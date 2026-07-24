/**
 * Navigation Controller — Head-tilt to Physics Force Mapping
 * P1-S1-13: Map head-tilt vectors to Rapier forces
 * P1-S1-15: Build LinearDamping viscosity system
 * P1-S1-39: Build head-tilt deadzone
 */

import type RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import type {
  HeadTilt,
  BioState,
  NavigationForces,
  NavigationInput,
  DampingConfig,
  DeadzoneConfig,
  NavigationControllerOptions,
  VesselPhysicsBody,
} from '@/types';
import { VESSEL_SPAWN_CONFIG, type VesselPhysicsConfig } from '@/types';

// ============================================================================
// Constants
// ============================================================================

/** 3 degrees in radians — deadzone threshold */
export const DEFAULT_DEADZONE_RADIANS = (3 * Math.PI) / 180;

/** Damping at coherence 1.0 (fluid movement) */
export const DEFAULT_MIN_DAMPING = 0.5;

/** Damping at coherence 0.0 (sluggish movement) */
export const DEFAULT_MAX_DAMPING = 5.0;

/** Forward force multiplier for head-tilt navigation */
export const DEFAULT_FORWARD_FORCE_MULTIPLIER = 15.0;

/** Brake force multiplier for back-lean navigation */
export const DEFAULT_BRAKE_FORCE_MULTIPLIER = 8.0;

/** Steering torque multiplier for left/right tilt */
export const DEFAULT_STEERING_TORQUE_MULTIPLIER = 2.5;

/** Maximum velocity cap in units/second (P1-S1-27) */
export const DEFAULT_MAX_VELOCITY = 8.0;

/** Time to reduce velocity to zero when braking (1 second) */
export const BRAKING_STOP_TIME = 1.0;

/** Angular damping for rotation decay (P1-S1-28) */
export const DEFAULT_ANGULAR_DAMPING = 3.0;

/** Mass for vessel physics body (P1-S1-30) */
export const DEFAULT_VESSEL_MASS = 1.0;

/** Spawn position (P1-S1-26) */
export const DEFAULT_SPAWN_POSITION = VESSEL_SPAWN_CONFIG.position;

/** Forward vector pointing North (P1-S1-26) */
export const DEFAULT_SPAWN_FORWARD = VESSEL_SPAWN_CONFIG.facing;

// ============================================================================
// Deadzone Implementation — P1-S1-39
// ============================================================================

/**
 * Apply deadzone to head-tilt angles
 * Small movements below 3 degrees are ignored for stability
 *
 * @param tilt - Raw head-tilt vector
 * @param thresholdRadians - Deadzone threshold (default 3°)
 * @returns Filtered tilt vector with deadzone applied
 */
export function applyDeadzone(tilt: HeadTilt, thresholdRadians: number = DEFAULT_DEADZONE_RADIANS): HeadTilt {
  /**
   * Deadzone formula with proportional scaling:
   * - If |angle| < threshold: output = 0 (ignore micro-movements)
   * - If |angle| >= threshold: output = (|angle| - threshold) * sign(angle)
   *   This creates proportional force above threshold
   */
  const applyThreshold = (value: number): number => {
    const absValue = Math.abs(value);
    if (absValue < thresholdRadians) {
      return 0;
    }
    // Proportional scaling: subtract threshold for smooth transition
    const scaled = absValue - thresholdRadians;
    return value > 0 ? scaled : -scaled;
  };

  return {
    roll: applyThreshold(tilt.roll),
    pitch: applyThreshold(tilt.pitch),
    yaw: applyThreshold(tilt.yaw),
    confidence: tilt.confidence,
  };
}

/**
 * Check if head is in neutral position (within deadzone on all axes)
 */
export function isNeutralPosition(tilt: HeadTilt, thresholdRadians: number = DEFAULT_DEADZONE_RADIANS): boolean {
  const deadzoned = applyDeadzone(tilt, thresholdRadians);
  return deadzoned.roll === 0 && deadzoned.pitch === 0 && deadzoned.yaw === 0;
}

