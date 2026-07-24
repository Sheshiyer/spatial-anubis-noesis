/**
 * ProgressiveDisclosure — Zone unlock sequence tracking
 * P4-S1-32 (partial): Progressive disclosure E→W→S
 *
 * Tracks which zones are unlocked and their unlock order.
 * Integrates with ZoneUnlockMachine for state management.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { ZoneId } from './FogBank';

/** Progressive disclosure milestone */
export interface DisclosureMilestone {
  /** Zone unlocked */
  zone: ZoneId;
  /** Order in sequence (0-indexed) */
  order: number;
  /** Timestamp when unlocked */
  unlockedAt: number;
  /** Time taken to unlock from previous (ms) */
  timeSincePrevious: number | null;
}

/** Progressive disclosure state */
export interface ProgressiveDisclosureState {
  /** Ordered list of unlocked zones */
  unlockedZones: ZoneId[];
  /** Milestone history */
  milestones: DisclosureMilestone[];
  /** Total time elapsed since first unlock (ms) */
  totalElapsedTime: number;
  /** Current unlock sequence position */
  currentPosition: number;
  /** Whether sequence is complete (all zones unlocked) */
  isSequenceComplete: boolean;
  /** Session start timestamp */
  sessionStartTime: number;
}

/** Progressive disclosure actions */
export interface ProgressiveDisclosureActions {
  /** Record zone unlock */
  recordUnlock: (zone: ZoneId) => void;
  /** Reset disclosure state */
  reset: () => void;
  /** Get next expected zone in sequence */
  getNextExpectedZone: () => ZoneId | null;
  /** Get sequence progress (0-1) */
  getProgress: () => number;
  /** Check if zone is in correct sequence order */
  isInSequence: (zone: ZoneId) => boolean;
  /** Get milestone for a zone */
  getMilestone: (zone: ZoneId) => DisclosureMilestone | null;
}

/** Combined store type */
export type ProgressiveDisclosureStore = ProgressiveDisclosureState & ProgressiveDisclosureActions;

/** Expected unlock sequence (E → W → S) */
const EXPECTED_SEQUENCE: ZoneId[] = ['north', 'east', 'west', 'south'];

/** Initial state */
const initialState: ProgressiveDisclosureState = {
  unlockedZones: ['north'], // North always unlocked
  milestones: [
    {
      zone: 'north',
      order: 0,
      unlockedAt: Date.now(),
      timeSincePrevious: null,
    },
  ],
  totalElapsedTime: 0,
  currentPosition: 1, // North is position 0
  isSequenceComplete: false,
  sessionStartTime: Date.now(),
};

/**
 * Progressive Disclosure Store
 * Tracks zone unlock progression and sequence
 *
 * @example
 * ```ts
 * const { recordUnlock, getProgress, getNextExpectedZone } = useProgressiveDisclosure();
 *
 * // Record unlock
 * recordUnlock('east');
 *
 * // Check progress
 * const progress = getProgress(); // 0.5 (2/4 zones)
 *
 * // Get next zone
 * const next = getNextExpectedZone(); // 'west'
 * ```
 */
