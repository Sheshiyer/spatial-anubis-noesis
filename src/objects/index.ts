/**
 * Objects Module
 * P2-S2: Object State Machine & Visual Effects
 * 
 * Exports all object-related systems
 */

// State Machine
export {
  ObjectStateMachine,
  getObjectStateMachine,
  resetObjectStateMachine,
} from './ObjectStateMachine';
export type { StateMachineCallbacks } from './ObjectStateMachine';

// Visual Effects
export {
  VisualEffectsManager,
  ELEMENT_COLORS,
  DEFAULT_EFFECT_CONFIG,
} from './VisualEffects';
export type { EffectConfig } from './VisualEffects';

// Factory
export {
  RitualObjectFactory,
  getRitualObjectFactory,
  OBJECT_TEMPLATES,
  ZONE_CONFIGS,
} from './RitualObjectFactory';
export type { ObjectTemplate, ZoneConfig, ZoneObjectPlacement } from './RitualObjectFactory';
