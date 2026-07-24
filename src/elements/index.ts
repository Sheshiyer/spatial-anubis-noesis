/**
 * Elements Module
 * P2-S3-10: Elemental affinity resonance system
 */

// Resonance system
export {
  ELEMENTS,
  RESONANCE_MATRIX,
  getElementInteraction,
  hasSpecialResonance,
  calculateResonanceForce,
  ElementAffinityCalculator,
  ElementTagSystem,
  createElementAffinityCalculator,
  createElementTagSystem,
  ALL_ELEMENTS,
  isValidElement,
} from './resonance';

// Types
export type {
  ElementType,
  ResonanceType,
  ElementInteraction,
  ElementAffinityMatrix,
  ElementProperties,
  ElementTag,
  ResonanceEvent,
} from './types';
