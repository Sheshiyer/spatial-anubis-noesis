/**
 * Cartographer Store Slice
 * 
 * P3-S3-01 to P3-S3-08: Cartographer's Compass implementation
 * - Orrery/gyroscope artifact at East Wing apex
 * - Orbital path activation
 * - Meta-reading synthesis
 * - 2D map projection
 * - 13-engine constellation assembly
 * - Gravity well system
 * - Unlock progression
 * - Unlock animation sequences
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  EngineId,
  EngineState,
  CartographerState,
  CartographerStatus,
  OrbitalPath,
  MetaPattern,
  CartographerMap,
  AggregatedReading,
  MapNode,
  MapConnection,
  EnginePosition,
} from './types';

// ============================================================================
// Constants
// ============================================================================

const EAST_WING_CENTER: EnginePosition = { x: 50, y: 0, z: 0 };

const ENGINE_POSITIONS: Record<EngineId, EnginePosition> = {
  // Tier 1: Inner Ring (r=5, y=-1)
  vimshottari: { x: 55, y: -1, z: 0 },
  iching: { x: 51.55, y: -1, z: 4.76 },
  tarot: { x: 45.95, y: -1, z: 2.94 },
  runes: { x: 45.95, y: -1, z: -2.94 },
  numerology: { x: 51.55, y: -1, z: -4.76 },
  // Tier 2: Middle Ring (r=10, y=0)
  biorhythm: { x: 60, y: 0, z: 0 },
  genekeys: { x: 50, y: 0, z: 10 },
  humandesign: { x: 40, y: 0, z: 0 },
  chronobiology: { x: 50, y: 0, z: -10 },
  // Tier 3: Outer Ring (r=15, y=2)
  'decision-mirror': { x: 65, y: 2, z: 0 },
  transits: { x: 42.5, y: 2, z: 12.99 },
  'somatic-canticle': { x: 42.5, y: 2, z: -12.99 },
  // Cartographer orbits all
  'cartographer-compass': { x: 67, y: 3, z: 0 }, // Initial position
};

const CARTOGRAPHER_UNLOCK_THRESHOLD = 7;
const ORBIT_PERIOD = 300; // 300 seconds per revolution (P3-S3-21)

// ============================================================================
// Initial State
// ============================================================================

const createInitialOrbitalPath = (): OrbitalPath => ({
  radius: 17,
  yOffset: 0,
  period: ORBIT_PERIOD,
  currentPhase: 0,
});

const createInitialDialStates = (): Record<EngineId, boolean> => ({
  vimshottari: false,
  iching: false,
  tarot: false,
  runes: false,
  numerology: false,
  biorhythm: false,
  genekeys: false,
  humandesign: false,
  chronobiology: false,
  'decision-mirror': false,
  transits: false,
  'somatic-canticle': false,
  'cartographer-compass': false,
});

const createDefaultEngineState = (engineId: EngineId, index: number): EngineState => {
  const tier = index < 5 ? 1 : index < 9 ? 2 : 3;
  const isTier1 = tier === 1;
  
  return {
    engineId,
    tier,
    status: isTier1 ? 'unlocked' : 'locked',
    position: ENGINE_POSITIONS[engineId],
    visualState: {
      primaryColor: isTier1 ? '#F5F0E8' : '#6B6B6B',
      emissiveIntensity: isTier1 ? 0.3 : 0,
      scaleMultiplier: 1,
      bloomEnabled: isTier1,
    },
    interactionState: {
      hovered: false,
      engaged: false,
      readingInProgress: false,
      lastInteractionTimestamp: null,
    },
    currentReading: null,
    history: [],
    gravityWell: {
      active: isTier1,
      innerRadius: 2.0,
      outerRadius: 8.0,
      force: 0.5,
    },
  };
};

const ENGINE_IDS: EngineId[] = [
  'vimshottari', 'iching', 'tarot', 'runes', 'numerology',
  'biorhythm', 'genekeys', 'humandesign', 'chronobiology',
  'decision-mirror', 'transits', 'somatic-canticle', 'cartographer-compass',
];

// ============================================================================
// Store Interface
// ============================================================================

export interface CartographerStore {
  // Constellation state
  engines: EngineState[];
  constellationRotation: number;
  
  // Cartographer state
  cartographer: CartographerState;
  
  // Actions
  setEngineStatus: (engineId: EngineId, status: EngineState['status']) => void;
  setEngineHovered: (engineId: EngineId, hovered: boolean) => void;
  setEngineEngaged: (engineId: EngineId, engaged: boolean) => void;
  recordReading: (engineId: EngineId, reading: EngineState['currentReading']) => void;
  updateCartographerOrbit: (deltaTime: number) => void;
  pauseCartographer: () => void;
  resumeCartographer: () => void;
  checkCartographerUnlock: () => boolean;
  synthesizeMetaReading: () => MetaPattern[];
  unfoldMap: () => CartographerMap | null;
  getDialStates: () => Record<EngineId, boolean>;
  getConsultedCount: () => number;
  getGravityWellForce: (engineId: EngineId, vesselPosition: EnginePosition) => number;
  updateConstellationRotation: (deltaTime: number) => void;
  unlockEngine: (engineId: EngineId) => void;
  reset: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

const distance3D = (a: EnginePosition, b: EnginePosition): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

const calculateGravityForce = (
  distance: number,
  innerRadius: number,
  outerRadius: number,
  maxForce: number
): number => {
  if (distance > outerRadius) return 0;
  if (distance < innerRadius) return maxForce;
  
  // Inverse square falloff
  const normalizedDistance = (distance - innerRadius) / (outerRadius - innerRadius);
  return maxForce * (1 - normalizedDistance) * (1 - normalizedDistance);
};

// ============================================================================
// Store Creation
// ============================================================================

const initialEngines = ENGINE_IDS.map((id, index) => createDefaultEngineState(id, index));

export const useCartographerStore = create<CartographerStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    engines: initialEngines,
    constellationRotation: 0,
    cartographer: {
      status: 'orbiting',
      orbitalPath: createInitialOrbitalPath(),
      unlocked: false,
      dialStates: createInitialDialStates(),
      metaPatterns: [],
      currentMap: null,
      lastMetaReading: [],
      unlockProgress: 0,
    },

    // =========================================================================
    // Engine Actions
    // =========================================================================

    setEngineStatus: (engineId, status) => {
      set((state) => ({
        engines: state.engines.map((e) =>
          e.engineId === engineId
            ? {
                ...e,
                status,
                gravityWell: {
                  ...e.gravityWell,
                  active: status !== 'locked',
                },
                visualState: {
                  ...e.visualState,
                  primaryColor: status === 'locked' ? '#6B6B6B' : e.visualState.primaryColor,
                  emissiveIntensity: status === 'locked' ? 0 : 0.3,
                },
              }
            : e
        ),
      }));
    },

    setEngineHovered: (engineId, hovered) => {
      set((state) => ({
        engines: state.engines.map((e) =>
          e.engineId === engineId
            ? {
                ...e,
                interactionState: { ...e.interactionState, hovered },
                visualState: {
                  ...e.visualState,
                  scaleMultiplier: hovered ? 1.1 : 1.0,
                },
              }
            : e
        ),
      }));
    },

    setEngineEngaged: (engineId, engaged) => {
      set((state) => ({
        engines: state.engines.map((e) =>
          e.engineId === engineId
            ? {
                ...e,
                interactionState: {
                  ...e.interactionState,
                  engaged,
                  lastInteractionTimestamp: engaged ? Date.now() : e.interactionState.lastInteractionTimestamp,
                },
              }
            : e
        ),
      }));
    },

    recordReading: (engineId, reading) => {
      set((state) => {
        const engine = state.engines.find((e) => e.engineId === engineId);
        if (!engine || !reading) return state;

        const newHistoryEntry: EngineHistoryEntry = {
          readingId: reading.readingId,
          timestamp: reading.timestamp,
          summary: reading.displayConfig.textContent.slice(0, 100) + '...',
        };

        const updatedDialStates = {
          ...state.cartographer.dialStates,
          [engineId]: true,
        };

        const consultedCount = Object.values(updatedDialStates).filter(Boolean).length;
        const cartographerUnlocked = consultedCount >= CARTOGRAPHER_UNLOCK_THRESHOLD;

        return {
          engines: state.engines.map((e) =>
            e.engineId === engineId
              ? {
                  ...e,
                  status: 'completed' as const,
                  currentReading: reading,
                  history: [...e.history, newHistoryEntry],
                  visualState: {
                    ...e.visualState,
                    primaryColor: '#B8860B', // Aged Gold for completed
                    emissiveIntensity: 0.8,
                  },
                }
              : e
          ),
          cartographer: {
            ...state.cartographer,
            dialStates: updatedDialStates,
            unlocked: cartographerUnlocked,
            unlockProgress: consultedCount,
          },
        };
      });

      // Check for unlocks after recording
      get().checkCartographerUnlock();
    },

    // =========================================================================
    // Cartographer Actions
    // =========================================================================

    updateCartographerOrbit: (deltaTime) => {
      set((state) => {
        if (state.cartographer.status !== 'orbiting') return state;

        const newPhase =
          (state.cartographer.orbitalPath.currentPhase +
            (deltaTime / state.cartographer.orbitalPath.period) * 360) %
          360;

        return {
          cartographer: {
            ...state.cartographer,
            orbitalPath: {
              ...state.cartographer.orbitalPath,
              currentPhase: newPhase,
            },
          },
        };
      });
    },

    pauseCartographer: () => {
      set((state) => ({
        cartographer: { ...state.cartographer, status: 'paused' },
      }));
    },

    resumeCartographer: () => {
      set((state) => ({
        cartographer: { ...state.cartographer, status: 'orbiting' },
      }));
    },

    checkCartographerUnlock: () => {
      const state = get();
      const consultedCount = Object.values(state.cartographer.dialStates).filter(Boolean).length;
      const shouldUnlock = consultedCount >= CARTOGRAPHER_UNLOCK_THRESHOLD;

      if (shouldUnlock && !state.cartographer.unlocked) {
        set((s) => ({
          cartographer: {
            ...s.cartographer,
            unlocked: true,
            unlockProgress: consultedCount,
          },
          engines: s.engines.map((e) =>
            e.engineId === 'cartographer-compass'
              ? {
                  ...e,
                  status: 'unlocked',
                  visualState: {
                    ...e.visualState,
                    primaryColor: '#B8860B',
                    emissiveIntensity: 0.5,
                    bloomEnabled: true,
                  },
                }
              : e
          ),
        }));
      }

      return shouldUnlock;
    },

    synthesizeMetaReading: () => {
      const state = get();
      const consultedEngines = state.engines.filter(
        (e) => state.cartographer.dialStates[e.engineId] && e.currentReading
      );

      if (consultedEngines.length < 2) return [];

      // Aggregate patterns from all consulted engines
      const patterns: MetaPattern[] = [];
      const allThemes = new Map<string, EngineId[]>();

      // Collect themes from all readings
      consultedEngines.forEach((engine) => {
        const reading = engine.currentReading;
        if (!reading) return;

        const themes = reading.displayConfig.highlightKeywords;
        themes.forEach((theme) => {
          const existing = allThemes.get(theme) || [];
          if (!existing.includes(engine.engineId)) {
            allThemes.set(theme, [...existing, engine.engineId]);
          }
        });
      });

      // Find patterns (themes appearing in multiple engines)
      allThemes.forEach((engines, theme) => {
        if (engines.length >= 2) {
          patterns.push({
            patternId: `pattern-${theme}-${Date.now()}`,
            name: `${theme} Convergence`,
            description: `The theme "${theme}" appears across ${engines.length} engines`,
            involvedEngines: engines,
            coherence: engines.length / consultedEngines.length,
            significance:
              engines.length >= 4 ? 'profound' : engines.length >= 3 ? 'major' : 'moderate',
          });
        }
      });

      set((s) => ({
        cartographer: {
          ...s.cartographer,
          metaPatterns: patterns,
          lastMetaReading: consultedEngines.map((e) => ({
            readingId: e.currentReading!.readingId,
            engineId: e.engineId,
            timestamp: e.currentReading!.timestamp,
            themes: e.currentReading!.displayConfig.highlightKeywords,
            keywords: e.currentReading!.displayConfig.highlightKeywords,
            coherence: 0.7, // Placeholder - would come from actual coherence
          })),
        },
      }));

      return patterns;
    },

    unfoldMap: () => {
      const state = get();
      if (!state.cartographer.unlocked) return null;

      const consultedEngines = state.engines.filter(
        (e) => state.cartographer.dialStates[e.engineId]
      );

      // Create 2D map projection
      const nodes: MapNode[] = consultedEngines.map((engine, index) => ({
        engineId: engine.engineId,
        position: engine.position,
        weight: engine.history.length,
        themes: engine.currentReading?.displayConfig.highlightKeywords || [],
        glowIntensity: engine.visualState.emissiveIntensity,
      }));

      // Calculate connections based on shared themes
      const connections: MapConnection[] = [];
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const sharedThemes = nodes[i].themes.filter((t) => nodes[j].themes.includes(t));
          if (sharedThemes.length > 0) {
            connections.push({
              from: nodes[i].engineId,
              to: nodes[j].engineId,
              weight: sharedThemes.length / Math.max(nodes[i].themes.length, nodes[j].themes.length),
              sharedThemes,
            });
          }
        }
      }

      const map: CartographerMap = {
        nodes,
        connections,
        narrative: `Across ${consultedEngines.length} engines, ${state.cartographer.metaPatterns.length} convergent patterns emerge...`,
        cartographerVoice: consultedEngines.length >= 10 ? 'revealing' : 'guiding',
      };

      set((s) => ({
        cartographer: {
          ...s.cartographer,
          currentMap: map,
          status: 'unfolding',
        },
      }));

      return map;
    },

    getDialStates: () => get().cartographer.dialStates,

    getConsultedCount: () =>
      Object.values(get().cartographer.dialStates).filter(Boolean).length,

    // =========================================================================
    // Physics/Gravity
    // =========================================================================

    getGravityWellForce: (engineId, vesselPosition) => {
      const engine = get().engines.find((e) => e.engineId === engineId);
      if (!engine || !engine.gravityWell.active || engine.status === 'locked') {
        return 0;
      }

      const distance = distance3D(engine.position, vesselPosition);
      return calculateGravityForce(
        distance,
        engine.gravityWell.innerRadius,
        engine.gravityWell.outerRadius,
        engine.gravityWell.force
      );
    },

    // =========================================================================
    // Constellation Animation
    // =========================================================================

    updateConstellationRotation: (deltaTime) => {
      set((state) => ({
        constellationRotation: (state.constellationRotation + deltaTime * 0.012) % 360, // 1 rev per 300s
      }));
    },

    // =========================================================================
    // Unlock System
    // =========================================================================

    unlockEngine: (engineId) => {
      set((state) => ({
        engines: state.engines.map((e) =>
          e.engineId === engineId && e.status === 'locked'
            ? {
                ...e,
                status: 'unlocked',
                visualState: {
                  ...e.visualState,
                  primaryColor: '#F5F0E8',
                  emissiveIntensity: 0.3,
                  bloomEnabled: true,
                },
                gravityWell: {
                  ...e.gravityWell,
                  active: true,
                },
              }
            : e
        ),
      }));
    },

    // =========================================================================
    // Reset
    // =========================================================================

    reset: () => {
      set({
        engines: initialEngines,
        constellationRotation: 0,
        cartographer: {
          status: 'orbiting',
          orbitalPath: createInitialOrbitalPath(),
          unlocked: false,
          dialStates: createInitialDialStates(),
          metaPatterns: [],
          currentMap: null,
          lastMetaReading: [],
          unlockProgress: 0,
        },
      });
    },
  }))
);

// ============================================================================
// Selectors
// ============================================================================

export const selectEnginesByTier = (state: CartographerStore, tier: number) =>
  state.engines.filter((e) => e.tier === tier);

export const selectUnlockedEngines = (state: CartographerStore) =>
  state.engines.filter((e) => e.status !== 'locked');

export const selectCartographerPosition = (state: CartographerStore): EnginePosition => {
  const phaseRad = (state.cartographer.orbitalPath.currentPhase * Math.PI) / 180;
  const center = EAST_WING_CENTER;
  return {
    x: center.x + Math.cos(phaseRad) * state.cartographer.orbitalPath.radius,
    y: center.y + state.cartographer.orbitalPath.yOffset,
    z: center.z + Math.sin(phaseRad) * state.cartographer.orbitalPath.radius,
  };
};

export const selectTotalGravityForce = (
  state: CartographerStore,
  vesselPosition: EnginePosition
): EnginePosition => {
  let totalFx = 0;
  let totalFy = 0;
  let totalFz = 0;

  state.engines.forEach((engine) => {
    if (engine.status === 'locked' || !engine.gravityWell.active) return;

    const force = state.getGravityWellForce(engine.engineId, vesselPosition);
    if (force <= 0) return;

    const dx = engine.position.x - vesselPosition.x;
    const dy = engine.position.y - vesselPosition.y;
    const dz = engine.position.z - vesselPosition.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (distance > 0) {
      totalFx += (dx / distance) * force;
      totalFy += (dy / distance) * force;
      totalFz += (dz / distance) * force;
    }
  });

  return { x: totalFx, y: totalFy, z: totalFz };
};
