/**
 * Engines Module — Core Types
 * All divination engine types and shared interfaces
 */

import type { 
  BiorhythmData, 
  GeneKeysProfile, 
  HDProfile, 
  ChronobiologyData 
} from './tier2/types';
import type { 
  DecisionMirrorState, 
  CelestialSphereData, 
  SomaticCanticleData 
} from './tier3/types';

// ============================================================================
// Engine Registry
// ============================================================================

/** All available engine IDs */
export type EngineId = 
  // Tier 1 - Ancient Instruments
  | 'vimshottari' 
  | 'nadi' 
  | 'kp_system' 
  | 'sounds_of_sirius'
  // Tier 2 - Biological Mirrors
  | 'biorhythm'
  | 'gene_keys'
  | 'human_design'
  | 'chronobiology'
  // Tier 3 - Synthesis Instruments
  | 'decision_mirror'
  | 'transit_overlay'
  | 'somatic_canticle';

/** Engine metadata */
export interface EngineMetadata {
  id: EngineId;
  name: string;
  tier: 1 | 2 | 3;
  description: string;
  requiresPIP: boolean;
  unlockRequirement: string;
  spatialPosition?: [number, number, number];
}

/** Complete engine registry */
export const ENGINE_REGISTRY: Record<EngineId, EngineMetadata> = {
  // Tier 1
  vimshottari: {
    id: 'vimshottari',
    name: 'Vimshottari Dasha',
    tier: 1,
    description: '120-year planetary cycle calculator',
    requiresPIP: false,
    unlockRequirement: 'Available on entry',
  },
  nadi: {
    id: 'nadi',
    name: 'Nadi Shodhana',
    tier: 1,
    description: 'Breath pattern oracle',
    requiresPIP: false,
    unlockRequirement: 'Available on entry',
  },
  kp_system: {
    id: 'kp_system',
    name: 'KP System',
    tier: 1,
    description: 'Krishnamurti Paddhati astrological',
    requiresPIP: false,
    unlockRequirement: 'Available on entry',
  },
  sounds_of_sirius: {
    id: 'sounds_of_sirius',
    name: 'Sounds of Sirius',
    tier: 1,
    description: 'Celestial sound engine',
    requiresPIP: false,
    unlockRequirement: 'Available on entry',
  },
  // Tier 2
  biorhythm: {
    id: 'biorhythm',
    name: 'Biorhythm Compass',
    tier: 2,
    description: 'Translucent pulsing sphere with three sine wave ribbons',
    requiresPIP: true,
    unlockRequirement: 'Active PIP connection',
    spatialPosition: [10, 2, 0],
  },
  gene_keys: {
    id: 'gene_keys',
    name: 'Gene Keys Helix',
    tier: 2,
    description: 'Rotating DNA double helix with 64 luminous nodes',
    requiresPIP: true,
    unlockRequirement: 'Active PIP connection',
    spatialPosition: [0, 2, 10],
  },
  human_design: {
    id: 'human_design',
    name: 'Human Design Bodygraph',
    tier: 2,
    description: '9-center wireframe constellation',
    requiresPIP: true,
    unlockRequirement: 'Active PIP connection',
    spatialPosition: [-10, 2, 0],
  },
  chronobiology: {
    id: 'chronobiology',
    name: 'Chronobiology Clock',
    tier: 2,
    description: 'Circular clock face with circadian zones',
    requiresPIP: true,
    unlockRequirement: 'Active PIP connection',
    spatialPosition: [0, 2, -10],
  },
  // Tier 3
  decision_mirror: {
    id: 'decision_mirror',
    name: 'Decision Mirror',
    tier: 3,
    description: 'Obsidian tablet with reflective surface and multi-engine convergence',
    requiresPIP: true,
    unlockRequirement: '2+ Tier 2 engines unlocked',
    spatialPosition: [15, 3, 0],
  },
  transit_overlay: {
    id: 'transit_overlay',
    name: 'Transit Overlay',
    tier: 3,
    description: 'Celestial sphere with natal and transit rings',
    requiresPIP: true,
    unlockRequirement: '2+ Tier 2 engines unlocked',
    spatialPosition: [-7.5, 3, 13],
  },
  somatic_canticle: {
    id: 'somatic_canticle',
    name: 'Somatic Canticle Index',
    tier: 3,
    description: 'Bio-gated content release scroll',
    requiresPIP: true,
    unlockRequirement: '2+ Tier 2 engines unlocked',
    spatialPosition: [-7.5, 3, -13],
  },
};

// ============================================================================
// Engine Data Types
// ============================================================================

/** Union of all engine data types */
export type EngineData = 
  | BiorhythmData
  | GeneKeysProfile
  | HDProfile
  | ChronobiologyData
  | DecisionMirrorState
  | CelestialSphereData
  | SomaticCanticleData;

