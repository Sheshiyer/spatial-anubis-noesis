/**
 * Cartographer Meta-Engine Types
 * 
 * P3-S3: Meta-Engine, Field Journal & Infrastructure
 */

import type { Vector3 } from 'three';

// ============================================================================
// Engine State Types
// ============================================================================

export type EngineId =
  | 'vimshottari'
  | 'iching'
  | 'tarot'
  | 'runes'
  | 'numerology'
  | 'biorhythm'
  | 'genekeys'
  | 'humandesign'
  | 'chronobiology'
  | 'decision-mirror'
  | 'transits'
  | 'somatic-canticle'
  | 'cartographer-compass';

export type EngineTier = 1 | 2 | 3;
export type EngineStatus = 'locked' | 'unlocked' | 'active' | 'completed';

export interface EnginePosition {
  x: number;
  y: number;
  z: number;
}

export interface EngineVisualState {
  primaryColor: string;
  emissiveIntensity: number;
  scaleMultiplier: number;
  bloomEnabled: boolean;
}

export interface EngineInteractionState {
  hovered: boolean;
  engaged: boolean;
  readingInProgress: boolean;
  lastInteractionTimestamp: number | null;
}

export interface ReadingDisplay {
  readingId: string;
  timestamp: number;
  inputData: Record<string, unknown>;
  outputData: Record<string, unknown>;
  displayConfig: {
    textContent: string;
    highlightKeywords: string[];
    visualArtifacts: unknown[];
  };
}

export interface EngineHistoryEntry {
  readingId: string;
  timestamp: number;
  summary: string;
}

export interface GravityWellConfig {
  active: boolean;
  innerRadius: number;
  outerRadius: number;
  force: number;
}

export interface EngineState {
  engineId: EngineId;
  tier: EngineTier;
  status: EngineStatus;
  position: EnginePosition;
  visualState: EngineVisualState;
  interactionState: EngineInteractionState;
  currentReading: ReadingDisplay | null;
  history: EngineHistoryEntry[];
  gravityWell: GravityWellConfig;
}

// ============================================================================
// Constellation Types
// ============================================================================

export interface FilamentConnection {
  fromEngine: EngineId;
  toEngine: EngineId;
  strength: number;
  crossReferences: number;
}

export interface ConstellationState {
  sessionId: string;
  userId: string;
  timestamp: number;
  eastWingCenter: EnginePosition;
  engines: EngineState[];
  filamentConnections: FilamentConnection[];
  compassOrbitalPhase: number;
  totalUniqueEnginesConsulted: number;
}

// ============================================================================
// Cartographer Types
// ============================================================================

export type CartographerStatus = 'orbiting' | 'paused' | 'engaged' | 'unfolding';

export interface OrbitalPath {
  radius: number;
  yOffset: number;
  period: number; // seconds per revolution
  currentPhase: number; // 0-360 degrees
}

export interface MetaPattern {
  patternId: string;
  name: string;
  description: string;
  involvedEngines: EngineId[];
  coherence: number; // 0-1
  significance: 'minor' | 'moderate' | 'major' | 'profound';
}

export interface AggregatedReading {
  readingId: string;
  engineId: EngineId;
  timestamp: number;
  themes: string[];
  keywords: string[];
  coherence: number;
}

export interface CartographerMap {
  nodes: MapNode[];
  connections: MapConnection[];
  narrative: string;
  cartographerVoice: 'observing' | 'guiding' | 'revealing';
}

export interface MapNode {
  engineId: EngineId;
  position: EnginePosition;
  weight: number; // Based on consultation frequency
  themes: string[];
  glowIntensity: number;
}

export interface MapConnection {
  from: EngineId;
  to: EngineId;
  weight: number;
  sharedThemes: string[];
}

export interface CartographerState {
  status: CartographerStatus;
  orbitalPath: OrbitalPath;
  unlocked: boolean;
  dialStates: Record<EngineId, boolean>; // true = engine consulted
  metaPatterns: MetaPattern[];
  currentMap: CartographerMap | null;
  lastMetaReading: AggregatedReading[];
  unlockProgress: number; // 0-7 engines consulted
}

// ============================================================================
// Unlock System Types
// ============================================================================

export interface UnlockConditions {
  tier1: Tier1UnlockCondition;
  tier2: Tier2UnlockCondition;
  tier3: Tier3UnlockCondition;
  cartographer: CartographerUnlockCondition;
}

export interface Tier1UnlockCondition {
  vimshottari: { birthDataEntered: boolean };
  iching: { always: true };
  tarot: { always: true };
  runes: { always: true };
  numerology: { tier1ReadingCompleted: boolean };
}

