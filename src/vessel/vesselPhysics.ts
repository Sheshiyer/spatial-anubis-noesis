/**
 * Vessel Physics Integration
 * P1-S1-22: Synchronize vessel visual with Rapier physics body
 * P1-S1-26: Set vessel spawn position
 * P1-S1-27: Movement speed curve (0.5s acceleration, 8 units/sec max)
 * P1-S1-28: Rotation damping
 * P1-S1-30: Configure vessel physics body (mass=1.0, locked X/Z rotation)
 * P1-S1-40: Vessel bounding box (capsule collider)
 * P1-S1-46: Vessel interaction raycast system
 */

import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import { getPhysicsWorld, getRapier } from '../physics/rapier';
import { syncThreeFromRapier } from '../physics/sync';
import type { VesselRaycastResult, VesselProximityEvent } from '../types/vessel';
import { VESSEL_RAYCAST_CONFIG, VESSEL_SPAWN_CONFIG } from '../types/vessel';

/** Vessel physics body configuration */
export interface VesselPhysicsBodyConfig {
  mass: number;
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  linearDamping: number;
  angularDamping: number;
  lockRotationsX: boolean;
  lockRotationsZ: boolean;
}

/** Default vessel physics config */
export const DEFAULT_VESSEL_PHYSICS_CONFIG: VesselPhysicsBodyConfig = {
  mass: 1.0,
  position: new THREE.Vector3(
    VESSEL_SPAWN_CONFIG.position.x,
    VESSEL_SPAWN_CONFIG.position.y,
    VESSEL_SPAWN_CONFIG.position.z
  ),
  rotation: new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, -1),
    new THREE.Vector3(
      VESSEL_SPAWN_CONFIG.facing.x,
      VESSEL_SPAWN_CONFIG.facing.y,
      VESSEL_SPAWN_CONFIG.facing.z
    ).normalize()
  ),
  linearDamping: 0.5,
  angularDamping: 2.0,
  lockRotationsX: true,
  lockRotationsZ: true,
};

/** Vessel physics controller */
export class VesselPhysicsController {
  private rigidBody: RAPIER.RigidBody | null = null;
  private collider: RAPIER.Collider | null = null;
  private capsuleRadius = 0.5;
  private capsuleHeight = 1.5;
  private maxVelocity = 8.0;
  private accelerationTime = 0.5;
  private currentAcceleration = 0;
  private raycastCooldown = 0;
  private lastRaycastTime = 0;
  private proximityListeners: Array<(event: VesselProximityEvent) => void> = [];

  /**
   * Create vessel physics body
   * P1-S1-30: Configure vessel physics body
   */
  createBody(config: Partial<VesselPhysicsBodyConfig> = {}): RAPIER.RigidBody {
    const fullConfig = { ...DEFAULT_VESSEL_PHYSICS_CONFIG, ...config };
    const world = getPhysicsWorld();
    const RAPIER = getRapier();

    // Create rigid body
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(fullConfig.position.x, fullConfig.position.y, fullConfig.position.z)
      .setRotation({
        x: fullConfig.rotation.x,
        y: fullConfig.rotation.y,
        z: fullConfig.rotation.z,
        w: fullConfig.rotation.w,
      })
      .setLinearDamping(fullConfig.linearDamping)
      .setAngularDamping(fullConfig.angularDamping)
      .setAdditionalMass(fullConfig.mass);

    this.rigidBody = world.createRigidBody(bodyDesc);

    // P1-S1-30: Lock X and Z rotations (yaw only)
    if (fullConfig.lockRotationsX) {
      this.rigidBody.lockRotations(true, false);
    }

    // P1-S1-40: Create capsule collider
    this.createCapsuleCollider();

    console.log('[VesselPhysics] Created vessel physics body');
    return this.rigidBody;
  }

