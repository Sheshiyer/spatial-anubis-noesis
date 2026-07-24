/**
 * Collision Event Handlers
 * P2-S3-09: Rapier contact callbacks with typed payloads
 */

import { type RAPIER } from '../physics';
import { CollisionEventBus } from './EventBus';
import {
  type ProximityWakeEvent,
  type RitualActivationEvent,
  type ZoneTransitionEvent,
  type ResonanceCheckEvent,
  type SettleEvent,
} from './types';

/** Proximity wake handler configuration */
export interface ProximityWakeConfig {
  wakeRadius: number;
  sleepRadius: number;
  onWake?: (event: ProximityWakeEvent) => void;
  onSleep?: (sourceId: string) => void;
}

/** Create proximity wake system */
export function createProximityWakeSystem(
  eventBus: CollisionEventBus,
  config: ProximityWakeConfig
) {
  const wakeStates = new Map<string, boolean>();

  return {
    checkProximity(
      sourceId: string,
      targetId: string,
      distance: number,
      sourcePos: { x: number; y: number; z: number },
      targetPos: { x: number; y: number; z: number }
    ): void {
      const isAwake = wakeStates.get(targetId) ?? false;

      if (distance < config.wakeRadius && !isAwake) {
        wakeStates.set(targetId, true);
        
        const event: ProximityWakeEvent = {
          type: 'proximity_wake',
          timestamp: Date.now(),
          sourceId,
          targetId,
          distance,
          wakeRadius: config.wakeRadius,
          sourcePosition: sourcePos,
          targetPosition: targetPos,
        };

        eventBus.emit(event);
        config.onWake?.(event);
      } else if (distance > config.sleepRadius && isAwake) {
        wakeStates.set(targetId, false);
        config.onSleep?.(targetId);
      }
    },

    isAwake(targetId: string): boolean {
      return wakeStates.get(targetId) ?? false;
    },

    reset(): void {
      wakeStates.clear();
    },
  };
}

/** Ritual activation handler */
export function createRitualActivationHandler(eventBus: CollisionEventBus) {
  return {
    activate(
      sourceId: string,
      targetId: string,
      ritualType: string,
      activationStrength: number,
      participants: string[]
    ): void {
      const event: RitualActivationEvent = {
        type: 'ritual_activation',
        timestamp: Date.now(),
        sourceId,
        targetId,
        ritualType,
        activationStrength,
        participants,
      };

      eventBus.emit(event);
    },
  };
}

/** Zone transition handler */
export function createZoneTransitionHandler(eventBus: CollisionEventBus) {
  const activeTransitions = new Map<string, { from: string; to: string; startTime: number }>();

  return {
    startTransition(sourceId: string, fromZone: string, toZone: string): void {
      activeTransitions.set(sourceId, { from: fromZone, to: toZone, startTime: Date.now() });
    },

    updateTransition(sourceId: string, progress: number): void {
      const transition = activeTransitions.get(sourceId);
      if (!transition) return;

      const event: ZoneTransitionEvent = {
        type: 'zone_transition',
        timestamp: Date.now(),
        sourceId,
        targetId: sourceId,
        fromZone: transition.from,
        toZone: transition.to,
        transitionProgress: progress,
      };

      eventBus.emit(event);
    },

    endTransition(sourceId: string): void {
      activeTransitions.delete(sourceId);
    },

    isTransitioning(sourceId: string): boolean {
      return activeTransitions.has(sourceId);
    },
  };
}

/** Resonance check handler */
export function createResonanceCheckHandler(eventBus: CollisionEventBus) {
  return {
    checkResonance(
      sourceId: string,
      targetId: string,
      elementA: string,
      elementB: string,
      resonanceType: string,
      resonanceModifier: number
    ): void {
      const event: ResonanceCheckEvent = {
        type: 'resonance_check',
        timestamp: Date.now(),
        sourceId,
        targetId,
        elementA,
        elementB,
        resonanceType,
        resonanceModifier,
      };

      eventBus.emit(event);
    },
  };
}

/** Settle handler */
export function createSettleHandler(eventBus: CollisionEventBus) {
  const settlingBodies = new Map<string, { startTime: number; lastPosition: { x: number; y: number; z: number } }>();

  return {
    checkSettle(
      bodyId: string,
      body: RAPIER.RigidBody,
      velocityThreshold = 0.1,
      settleDuration = 2000
    ): void {
      const velocity = body.linvel();
      const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2);
      const position = body.translation();

      if (speed < velocityThreshold) {
        const settling = settlingBodies.get(bodyId);
        
        if (!settling) {
          settlingBodies.set(bodyId, { startTime: Date.now(), lastPosition: position });
        } else {
          const elapsed = Date.now() - settling.startTime;
          
          if (elapsed >= settleDuration) {
            const event: SettleEvent = {
              type: 'settle',
              timestamp: Date.now(),
              sourceId: bodyId,
              targetId: bodyId,
              settlePosition: position,
              velocityAtRest: speed,
              restDuration: elapsed / 1000,
            };

            eventBus.emit(event);
            settlingBodies.delete(bodyId);
          }
        }
      } else {
        settlingBodies.delete(bodyId);
      }
    },

    isSettling(bodyId: string): boolean {
      return settlingBodies.has(bodyId);
    },

    reset(): void {
      settlingBodies.clear();
    },
  };
}

/** Create all collision handlers */
export function createCollisionHandlers(eventBus: CollisionEventBus, proximityConfig: ProximityWakeConfig) {
  return {
    proximity: createProximityWakeSystem(eventBus, proximityConfig),
    ritual: createRitualActivationHandler(eventBus),
    zone: createZoneTransitionHandler(eventBus),
    resonance: createResonanceCheckHandler(eventBus),
    settle: createSettleHandler(eventBus),
  };
}
