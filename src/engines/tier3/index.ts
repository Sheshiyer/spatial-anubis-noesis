/**
 * Tier 3 Synthesis Instruments — Module Exports
 */

// Types
export type {
  Tier3UnlockState,
  Tier3Placement,
  ConvergenceTheme,
  MirrorSurfaceState,
  MirrorLayer,
  MirrorLayerData,
  ConvergenceScore,
  DecisionMirrorState,
  MirrorInteractionState,
  TransitPlanet,
  TransitAspect,
  CelestialSphereData,
  TransitInteractionState,
  CanticleScrollState,
  CanticleSection,
  SomaticCanticleData,
  BioGatedReleaseState,
  GateToGeneKeyMap,
  TransitVimshottariCrossRef,
  CrossReferenceData,
  Tier3EngineStates,
  Tier3UnlockRequirements,
} from './types';

// Constants
export { 
  ASPECT_COLORS,
  TIER3_SPATIAL_PLACEMENT,
  DEFAULT_TIER3_REQUIREMENTS,
} from './types';

// Engine 10: Decision Mirror
export { 
  DecisionMirrorEngine, 
  createDecisionMirrorEngine 
} from './DecisionMirrorEngine';

// Engine 11: Transit Overlay
export { 
  TransitOverlayEngine, 
  createTransitOverlayEngine 
} from './TransitOverlayEngine';

// Engine 12: Somatic Canticle Index
export { 
  SomaticCanticleEngine, 
  createSomaticCanticleEngine 
} from './SomaticCanticleEngine';