  /**
   * Create capsule collider around splat cloud
   * P1-S1-40: Vessel bounding box for collision detection
   */
  private createCapsuleCollider(): void {
    if (!this.rigidBody) return;

    const world = getPhysicsWorld();
    const RAPIER = getRapier();

    // Capsule oriented vertically (Y-axis)
    const colliderDesc = RAPIER.ColliderDesc.capsule(
      this.capsuleHeight / 2,
      this.capsuleRadius
    )
      .setTranslation(0, 0, 0)
      .setFriction(0.5)
      .setRestitution(0.2);

    this.collider = world.createCollider(colliderDesc, this.rigidBody);
  }

  /**
   * Get the rigid body
   */
  getBody(): RAPIER.RigidBody | null {
    return this.rigidBody;
  }

  /**
   * Apply movement force with speed curve
   * P1-S1-27: Movement speed curve (0.5s acceleration ramp, max 8 units/sec)
   */
  applyMovement(direction: THREE.Vector3, deltaTime: number): void {
    if (!this.rigidBody) return;

    // Update acceleration ramp
    this.currentAcceleration = Math.min(
      this.currentAcceleration + deltaTime / this.accelerationTime,
      1.0
    );

    // Calculate force based on acceleration curve
    const forceMagnitude = this.maxVelocity * this.currentAcceleration;
    const force = direction.clone().multiplyScalar(forceMagnitude);

    // Apply as impulse
    this.rigidBody.applyImpulse(
      { x: force.x, y: force.y, z: force.z },
      true
    );

    // Cap velocity
    const velocity = this.rigidBody.linvel();
    const currentSpeed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2);
    if (currentSpeed > this.maxVelocity) {
      const scale = this.maxVelocity / currentSpeed;
      this.rigidBody.setLinvel(
        { x: velocity.x * scale, y: velocity.y * scale, z: velocity.z * scale },
        true
      );
    }
  }

  /**
   * Apply braking force
   */
  applyBrake(deltaTime: number): void {
    if (!this.rigidBody) return;

    const velocity = this.rigidBody.linvel();
    const brakeForce = 5.0 * deltaTime;
    
    this.rigidBody.setLinvel(
      {
        x: velocity.x * (1 - brakeForce),
        y: velocity.y * (1 - brakeForce),
        z: velocity.z * (1 - brakeForce),
      },
      true
    );

    // Reset acceleration
    this.currentAcceleration = 0;
  }

  /**
   * Apply steering torque
   */
  applySteering(torque: number): void {
    if (!this.rigidBody) return;

    // Only Y-axis rotation (yaw)
    this.rigidBody.applyTorqueImpulse({ x: 0, y: torque, z: 0 }, true);
  }

  /**
   * P1-S1-28: Apply rotation damping
   * Decay to <0.01 rad/s within 300ms
   */
  applyRotationDamping(deltaTime: number): void {
    if (!this.rigidBody) return;

    const angularVel = this.rigidBody.angvel();
    const dampingFactor = 1 - Math.min(deltaTime / 0.3, 1.0); // 300ms decay

    // Only damp Y rotation (yaw)
    this.rigidBody.setAngvel(
      { x: 0, y: angularVel.y * dampingFactor, z: 0 },
      true
    );
  }

  /**
   * Update damping based on coherence
   * P1-S1-15: High coherence=0.5 (fluid), low coherence=5.0 (sluggish)
   */
  updateLinearDamping(coherence: number): void {
    if (!this.rigidBody) return;

    const minDamping = 0.5;
    const maxDamping = 5.0;
    const damping = minDamping + (1 - coherence) * (maxDamping - minDamping);

    this.rigidBody.setLinearDamping(damping);
  }

  /**
   * P1-S1-46: Raycast for approaching objects
   * Fire proximity events at 10 unit range
   */
  raycastForward(): VesselRaycastResult {
    if (!this.rigidBody) {
      return { hit: false, distance: 0, point: null, objectId: null };
    }

    const now = performance.now();
    if (now - this.lastRaycastTime < this.raycastCooldown) {
      return { hit: false, distance: 0, point: null, objectId: null };
    }
    this.lastRaycastTime = now;

    const world = getPhysicsWorld();
    const position = this.rigidBody.translation();
    const rotation = this.rigidBody.rotation();

    // Calculate forward direction from rotation
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w));

    const origin = { x: position.x, y: position.y, z: position.z };
    const direction = { x: forward.x, y: forward.y, z: forward.z };

    let result: VesselRaycastResult = {
      hit: false,
      distance: VESSEL_RAYCAST_CONFIG.range,
      point: null,
      objectId: null,
    };

    // Cast ray using world.castRay
    const ray = new (getRapier()).Ray(origin, direction);
    const hit = world.castRay(ray, VESSEL_RAYCAST_CONFIG.range, true);

    if (hit) {
      const hitCollider = hit.collider;
      const hitBody = hitCollider.parent();
      
      if (hitBody && hitBody.handle !== this.rigidBody?.handle) {
        const hitPoint = ray.pointAt(hit.timeOfImpact);
        result = {
          hit: true,
          distance: hit.timeOfImpact,
          point: new THREE.Vector3(hitPoint.x, hitPoint.y, hitPoint.z),
          objectId: hitBody.handle.toString(),
        };

        // Fire proximity event
        this.fireProximityEvent({
          type: 'approach',
          objectId: result.objectId ?? '',
          distance: result.distance,
          timestamp: now,
        });
      }
    }

    return result;
  }

  /**
   * Add proximity event listener
   */
  onProximity(callback: (event: VesselProximityEvent) => void): () => void {
    this.proximityListeners.push(callback);
    return () => {
      const index = this.proximityListeners.indexOf(callback);
      if (index > -1) {
        this.proximityListeners.splice(index, 1);
      }
    };
  }

  /**
   * Fire proximity event to all listeners
   */
  private fireProximityEvent(event: VesselProximityEvent): void {
    this.proximityListeners.forEach((callback) => callback(event));
  }

  /**
   * P1-S1-22: Sync visual object with physics body
   * <1 pixel lag at 60fps
   */
  syncVisualToPhysics(visualObject: THREE.Object3D): void {
    if (!this.rigidBody) return;
    syncThreeFromRapier(visualObject, this.rigidBody);
  }

  /**
   * Get current velocity
   */
  getVelocity(): THREE.Vector3 {
    if (!this.rigidBody) return new THREE.Vector3();
    const vel = this.rigidBody.linvel();
    return new THREE.Vector3(vel.x, vel.y, vel.z);
  }

  /**
   * Get current angular velocity
   */
  getAngularVelocity(): THREE.Vector3 {
    if (!this.rigidBody) return new THREE.Vector3();
    const angVel = this.rigidBody.angvel();
    return new THREE.Vector3(angVel.x, angVel.y, angVel.z);
  }

  /**
   * Check if body is colliding
   */
  isColliding(): boolean {
    if (!this.rigidBody || !this.collider) return false;

    const world = getPhysicsWorld();
    let colliding = false;

    world.contactPairsWith(this.collider, () => {
      colliding = true;
    });

    return colliding;
  }

  /**
   * Destroy physics body
   */
  destroy(): void {
    if (this.rigidBody) {
      const world = getPhysicsWorld();
      world.removeRigidBody(this.rigidBody);
      this.rigidBody = null;
      this.collider = null;
    }
  }
}

/** Singleton physics controller instance */
let vesselPhysicsController: VesselPhysicsController | null = null;

/**
 * Get or create vessel physics controller
 */
export function getVesselPhysicsController(): VesselPhysicsController {
  if (!vesselPhysicsController) {
    vesselPhysicsController = new VesselPhysicsController();
  }
  return vesselPhysicsController;
}

/**
 * Reset vessel physics controller
 */
export function resetVesselPhysics(): void {
  if (vesselPhysicsController) {
    vesselPhysicsController.destroy();
    vesselPhysicsController = null;
  }
}
