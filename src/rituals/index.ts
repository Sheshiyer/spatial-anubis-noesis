/**
 * Rituals Module
 * P4-S1: Ritual & Sigil Forge Implementation
 *
 * Exports:
 * - StoneOfIntention: Physical stone with distance-based damping
 * - CircleOfFire: Fire circle collider and ignition effect
 * - CrystalSpawn: Crystal materialization from ash
 * - SigilForge: Anvil with sweet spot indicator
 * - SigilStrike: Momentum evaluation for strikes
 * - SigilShatter: Crystal shatter effect
 * - SigilDisplay: SVG sigil display in 3D
 * - RitualTracker: Ritual completion tracking
 * - breatheSync: Breath synchronization controller (existing)
 */

// Stone of Intention
export {
  StoneOfIntention,
  type StoneOfIntentionProps,
  type StoneConfig,
  type StoneState,
  DEFAULT_STONE_CONFIG,
  RITUAL_COLLISION_LAYER,
  getStoneState,
} from './StoneOfIntention';

// Circle of Fire
export {
  CircleOfFire,
  type CircleOfFireProps,
  type FireCircleConfig,
  type FireState,
  DEFAULT_FIRE_CIRCLE_CONFIG,
} from './CircleOfFire';

// Crystal Spawn
export {
  CrystalSpawnController,
  createCrystalSpawn,
  calculateCrystalSpawnPosition,
  generateSpawnParticles,
  type CrystalConfig,
  type CrystalSpawnState,
  type CrystalSpawnData,
  DEFAULT_CRYSTAL_CONFIG,
} from './CrystalSpawn';

// Sigil Forge
export {
  SigilForge,
  type SigilForgeProps,
  type SigilForgeConfig,
  type ForgeState,
  DEFAULT_FORGE_CONFIG,
  isInSweetSpot,
  getDistanceFromSweetSpot,
  getSweetSpotQuality,
} from './SigilForge';

// Sigil Strike
export {
  SigilStrikeEvaluator,
  createSigilStrikeEvaluator,
  calculateMomentum,
  determineStrikeTier,
  getTierColor,
  getTierDescription,
  validateStrike,
  mapVerbTierToSigilTier,
  type SigilStrikeTier,
  type StrikeMomentumThresholds,
  type StrikeEvaluation,
  type StrikeConfig,
  DEFAULT_MOMENTUM_THRESHOLDS,
  DEFAULT_STRIKE_CONFIG,
} from './SigilStrike';

// Sigil Shatter
export {
  SigilShatter,
  type SigilShatterProps,
  type ShatterConfig,
  type ShatterState,
  type ShatterEvent,
  DEFAULT_SHATTER_CONFIG,
  createPhysicalShards,
  playShatterSound,
} from './SigilShatter';

// Sigil Display
export {
  SigilDisplay,
  type SigilDisplayProps,
  type SigilDisplayConfig,
  type SigilDisplayState,
  DEFAULT_DISPLAY_CONFIG,
  generatePlaceholderSigil,
  isValidSvgPath,
  getSigilComplexity,
} from './SigilDisplay';

// Ritual Tracker
export {
  createRitualTrackerSlice,
  getRitualName,
  getRitualDescription,
  getRitualZoneColor,
  calculateTotalQuality,
  areAllRitualsComplete,
  getNextRitual,
  type RitualType,
  type RitualCompletion,
  type RitualMark,
  type RitualTrackerState,
  type RitualTrackerActions,
  RITUAL_ZONES,
  RITUAL_POSITIONS,
} from './RitualTracker';

// Breath Sync (existing)
export {
  BreatheSyncController,
  createBreatheSyncController,
  calculateBreatheSyncVisual,
  type BreatheSyncState,
  type BreatheSyncConfig,
  type BreatheSyncVisualData,
  DEFAULT_BREATHE_SYNC_CONFIG,
} from './breatheSync';
