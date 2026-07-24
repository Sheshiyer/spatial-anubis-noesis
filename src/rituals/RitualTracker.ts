/**
 * Ritual Completion Tracking
 * P4-S1-26, P4-S1-28: Track ritual completion and world floor marks
 *
 * Tracks 4 founding rituals:
 * 1. Breath Sync (East)
 * 2. Engine Consultation (East)
 * 3. Stone of Intention + Sigil Forge (West)
 * 4. South Gate Passage
 *
 * Completed rituals leave Aged Gold marks on world floor.
 */

import * as THREE from 'three';

/** Ritual types */
export type RitualType =
  | 'breath_sync'
  | 'engine_consultation'
  | 'stone_and_sigil'
  | 'south_gate_passage';

/** Ritual completion data */
export interface RitualCompletion {
  /** Ritual type */
  type: RitualType;
  /** Completion timestamp */
  completedAt: number;
  /** World position where completed */
  position: THREE.Vector3;
  /** Floor mark position (projected to Y=0) */
  markPosition: THREE.Vector3;
  /** Completion quality (0-1) */
  quality: number;
  /** Session ID */
  sessionId: string;
}

/** Ritual floor mark */
export interface RitualMark {
  /** Mark ID */
  id: string;
  /** Ritual type */
  ritualType: RitualType;
  /** World position (Y=0) */
  position: THREE.Vector3;
  /** Mark color (Aged Gold) */
  color: THREE.Color;
  /** Mark intensity (based on quality) */
  intensity: number;
  /** Mark radius */
  radius: number;
  /** Created at timestamp */
  createdAt: number;
}

/** Ritual zone positions */
export const RITUAL_ZONES = {
  east: new THREE.Vector3(35, 0, 0),
  west: new THREE.Vector3(-35, 0, 0),
  north: new THREE.Vector3(0, 0, -35),
  south: new THREE.Vector3(0, 0, 35),
  center: new THREE.Vector3(0, 0, 0),
} as const;

/** Ritual default positions */
export const RITUAL_POSITIONS: Record<RitualType, THREE.Vector3> = {
  breath_sync: RITUAL_ZONES.east,
  engine_consultation: RITUAL_ZONES.east,
  stone_and_sigil: RITUAL_ZONES.west,
  south_gate_passage: RITUAL_ZONES.south,
};

/** Ritual tracker state slice for Zustand */
export interface RitualTrackerState {
  /** Completed rituals */
  completedRituals: RitualCompletion[];
  /** Floor marks */
  floorMarks: RitualMark[];
  /** Current session ID */
  sessionId: string;
  /** Active ritual (if any) */
  activeRitual: RitualType | null;
}

/** Ritual tracker actions */
export interface RitualTrackerActions {
  /** Mark ritual as complete */
  completeRitual: (
    type: RitualType,
    position: THREE.Vector3,
    quality: number
  ) => void;
  /** Check if ritual is complete */
  isRitualComplete: (type: RitualType) => boolean;
  /** Get completion data for ritual */
  getRitualCompletion: (type: RitualType) => RitualCompletion | null;
  /** Get all floor marks */
  getFloorMarks: () => RitualMark[];
  /** Set active ritual */
  setActiveRitual: (type: RitualType | null) => void;
  /** Get active ritual */
  getActiveRitual: () => RitualType | null;
  /** Reset all rituals (for new session) */
  resetRituals: () => void;
  /** Get completion percentage */
  getCompletionPercentage: () => number;
}

