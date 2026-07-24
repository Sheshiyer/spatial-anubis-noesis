/**
 * Tier 1 Ancient Instruments
 * P3-S1: I-Ching, Vimshottari, Tarot, Runes, Numerology
 * 
 * Five 3D divination engine artifacts:
 * 1. I-Ching Oracle - Physics-based coin toss
 * 2. Vimshottari Clock - Concentric rotating rings
 * 3. Tarot Arcana - Spiral card ring with veil
 * 4. Rune Stones - Spatial casting
 * 5. Numerology Matrix - Cascading number grid
 */

// Engine Components
export { IChingEngine } from './i-ching';
export { VimshottariEngine } from './vimshottari';
export { TarotEngine } from './tarot';
export { RuneEngine } from './runes';
export { NumerologyEngine } from './numerology';

// Manager
export { Tier1EnginesManager, TIER_1_ENGINE_CONFIG } from './Tier1EnginesManager';

// Shared Infrastructure
export {
  // Store
  useTier1EngineStore,
  
  // Components
  Text3D,
  FloatingText,
  useTypewriter,
  FilamentConnections,
  ParticleBurst,
  LoadingGlow,
  
  // Spatial config
  EAST_WING_CENTER,
  TIER_1_RADIUS,
  TIER_1_Y_OFFSET,
  TIER_1_ANGLES,
  ENGINE_POSITIONS,
  getAbsolutePosition,
} from './shared';

// Types
export type {
  EngineId,
  EngineStatus,
  InteractionState,
  Tier1EngineState,
  EngineReading,
  FilamentConnection,
  LoadingState,
  EnginePosition,
  EngineVisualState,
  Text3DConfig,
  
  // API Types
  IChingRequest,
  IChingReading,
  IChingLine,
  VimshottariRequest,
  VimshottariReading,
  VimshottariPeriod,
  DashaPlanet,
  TarotRequest,
  TarotReading,
  TarotCard,
  TarotSpread,
  RuneRequest,
  RuneReading,
  RuneStone,
  RuneCastType,
  NumerologyRequest,
  NumerologyReading,
  NumerologyChart,
} from './shared/types';
