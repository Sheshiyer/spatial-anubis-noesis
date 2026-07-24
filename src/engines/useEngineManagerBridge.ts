/**
 * Engine Manager Bridge
 * Bridges EngineManager (class-based singleton) events to cartographerStore (Zustand)
 *
 * EngineManager handles: unlock rules, bio-gating, tier progression
 * CartographerStore handles: positions, LOD, visual states for all 13 engines
 *
 * Bridge: EngineManager events → cartographerStore visual updates
 * Bridge: Store bio-state → EngineManager for unlock checks
 */

import { useEffect, useRef, useCallback } from 'react';
import { useCartographerStore } from './meta/cartographerStore';
import { useEngines } from './hooks/useEngines';
import { useStore } from '../state/store';
import type { EngineId as CartographerEngineId } from './meta/types';
import type { EngineId as ManagerEngineId } from './types';

// ============================================================================
// ID Mapping between the two systems
// ============================================================================

/**
 * Map EngineManager IDs (snake_case) to CartographerStore IDs
 * EngineManager: gene_keys, human_design, decision_mirror, transit_overlay, somatic_canticle
 * CartographerStore: genekeys, humandesign, decision-mirror, transits, somatic-canticle
 */
const MANAGER_TO_CARTOGRAPHER: Record<string, CartographerEngineId> = {
  // Tier 2
  biorhythm: 'biorhythm',
  gene_keys: 'genekeys',
  human_design: 'humandesign',
  chronobiology: 'chronobiology',
  // Tier 3
  decision_mirror: 'decision-mirror',
  transit_overlay: 'transits',
  somatic_canticle: 'somatic-canticle',
};

/** Reverse mapping for future use (cartographer → manager) */
export const CARTOGRAPHER_TO_MANAGER: Record<string, ManagerEngineId> = {
  biorhythm: 'biorhythm',
  genekeys: 'gene_keys',
  humandesign: 'human_design',
  chronobiology: 'chronobiology',
  'decision-mirror': 'decision_mirror',
  transits: 'transit_overlay',
  'somatic-canticle': 'somatic_canticle',
};

function toCartographerId(managerId: string): CartographerEngineId | null {
  return MANAGER_TO_CARTOGRAPHER[managerId] ?? null;
}

// ============================================================================
// Bridge Hook
// ============================================================================

/**
 * Bridge hook: call once at the constellation root level.
 * Listens to EngineManager events and syncs with cartographerStore.
 * Pipes bio-state from vessel store to EngineManager for gating checks.
 */
export function useEngineManagerBridge() {
  const { engineManager, refreshState } = useEngines();
  const unlockEngine = useCartographerStore((s) => s.unlockEngine);
  const setEngineStatus = useCartographerStore((s) => s.setEngineStatus);
  const vesselBioState = useStore((s) => s.vessel.bioState);
  const bridgeInitialized = useRef(false);

  // Sync EngineManager unlock state → CartographerStore on changes
  const syncUnlockStates = useCallback(() => {
    const state = engineManager.getState();

    Object.entries(state.engines).forEach(([id, engine]) => {
      const cartId = toCartographerId(id);
      if (!cartId) return;

      if (engine.isUnlocked) {
        unlockEngine(cartId);
      }
    });
  }, [engineManager, unlockEngine]);

  // Subscribe to EngineManager events
  useEffect(() => {
    if (bridgeInitialized.current) return;
    bridgeInitialized.current = true;

    const unsubscribers: Array<() => void> = [];

    // Listen to all tier 2/3 engine events
    const engineIds: ManagerEngineId[] = [
      'biorhythm', 'gene_keys', 'human_design', 'chronobiology',
      'decision_mirror', 'transit_overlay', 'somatic_canticle',
    ];

    engineIds.forEach((id) => {
      const unsub = engineManager.onEvent(id, (event) => {
        const cartId = toCartographerId(event.engineId);
        if (!cartId) return;

        if (event.type === 'unlocked') {
          unlockEngine(cartId);
        } else if (event.type === 'unlocking') {
          setEngineStatus(cartId, 'active');
        }
      });
      unsubscribers.push(unsub);
    });

    // Initial sync
    syncUnlockStates();

    return () => {
      unsubscribers.forEach((unsub) => unsub());
      bridgeInitialized.current = false;
    };
  }, [engineManager, unlockEngine, setEngineStatus, syncUnlockStates]);

  // Pipe bio-state to EngineManager for gating checks
  useEffect(() => {
    if (!vesselBioState) return;

    // Map bio-state coherence to PIP data format
    const coherence = vesselBioState.coherence ?? 0;
    const isConnected = coherence > 0;

    engineManager.updatePIPStatus(isConnected);

    if (isConnected) {
      engineManager.updatePIPData({
        coherence,
        hrv: 0,
        breathPhase: vesselBioState.breathPhase ?? 0,
        timestamp: Date.now(),
      } as any);
    }
  }, [engineManager, vesselBioState]);

  return {
    syncUnlockStates,
    refreshState,
    toCartographerId,
  };
}
