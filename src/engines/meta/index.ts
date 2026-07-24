/**
 * Cartographer Meta-Engine Module
 * 
 * P3-S3: Meta-Engine, Field Journal & Infrastructure
 * 
 * Exports:
 * - Types for engines, constellation, cartographer
 * - Zustand store for cartographer state
 * - Audio system for engine sounds
 * - Performance/LOD management
 * - API router
 * - Polish features (counters, effects, badges)
 */

// Types
export type {
  EngineId,
  EngineTier,
  EngineStatus,
  EnginePosition,
  EngineVisualState,
  EngineInteractionState,
  ReadingDisplay,
  EngineHistoryEntry,
  GravityWellConfig,
  EngineState,
  FilamentConnection,
  ConstellationState,
  CartographerStatus,
  OrbitalPath,
  MetaPattern,
  AggregatedReading,
  CartographerMap,
  MapNode,
  MapConnection,
  UnlockConditions,
  UnlockAnimationState,
  JournalEntry,
  GeneKeyProgression,
  ReadingStats,
  JournalFilters,
  CartographerNarrative,
  EngineTone,
  AudioPosition,
  SpatialAudioConfig,
  CompletionToneVariant,
  LODLevel,
  LODConfig,
  InstancedGeometry,
  EngineRequest,
  EngineResponse,
  CartographerRequest,
  CartographerResponse,
} from './types';

// Store
export {
  useCartographerStore,
  selectEnginesByTier,
  selectUnlockedEngines,
  selectCartographerPosition,
  selectTotalGravityForce,
} from './cartographerStore';

export type { CartographerStore } from './cartographerStore';

// Audio
export {
  EngineAudio,
  engineAudio,
  ENGINE_TONES,
  COMPLETION_TONE_VARIANTS,
  AUDIO_CONSTANTS,
} from './EngineAudio';

// Performance
export {
  LODManager,
  InstancedRenderingManager,
  PerformanceMonitor,
  ConstellationAnimator,
  lodManager,
  instancedRenderingManager,
  performanceMonitor,
  constellationAnimator,
  DEFAULT_LOD_CONFIG,
} from './performance';

// Polish
export {
  usePolishStore,
  selectTopEngines,
  selectSessionProgress,
  selectRecentInsights,
} from './polishStore';

export type {
  ConsultationCounter,
  ParticleEffect,
  SharedReading,
  ExportConfig,
  Badge,
  InsightPattern,
  PolishStore,
} from './polishStore';

// Constants
export const CARTOGRAPHER_CONSTANTS = {
  UNLOCK_THRESHOLD: 7,
  ORBIT_PERIOD: 300, // seconds
  ORBIT_RADIUS: 17,
  EAST_WING_CENTER: { x: 50, y: 0, z: 0 },
  GRAVITY_WELL: {
    innerRadius: 2.0,
    outerRadius: 8.0,
    maxForce: 0.5,
  },
} as const;

// Engine registry metadata
export const ENGINE_METADATA: Record<
  EngineId,
  { name: string; tier: 1 | 2 | 3; description: string }
> = {
  'vimshottari': { name: 'Vimshottari Dasha', tier: 1, description: 'Vedic Astrology planetary periods' },
  'iching': { name: 'I-Ching Oracle', tier: 1, description: 'Ancient Chinese divination' },
  'tarot': { name: 'Tarot Arcana', tier: 1, description: 'Western esoteric card reading' },
  'runes': { name: 'Rune Stones', tier: 1, description: 'Norse Elder Futhark casting' },
  'numerology': { name: 'Numerology Matrix', tier: 1, description: 'Pythagorean number analysis' },
  'biorhythm': { name: 'Biorhythm Compass', tier: 2, description: 'Physical/Emotional/Intellectual cycles' },
  'genekeys': { name: 'Gene Keys Helix', tier: 2, description: '64-key Shadow-Gift-Siddhi map' },
  'humandesign': { name: 'Human Design', tier: 2, description: 'Bodygraph constellation' },
  'chronobiology': { name: 'Chronobiology Clock', tier: 2, description: 'Circadian rhythm sync' },
  'decision-mirror': { name: 'Decision Mirror', tier: 3, description: 'Multi-system convergence' },
  'transits': { name: 'Transit Overlay', tier: 3, description: 'Planetary transit mapping' },
  'somatic-canticle': { name: 'Somatic Canticle', tier: 3, description: 'Bio-gated narrative' },
  'cartographer-compass': { name: 'Cartographer\'s Compass', tier: 3, description: 'Meta-pattern synthesis' },
};

// Engine unlock conditions
export const UNLOCK_CONDITIONS = {
  tier1: {
    'vimshottari': 'birth_data',
    'iching': 'always',
    'tarot': 'always',
    'runes': 'always',
    'numerology': 'first_reading',
  },
  tier2: {
    'biorhythm': 'pip_active',
    'genekeys': 'birth_data + tier1_reading',
    'humandesign': 'birth_data_precise',
    'chronobiology': 'pip_active + 3_sessions',
  },
  tier3: {
    'decision-mirror': '3_unique_engines',
    'transits': 'vimshottari + birth_data',
    'somatic-canticle': '5_readings + coherence_60',
    'cartographer-compass': '7_unique_engines',
  },
} as const;