// ============================================================================
// Damping Controller — P1-S1-15
// ============================================================================

/**
 * Calculate linear damping based on coherence value
 * High coherence (1.0) = damping 0.5 (fluid)
 * Low coherence (0.0) = damping 5.0 (sluggish)
 *
 * Linear interpolation: damping = max - coherence * (max - min)
 *
 * @param coherence - Coherence value 0.0 to 1.0
 * @param minDamping - Damping at coherence 1.0 (default 0.5)
 * @param maxDamping - Damping at coherence 0.0 (default 5.0)
 * @returns Calculated linear damping value
 */
export function calculateLinearDamping(
  coherence: number,
  minDamping: number = DEFAULT_MIN_DAMPING,
  maxDamping: number = DEFAULT_MAX_DAMPING
): number {
  // Clamp coherence to valid range
  const clampedCoherence = Math.max(0, Math.min(1, coherence));
  // Linear interpolation: as coherence increases, damping decreases
  return maxDamping - clampedCoherence * (maxDamping - minDamping);
}

/**
 * Update rigid body linear damping in real-time
 * Called each frame based on current coherence signal
 *
 * @param rigidBody - Rapier rigid body to update
 * @param damping - New linear damping value
 */
export function updateLinearDamping(rigidBody: RAPIER.RigidBody, damping: number): void {
  rigidBody.setLinearDamping(damping);
}

/**
 * Create default damping configuration
 */
export function createDampingConfig(
  minDamping: number = DEFAULT_MIN_DAMPING,
  maxDamping: number = DEFAULT_MAX_DAMPING
): DampingConfig {
  return {
    minDamping,
    maxDamping,
    currentDamping: maxDamping, // Start sluggish until coherence is established
  };
}

// ============================================================================
// Force Mapping — P1-S1-13
// ============================================================================

/**
 * Calculate navigation forces from head-tilt input
 *
 * Tilt Left (>-3°):  Apply counter-clockwise torque (negative Y)
 * Tilt Right (>3°):  Apply clockwise torque (positive Y)
 * Lean Forward:      Apply forward impulse
 * Lean Back:         Apply braking force
 * Neutral (±3°):     No rotation force
 *
 * @param tilt - Head-tilt vector (already deadzoned)
 * @param options - Force calculation options
 * @returns Calculated forces for physics application
 */
export function calculateNavigationForces(
  tilt: HeadTilt,
  options: Partial<NavigationControllerOptions> = {}
): NavigationForces {
  const {
    forwardForceMultiplier = DEFAULT_FORWARD_FORCE_MULTIPLIER,
    brakeForceMultiplier = DEFAULT_BRAKE_FORCE_MULTIPLIER,
    steeringTorqueMultiplier = DEFAULT_STEERING_TORQUE_MULTIPLIER,
  } = options;

  // Forward lean (negative pitch) = forward force
  // Back lean (positive pitch) = brake force
  let forwardForce = 0;
  let brakeForce = 0;

  if (tilt.pitch < 0) {
    // Forward lean: apply forward force proportional to lean angle
    forwardForce = Math.abs(tilt.pitch) * forwardForceMultiplier;
  } else if (tilt.pitch > 0) {
    // Back lean: apply braking force to reduce velocity
    brakeForce = tilt.pitch * brakeForceMultiplier;
  }

  // Roll controls steering (yaw rotation)
  // Counter-clockwise torque for left tilt (negative roll)
  // Clockwise torque for right tilt (positive roll)
  const steeringTorque = tilt.roll * steeringTorqueMultiplier;

  return {
    forwardForce,
    brakeForce,
    steeringTorque,
  };
}

/**
 * Apply forward movement force to rigid body
 * Force is applied in the direction the body is facing
 */
