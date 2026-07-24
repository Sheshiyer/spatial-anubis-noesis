/**
 * Object State Machine
 * P2-S2-08: Object FSM with validated transitions
 * P2-S2-09: Proximity wake system
 * P2-S2-11: RigidBody type transitions
 * P2-S2-12: Sleep/wake policy
 */

import type RAPIER from '@dimforge/rapier3d-compat';
import type { Vector3 } from 'three';
import {
  type ObjectState,
  type StateTransition,
  type RitualObject,
  type ObjectStateConfig,
  VALID_TRANSITIONS,
  STATE_TO_BODY_TYPE,
  DEFAULT_STATE_CONFIG,
} from '../verbs/types';
import { getRapier, getPhysicsWorld } from '../physics/rapier';

export interface StateMachineCallbacks {
  onStateChange?: (object: RitualObject, from: ObjectState, to: ObjectState) => void;
  onWake?: (object: RitualObject) => void;
  onSleep?: (object: RitualObject) => void;
}

export class ObjectStateMachine {
  private config: ObjectStateConfig;
  private callbacks: StateMachineCallbacks;
  private objects: Map<string, RitualObject> = new Map();
  private lastProximityCheck: number = 0;
  private readonly PROXIMITY_CHECK_INTERVAL = 100; // ms

  constructor(
    config: Partial<ObjectStateConfig> = {},
    callbacks: StateMachineCallbacks = {}
  ) {
    this.config = { ...DEFAULT_STATE_CONFIG, ...config };
    this.callbacks = callbacks;
  }

  /**
   * Register a ritual object with the state machine
   */
  registerObject(object: RitualObject): void {
    this.objects.set(object.id, object);
    
    // Initialize state
    if (object.state !== 'Dormant') {
      this.transitionObject(object.id, object.state);
    }
  }

  /**
   * Unregister an object
   */
  unregisterObject(objectId: string): void {
    this.objects.delete(objectId);
  }

  /**
   * Get an object by ID
   */
  getObject(objectId: string): RitualObject | undefined {
    return this.objects.get(objectId);
  }

  /**
   * Get all registered objects
   */
  getAllObjects(): RitualObject[] {
    return Array.from(this.objects.values());
  }

  /**
   * Get objects by state
   */
  getObjectsByState(state: ObjectState): RitualObject[] {
    return this.getAllObjects().filter((obj) => obj.state === state);
  }

  /**
   * Check if a state transition is valid
   */
  isValidTransition(from: ObjectState, to: ObjectState): boolean {
    const validTargets = VALID_TRANSITIONS[from];
    return validTargets.includes(to);
  }

  /**
   * Transition an object to a new state
   */
  transitionObject(objectId: string, newState: ObjectState): boolean {
    const object = this.objects.get(objectId);
    if (!object) {
      console.warn(`[ObjectStateMachine] Object ${objectId} not found`);
      return false;
    }

    const currentState = object.state;

    // Check if transition is valid
    if (!this.isValidTransition(currentState, newState)) {
      console.warn(
        `[ObjectStateMachine] Invalid transition: ${currentState} -> ${newState}`
      );
      return false;
    }

    // Record transition
    const transition: StateTransition = {
      from: currentState,
      to: newState,
      trigger: this.inferTrigger(currentState, newState),
      timestamp: performance.now(),
    };
    object.stateTransitions.push(transition);

    // Update state
    object.state = newState;
    object.lastActiveTime = performance.now();

    // Apply RigidBody type change
    this.updateRigidBodyType(object, newState);

    // Trigger callback
    this.callbacks.onStateChange?.(object, currentState, newState);

    // Dispatch event
    this.dispatchStateChangeEvent(objectId, currentState, newState);

    console.log(`[ObjectStateMachine] ${objectId}: ${currentState} -> ${newState}`);
    return true;
  }