/** Ritual tracker store slice */
export const createRitualTrackerSlice = (
  set: (fn: (state: RitualTrackerState) => void) => void,
  get: () => RitualTrackerState
): RitualTrackerState & RitualTrackerActions => {
  // Load from localStorage
  const loadFromStorage = (): Partial<RitualTrackerState> => {
    try {
      const stored = localStorage.getItem('spatial-anubis:rituals');
      if (stored) {
        const data = JSON.parse(stored);
        return {
          completedRituals: data.completedRituals || [],
          floorMarks: data.floorMarks || [],
        };
      }
    } catch (err) {
      console.error('[RitualTracker] Failed to load from storage:', err);
    }
    return {};
  };

  // Save to localStorage
  const saveToStorage = (state: RitualTrackerState) => {
    try {
      localStorage.setItem(
        'spatial-anubis:rituals',
        JSON.stringify({
          completedRituals: state.completedRituals,
          floorMarks: state.floorMarks,
        })
      );
    } catch (err) {
      console.error('[RitualTracker] Failed to save to storage:', err);
    }
  };

  const stored = loadFromStorage();
  const sessionId = `session-${Date.now()}`;

  return {
    // Initial state
    completedRituals: stored.completedRituals || [],
    floorMarks: stored.floorMarks || [],
    sessionId,
    activeRitual: null,

    // Actions
    completeRitual: (type, position, quality) => {
      set((state) => {
        // Check if already complete
        const existing = state.completedRituals.find(r => r.type === type);
        if (existing) {
          console.warn(`[RitualTracker] Ritual ${type} already complete`);
          return;
        }

        // Create completion record
        const completion: RitualCompletion = {
          type,
          completedAt: Date.now(),
          position: position.clone(),
          markPosition: new THREE.Vector3(position.x, 0, position.z),
          quality: Math.max(0, Math.min(1, quality)),
          sessionId: state.sessionId,
        };

        // Create floor mark
        const mark: RitualMark = {
          id: `mark-${type}-${Date.now()}`,
          ritualType: type,
          position: completion.markPosition,
          color: new THREE.Color(0xC5A442), // Aged Gold
          intensity: 0.5 + quality * 0.5,
          radius: 1.5,
          createdAt: Date.now(),
        };

        state.completedRituals.push(completion);
        state.floorMarks.push(mark);

        console.log(`[RitualTracker] Ritual ${type} completed`, {
          quality: quality.toFixed(2),
          position: completion.markPosition,
        });

        // Save to storage
        saveToStorage(state);
      });
    },

    isRitualComplete: (type) => {
      const state = get();
      return state.completedRituals.some(r => r.type === type);
    },

    getRitualCompletion: (type) => {
      const state = get();
      return state.completedRituals.find(r => r.type === type) || null;
    },

    getFloorMarks: () => {
      return get().floorMarks;
    },

    setActiveRitual: (type) => {
      set((state) => {
        state.activeRitual = type;
      });
    },

    getActiveRitual: () => {
      return get().activeRitual;
    },

    resetRituals: () => {
      set((state) => {
        state.completedRituals = [];
        state.floorMarks = [];
        state.activeRitual = null;
        state.sessionId = `session-${Date.now()}`;

        console.log('[RitualTracker] Rituals reset');
        saveToStorage(state);
      });
    },

    getCompletionPercentage: () => {
      const state = get();
      const totalRituals = 4; // 4 founding rituals
      return (state.completedRituals.length / totalRituals) * 100;
    },
  };
};

/**
 * Get ritual display name
 */
export function getRitualName(type: RitualType): string {
  switch (type) {
    case 'breath_sync':
      return 'Breath Sync Attunement';
    case 'engine_consultation':
      return 'Engine Consultation';
    case 'stone_and_sigil':
      return 'Stone of Intention & Sigil Forge';
    case 'south_gate_passage':
      return 'South Gate Passage';
  }
}

/**
 * Get ritual description
 */
export function getRitualDescription(type: RitualType): string {
  switch (type) {
    case 'breath_sync':
      return 'Attune your vessel to the breathfield through 3 coherent breath cycles.';
    case 'engine_consultation':
      return 'Consult the 13 engines for guidance on your path.';
    case 'stone_and_sigil':
      return 'Carry the Stone of Intention to the fire circle and forge your sigil.';
    case 'south_gate_passage':
      return 'Pass through the South Gate to complete your initiation.';
  }
}

/**
 * Get ritual zone color
 */
export function getRitualZoneColor(type: RitualType): THREE.Color {
  switch (type) {
    case 'breath_sync':
    case 'engine_consultation':
      return new THREE.Color(0xC5A442); // Aged Gold (East)
    case 'stone_and_sigil':
      return new THREE.Color(0xC45B28); // Terracotta (West)
    case 'south_gate_passage':
      return new THREE.Color(0x8B6914); // Vessel Bronze (South)
  }
}

/**
 * Calculate total ritual quality score
 */
export function calculateTotalQuality(completions: RitualCompletion[]): number {
  if (completions.length === 0) return 0;

  const totalQuality = completions.reduce((sum, c) => sum + c.quality, 0);
  return totalQuality / completions.length;
}

/**
 * Check if all founding rituals are complete
 */
export function areAllRitualsComplete(completions: RitualCompletion[]): boolean {
  const ritualTypes: RitualType[] = [
    'breath_sync',
    'engine_consultation',
    'stone_and_sigil',
    'south_gate_passage',
  ];

  return ritualTypes.every(type =>
    completions.some(c => c.type === type)
  );
}

/**
 * Get next recommended ritual
 */
export function getNextRitual(completions: RitualCompletion[]): RitualType | null {
  const order: RitualType[] = [
    'breath_sync',
    'engine_consultation',
    'stone_and_sigil',
    'south_gate_passage',
  ];

  for (const ritual of order) {
    if (!completions.some(c => c.type === ritual)) {
      return ritual;
    }
  }

  return null; // All complete
}