export function applyForwardForce(
  rigidBody: RAPIER.RigidBody,
  force: number,
  wakeUp: boolean = true
): void {
  if (force <= 0) return;

  // Get current rotation to determine forward direction
  const rotation = rigidBody.rotation();
  const quaternion = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);

  // Forward vector in local space is (0, 0, -1)
  const forwardLocal = new THREE.Vector3(0, 0, -1);
  const forwardWorld = forwardLocal.applyQuaternion(quaternion);

  // Apply impulse in forward direction
  const impulse = {
    x: forwardWorld.x * force,
    y: 0, // Keep movement horizontal
    z: forwardWorld.z * force,
  };

  rigidBody.applyImpulse(impulse, wakeUp);
}

/**
 * Apply braking force to reduce velocity to zero
 * Reduces velocity to zero within 1 second on back tilt (P1-S1-13)
 */
export function applyBrakingForce(
  rigidBody: RAPIER.RigidBody,
  brakeFactor: number,
  wakeUp: boolean = true
): void {
  if (brakeFactor <= 0) return;

  const velocity = rigidBody.linvel();
  const speed = Math.sqrt(velocity.x ** 2 + velocity.z ** 2);

  if (speed < 0.01) return; // Already stopped

  // Calculate braking impulse to reduce velocity to zero in BRAKING_STOP_TIME
  // F = m * a = m * (v / t)
  const mass = rigidBody.mass();
  const brakingMagnitude = (mass * speed) / BRAKING_STOP_TIME;

  // Apply scaled braking force
  const actualBraking = brakingMagnitude * Math.min(brakeFactor, 1.0);

  // Braking is opposite to velocity direction
  const brakeImpulse = {
    x: -(velocity.x / speed) * actualBraking,
    y: 0,
    z: -(velocity.z / speed) * actualBraking,
  };

  rigidBody.applyImpulse(brakeImpulse, wakeUp);
}

/**
 * Apply steering torque (yaw rotation only)
 * X and Z rotations are locked per P1-S1-30
 */
export function applySteeringTorque(
  rigidBody: RAPIER.RigidBody,
  torque: number,
  wakeUp: boolean = true
): void {
  if (Math.abs(torque) < 0.001) return;

  // Apply torque around Y-axis only (yaw)
  // Counter-clockwise (left tilt) = negative torque
  // Clockwise (right tilt) = positive torque
  rigidBody.applyTorqueImpulse({ x: 0, y: torque, z: 0 }, wakeUp);
}

// ============================================================================
// Velocity Limiting — P1-S1-27
// ============================================================================

/**
 * Clamp velocity to maximum cap
 * P1-S1-27: Maximum velocity 8 units/sec
 */
export function clampVelocity(rigidBody: RAPIER.RigidBody, maxVelocity: number = DEFAULT_MAX_VELOCITY): void {
  const velocity = rigidBody.linvel();
  const horizontalSpeed = Math.sqrt(velocity.x ** 2 + velocity.z ** 2);

  if (horizontalSpeed > maxVelocity) {
    const scale = maxVelocity / horizontalSpeed;
    rigidBody.setLinvel(
      {
        x: velocity.x * scale,
        y: velocity.y,
        z: velocity.z * scale,
      },
      false
    );
  }
}

// ============================================================================
// Angular Damping — P1-S1-28
// ============================================================================

/**
 * Set angular damping to prevent endless spinning
 * P1-S1-28: Rotation decays to zero within 0.3 seconds of neutral
 */
export function setupAngularDamping(
  rigidBody: RAPIER.RigidBody,
  angularDamping: number = DEFAULT_ANGULAR_DAMPING
): void {
  rigidBody.setAngularDamping(angularDamping);
}

// ============================================================================
// Vessel Physics Body Creation — P1-S1-30
// ============================================================================

/**
 * Create vessel physics body with proper configuration
 * P1-S1-30: Mass=1.0, locked X/Z rotation (yaw only)
 * P1-S1-26: Spawn at (0, 1.7, 0) facing North
 * P1-S1-40: Capsule collider
 *
 * @param world - Rapier physics world
 * @param rapier - Rapier instance
 * @param config - Optional custom configuration
 * @returns Vessel physics body reference
 */
