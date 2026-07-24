/**
 * World Zones Module
 * P4-S1: Zone System Implementation
 *
 * Provides zone unlock progression, fog rendering, boundary physics,
 * proximity fallback, unlock triggers, ritual recovery, binaural transitions,
 * and progressive disclosure tracking.
 */

// ============================================================================
// FogBank — SparkJS-based volumetric fog
// ============================================================================

export {
  FogBank,
  MultiZoneFog,
  DEFAULT_ZONE_FOG_CONFIGS,
} from './FogBank';

export type {
  ZoneId,
  ZoneFogConfig,
  FogBankProps,
  MultiZoneFogProps,
} from './FogBank';

// ============================================================================
// ZoneUnlockMachine — State machine for unlock progression
// ============================================================================

export {
  useZoneUnlock,
  useIsZoneUnlocked,
  useZoneProgress,
  useIsConditionMet,
  getUnlockedZones,
  getUnlockSequenceProgress,
  areAllZonesUnlocked,
} from './ZoneUnlockMachine';

export type {
  ZoneUnlockState,
  UnlockCondition,
  ZoneUnlockConfig,
  ZoneUnlockStore,
  ZoneUnlockActions,
} from './ZoneUnlockMachine';

// ============================================================================
// ZoneBoundary — Exponential friction for locked boundaries
// ============================================================================

export {
  ZoneBoundaryController,
  createZoneBoundaryController,
  calculateZoneFriction,
  calculateAllZoneFriction,
  useZoneBoundaryFriction,
  easeInExpo,
  DEFAULT_ZONE_BOUNDARIES,
} from './ZoneBoundary';

export type {
  ZoneBoundaryConfig,
} from './ZoneBoundary';

// ============================================================================
// ZoneProximityFallback — Proximity timer for non-webcam unlocks
// ============================================================================

export {
  ZoneProximityController,
  createZoneProximityController,
  useZoneProximityUnlock,
  DEFAULT_PROXIMITY_TIMERS,
} from './ZoneProximityFallback';

export type {
  ProximityTimerConfig,
} from './ZoneProximityFallback';

// ============================================================================
// ZoneTriggers — Unlock trigger conditions
// ============================================================================

export {
  EastWingBreathTrigger,
  WestWingEngineTrigger,
  SouthGateSigilTrigger,
  ZoneTriggerManager,
  createZoneTriggerManager,
} from './ZoneTriggers';

export type {
  ZoneTriggerEvent,
  ZoneTriggerCallback,
} from './ZoneTriggers';

// ============================================================================
// RitualRecovery — Ritual checkpoint and resume system
// ============================================================================

export {
  RitualRecoveryManager,
  createRitualRecoveryManager,
  useRitualRecovery,
  DEFAULT_RECOVERY_CONFIG,
} from './RitualRecovery';

export type {
  RitualType,
  RitualCheckpoint,
  RitualRecoveryConfig,
} from './RitualRecovery';

// ============================================================================
// ZoneTeleport — Binaural frequency transitions
// ============================================================================

export {
  ZoneBinauralController,
  createZoneBinauralController,
  interpolateBinauralFrequency,
  getRecommendedBinauralForRitual,
  DEFAULT_ZONE_BINAURAL_CONFIGS,
} from './ZoneTeleport';

export type {
  ZoneBinauralConfig,
} from './ZoneTeleport';

// ============================================================================
// ProgressiveDisclosure — Zone unlock sequence tracking
// ============================================================================

export {
  useProgressiveDisclosure,
  useIsZoneDisclosed,
  useDisclosureProgress,
  useNextExpectedZone,
  getSequenceDescription,
  getAverageUnlockTime,
  getZoneUnlockTime,
  getOutOfSequenceUnlocks,
  exportDisclosureData,
} from './ProgressiveDisclosure';

export type {
  DisclosureMilestone,
  ProgressiveDisclosureState,
  ProgressiveDisclosureActions,
  ProgressiveDisclosureStore,
} from './ProgressiveDisclosure';

// ============================================================================
// Constants
// ============================================================================

/** Zone unlock sequence order (E → W → S) */
export const ZONE_UNLOCK_SEQUENCE = ['east', 'west', 'south'] as const;

/** Zone display names */
export const ZONE_NAMES: Record<import('./FogBank').ZoneId, string> = {
  north: 'Breathfield',
  east: 'Engines',
  west: 'Forge',
  south: 'Threshold',
} as const;

/** Zone cardinal directions */
export const ZONE_DIRECTIONS: Record<import('./FogBank').ZoneId, string> = {
  north: 'North',
  east: 'East',
  west: 'West',
  south: 'South',
} as const;
