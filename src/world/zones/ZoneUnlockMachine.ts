/**
 * ZoneUnlockMachine — State machine for zone unlock progression
 * P4-S1-02: breath-sync(East) → engine-interaction(West) → sigil-forge(South)
 *
 * States: locked → unlocking → unlocked
 * North is always unlocked (Breathfield home zone)
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { ZoneId } from './FogBank';

/** Zone unlock state */
export type ZoneUnlockState = 'locked' | 'unlocking' | 'unlocked';

/** Unlock condition type */
export type UnlockCondition =
  | 'always-unlocked'      // North zone
  | 'breath-sync'          // East: 3 synced breaths
  | 'engine-ritual'        // West: Any Engine ritual completed
  | 'sigil-forge'          // South: Successful sigil forge
  | 'proximity-fallback';  // Fallback: proximity timer (non-webcam)

/** Zone unlock configuration */
export interface ZoneUnlockConfig {
  /** Zone identifier */
  zone: ZoneId;
  /** Current unlock state */
  state: ZoneUnlockState;
  /** Unlock condition required */
  condition: UnlockCondition;
  /** Progress toward unlock (0-1) */
  progress: number;
  /** Timestamp when unlock started */
  unlockStartTime: number | null;
  /** Timestamp when unlocked */
  unlockedTime: number | null;
  /** Whether condition is met */
  conditionMet: boolean;
}

/** Zone unlock store state */
export interface ZoneUnlockState {
  /** Per-zone unlock configurations */
  zones: Record<ZoneId, ZoneUnlockConfig>;
  /** Whether webcam is available */
  hasWebcam: boolean;
  /** Unlock sequence order (for progressive disclosure) */
  unlockSequence: ZoneId[];
  /** Current unlock index in sequence */
  currentUnlockIndex: number;
}

/** Zone unlock actions */
export interface ZoneUnlockActions {
  /** Set zone unlock state */
  setZoneState: (zone: ZoneId, state: ZoneUnlockState) => void;
  /** Set zone progress */
  setZoneProgress: (zone: ZoneId, progress: number) => void;
  /** Mark zone condition as met */
  setConditionMet: (zone: ZoneId, met: boolean) => void;
  /** Start unlocking a zone */
  startUnlock: (zone: ZoneId) => void;
  /** Complete zone unlock */
  completeUnlock: (zone: ZoneId) => void;
  /** Reset zone to locked state */
  resetZone: (zone: ZoneId) => void;
  /** Set webcam availability */
  setHasWebcam: (hasWebcam: boolean) => void;
  /** Reset all zones */
  resetAll: () => void;
  /** Get next zone in unlock sequence */
  getNextZone: () => ZoneId | null;
}

/** Combined store type */
export type ZoneUnlockStore = ZoneUnlockState & ZoneUnlockActions;

/** Default zone configurations */
const defaultZoneConfigs: Record<ZoneId, ZoneUnlockConfig> = {
  north: {
    zone: 'north',
    state: 'unlocked', // Always unlocked (Breathfield)
    condition: 'always-unlocked',
    progress: 1,
    unlockStartTime: null,
    unlockedTime: Date.now(),
    conditionMet: true,
  },
  east: {
    zone: 'east',
    state: 'locked',
    condition: 'breath-sync',
    progress: 0,
    unlockStartTime: null,
    unlockedTime: null,
    conditionMet: false,
  },
  west: {
    zone: 'west',
    state: 'locked',
    condition: 'engine-ritual',
    progress: 0,
    unlockStartTime: null,
    unlockedTime: null,
    conditionMet: false,
  },
  south: {
    zone: 'south',
    state: 'locked',
    condition: 'sigil-forge',
    progress: 0,
    unlockStartTime: null,
    unlockedTime: null,
    conditionMet: false,
  },
};

/** Unlock sequence order (E → W → S) */
const UNLOCK_SEQUENCE: ZoneId[] = ['east', 'west', 'south'];

/**
 * Zone Unlock State Machine Store
 *
 * @example
 * ```ts
 * const { zones, startUnlock, completeUnlock } = useZoneUnlock();
 *
 * // Check if East zone is locked
 * if (zones.east.state === 'locked') {
 *   startUnlock('east');
 * }
 *
 * // Complete unlock when condition met
 * if (zones.east.conditionMet) {
 *   completeUnlock('east');
 * }
 * ```
 */