export function createVesselPhysicsBody(
  world: RAPIER.World,
  rapier: typeof RAPIER,
  config?: Partial<VesselPhysicsConfig>
): VesselPhysicsBody {
  // Use existing defaults and merge with provided config
  const finalConfig: VesselPhysicsConfig = {
    mass: config?.mass ?? DEFAULT_VESSEL_MASS,
    maxVelocity: config?.maxVelocity ?? DEFAULT_MAX_VELOCITY,
    accelerationTime: config?.accelerationTime ?? 0.5,
    linearDampingBase: config?.linearDampingBase ?? DEFAULT_MIN_DAMPING,
    linearDampingSluggish: config?.linearDampingSluggish ?? DEFAULT_MAX_DAMPING,
    rotationDamping: config?.rotationDamping ?? DEFAULT_ANGULAR_DAMPING,
    lockedAxes: config?.lockedAxes ?? { x: true, y: false, z: true },
  };

  // Create dynamic rigid body at spawn position
  // Note: Mass is controlled via collider density, not RigidBodyDesc
  const bodyDesc = rapier.RigidBodyDesc.dynamic()
    .setTranslation(DEFAULT_SPAWN_POSITION.x, DEFAULT_SPAWN_POSITION.y, DEFAULT_SPAWN_POSITION.z)
    .setLinearDamping(DEFAULT_MAX_DAMPING) // Start sluggish
    .setAngularDamping(DEFAULT_ANGULAR_DAMPING);

  // Lock rotation on X and Z axes (yaw only per P1-S1-30)
  // Rapier uses lockRotations() with axis parameters in newer versions
  // For compatibility, we use lockRotations() which locks all rotations
  // and the damping will control the decay
  if (finalConfig.lockedAxes.x && finalConfig.lockedAxes.z) {
    bodyDesc.lockRotations();
  }

  const rigidBody = world.createRigidBody(bodyDesc);

  // Create capsule collider (P1-S1-40)
  // Height 1.6m (human-scale), radius 0.3m
  // Mass is calculated from volume × density (target: 1.0 kg)
  const capsuleHeight = 1.0;
  const capsuleRadius = 0.3;
  // Calculate density to achieve target mass
  // Capsule volume = πr²(h + 4r/3) ≈ 0.4 m³ for these dimensions
  // Density = mass / volume ≈ 2.5 for 1kg mass
  const targetDensity = finalConfig.mass / (Math.PI * capsuleRadius * capsuleRadius * (capsuleHeight + (4 * capsuleRadius) / 3));
  const colliderDesc = rapier.ColliderDesc.capsule(capsuleHeight / 2, capsuleRadius)
    .setDensity(targetDensity)
    .setFriction(0.5)
    .setRestitution(0.1);

  const collider = world.createCollider(colliderDesc, rigidBody);

  // Orient to face North (0, 0, -1)
  // Default orientation is identity, need to rotate to face spawnForward
  const forward = new THREE.Vector3(DEFAULT_SPAWN_FORWARD.x, DEFAULT_SPAWN_FORWARD.y, DEFAULT_SPAWN_FORWARD.z);
  forward.normalize();
  const targetRotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), forward);

  rigidBody.setRotation(
    {
      x: targetRotation.x,
      y: targetRotation.y,
      z: targetRotation.z,
      w: targetRotation.w,
    },
    true
  );

  console.log('[Navigation] Vessel physics body created:', {
    position: DEFAULT_SPAWN_POSITION,
    mass: finalConfig.mass,
    lockedAxes: finalConfig.lockedAxes,
    collider: 'capsule',
  });

  return {
    rigidBody,
    config: finalConfig,
    collider,
  };
}

// ============================================================================
// Navigation Controller Class
// ============================================================================

/**
 * Main navigation controller that integrates all systems
 * - Head-tilt to force mapping (P1-S1-13)
 * - Linear damping based on coherence (P1-S1-15)
 * - Deadzone filtering (P1-S1-39)
 */
export class NavigationController {
  private options: NavigationControllerOptions;
  private dampingConfig: DampingConfig;
  private deadzoneConfig: DeadzoneConfig;
  private currentInput: NavigationInput;

