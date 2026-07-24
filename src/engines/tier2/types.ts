/**
 * Tier 2 Biological Mirrors — Type Definitions
 * P3-S2: Biorhythm Compass, Gene Keys Helix, Human Design Bodygraph, Chronobiology Clock
 */

import type { PIPData } from '../../pip/types';

// ============================================================================
// Common Tier 2 Types
// ============================================================================

/** Bio-data sources for Tier 2 engines */
export interface BioDataSource {
  /** Heart Rate Variability (0-100) */
  hrv: number;
  /** Facial affect/emotional state (0-100) */
  facialAffect: number;
  /** Blink rate per minute */
  blinkRate: number;
  /** Timestamp */
  timestamp: number;
}

/** Tier 2 engine unlock states */
export type Tier2UnlockState = 'locked' | 'unlocking' | 'unlocked';

/** Spatial placement for Tier 2 engines */
export interface Tier2Placement {
  /** Radius from center (10 units) */
  radius: number;
  /** Angular position in degrees (90° spacing) */
  angle: number;
  /** World position */
  position: [number, number, number];
}

// ============================================================================
// Engine 6: Biorhythm Compass (P3-S2-01 to 03, 31)
// ============================================================================

/** Biorhythm cycle types */
export type BiorhythmCycle = 'physical' | 'emotional' | 'intellectual';

/** Individual biorhythm cycle data */
export interface BiorhythmCycleData {
  /** Cycle type */
  type: BiorhythmCycle;
  /** Current value (-100 to +100) */
  value: number;
  /** Cycle phase (0-1) */
  phase: number;
  /** Days into cycle */
  daysInCycle: number;
  /** Color for visualization */
  color: string;
}

/** Complete biorhythm data */
export interface BiorhythmData {
  /** Physical cycle (23 days) - Red */
  physical: BiorhythmCycleData;
  /** Emotional cycle (28 days) - Blue */
  emotional: BiorhythmCycleData;
  /** Intellectual cycle (33 days) - Green */
  intellectual: BiorhythmCycleData;
  /** Birth date used for calculation */
  birthDate: string;
  /** Current date */
  currentDate: string;
  /** 30-day projection data */
  projection: BiorhythmProjection[];
}

/** 30-day biorhythm projection point */
export interface BiorhythmProjection {
  date: string;
  physical: number;
  emotional: number;
  intellectual: number;
}

/** Biorhythm compass interaction state */
export interface BiorhythmInteractionState {
  /** Currently scrubbing */
  isScrubbing: boolean;
  /** Scrub offset in days */
  scrubOffset: number;
  /** Hovering which ribbon */
  hoveredRibbon: BiorhythmCycle | null;
}

// ============================================================================
// Engine 7: Gene Keys Helix (P3-S2-04 to 06, 30)
// ============================================================================

/** Gene Key sphere representation */
export interface GeneKey {
  /** Gene Key number (1-64) */
  number: number;
  /** Sphere/position on helix */
  sphere: number;
  /** Shadow state (challenge) */
  shadow: string;
  /** Gift state (potential) */
  gift: string;
  /** Siddhi state (enlightenment) */
  siddhi: string;
  /** Current activation level */
  activation: 'shadow' | 'gift' | 'siddhi';
  /** Activation percentage (0-100) */
  activationLevel: number;
}

/** DNA helix configuration */
export interface GeneKeyHelixConfig {
  /** Number of turns */
  turns: number;
  /** Radius of helix */
  radius: number;
  /** Height of helix */
  height: number;
  /** Number of nodes (64) */
  nodeCount: number;
}

/** Gene Keys profile from birth data */
export interface GeneKeysProfile {
  /** Life's work - primary purpose */
  lifesWork: GeneKey;
  /** Evolution - growth path */
  evolution: GeneKey;
  /** Radiance - how you shine */
  radiance: GeneKey;
  /** Purpose - ultimate destiny */
  purpose: GeneKey;
  /** Attraction - what you draw in */
  attraction: GeneKey;
  /** Pearl - hidden wisdom */
  pearl: GeneKey;
  /** Culture - community role */
  culture: GeneKey;
  /** All 64 Gene Keys */
  allKeys: GeneKey[];
}

/** Gene Key interaction state */
export interface GeneKeyInteractionState {
  /** Currently selected strand */
  selectedStrand: number | null;
  /** Current layer being viewed (Shadow/Gift/Siddhi) */
  currentLayer: 'shadow' | 'gift' | 'siddhi';
  /** Transition progress between layers */
  layerTransitionProgress: number;
}

// ============================================================================
// Engine 8: Human Design Bodygraph (P3-S2-07 to 09, 29)
// ============================================================================

/** Human Design center types */
export type HDCenter = 
  | 'head' 
  | 'ajna' 
  | 'throat' 
  | 'g' 
  | 'heart' 
  | 'sacral' 
  | 'spleen' 
  | 'solarPlexus' 
  | 'root';

/** Center definition state */
export type CenterDefinition = 'defined' | 'undefined' | 'open';

/** Individual center data */
export interface HDCenterData {
  /** Center identifier */
  id: HDCenter;
  /** Display name */
  name: string;
  /** Definition state */
  definition: CenterDefinition;
  /** Position in bodygraph */
  position: [number, number, number];
  /** Connected gates */
  gates: number[];
  /** Color based on definition */
  color: string;
}

