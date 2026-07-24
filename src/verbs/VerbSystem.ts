/**
 * Kinetic Verb System
 * P2-S2-01: GRASP verb
 * P2-S2-02: THROW verb
 * P2-S2-03: ORBIT verb
 * P2-S2-04: STRIKE verb
 * P2-S2-05: BREATHE-SYNC verb
 * P2-S2-06: REST verb
 * P2-S2-27: Verb state machine (prevent simultaneous)
 * P2-S2-30: Inventory system (max 2 objects)
 */

import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import { getRapier, getPhysicsWorld } from '../physics/rapier';
import type { ObjectStateMachine } from '../objects/ObjectStateMachine';
import { VelocityTracker } from '../gestures/GestureDetector';
import type { PIPData } from '../bio/types';
import {
  type KineticVerbType,
  type VerbState,
  type RitualObject,
  type GraspState,
  type ThrowState,
  type OrbitState,
  type BreathSyncState,
  type StrikeOutcome,
  type InventoryState,
  VERB_CONFIG,
  calculateStrikeTier,
} from './types';

// ============================================================================
// Verb System
// ============================================================================

export class VerbSystem {
  private stateMachine: ObjectStateMachine;
  private velocityTracker: VelocityTracker;
  
  // Verb states
  private verbState: VerbState;
  private inventory: InventoryState;
  
  // Active verb states
  private graspState: GraspState | null = null;
  private throwState: ThrowState | null = null;
  private orbitState: OrbitState | null = null;
  private breathSyncStates: Map<string, BreathSyncState> = new Map();
  
  // Strike tracking
  private lastCollisionMomentum: Map<string, number> = new Map();
  
  // Cooldown tracking
  private lastVerbEndTime: number = 0;

  constructor(stateMachine: ObjectStateMachine) {
    this.stateMachine = stateMachine;
    this.velocityTracker = new VelocityTracker(VERB_CONFIG.THROW.velocityBufferSize);
    
    this.verbState = {
      current: 'IDLE',
      previous: 'IDLE',
      isActive: false,
      startTime: 0,
      targetObjectId: null,
    };
    
    this.inventory = {
      graspedObjects: [],
      maxSlots: VERB_CONFIG.GRASP.maxInventory,
    };

    this.setupCollisionDetection();
  }

  // ============================================================================
  // Verb Activation
  // ============================================================================

  /**
   * Activate a kinetic verb
   * P2-S2-27: Prevent simultaneous verbs with cooldown
   */
  activateVerb(verb: KineticVerbType, targetObjectId?: string): boolean {
    // Check cooldown
    const now = performance.now();
    if (now - this.lastVerbEndTime < VERB_CONFIG.GLOBAL.cooldownMs) {
      console.log(`[VerbSystem] Cooldown active, cannot activate ${verb}`);
      return false;
    }

    // Check if another verb is active
    if (this.verbState.isActive && this.verbState.current !== 'IDLE') {
      // Allow transitioning from GRASP to THROW
      if (this.verbState.current === 'GRASP' && verb === 'THROW') {
        this.executeThrow();
        return true;
      }
      
      console.log(`[VerbSystem] Cannot activate ${verb}, ${this.verbState.current} is active`);
      return false;
    }

    // Validate target object
    if (targetObjectId) {
      const object = this.stateMachine.getObject(targetObjectId);
      if (!object) {
        console.warn(`[VerbSystem] Target object ${targetObjectId} not found`);
        return false;
      }

      // Check if object is in valid state for verb
      if (!this.isValidObjectForVerb(object, verb)) {
        return false;
      }
    }

    // Activate verb
    this.verbState.previous = this.verbState.current;
    this.verbState.current = verb;
    this.verbState.isActive = true;
    this.verbState.startTime = now;
    this.verbState.targetObjectId = targetObjectId ?? null;

    console.log(`[VerbSystem] Activated ${verb}${targetObjectId ? ` on ${targetObjectId}` : ''}`);

    // Execute verb-specific logic
    switch (verb) {
      case 'GRASP':
        if (targetObjectId) this.executeGrasp(targetObjectId);
        break;
      case 'THROW':
        if (targetObjectId) this.executeThrow();
        break;
      case 'ORBIT':
        if (targetObjectId) this.executeOrbit(targetObjectId);
        break;
      case 'STRIKE':
        if (targetObjectId) this.executeStrike(targetObjectId);
        break;
      case 'BREATHE_SYNC':
        if (targetObjectId) this.executeBreathSync(targetObjectId);
        break;
      case 'REST':
        if (targetObjectId) this.executeRest(targetObjectId);
        break;
    }

    // Dispatch event
    window.dispatchEvent(
      new CustomEvent('verb:activate', {
        detail: { verb, targetId: targetObjectId },
      })
    );

    return true;
  }

