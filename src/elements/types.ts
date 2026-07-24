/**
 * Elemental Affinity Types
 * P2-S3-10: Elemental affinity resonance table
 */

/** Elemental types */
export type ElementType = 'fire' | 'water' | 'earth' | 'air' | 'void';

/** Resonance outcome types */
export type ResonanceType =
  | 'amplify'
  | 'dissonance'
  | 'ground'
  | 'lift'
  | 'forge_resonance'
  | 'neutral';

/** Element interaction result */
export interface ElementInteraction {
  /** Type of resonance */
  resonanceType: ResonanceType;
  /** Physics force modifier */
  forceModifier: number;
  /** Visual effect type */
  visualEffect: string;
  /** Description of interaction */
  description: string;
}

/** Elemental affinity matrix (5x5) */
export type ElementAffinityMatrix = Record<
  ElementType,
  Record<ElementType, ElementInteraction>
>;

/** Element properties */
export interface ElementProperties {
  type: ElementType;
  color: string;
  symbol: string;
  description: string;
  primaryAttribute: string;
}

/** Element tag on objects */
export interface ElementTag {
  element: ElementType;
  strength: number; // 0-1
  modifiers: string[];
}

/** Resonance event */
export interface ResonanceEvent {
  elementA: ElementType;
  elementB: ElementType;
  sourceId: string;
  targetId: string;
  result: ElementInteraction;
  timestamp: number;
}