  /**
   * Update the RigidBody type based on state
   */
  private updateRigidBodyType(object: RitualObject, state: ObjectState): void {
    if (!object.rigidBody) return;

    const RAPIER = getRapier();
    const targetType = STATE_TO_BODY_TYPE[state];

    // Rapier doesn't allow changing body type directly, we need to recreate
    // For now, we'll use the setBodyType if available or recreate
    try {
      // @ts-expect-error - Rapier API may vary
      if (object.rigidBody.setBodyType) {
        // @ts-expect-error
        object.rigidBody.setBodyType(RAPIER.RigidBodyType[targetType]);
      }
      
      // Additional state-specific configuration
      switch (state) {
        case 'Dormant':
          object.rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, false);
          object.rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, false);
          object.rigidBody.sleep();
          break;
        case 'Awakened':
          object.rigidBody.wakeUp();
          break;
        case 'Active':
          object.rigidBody.wakeUp();
          // Enable CCD for active objects
          if (object.ccdEnabled) {
            for (let i = 0; i < object.rigidBody.numColliders(); i++) {
              const collider = object.rigidBody.collider(i);
              collider.setCcdEnabled(true);
            }
          }
          break;
        case 'Ritual':
          object.rigidBody.wakeUp();
          break;
        case 'Integrated':
          object.rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, false);
          object.rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, false);
          break;
      }
    } catch (error) {
      console.error('[ObjectStateMachine] Failed to update RigidBody type:', error);
    }
  }

  /**
   * Infer the trigger type from state transition
   */
  private inferTrigger(from: ObjectState, to: ObjectState): StateTransition['trigger'] {
    if (from === 'Dormant' && to === 'Awakened') return 'proximity';
    if (from === 'Awakened' && to === 'Dormant') return 'distance';
    if (to === 'Active') return 'grasp';
    if (from === 'Active' && to === 'Awakened') return 'release';
    if (to === 'Ritual') return 'ritual';
    if (to === 'Integrated') return 'integrate';
    if (to === 'Dormant') return 'rest';
    return 'proximity';
  }

  /**
   * Update proximity checks for all dormant objects
   * P2-S2-09: Proximity wake system
   * P2-S2-12: Sleep/wake policy
   */
  updateProximity(vesselPosition: Vector3): void {
    const now = performance.now();
    
    // Throttle proximity checks
    if (now - this.lastProximityCheck < this.PROXIMITY_CHECK_INTERVAL) {
      return;
    }
    this.lastProximityCheck = now;

    for (const object of this.objects.values()) {
      const distance = this.calculateDistance(object.position, vesselPosition);

      switch (object.state) {
        case 'Dormant':
          // <10u: Dormant → Awakened
          if (distance < this.config.awakenDistance) {
            this.transitionObject(object.id, 'Awakened');
            this.callbacks.onWake?.(object);
          }
          break;

        case 'Awakened':
          // >15u: revert to Dormant
          if (distance > this.config.awakenDistance + 5) {
            this.transitionObject(object.id, 'Dormant');
            this.callbacks.onSleep?.(object);
          }
          break;

        case 'Active':
          // Active objects check for rest condition
          this.checkRestCondition(object);
          break;
      }

      // Sleep/wake policy: >20u sleep, <10u wake
      if (object.rigidBody) {
        if (distance > this.config.dormantDistance && !object.rigidBody.isSleeping()) {
          object.rigidBody.sleep();
        } else if (distance < this.config.awakenDistance && object.rigidBody.isSleeping()) {
          object.rigidBody.wakeUp();
        }
      }
    }
  }

  /**
   * Check if an object should transition to REST state
   */
  private checkRestCondition(object: RitualObject): void {
    if (!object.rigidBody) return;

    const velocity = object.rigidBody.linvel();
    const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2);

    if (speed < this.config.sleepVelocityThreshold) {
      if (!object.restStartTime) {
        object.restStartTime = performance.now();
      } else if (performance.now() - object.restStartTime > this.config.restTimeoutMs) {
        // Transition to Awakened (rested but still awake)
        this.transitionObject(object.id, 'Awakened');
        object.restStartTime = null;
        
        // Dispatch rest event
        window.dispatchEvent(
          new CustomEvent('rest:enter', { detail: { objectId: object.id } })
        );
      }
    } else {
      object.restStartTime = null;
    }
  }

  /**
   * Force wake an object (e.g., for interaction)
   */
  wakeObject(objectId: string): void {
    const object = this.objects.get(objectId);
    if (!object) return;

    if (object.rigidBody?.isSleeping()) {
      object.rigidBody.wakeUp();
    }

    if (object.state === 'Dormant') {
      this.transitionObject(objectId, 'Awakened');
    }
  }

  /**
   * Force sleep an object
   */
  sleepObject(objectId: string): void {
    const object = this.objects.get(objectId);
    if (!object) return;

    object.rigidBody?.sleep();

    if (object.state !== 'Dormant' && object.state !== 'Integrated') {
      this.transitionObject(objectId, 'Dormant');
    }
  }

  /**
   * Calculate distance between object and vessel
   */
  private calculateDistance(objPos: Vector3, vesselPos: Vector3): number {
    const dx = objPos.x - vesselPos.x;
    const dy = objPos.y - vesselPos.y;
    const dz = objPos.z - vesselPos.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Dispatch state change event
   */
  private dispatchStateChangeEvent(
    objectId: string,
    from: ObjectState,
    to: ObjectState
  ): void {
    window.dispatchEvent(
      new CustomEvent('state:change', {
        detail: { objectId, from, to },
      })
    );
  }

  /**
   * Clean up all objects
   */
  dispose(): void {
    this.objects.clear();
  }
}

// Singleton instance for global access
let globalStateMachine: ObjectStateMachine | null = null;

export function getObjectStateMachine(): ObjectStateMachine {
  if (!globalStateMachine) {
    globalStateMachine = new ObjectStateMachine();
  }
  return globalStateMachine;
}

export function resetObjectStateMachine(): void {
  globalStateMachine?.dispose();
  globalStateMachine = new ObjectStateMachine();
}