export interface Tier2UnlockCondition {
  biorhythm: { pipActive: boolean };
  genekeys: { birthDataEntered: boolean; tier1ReadingCompleted: boolean };
  humandesign: { birthDataEntered: boolean; preciseTime: boolean };
  chronobiology: { pipActive: boolean; bioSessions: number };
}

export interface Tier3UnlockCondition {
  decisionMirror: { uniqueReadingsThisSession: number };
  transits: { vimshottariConsulted: boolean; birthDataPrecise: boolean };
  somaticCanticle: { totalReadings: number; coherenceAchieved: boolean };
}

export interface CartographerUnlockCondition {
  uniqueEnginesConsulted: number; // 7 required
}

export interface UnlockAnimationState {
  engineId: EngineId;
  phase: 'fog' | 'materialize' | 'burst' | 'complete';
  progress: number; // 0-1
  particleCount: number;
  lightIntensity: number;
}

// ============================================================================
// Field Journal Types
// ============================================================================

export interface JournalEntry {
  entryId: string;
  readingId: string;
  engineId: EngineId;
  timestamp: number;
  sessionId: string;
  userId: string;
  readingData: Record<string, unknown>;
  interpretation: string;
  userNotes: string | null;
  tags: string[];
  isFavorite: boolean;
  coherenceAtReading: number | null;
  vesselPosition: EnginePosition | null;
}

export interface GeneKeyProgression {
  keyNumber: number;
  progression: Array<{
    timestamp: number;
    state: 'Shadow' | 'Gift' | 'Siddhi';
    coherence: number;
    readingId: string;
  }>;
  currentState: 'Shadow' | 'Gift' | 'Siddhi';
  progressionPercentage: number; // 0-100
}

export interface ReadingStats {
  totalReadings: number;
  readingsByEngine: Record<EngineId, number>;
  readingsByDate: Record<string, number>; // YYYY-MM-DD -> count
  favoriteCount: number;
  uniqueEnginesConsulted: number;
  currentStreak: number; // days
  longestStreak: number;
  averageCoherence: number;
  mostActiveEngine: EngineId | null;
}

export interface JournalFilters {
  engines: EngineId[];
  dateRange: { from: Date | null; to: Date | null };
  tags: string[];
  favoritesOnly: boolean;
  searchQuery: string;
}

export interface CartographerNarrative {
  narrativeId: string;
  sessionId: string;
  timestamp: number;
  enginesConsulted: EngineId[];
  narrativeText: string;
  themes: string[];
  coherence: number;
}

// ============================================================================
// Audio Types
// ============================================================================

export interface EngineTone {
  engineId: EngineId;
  baseFrequency: number;
  harmonicRatio: number;
  duration: number;
  envelope: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
}

export interface AudioPosition {
  x: number;
  y: number;
  z: number;
}

export interface SpatialAudioConfig {
  cutoffDistance: number; // 10 units
  attenuationCurve: 'inverse_square' | 'linear' | 'exponential';
  maxVolume: number;
}

export type CompletionToneVariant = 
  | 'vimshottari'
  | 'iching'
  | 'tarot'
  | 'runes'
  | 'numerology'
  | 'biorhythm'
  | 'genekeys'
  | 'humandesign'
  | 'chronobiology'
  | 'decision-mirror'
  | 'transits'
  | 'somatic-canticle'
  | 'cartographer-compass';

// ============================================================================
// Performance/LOD Types
// ============================================================================

export type LODLevel = 'full' | 'medium' | 'billboard' | 'icon';

export interface LODConfig {
  fullDistance: number;    // 0-5 units
  mediumDistance: number;  // 5-15 units
  billboardDistance: number; // 15-30 units
  iconDistance: number;    // 30+ units
}

export interface InstancedGeometry {
  geometryType: string;
  maxInstances: number;
  material: string;
  bufferUsage: 'static' | 'dynamic';
}

// ============================================================================
// API Types
// ============================================================================

export interface EngineRequest {
  engineId: EngineId;
  userId: string;
  sessionId: string;
  inputData: Record<string, unknown>;
  context: {
    coherence: number | null;
    vesselPosition: EnginePosition | null;
    activeReadings: string[];
  };
}

export interface EngineResponse {
  readingId: string;
  engineId: EngineId;
  timestamp: number;
  outputData: Record<string, unknown>;
  interpretation: string;
  themes: string[];
  keywords: string[];
  suggestedNextEngines: EngineId[];
}

export interface CartographerRequest {
  activeReadings: AggregatedReading[];
  sessionHistory: string[];
  coherenceScore: number;
  engagementDepth: number;
}

export interface CartographerResponse {
  metaReadingId: string;
  patterns: MetaPattern[];
  map: CartographerMap;
  narrative: string;
  cartographerVoice: string;
}
