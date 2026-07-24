/**
 * Event System Types
 * P2-S3-09: Collision event system
 */

/** Collision event types */
export type CollisionEventType =
  | 'proximity_wake'
  | 'ritual_activation'
  | 'zone_transition'
  | 'resonance_check'
  | 'settle';

/** Base collision event */
export interface CollisionEvent {
  type: CollisionEventType;
  timestamp: number;
  sourceId: string;
  targetId: string;
}

/** Proximity wake event */
export interface ProximityWakeEvent extends CollisionEvent {
  type: 'proximity_wake';
  distance: number;
  wakeRadius: number;
  sourcePosition: { x: number; y: number; z: number };
  targetPosition: { x: number; y: number; z: number };
}

/** Ritual activation event */
export interface RitualActivationEvent extends CollisionEvent {
  type: 'ritual_activation';
  ritualType: string;
  activationStrength: number;
  participants: string[];
}

/** Zone transition event */
export interface ZoneTransitionEvent extends CollisionEvent {
  type: 'zone_transition';
  fromZone: string;
  toZone: string;
  transitionProgress: number;
}

/** Resonance check event */
export interface ResonanceCheckEvent extends CollisionEvent {
  type: 'resonance_check';
  elementA: string;
  elementB: string;
  resonanceType: string;
  resonanceModifier: number;
}

/** Settle event */
export interface SettleEvent extends CollisionEvent {
  type: 'settle';
  settlePosition: { x: number; y: number; z: number };
  velocityAtRest: number;
  restDuration: number;
}

/** Union of all collision events */
export type AnyCollisionEvent =
  | ProximityWakeEvent
  | RitualActivationEvent
  | ZoneTransitionEvent
  | ResonanceCheckEvent
  | SettleEvent;

/** Event listener type */
export type CollisionEventListener<T extends AnyCollisionEvent = AnyCollisionEvent> = (
  event: T
) => void;

/** Event bus configuration */
export interface EventBusConfig {
  /** Max listeners per event type */
  maxListeners: number;
  /** Enable event history tracking */
  trackHistory: boolean;
  /** Max history size */
  maxHistorySize: number;
}

/** Default event bus config */
export const DEFAULT_EVENT_BUS_CONFIG: EventBusConfig = {
  maxListeners: 50,
  trackHistory: true,
  maxHistorySize: 1000,
};
