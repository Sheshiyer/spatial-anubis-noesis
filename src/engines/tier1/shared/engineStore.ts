/**
 * Tier 1 Engine State Management (P3-S1-29)
 * Zustand store for engine interaction states
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  EngineId,
  EngineStatus,
  InteractionState,
  Tier1EngineState,
  EngineReading,
  FilamentConnection,
  LoadingState,
} from './types';
import { ENGINE_POSITIONS } from './types';

// ============================================================================
// Initial State
// ============================================================================

const createInitialEngineState = (engineId: EngineId): Tier1EngineState => ({
  engineId,
  status: engineId === 'numerology' ? 'locked' : 'unlocked',
  position: ENGINE_POSITIONS[engineId],
  interaction: 'idle',
  lastInteractionTimestamp: null,
  currentReading: null,
  history: [],
});

const INITIAL_ENGINES: Record<EngineId, Tier1EngineState> = {
  'i-ching': createInitialEngineState('i-ching'),
  'vimshottari': createInitialEngineState('vimshottari'),
  'tarot': createInitialEngineState('tarot'),
  'runes': createInitialEngineState('runes'),
  'numerology': createInitialEngineState('numerology'),
};

// ============================================================================
// Store Interface
// ============================================================================

interface Tier1EngineStore {
  // Engine states
  engines: Record<EngineId, Tier1EngineState>;
  
  // Filament connections (P3-S1-28)
  filaments: FilamentConnection[];
  
  // Loading states (P3-S1-32, P3-S1-33)
  loadingStates: Record<EngineId, LoadingState>;
  
  // Actions
  setEngineInteraction: (engineId: EngineId, state: InteractionState) => void;
  setEngineStatus: (engineId: EngineId, status: EngineStatus) => void;
  setCurrentReading: (engineId: EngineId, reading: EngineReading | null) => void;
  addToHistory: (engineId: EngineId, summary: { readingId: string; summary: string }) => void;
  unlockEngine: (engineId: EngineId) => void;
  
  // Filament actions
  addFilament: (from: EngineId, to: EngineId) => void;
  updateFilamentStrength: (from: EngineId, to: EngineId, strength: number) => void;
  
  // Loading state actions
  setLoading: (engineId: EngineId, loading: boolean, type?: LoadingState['type']) => void;
  setLoadingProgress: (engineId: EngineId, progress: number) => void;
  triggerParticleBurst: (engineId: EngineId) => void;
  
  // Queries
  getConsultedEngines: () => EngineId[];
  getActiveEngines: () => EngineId[];
  hasConnection: (from: EngineId, to: EngineId) => boolean;
  
  // Hover expansion (P3-S1-31)
  hoveredEngine: EngineId | null;
  setHoveredEngine: (engineId: EngineId | null) => void;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useTier1EngineStore = create<Tier1EngineStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    engines: { ...INITIAL_ENGINES },
    filaments: [],
    loadingStates: {
      'i-ching': { isLoading: false, type: 'reading', progress: 0, particleBurst: false },
      'vimshottari': { isLoading: false, type: 'reading', progress: 0, particleBurst: false },
      'tarot': { isLoading: false, type: 'reading', progress: 0, particleBurst: false },
      'runes': { isLoading: false, type: 'reading', progress: 0, particleBurst: false },
      'numerology': { isLoading: false, type: 'calculation', progress: 0, particleBurst: false },
    },
    hoveredEngine: null,

    // Interaction state management
    setEngineInteraction: (engineId, interaction) => {
      set((state) => ({
        engines: {
          ...state.engines,
          [engineId]: {
            ...state.engines[engineId],
            interaction,
            lastInteractionTimestamp: Date.now(),
          },
        },
      }));
    },

    setEngineStatus: (engineId, status) => {
      set((state) => ({
        engines: {
          ...state.engines,
          [engineId]: {
            ...state.engines[engineId],
            status,
          },
        },
      }));
    },

    setCurrentReading: (engineId, reading) => {
      set((state) => ({
        engines: {
          ...state.engines,
          [engineId]: {
            ...state.engines[engineId],
            currentReading: reading,
            status: reading ? 'active' : 'unlocked',
          },
        },
      }));
    },

    addToHistory: (engineId, { readingId, summary }) => {
      set((state) => ({
        engines: {
          ...state.engines,
          [engineId]: {
            ...state.engines[engineId],
            history: [
              ...state.engines[engineId].history,
              { readingId, timestamp: Date.now(), summary },
            ],
            status: 'completed',
          },
        },
      }));
      
      // Auto-create filament connections
      const consulted = get().getConsultedEngines();
      for (const otherId of consulted) {
        if (otherId !== engineId && !get().hasConnection(engineId, otherId)) {
          get().addFilament(engineId, otherId);
        }
      }
      
      // Unlock numerology after first reading from any Tier 1 engine
      if (get().engines.numerology.status === 'locked') {
        const completedCount = Object.values(get().engines).filter(
          (e) => e.history.length > 0
        ).length;
        if (completedCount >= 1) {
          get().unlockEngine('numerology');
        }
      }
    },

    unlockEngine: (engineId) => {
      set((state) => ({
        engines: {
          ...state.engines,
          [engineId]: {
            ...state.engines[engineId],
            status: 'unlocked',
          },
        },
      }));
    },

    // Filament connections (P3-S1-28)
    addFilament: (from, to) => {
      const existing = get().filaments.find(
        (f) => (f.fromEngine === from && f.toEngine === to) ||
               (f.fromEngine === to && f.toEngine === from)
      );
      
      if (existing) {
        // Strengthen existing
        set((state) => ({
          filaments: state.filaments.map((f) =>
            f === existing
              ? { ...f, strength: Math.min(1, f.strength + 0.2), crossReferences: f.crossReferences + 1 }
              : f
          ),
        }));
      } else {
        // Create new
        set((state) => ({
          filaments: [
            ...state.filaments,
            {
              fromEngine: from,
              toEngine: to,
              strength: 0.3,
              crossReferences: 1,
              pulsePhase: Math.random() * Math.PI * 2,
            },
          ],
        }));
      }
    },

    updateFilamentStrength: (from, to, strength) => {
      set((state) => ({
        filaments: state.filaments.map((f) =>
          (f.fromEngine === from && f.toEngine === to) ||
          (f.fromEngine === to && f.toEngine === from)
            ? { ...f, strength: Math.max(0, Math.min(1, strength)) }
            : f
        ),
      }));
    },

    // Loading states (P3-S1-32, P3-S1-33)
    setLoading: (engineId, isLoading, type = 'reading') => {
      set((state) => ({
        loadingStates: {
          ...state.loadingStates,
          [engineId]: {
            ...state.loadingStates[engineId],
            isLoading,
            type,
            progress: isLoading ? 0 : 100,
            particleBurst: isLoading,
          },
        },
      }));
      
      // Clear particle burst after animation
      if (isLoading) {
        setTimeout(() => {
          set((state) => ({
            loadingStates: {
              ...state.loadingStates,
              [engineId]: {
                ...state.loadingStates[engineId],
                particleBurst: false,
              },
            },
          }));
        }, 500);
      }
    },

    setLoadingProgress: (engineId, progress) => {
      set((state) => ({
        loadingStates: {
          ...state.loadingStates,
          [engineId]: {
            ...state.loadingStates[engineId],
            progress: Math.max(0, Math.min(100, progress)),
          },
        },
      }));
    },

    triggerParticleBurst: (engineId) => {
      set((state) => ({
        loadingStates: {
          ...state.loadingStates,
          [engineId]: {
            ...state.loadingStates[engineId],
            particleBurst: true,
          },
        },
      }));
      
      setTimeout(() => {
        set((state) => ({
          loadingStates: {
            ...state.loadingStates,
            [engineId]: {
              ...state.loadingStates[engineId],
              particleBurst: false,
            },
          },
        }));
      }, 500);
    },

    // Hover expansion (P3-S1-31)
    setHoveredEngine: (engineId) => {
      set({ hoveredEngine: engineId });
    },

    // Queries
    getConsultedEngines: () => {
      return (Object.keys(get().engines) as EngineId[]).filter(
        (id) => get().engines[id].history.length > 0
      );
    },

    getActiveEngines: () => {
      return (Object.keys(get().engines) as EngineId[]).filter(
        (id) => get().engines[id].interaction !== 'idle'
      );
    },

    hasConnection: (from, to) => {
      return get().filaments.some(
        (f) => (f.fromEngine === from && f.toEngine === to) ||
               (f.fromEngine === to && f.toEngine === from)
      );
    },
  }))
);

// ============================================================================
// Selectors
// ============================================================================

export const selectEngineState = (engineId: EngineId) => (state: Tier1EngineStore) =>
  state.engines[engineId];

export const selectEngineInteraction = (engineId: EngineId) => (state: Tier1EngineStore) =>
  state.engines[engineId].interaction;

export const selectFilaments = (state: Tier1EngineStore) => state.filaments;

export const selectLoadingState = (engineId: EngineId) => (state: Tier1EngineStore) =>
  state.loadingStates[engineId];

export const selectIsHovered = (engineId: EngineId) => (state: Tier1EngineStore) =>
  state.hoveredEngine === engineId;