  /**
   * Deactivate current verb
   */
  deactivateVerb(completed: boolean = true): void {
    if (!this.verbState.isActive) return;

    const verb = this.verbState.current;
    const targetId = this.verbState.targetObjectId;

    // Execute verb-specific cleanup
    switch (verb) {
      case 'GRASP':
        this.endGrasp(false);
        break;
      case 'ORBIT':
        this.endOrbit();
        break;
      case 'BREATHE_SYNC':
        if (targetId) this.endBreathSync(targetId);
        break;
    }

    // Update state
    this.verbState.previous = this.verbState.current;
    this.verbState.current = 'IDLE';
    this.verbState.isActive = false;
    this.verbState.targetObjectId = null;
    this.lastVerbEndTime = performance.now();

    // Dispatch event
    window.dispatchEvent(
      new CustomEvent('verb:deactivate', {
        detail: { verb, targetId },
      })
    );

    console.log(`[VerbSystem] Deactivated ${verb}`);
  }

  /**
   * Check if object is in valid state for verb
   */
  private isValidObjectForVerb(object: RitualObject, verb: KineticVerbType): boolean {
    switch (verb) {
      case 'GRASP':
        // Can grasp Awakened or Active objects, not already grasped
        return (object.state === 'Awakened' || object.state === 'Active') &&
               !this.inventory.graspedObjects.includes(object.id) &&
               this.inventory.graspedObjects.length < this.inventory.maxSlots;
      
      case 'THROW':
        // Can only throw grasped objects
        return this.inventory.graspedObjects.includes(object.id);
      
      case 'ORBIT':
        return object.state === 'Awakened' || object.state === 'Active';
      
      case 'STRIKE':
        return object.state === 'Active' || object.state === 'Awakened';
      
      case 'BREATHE_SYNC':
        return object.state === 'Active' || object.state === 'Ritual';
      
      case 'REST':
        return object.state === 'Active';
      
      default:
        return true;
    }
  }

  // ============================================================================
  // P2-S2-01: GRASP Verb
  // ============================================================================

