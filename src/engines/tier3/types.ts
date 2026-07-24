/**
 * Tier 3 Synthesis Instruments — Type Definitions
 * P3-S2: Decision Mirror, Transit Overlay, Somatic Canticle Index
 */

import type { BiorhythmData } from '../tier2/types';

// ============================================================================
// Common Tier 3 Types
// ============================================================================

/** Tier 3 engine unlock states */
export type Tier3UnlockState = 'locked' | 'unlocking' | 'unlocked';

/** Spatial placement for Tier 3 engines */
export interface Tier3Placement {
  /** Radius from center (15 units) */
  radius: number;
  /** Angular position in degrees (120° spacing) */
  angle: number;
  /** World position */
  position: [number, number, number];
}

/** Convergence theme from multi-engine analysis */
export interface ConvergenceTheme {
  /** Theme name */
  name: string;
  /** Theme category */
  category: string;
  /** Contributing engines */
  sources: string[];
  /** Strength (0-100) */
  strength: number;
  /** Description */
  description: string;
}

// ============================================================================
// Engine 10: Decision Mirror (P3-S2-16 to 19)
// ============================================================================

/** Obsidian mirror surface state */
export interface MirrorSurfaceState {
  /** Reflectivity (0-1) */
  reflectivity: number;
  /** Surface turbulence */
  turbulence: number;
  /** Depth of surface effect */
  depth: number;
  /** Current shader uniforms */
  uniforms: {
    time: number;
    reflectivity: number;
    noiseScale: number;
    distortionStrength: number;
  };
}

/** Layer types in decision mirror */
export type MirrorLayer = 
  | 'biorhythm'
  | 'geneKeys'
  | 'humanDesign'
  | 'chronobiology'
  | 'transit'
  | 'vimshottari'
  | 'nadi';

/** Individual engine layer */
export interface MirrorLayerData {
  /** Layer type */
  type: MirrorLayer;
  /** Visibility */
  visible: boolean;
  /** Opacity (0-1) */
  opacity: number;
  /** Position offset from center */
  offset: [number, number, number];
  /** Scale */
  scale: number;
  /** Rotation */
  rotation: number;
  /** Data from source engine */
  data: unknown;
}

/** Convergence score calculation */
export interface ConvergenceScore {
  /** Overall convergence (0-100) */
  score: number;
  /** Contributing themes */
  themes: ConvergenceTheme[];
  /** Theme overlap percentage */
  overlapPercentage: number;
  /** Confidence level */
  confidence: number;
  /** Interpretation */
  interpretation: string;
}

/** Decision mirror state */
export interface DecisionMirrorState {
  /** Surface state */
  surface: MirrorSurfaceState;
  /** Active layers */
  layers: MirrorLayerData[];
  /** Convergence analysis */
  convergence: ConvergenceScore | null;
  /** Layer separation mode */
  separationMode: boolean;
  /** Currently dragged layer */
  draggedLayer: MirrorLayer | null;
}

/** Mirror interaction state */
export interface MirrorInteractionState {
  /** Hovering mirror */
  isHovering: boolean;
  /** Currently separating layers */
  isSeparating: boolean;
  /** Separation distance */
  separationDistance: number;
  /** Selected layer for comparison */
  selectedLayers: MirrorLayer[];
}

// ============================================================================
// Engine 11: Transit Overlay (P3-S2-20 to 23)
// ============================================================================

/** Planet positions in transit */
export interface TransitPlanet {
  /** Planet name */
  name: string;
  /** Natal position (degrees) */
  natalPosition: number;
  /** Current transit position (degrees) */
  transitPosition: number;
  /** Sign */
  sign: string;
  /** House */
  house: number;
  /** Is retrograde */
  retrograde: boolean;
}

/** Aspect between planets */
export interface TransitAspect {
  /** Planet 1 */
  planet1: string;
  /** Planet 2 */
  planet2: string;
  /** Aspect type */
  aspect: 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition';
  /** Orb in degrees */
  orb: number;
  /** Aspect quality */
  quality: 'harmonious' | 'challenging' | 'neutral';
  /** Color based on quality */
  color: string;
  /** Exactness (0-1, 1 = exact) */
  exactness: number;
}

/** Celestial sphere data */
export interface CelestialSphereData {
  /** Natal chart - inner ring */
  natal: {
    planets: TransitPlanet[];
    ascendant: number;
    mc: number;
    houses: number[];
  };
  /** Transit chart - outer ring */
  transit: {
    planets: TransitPlanet[];
    date: string;
    time: string;
  };
  /** Current aspects */
  aspects: TransitAspect[];
  /** Highlighted aspects */
  highlightedAspects: TransitAspect[];
}

