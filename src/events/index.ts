/**
 * Events Module
 * P2-S3-09: Collision event system
 */

// Event Bus
export {
  CollisionEventBus,
  createEventBus,
  getGlobalEventBus,
  resetGlobalEventBus,
} from './EventBus';

// Collision Handlers
export {
  createProximityWakeSystem,
  createRitualActivationHandler,
  createZoneTransitionHandler,
  createResonanceCheckHandler,
  createSettleHandler,
  createCollisionHandlers,
} from './collisionHandlers';

// Types
export type {
  CollisionEventType,
  CollisionEvent,
  ProximityWakeEvent,
  RitualActivationEvent,
  ZoneTransitionEvent,
  ResonanceCheckEvent,
  SettleEvent,
  AnyCollisionEvent,
  CollisionEventListener,
  EventBusConfig,
} from './types';

export { DEFAULT_EVENT_BUS_CONFIG } from './types';

// React hooks
export { useCollisionEvents, useProximityWake, useZoneTransition } from './useEvents';