/** Engine state wrapper */
export interface EngineState<T extends EngineData = EngineData> {
  /** Engine ID */
  engineId: EngineId;
  /** Current data */
  data: T | null;
  /** Last update timestamp */
  lastUpdate: number;
  /** Is data loading */
  isLoading: boolean;
  /** Error if any */
  error: string | null;
  /** Engine is unlocked */
  isUnlocked: boolean;
  /** Unlock progress (0-1) */
  unlockProgress: number;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/** Base API request */
export interface EngineApiRequest {
  /** Birth date (ISO format) */
  birthDate?: string;
  /** Birth time (HH:MM) */
  birthTime?: string;
  /** Birth location */
  birthLocation?: string;
  /** Current PIP data */
  pipData?: {
    coherence: number;
    hrv: number;
    breathPhase: number;
    timestamp: number;
  };
}

/** Base API response */
export interface EngineApiResponse<T = unknown> {
  /** Success flag */
  success: boolean;
  /** Response data */
  data?: T;
  /** Error message */
  error?: string;
  /** Server timestamp */
  timestamp: string;
}

/** Biorhythm API request */
export interface BiorhythmApiRequest extends EngineApiRequest {
  /** Scrub offset in days */
  scrubOffset?: number;
}

/** Gene Keys API request */
export interface GeneKeysApiRequest extends EngineApiRequest {
  /** Specific Gene Key to query */
  specificKey?: number;
}

/** Human Design API request */
export interface HumanDesignApiRequest extends EngineApiRequest {
  /** Query specific center */
  center?: string;
}

/** Chronobiology API request */
export interface ChronobiologyApiRequest extends EngineApiRequest {
  /** Device timezone */
  timezone?: string;
  /** Override current time (for testing) */
  overrideTime?: string;
}

/** Transit API request */
export interface TransitApiRequest extends EngineApiRequest {
  /** Date for transit calculation */
  transitDate?: string;
  /** Time for transit calculation */
  transitTime?: string;
}

/** Somatic Canticle API request */
export interface SomaticCanticleApiRequest extends EngineApiRequest {
  /** Current coherence level */
  currentCoherence: number;
  /** Requested section */
  sectionId?: string;
}

// ============================================================================
// Engine Manager Types
// ============================================================================

/** Engine manager state */
export interface EngineManagerState {
  /** All engine states */
  engines: Record<EngineId, EngineState>;
  /** Currently active engine */
  activeEngine: EngineId | null;
  /** Tier 2 unlock progress */
  tier2Progress: {
    unlocked: number;
    total: number;
  };
  /** Tier 3 unlock progress */
  tier3Progress: {
    unlocked: number;
    total: number;
  };
  /** Global convergence score */
  globalConvergence: number;
}

/** Engine manager actions */
export interface EngineManagerActions {
  /** Unlock an engine */
  unlockEngine: (engineId: EngineId) => Promise<void>;
  /** Refresh engine data */
  refreshEngine: (engineId: EngineId) => Promise<void>;
  /** Set active engine */
  setActiveEngine: (engineId: EngineId | null) => void;
  /** Check unlock requirements */
  checkUnlockRequirements: () => void;
  /** Get convergence analysis */
  getConvergenceAnalysis: () => Promise<{
    score: number;
    themes: string[];
  }>;
}

// ============================================================================
// Visualization Types
// ============================================================================

/** 3D visualization configuration */
export interface EngineVisualizationConfig {
  /** Position in world space */
  position: [number, number, number];
  /** Rotation */
  rotation: [number, number, number];
  /** Scale */
  scale: number;
  /** Visibility */
  visible: boolean;
  /** Opacity */
  opacity: number;
  /** Glow intensity */
  glowIntensity: number;
}

/** Engine artifact visual state */
export interface EngineArtifactState {
  /** Current visual configuration */
  visual: EngineVisualizationConfig;
  /** Animation state */
  animation: {
    isAnimating: boolean;
    animationType: string | null;
    progress: number;
  };
  /** Interaction state */
  interaction: {
    isHovered: boolean;
    isSelected: boolean;
    isDragged: boolean;
  };
}

// ============================================================================
// Event Types
// ============================================================================

/** Engine event types */
export type EngineEventType = 
  | 'data_updated'
  | 'unlocked'
  | 'unlocking'
  | 'interaction'
  | 'error'
  | 'convergence_calculated';

/** Engine event payload */
export interface EngineEvent {
  type: EngineEventType;
  engineId: EngineId;
  timestamp: number;
  payload?: unknown;
}

/** Engine event listener */
export type EngineEventListener = (event: EngineEvent) => void;
