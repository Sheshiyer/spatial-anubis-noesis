/**
 * Engines module — 13 divination engine artifacts and interactions
 * 
 * Tier 1: Ancient Instruments (Vimshottari, Nadi, KP System, Sounds of Sirius)
 * Tier 2: Biological Mirrors (Biorhythm Compass, Gene Keys Helix, Human Design Bodygraph, Chronobiology Clock)
 * Tier 3: Synthesis Instruments (Decision Mirror, Transit Overlay, Somatic Canticle Index)
 * Meta-Engine: Field Journal & Constellation Tracking
 */

// ============================================================================
// Meta Engine (Existing)
// ============================================================================

export * from './meta';

// ============================================================================
// Core Types
// ============================================================================

export type {
  EngineId,
  EngineMetadata,
  EngineData,
  EngineState,
  EngineApiRequest,
  EngineApiResponse,
  EngineManagerState,
  EngineManagerActions,
  EngineVisualizationConfig,
  EngineArtifactState,
  EngineEvent,
  EngineEventType,
  EngineEventListener,
  BiorhythmApiRequest,
  GeneKeysApiRequest,
  HumanDesignApiRequest,
  ChronobiologyApiRequest,
  TransitApiRequest,
  SomaticCanticleApiRequest,
} from './types';

export { ENGINE_REGISTRY } from './types';

// ============================================================================
// Tier 2: Biological Mirrors
// ============================================================================

export * from './tier2';

// ============================================================================
// Tier 3: Synthesis Instruments
// ============================================================================

export * from './tier3';

// ============================================================================
// Engine Manager
// ============================================================================

export { 
  EngineManager, 
  createEngineManager 
} from './EngineManager';

// ============================================================================
// Cross-References
// ============================================================================

export {
  GATE_TO_GENE_KEY_MAP,
  getGeneKeyForGate,
  getGateForGeneKey,
  getRelatedGates,
  calculateTransitVimshottariCrossRef,
  getActiveCrossReferences,
  getCrossReferenceData,
  findHDGeneKeyConvergences,
} from './crossReferences';

// ============================================================================
// API Client
// ============================================================================

export {
  // Real API calls
  fetchBiorhythmData,
  fetchGeneKeysData,
  fetchHumanDesignData,
  fetchChronobiologyData,
  fetchTransitData,
  fetchSomaticCanticleData,
  fetchConvergenceAnalysis,
  // Mock API calls for development
  mockFetchBiorhythmData,
  mockFetchGeneKeysData,
  mockFetchHumanDesignData,
  mockFetchChronobiologyData,
} from './api';

// ============================================================================
// React Hooks
// ============================================================================

export {
  useEngines,
  useEngine,
  useUnlockAnimations,
  useEnginePIP,
} from './hooks';

// ============================================================================
// 3D Components
// ============================================================================

export {
  // Tier 2
  BiorhythmCompass,
  GeneKeysHelix,
  HumanDesignBodygraph,
  ChronobiologyClock,
  // Tier 3
  DecisionMirror,
  TransitOverlay,
  SomaticCanticle,
} from './components';