  /**
   * Execute GRASP verb - create spring joint
   */
  private executeGrasp(objectId: string): void {
    const object = this.stateMachine.getObject(objectId);
    if (!object || !object.rigidBody) return;

    // Check inventory limit
    if (this.inventory.graspedObjects.length >= this.inventory.maxSlots) {
      console.log(`[VerbSystem] Inventory full, cannot grasp ${objectId}`);
      return;
    }

    const RAPIER = getRapier();
    const world = getPhysicsWorld();

    // Wake object and transition to Active
    this.stateMachine.wakeObject(objectId);
    this.stateMachine.transitionObject(objectId, 'Active');

    // Create spring joint config
    const jointData = RAPIER.JointData.spring(
      VERB_CONFIG.GRASP.springStiffness,
      VERB_CONFIG.GRASP.springDamping,
      VERB_CONFIG.GRASP.maxDistance,
    );

    // Get object position for anchor
    const objectPos = object.rigidBody.translation();
    jointData.localAnchor1 = { x: 0, y: 0, z: 0 }; // Hand position (will be updated)
    jointData.localAnchor2 = { x: 0, y: 0, z: 0 }; // Object center

    // Create joint - attached to a kinematic hand body (simulated)
    // In practice, the hand position would be tracked and the joint anchor updated
    const handBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(objectPos.x, objectPos.y + 1, objectPos.z);
    const handBody = world.createRigidBody(handBodyDesc);

    const joint = world.createImpulseJoint(jointData, handBody, object.rigidBody, true);

    // Store grasp state
    this.graspState = {
      objectId,
      joint,
      handPosition: new THREE.Vector3(objectPos.x, objectPos.y + 1, objectPos.z),
      startTime: performance.now(),
      mass: object.mass,
    };

    // Add to inventory
    this.inventory.graspedObjects.push(objectId);

    // Initialize throw state
    this.throwState = {
      objectId,
      velocityBuffer: [],
      isCharging: true,
    };

    // Dispatch event
    window.dispatchEvent(
      new CustomEvent('grasp:start', {
        detail: { objectId, handPosition: this.graspState.handPosition },
      })
    );

    console.log(`[GRASP] Grasped ${objectId}`);
  }

  /**
   * Update grasp - move hand position
   */
  updateGraspHandPosition(position: THREE.Vector3): void {
    if (!this.graspState || !this.verbState.isActive || this.verbState.current !== 'GRASP') {
      return;
    }

    // Update hand position
    this.graspState.handPosition.copy(position);

    // Update joint anchor (would need access to hand body)
    // In full implementation, the hand kinematic body position would be updated

    // Record velocity for throw
    if (this.throwState) {
      this.recordVelocitySample(position);
    }
  }

  /**
   * End grasp - optionally throw
   */
  private endGrasp(shouldThrow: boolean): void {
    if (!this.graspState) return;

    const { objectId, joint } = this.graspState;

    // Remove joint
    if (joint) {
      const world = getPhysicsWorld();
      world.removeImpulseJoint(joint, true);
    }

    // If throwing, velocity will be applied by executeThrow
    if (!shouldThrow) {
      // Transition back to Awakened
      this.stateMachine.transitionObject(objectId, 'Awakened');
    }

    // Remove from inventory
    this.inventory.graspedObjects = this.inventory.graspedObjects.filter(
      id => id !== objectId
    );

    // Dispatch event
    window.dispatchEvent(
      new CustomEvent('grasp:end', {
        detail: { objectId, thrown: shouldThrow },
      })
    );

    this.graspState = null;
    console.log(`[GRASP] Released ${objectId}${shouldThrow ? ' (thrown)' : ''}`);
  }

  // ============================================================================
  // P2-S2-02: THROW Verb
  // ============================================================================

  /**
   * Execute THROW verb - release with velocity
   */
  private executeThrow(): void {
    if (!this.throwState || !this.graspState) {
      console.warn('[THROW] No object to throw');
      return;
    }

    const { objectId } = this.throwState;
    const object = this.stateMachine.getObject(objectId);
    if (!object || !object.rigidBody) return;

    // Calculate release velocity from buffer
    const releaseVelocity = this.calculateReleaseVelocity();
    if (!releaseVelocity) {
      console.warn('[THROW] No velocity data available');
      return;
    }

    // Apply velocity multiplier and cap
    const multiplier = VERB_CONFIG.THROW.velocityMultiplier;
    let impulse = releaseVelocity.clone().multiplyScalar(multiplier * object.mass);
    
    // Cap impulse
    const maxImpulse = VERB_CONFIG.THROW.maxImpulse;
    if (impulse.length() > maxImpulse) {
      impulse.normalize().multiplyScalar(maxImpulse);
    }

    // End grasp first (without state change, we'll keep Active)
    this.endGrasp(true);

    // Apply impulse
    object.rigidBody.applyImpulse(
      { x: impulse.x, y: impulse.y, z: impulse.z },
      true
    );

    // Cap velocity
    this.enforceVelocityCap(object);

    // Keep object in Active state
    this.stateMachine.transitionObject(objectId, 'Active');

    // Dispatch event
    window.dispatchEvent(
      new CustomEvent('throw:release', {
        detail: {
          objectId,
          velocity: releaseVelocity,
          impulse: impulse.length(),
        },
      })
    );

    console.log(`[THROW] Threw ${objectId} with impulse ${impulse.length().toFixed(2)}`);

    // Clear throw state
    this.throwState = null;
  }