export const useProgressiveDisclosure = create<ProgressiveDisclosureStore>()(
  subscribeWithSelector((set, get) => ({
    // State
    ...initialState,

    // Actions
    recordUnlock: (zone) => {
      const state = get();

      // Don't record if already unlocked
      if (state.unlockedZones.includes(zone)) {
        console.warn(`[ProgressiveDisclosure] Zone ${zone} already unlocked`);
        return;
      }

      const now = Date.now();
      const previousMilestone = state.milestones[state.milestones.length - 1];
      const timeSincePrevious = previousMilestone ? now - previousMilestone.unlockedAt : null;

      const milestone: DisclosureMilestone = {
        zone,
        order: state.unlockedZones.length,
        unlockedAt: now,
        timeSincePrevious,
      };

      const newUnlockedZones = [...state.unlockedZones, zone];
      const newMilestones = [...state.milestones, milestone];
      const totalElapsed = now - state.sessionStartTime;
      const isComplete = newUnlockedZones.length === EXPECTED_SEQUENCE.length;

      set({
        unlockedZones: newUnlockedZones,
        milestones: newMilestones,
        totalElapsedTime: totalElapsed,
        currentPosition: newUnlockedZones.length,
        isSequenceComplete: isComplete,
      });

      console.log(
        `[ProgressiveDisclosure] Unlocked ${zone} (${newUnlockedZones.length}/${EXPECTED_SEQUENCE.length})`
      );

      if (isComplete) {
        console.log(
          `[ProgressiveDisclosure] Sequence complete! Total time: ${(totalElapsed / 1000).toFixed(1)}s`
        );
      }
    },

    reset: () => {
      set({
        ...initialState,
        sessionStartTime: Date.now(),
      });
      console.log('[ProgressiveDisclosure] Reset disclosure state');
    },

    getNextExpectedZone: () => {
      const state = get();
      if (state.isSequenceComplete) return null;

      return EXPECTED_SEQUENCE[state.currentPosition] || null;
    },

    getProgress: () => {
      const state = get();
      return state.currentPosition / EXPECTED_SEQUENCE.length;
    },

    isInSequence: (zone) => {
      const state = get();
      const expectedZone = EXPECTED_SEQUENCE[state.currentPosition];
      return zone === expectedZone;
    },

    getMilestone: (zone) => {
      const state = get();
      return state.milestones.find((m) => m.zone === zone) || null;
    },
  }))
);

/**
 * Get human-readable unlock sequence description
 */
export function getSequenceDescription(state: ProgressiveDisclosureStore): string {
  const { unlockedZones, currentPosition } = state;

  if (state.isSequenceComplete) {
    return 'All zones unlocked';
  }

  const nextZone = EXPECTED_SEQUENCE[currentPosition];
  const unlocked = unlockedZones.map((z) => z.toUpperCase()).join(' → ');
  const next = nextZone ? nextZone.toUpperCase() : 'NONE';

  return `Unlocked: ${unlocked} | Next: ${next}`;
}

/**
 * Calculate average time between unlocks
 */
export function getAverageUnlockTime(state: ProgressiveDisclosureStore): number {
  const { milestones } = state;

  if (milestones.length <= 1) return 0;

  const times = milestones
    .filter((m) => m.timeSincePrevious !== null)
    .map((m) => m.timeSincePrevious as number);

  if (times.length === 0) return 0;

  const sum = times.reduce((acc, t) => acc + t, 0);
  return sum / times.length;
}

/**
 * Get unlock time for a specific zone
 */
export function getZoneUnlockTime(state: ProgressiveDisclosureStore, zone: ZoneId): number | null {
  const milestone = state.milestones.find((m) => m.zone === zone);
  return milestone ? milestone.unlockedAt : null;
}

/**
 * Get zones unlocked out of sequence (diagnostic)
 */
export function getOutOfSequenceUnlocks(state: ProgressiveDisclosureStore): ZoneId[] {
  const outOfSequence: ZoneId[] = [];

  state.milestones.forEach((milestone, index) => {
    const expectedZone = EXPECTED_SEQUENCE[index];
    if (milestone.zone !== expectedZone && milestone.zone !== 'north') {
      outOfSequence.push(milestone.zone);
    }
  });

  return outOfSequence;
}

/**
 * Export disclosure data for analytics
 */
export function exportDisclosureData(state: ProgressiveDisclosureStore): Record<string, any> {
  return {
    sequence: state.unlockedZones,
    milestones: state.milestones,
    totalTime: state.totalElapsedTime,
    averageUnlockTime: getAverageUnlockTime(state),
    isComplete: state.isSequenceComplete,
    outOfSequence: getOutOfSequenceUnlocks(state),
  };
}

/**
 * Hook to check if a specific zone is unlocked
 */
export function useIsZoneDisclosed(zone: ZoneId): boolean {
  return useProgressiveDisclosure((state) => state.unlockedZones.includes(zone));
}

/**
 * Hook to get unlock progress
 */
export function useDisclosureProgress(): number {
  return useProgressiveDisclosure((state) => state.getProgress());
}

/**
 * Hook to get next expected zone
 */
export function useNextExpectedZone(): ZoneId | null {
  return useProgressiveDisclosure((state) => state.getNextExpectedZone());
}