/** Transit interaction state */
export interface TransitInteractionState {
  /** Currently scrubbing time */
  isScrubbing: boolean;
  /** Scrub date offset in days */
  scrubOffset: number;
  /** Selected planet */
  selectedPlanet: string | null;
  /** Showing aspects for */
  showingAspectsFor: string | null;
}

/** Aspect color mapping */
export const ASPECT_COLORS = {
  harmonious: '#D4AF37', // Gold - Aged Gold
  challenging: '#C65D3B', // Terracotta
  neutral: '#6B6B6B', // Stone Grey
} as const;

// ============================================================================
// Engine 12: Somatic Canticle Index (P3-S2-24 to 25)
// ============================================================================

/** Content scroll state */
export interface CanticleScrollState {
  /** Unfurl progress (0-1) */
  unfurlProgress: number;
  /** Currently reading section */
  currentSection: number;
  /** Total sections */
  totalSections: number;
  /** Bio-gating status */
  bioGated: boolean;
  /** Required coherence to unlock */
  requiredCoherence: number;
}

/** Canticle content section */
export interface CanticleSection {
  /** Section ID */
  id: string;
  /** Section title */
  title: string;
  /** Content text */
  content: string;
  /** Bio-state gate required */
  gateType: 'coherence' | 'breath_phase' | 'presence' | 'none';
  /** Threshold for unlocking */
  gateThreshold: number;
  /** Is unlocked */
  unlocked: boolean;
  /** Unlock timestamp */
  unlockedAt: number | null;
}

/** Somatic canticle data */
export interface SomaticCanticleData {
  /** Title of canticle */
  title: string;
  /** Generated from engines */
  sourceEngines: string[];
  /** All sections */
  sections: CanticleSection[];
  /** Current scroll state */
  scrollState: CanticleScrollState;
  /** Personalized insights */
  insights: string[];
}

/** Bio-gated release state */
export interface BioGatedReleaseState {
  /** Current coherence level */
  currentCoherence: number;
  /** Required coherence */
  requiredCoherence: number;
  /** Progress toward unlock */
  unlockProgress: number;
  /** Currently unlocking */
  isUnlocking: boolean;
  /** Section being unlocked */
  unlockingSection: string | null;
}

// ============================================================================
// Cross-Engine References (P3-S2-27, 28)
// ============================================================================

/** HD Gate to Gene Key mapping */
export interface GateToGeneKeyMap {
  /** Human Design gate number (1-64) */
  gate: number;
  /** Corresponding Gene Key number (1-64) */
  geneKey: number;
  /** I Ching hexagram */
  iching: string;
  /** Keyword */
  keyword: string;
}

/** Transit to Vimshottari cross-reference */
export interface TransitVimshottariCrossRef {
  /** Transit planet */
  transitPlanet: string;
  /** Current Vimshottari dasha lord */
  dashaLord: string;
  /** Relationship interpretation */
  interpretation: string;
  /** Convergence strength (0-100) */
  convergence: number;
}

/** Cross-reference data structure */
export interface CrossReferenceData {
  /** Gate to Gene Key mappings */
  gateGeneKeyMap: GateToGeneKeyMap[];
  /** Transit-Vimshottari cross-references */
  transitVimshottariRefs: TransitVimshottariCrossRef[];
  /** Active convergences */
  activeConvergences: ConvergenceTheme[];
}

// ============================================================================
// Tier 3 Infrastructure
// ============================================================================

/** Tier 3 engine states */
export interface Tier3EngineStates {
  decisionMirror: { unlocked: boolean; unlockProgress: number };
  transitOverlay: { unlocked: boolean; unlockProgress: number };
  somaticCanticle: { unlocked: boolean; unlockProgress: number };
}

/** Tier 3 unlock requirements */
export interface Tier3UnlockRequirements {
  /** Minimum Tier 2 engines unlocked */
  minTier2Engines: number;
  /** Requires Tier 2 synthesis data */
  requiresTier2Data: boolean;
  /** Minimum session coherence average */
  minSessionCoherence: number;
}

export const TIER3_SPATIAL_PLACEMENT: Tier3Placement[] = [
  { radius: 15, angle: 0, position: [15, 3, 0] },      // Decision Mirror
  { radius: 15, angle: 120, position: [-7.5, 3, 13] }, // Transit Overlay
  { radius: 15, angle: 240, position: [-7.5, 3, -13] }, // Somatic Canticle
];

export const DEFAULT_TIER3_REQUIREMENTS: Tier3UnlockRequirements = {
  minTier2Engines: 2,
  requiresTier2Data: true,
  minSessionCoherence: 40,
};