  /**
   * Record velocity sample for throw calculation
   */
  private recordVelocitySample(position: THREE.Vector3): void {
    if (!this.throwState) return;

    const now = performance.now();
    const buffer = this.throwState.velocityBuffer;

    // Calculate instantaneous velocity
    let velocity = new THREE.Vector3();
    if (buffer.length > 0) {
      const last = buffer[buffer.length - 1];
      const dt = (now - last.timestamp) / 1000;
      if (dt > 0) {
        velocity.subVectors(position, last.position).divideScalar(dt);
      }
    }

    buffer.push({
      position: position.clone(),
      timestamp: now,
      velocity,
    });

    // Trim buffer
    const maxSize = VERB_CONFIG.THROW.velocityBufferSize;
    if (buffer.length > maxSize) {
      buffer.shift();
    }
  }

  /**
   * Calculate release velocity from buffer
   */
  private calculateReleaseVelocity(): THREE.Vector3 | null {
    if (!this.throwState || this.throwState.velocityBuffer.length === 0) {
      return null;
    }

    const buffer = this.throwState.velocityBuffer;
    
    // Average the last few velocities
    const avg = buffer.reduce(
      (sum, sample) => sum.add(sample.velocity),
      new THREE.Vector3()
    );
    avg.divideScalar(buffer.length);

    return avg;
  }

  // ============================================================================
  // P2-S2-03: ORBIT Verb
  // ============================================================================

  /**
   * Execute ORBIT verb - spherical joint constraint
   */
  private executeOrbit(objectId: string): void {
    const object = this.stateMachine.getObject(objectId);
    if (!object || !object.rigidBody) return;

    const RAPIER = getRapier();
    const world = getPhysicsWorld();

    // Wake and activate
    this.stateMachine.wakeObject(objectId);
    this.stateMachine.transitionObject(objectId, 'Active');

    // Create spherical joint at vessel position
    // This constrains the object to orbit at fixed radius
    const objectPos = object.rigidBody.translation();
    const vesselPos = new THREE.Vector3(0, 0, 0); // Would be actual vessel position

    const jointData = RAPIER.JointData.spherical(
      { x: vesselPos.x, y: vesselPos.y, z: vesselPos.z },
      { x: 0, y: 0, z: 0 }
    );

    // Create anchor body at vessel position
    const anchorBodyDesc = RAPIER.RigidBodyDesc.fixed()
      .setTranslation(vesselPos.x, vesselPos.y, vesselPos.z);
    const anchorBody = world.createRigidBody(anchorBodyDesc);

    const joint = world.createImpulseJoint(jointData, anchorBody, object.rigidBody, true);

    this.orbitState = {
      objectId,
      centerPosition: vesselPos,
      radius: VERB_CONFIG.ORBIT.radius,
      angularVelocity: new THREE.Vector3(),
      joint,
      handSeparation: 0,
    };

    console.log(`[ORBIT] Orbiting ${objectId}`);
  }

  /**
   * Update orbit with hand rotation
   */
  updateOrbit(handSeparation: number, handRotation: THREE.Vector3): void {
    if (!this.orbitState || this.verbState.current !== 'ORBIT') return;

    this.orbitState.handSeparation = handSeparation;
    this.orbitState.angularVelocity.copy(handRotation);

    // Apply angular velocity to orbiting object
    const object = this.stateMachine.getObject(this.orbitState.objectId);
    if (object?.rigidBody) {
      // Angular velocity mapped to hand rotation
      object.rigidBody.setAngvel(
        { x: handRotation.x, y: handRotation.y, z: handRotation.z },
        true
      );
    }
  }