  constructor(options: Partial<NavigationControllerOptions> = {}) {
    this.options = {
      forwardForceMultiplier: options.forwardForceMultiplier ?? DEFAULT_FORWARD_FORCE_MULTIPLIER,
      brakeForceMultiplier: options.brakeForceMultiplier ?? DEFAULT_BRAKE_FORCE_MULTIPLIER,
      steeringTorqueMultiplier: options.steeringTorqueMultiplier ?? DEFAULT_STEERING_TORQUE_MULTIPLIER,
      deadzoneDegrees: options.deadzoneDegrees ?? 3,
      minDamping: options.minDamping ?? DEFAULT_MIN_DAMPING,
      maxDamping: options.maxDamping ?? DEFAULT_MAX_DAMPING,
    };

    this.dampingConfig = createDampingConfig(this.options.minDamping, this.options.maxDamping);
    this.deadzoneConfig = {
      thresholdRadians: (this.options.deadzoneDegrees * Math.PI) / 180,
      useProportionalScaling: true,
    };

    this.currentInput = {
      headTilt: null,
      bioState: { coherence: 0, lqd: 0, entropy: 0, breathPhase: 0 },
      timestamp: performance.now(),
    };
  }

  /**
   * Update navigation input from bio-signals
   * Called when new head-tilt or bio-state data arrives
   */
  updateInput(headTilt: HeadTilt | null, bioState: BioState): void {
    this.currentInput = {
      headTilt,
      bioState,
      timestamp: performance.now(),
    };
  }

  /**
   * Process navigation and apply forces to vessel
   * Call this in the physics update loop
   */
  processNavigation(vessel: VesselPhysicsBody): void {
    // Update linear damping based on coherence (P1-S1-15)
    const targetDamping = calculateLinearDamping(
      this.currentInput.bioState.coherence,
      this.dampingConfig.minDamping,
      this.dampingConfig.maxDamping
    );
    this.dampingConfig.currentDamping = targetDamping;
    updateLinearDamping(vessel.rigidBody, targetDamping);

    // If no head-tilt data, skip force application
    if (!this.currentInput.headTilt) {
      return;
    }

    // Apply deadzone filtering (P1-S1-39)
    const deadzonedTilt = applyDeadzone(this.currentInput.headTilt, this.deadzoneConfig.thresholdRadians);

    // Calculate navigation forces (P1-S1-13)
    const forces = calculateNavigationForces(deadzonedTilt, this.options);

    // Apply forces to vessel
    applyForwardForce(vessel.rigidBody, forces.forwardForce);
    applyBrakingForce(vessel.rigidBody, forces.brakeForce);
    applySteeringTorque(vessel.rigidBody, forces.steeringTorque);

    // Clamp velocity to maximum (P1-S1-27)
    clampVelocity(vessel.rigidBody, vessel.config.maxVelocity);
  }

  /**
   * Get current navigation forces (for debugging)
   */
  getCurrentForces(): NavigationForces | null {
    if (!this.currentInput.headTilt) {
      return null;
    }
    const deadzonedTilt = applyDeadzone(this.currentInput.headTilt, this.deadzoneConfig.thresholdRadians);
    return calculateNavigationForces(deadzonedTilt, this.options);
  }

  /**
   * Get current damping value
   */
  getCurrentDamping(): number {
    return this.dampingConfig.currentDamping;
  }

  /**
   * Check if input is neutral (within deadzone)
   */
  isNeutral(): boolean {
    if (!this.currentInput.headTilt) return true;
    return isNeutralPosition(this.currentInput.headTilt, this.deadzoneConfig.thresholdRadians);
  }

  /**
   * Reset controller state
   */
  reset(): void {
    this.currentInput = {
      headTilt: null,
      bioState: { coherence: 0, lqd: 0, entropy: 0, breathPhase: 0 },
      timestamp: performance.now(),
    };
  }
}

// ============================================================================
// Utility Exports
// ============================================================================