/** Human Design type */
export type HDType = 
  | 'manifestor' 
  | 'generator' 
  | 'manifesting_generator' 
  | 'projector' 
  | 'reflector';

/** Authority types */
export type HDAuthority = 
  | 'sacral' 
  | 'emotional' 
  | 'splenic' 
  | 'ego' 
  | 'self_projected' 
  | 'mental' 
  | 'lunar';

/** Strategy per type */
export type HDStrategy = 
  | 'inform'  // Manifestor
  | 'respond' // Generator/MG
  | 'wait_invitation' // Projector
  | 'wait_lunar' // Reflector
  | 'wait_response';

/** Human Design profile */
export interface HDProfile {
  /** Type */
  type: HDType;
  /** Authority */
  authority: HDAuthority;
  /** Strategy */
  strategy: HDStrategy;
  /** Profile (e.g., "3/5") */
  profile: string;
  /** Defined centers */
  definedCenters: HDCenter[];
  /** Undefined centers */
  undefinedCenters: HDCenter[];
  /** All centers */
  centers: HDCenterData[];
  /** Channels (defined connections) */
  channels: Array<[number, number]>;
}

/** Audio frequency per type/authority */
export interface HDAudioFrequency {
  /** Base frequency in Hz */
  baseFreq: number;
  /** Harmonic intervals */
  harmonics: number[];
  /** Resonance quality */
  resonance: string;
}

/** Bodygraph interaction state */
export interface BodygraphInteractionState {
  /** Hovered center */
  hoveredCenter: HDCenter | null;
  /** Selected center for details */
  selectedCenter: HDCenter | null;
  /** Audio playing state */
  audioPlaying: boolean;
}

// ============================================================================
// Engine 9: Chronobiology Clock (P3-S2-10 to 12)
// ============================================================================

/** Circadian phase types */
export type CircadianPhase = 
  | 'sleep'
  | 'wake'
  | 'peak'
  | 'dip'
  | 'wind_down'
  | 'deep_sleep';

/** Circadian zone data */
export interface CircadianZone {
  /** Phase type */
  phase: CircadianPhase;
  /** Start hour (0-23) */
  startHour: number;
  /** End hour (0-23) */
  endHour: number;
  /** Color for visualization */
  color: string;
  /** Description */
  description: string;
  /** Optimal activities */
  activities: string[];
}

/** Chronotype classification */
export type Chronotype = 
  | 'extreme_early' 
  | 'moderate_early' 
  | 'intermediate' 
  | 'moderate_late' 
  | 'extreme_late';

/** Chronobiology data */
export interface ChronobiologyData {
  /** Current device time */
  deviceTime: string;
  /** Detected timezone */
  timezone: string;
  /** Current circadian phase */
  currentPhase: CircadianPhase;
  /** Chronotype assessment */
  chronotype: Chronotype;
  /** All circadian zones for 24h */
  zones: CircadianZone[];
  /** Cortisol peak time */
  cortisolPeak: number;
  /** Melatonin onset time */
  melatoninOnset: number;
  /** Body temperature minimum */
  tempMinimum: number;
  /** Recommended sleep window */
  sleepWindow: { start: number; end: number };
  /** Recommended wake window */
  wakeWindow: { start: number; end: number };
}

/** Clock interaction state */
export interface ClockInteractionState {
  /** Hovering which zone */
  hoveredZone: CircadianPhase | null;
  /** Showing detailed view */
  showDetails: boolean;
}

// ============================================================================
// Tier 2 Infrastructure
// ============================================================================

/** Tier 2 engine states */
export interface Tier2EngineStates {
  biorhythm: { unlocked: boolean; unlockProgress: number };
  geneKeys: { unlocked: boolean; unlockProgress: number };
  humanDesign: { unlocked: boolean; unlockProgress: number };
  chronobiology: { unlocked: boolean; unlockProgress: number };
}

/** Bio-gating requirements */
export interface BioGatingRequirements {
  /** Minimum coherence for Tier 2 */
  minCoherence: number;
  /** Minimum sustained connection time (seconds) */
  minConnectionTime: number;
  /** Requires active PIP */
  requiresPIP: boolean;
}

/** Unlock animation state */
export interface UnlockAnimationState {
  /** Engine being unlocked */
  engine: string;
  /** Animation progress (0-1) */
  progress: number;
  /** Fog density (decreasing) */
  fogDensity: number;
  /** Glow intensity (increasing) */
  glowIntensity: number;
  /** Audio cue played */
  audioCuePlayed: boolean;
}

export const DEFAULT_BIO_GATE: BioGatingRequirements = {
  minCoherence: 30,
  minConnectionTime: 10,
  requiresPIP: true,
};

export const TIER2_SPATIAL_PLACEMENT: Tier2Placement[] = [
  { radius: 10, angle: 0, position: [10, 2, 0] },    // Biorhythm - East
  { radius: 10, angle: 90, position: [0, 2, 10] },   // Gene Keys - South
  { radius: 10, angle: 180, position: [-10, 2, 0] }, // Human Design - West
  { radius: 10, angle: 270, position: [0, 2, -10] }, // Chronobiology - North
];