  /**
   * End orbit verb
   */
  private endOrbit(): void {
    if (!this.orbitState) return;

    const { objectId, joint } = this.orbitState;

    // Remove joint
    if (joint) {
      const world = getPhysicsWorld();
      world.removeImpulseJoint(joint, true);
    }

    // Transition back to Awakened
    this.stateMachine.transitionObject(objectId, 'Awakened');

    this.orbitState = null;
    console.log(`[ORBIT] Ended orbit for ${objectId}`);
  }

  // ============================================================================
  // P2-S2-04: STRIKE Verb
  // ============================================================================

  /**
   * Execute STRIKE verb
   */
  private executeStrike(objectId: string): void {
    const object = this.stateMachine.getObject(objectId);
    if (!object) return;

    // STRIKE is triggered by collision, not directly
    // This sets up the object for strike detection
    this.stateMachine.wakeObject(objectId);
    this.stateMachine.transitionObject(objectId, 'Active');

    console.log(`[STRIKE] Strike mode active for ${objectId}`);
  }

  /**
   * Handle collision for strike detection
   */
  private handleStrikeCollision(objectId: string, momentum: number): void {
    const threshold = VERB_CONFIG.STRIKE.baseThreshold;
    
    if (momentum < threshold) {
      return; // Not a strike
    }

    // Calculate tier
    const tier = calculateStrikeTier(momentum);
    
    const outcome: StrikeOutcome = {
      tier,
      momentum,
      targetId: objectId,
      timestamp: performance.now(),
    };

    // Store for retrieval
    this.lastCollisionMomentum.set(objectId, momentum);

    // Dispatch event
    window.dispatchEvent(
      new CustomEvent('strike:impact', {
        detail: { outcome },
      })
    );

    console.log(`[STRIKE] ${tier} strike on ${objectId} (momentum: ${momentum.toFixed(2)})`);
  }

  /**
   * Setup collision detection
   */
  private setupCollisionDetection(): void {
    // Collision detection is handled by Rapier's event system
    // This would be connected to the physics world's contact events
    // For now, we set up a listener that can be called externally
    window.addEventListener('physics:collision', ((e: CustomEvent) => {
      const { bodyA, bodyB, impulse } = e.detail;
      
      // Check if either body is a ritual object
      for (const object of this.stateMachine.getAllObjects()) {
        if (object.rigidBody && (object.rigidBody.handle === bodyA || object.rigidBody.handle === bodyB)) {
          this.handleStrikeCollision(object.id, impulse);
        }
      }
    }) as EventListener);
  }

  // ============================================================================
  // P2-S2-05: BREATHE-SYNC Verb
  // ============================================================================

  /**
   * Execute BREATHE-SYNC verb
   */
  private executeBreathSync(objectId: string): void {
    const object = this.stateMachine.getObject(objectId);
    if (!object) return;

    const state: BreathSyncState = {
      objectId,
      coherenceCycles: 0,
      lastBreathPhase: 0,
      isAttuned: false,
      attunementProgress: 0,
      baseScale: object.scale,
    };

    this.breathSyncStates.set(objectId, state);

    console.log(`[BREATHE-SYNC] Started for ${objectId}`);
  }