export const useZoneUnlock = create<ZoneUnlockStore>()(
  subscribeWithSelector((set, get) => ({
    // State
    zones: { ...defaultZoneConfigs },
    hasWebcam: true,
    unlockSequence: UNLOCK_SEQUENCE,
    currentUnlockIndex: 0,

    // Actions
    setZoneState: (zone, state) => {
      set((prev) => ({
        zones: {
          ...prev.zones,
          [zone]: {
            ...prev.zones[zone],
            state,
          },
        },
      }));
    },

    setZoneProgress: (zone, progress) => {
      set((prev) => ({
        zones: {
          ...prev.zones,
          [zone]: {
            ...prev.zones[zone],
            progress: Math.max(0, Math.min(1, progress)),
          },
        },
      }));
    },

    setConditionMet: (zone, met) => {
      set((prev) => ({
        zones: {
          ...prev.zones,
          [zone]: {
            ...prev.zones[zone],
            conditionMet: met,
          },
        },
      }));

      // Auto-start unlock if condition is met and zone is locked
      const state = get();
      if (met && state.zones[zone].state === 'locked') {
        get().startUnlock(zone);
      }
    },

    startUnlock: (zone) => {
      set((prev) => ({
        zones: {
          ...prev.zones,
          [zone]: {
            ...prev.zones[zone],
            state: 'unlocking',
            unlockStartTime: Date.now(),
          },
        },
      }));
    },

    completeUnlock: (zone) => {
      set((prev) => {
        const newZones = {
          ...prev.zones,
          [zone]: {
            ...prev.zones[zone],
            state: 'unlocked' as ZoneUnlockState,
            progress: 1,
            unlockedTime: Date.now(),
          },
        };

        // Update unlock sequence index
        const zoneIndex = UNLOCK_SEQUENCE.indexOf(zone);
        const newIndex = zoneIndex >= 0 ? zoneIndex + 1 : prev.currentUnlockIndex;

        return {
          zones: newZones,
          currentUnlockIndex: newIndex,
        };
      });
    },

    resetZone: (zone) => {
      set((prev) => ({
        zones: {
          ...prev.zones,
          [zone]: {
            ...defaultZoneConfigs[zone],
          },
        },
      }));
    },

    setHasWebcam: (hasWebcam) => {
      set({ hasWebcam });

      // If no webcam, switch to proximity fallback for all locked zones
      if (!hasWebcam) {
        const state = get();
        const newZones = { ...state.zones };

        Object.keys(newZones).forEach((key) => {
          const zone = key as ZoneId;
          if (zone !== 'north' && newZones[zone].state === 'locked') {
            newZones[zone] = {
              ...newZones[zone],
              condition: 'proximity-fallback',
            };
          }
        });

        set({ zones: newZones });
      }
    },

    resetAll: () => {
      set({
        zones: { ...defaultZoneConfigs },
        currentUnlockIndex: 0,
      });
    },

    getNextZone: () => {
      const state = get();
      if (state.currentUnlockIndex >= UNLOCK_SEQUENCE.length) {
        return null;
      }
      return UNLOCK_SEQUENCE[state.currentUnlockIndex];
    },
  }))
);

/**
 * Hook to check if a zone is unlocked
 */
export function useIsZoneUnlocked(zone: ZoneId): boolean {
  return useZoneUnlock((state) => state.zones[zone].state === 'unlocked');
}

/**
 * Hook to get zone unlock progress
 */
export function useZoneProgress(zone: ZoneId): number {
  return useZoneUnlock((state) => state.zones[zone].progress);
}

/**
 * Hook to check if condition is met for a zone
 */
export function useIsConditionMet(zone: ZoneId): boolean {
  return useZoneUnlock((state) => state.zones[zone].conditionMet);
}

/**
 * Get all unlocked zones
 */
export function getUnlockedZones(state: ZoneUnlockStore): ZoneId[] {
  return Object.keys(state.zones).filter(
    (zone) => state.zones[zone as ZoneId].state === 'unlocked'
  ) as ZoneId[];
}

/**
 * Get unlock sequence completion percentage
 */
export function getUnlockSequenceProgress(state: ZoneUnlockStore): number {
  const unlockedCount = getUnlockedZones(state).filter(
    (zone) => zone !== 'north' // Exclude always-unlocked North
  ).length;
  return unlockedCount / UNLOCK_SEQUENCE.length;
}

/**
 * Check if all zones are unlocked
 */
export function areAllZonesUnlocked(state: ZoneUnlockStore): boolean {
  return getUnlockedZones(state).length === 4;
}