  /**
   * Update breath sync from PIP data
   */
  updateBreathSync(pipData: PIPData): void {
    for (const [objectId, state] of this.breathSyncStates) {
      const object = this.stateMachine.getObject(objectId);
      if (!object || !object.collider) continue;

      // Check coherence threshold
      if (pipData.coherence >= VERB_CONFIG.BREATHE_SYNC.coherenceThreshold) {
        // Track breath cycles
        if (pipData.breathPhase < 0.1 && state.lastBreathPhase > 0.9) {
          // New cycle started
          state.coherenceCycles++;
          
          // Update progress
          state.attunementProgress = Math.min(
            1,
            state.coherenceCycles / VERB_CONFIG.BREATHE_SYNC.requiredCycles
          );

          console.log(`[BREATHE-SYNC] ${objectId} cycle ${state.coherenceCycles}/${VERB_CONFIG.BREATHE_SYNC.requiredCycles}`);

          // Check for attunement
          if (state.coherenceCycles >= VERB_CONFIG.BREATHE_SYNC.requiredCycles && !state.isAttuned) {
            state.isAttuned = true;
            window.dispatchEvent(
              new CustomEvent('breath:attune', {
                detail: { objectId, cycles: state.coherenceCycles },
              })
            );
          }
        }
      }

      state.lastBreathPhase = pipData.breathPhase;

      // Scale collider based on breath phase (even before full attunement)
      if (state.isAttuned) {
        const minScale = VERB_CONFIG.BREATHE_SYNC.minScale;
        const maxScale = VERB_CONFIG.BREATHE_SYNC.maxScale;
        const scale = minScale + (maxScale - minScale) * pipData.breathPhase;
        
        // Apply scale to collider
        const newScale = state.baseScale * scale;
        object.collider.setScale(newScale);
        object.scale = newScale;
      }
    }
  }

  /**
   * End breath sync
   */
  private endBreathSync(objectId: string): void {
    const state = this.breathSyncStates.get(objectId);
    if (!state) return;

    const object = this.stateMachine.getObject(objectId);
    if (object?.collider) {
      // Reset scale
      object.collider.setScale(state.baseScale);
      object.scale = state.baseScale;
    }

    this.breathSyncStates.delete(objectId);
    console.log(`[BREATHE-SYNC] Ended for ${objectId}`);
  }

  // ============================================================================
  // P2-S2-06: REST Verb
  // ============================================================================

  /**
   * Execute REST verb - transition to Fixed
   */
  private executeRest(objectId: string): void {
    const object = this.stateMachine.getObject(objectId);
    if (!object) return;

    // Transition to Awakened (which becomes Fixed after rest timeout)
    this.stateMachine.transitionObject(objectId, 'Awakened');

    console.log(`[REST] Initiated for ${objectId}`);
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * P2-S2-19: Enforce velocity cap at 50.0
   */
  private enforceVelocityCap(object: RitualObject): void {
    if (!object.rigidBody) return;

    const maxVelocity = VERB_CONFIG.THROW.maxVelocity;
    const velocity = object.rigidBody.linvel();
    const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2);

    if (speed > maxVelocity) {
      const scale = maxVelocity / speed;
      object.rigidBody.setLinvel(
        { x: velocity.x * scale, y: velocity.y * scale, z: velocity.z * scale },
        true
      );
    }
  }

  /**
   * Get current verb state
   */
  getVerbState(): VerbState {
    return { ...this.verbState };
  }

  /**
   * Get inventory state
   */
  getInventory(): InventoryState {
    return { ...this.inventory };
  }

  /**
   * Get grasped objects
   */
  getGraspedObjects(): string[] {
    return [...this.inventory.graspedObjects];
  }

  /**
   * Check if object is being grasped
   */
  isGrasped(objectId: string): boolean {
    return this.inventory.graspedObjects.includes(objectId);
  }

  /**
   * Get last strike outcome for an object
   */
  getLastStrikeMomentum(objectId: string): number | undefined {
    return this.lastCollisionMomentum.get(objectId);
  }

  /**
   * Update loop
   */
  update(vesselPosition: THREE.Vector3, pipData?: PIPData): void {
    // Update breath sync if active
    if (pipData && this.breathSyncStates.size > 0) {
      this.updateBreathSync(pipData);
    }

    // Update grasp tracking
    if (this.graspState && this.verbState.current === 'GRASP') {
      // Check if object is still valid
      const object = this.stateMachine.getObject(this.graspState.objectId);
      if (!object) {
        this.deactivateVerb();
      }
    }
  }
}
