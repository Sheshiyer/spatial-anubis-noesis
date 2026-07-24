/**
 * Vessel Zustand Slice
 * P1-S1-36: Build vessel Zustand slice
 * P1-S1-50: Build vessel state persistence
 */

import * as THREE from 'three';
import type {
  VesselState,
  VesselBioState,
  VesselVisualConfig,
  VesselTransform,
  VesselRenderingMode,
  PersistedVesselConfig,
  VesselId,
  VesselPath,
} from '../types/vessel';
import {
  DEFAULT_VISUAL_CONFIG,
  DEFAULT_PHYSICS_CONFIG,
  DEFAULT_BIO_STATE,
  VESSEL_SPAWN_CONFIG,
} from '../types/vessel';

/** Storage key for vessel persistence */
const VESSEL_STORAGE_KEY = 'spatial-anubis-vessel';

/** Vessel slice state */
export interface VesselSliceState {
  vessel: VesselState;
  renderingMode: VesselRenderingMode;
}

/** Vessel slice actions */
export interface VesselSliceActions {
  setVesselPosition: (position: THREE.Vector3) => void;
  setVesselRotation: (rotation: THREE.Quaternion) => void;
  setVesselTransform: (transform: Partial<VesselTransform>) => void;
  setVesselBioState: (bioState: Partial<VesselBioState>) => void;
  setVesselVisualConfig: (config: Partial<VesselVisualConfig>) => void;
  setVesselCalibrated: (isCalibrated: boolean) => void;
  setVesselSpawned: (isSpawned: boolean) => void;
  setVesselPath: (path: VesselPath) => void;
  setRenderingMode: (mode: VesselRenderingMode) => void;
  toggleRenderingMode: () => void;
  resetVessel: () => void;
  loadPersistedConfig: () => void;
  saveVesselConfig: () => void;
}

/** Combined vessel slice */
export type VesselSlice = VesselSliceState & VesselSliceActions;

/**
 * Generate unique vessel ID
 */
function generateVesselId(): VesselId {
  return `vessel-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Create initial vessel state
 */
function createInitialVesselState(): VesselState {
  return {
    vesselId: generateVesselId(),
    path: 'A',
    transform: {
      position: new THREE.Vector3(
        VESSEL_SPAWN_CONFIG.position.x,
        VESSEL_SPAWN_CONFIG.position.y,
        VESSEL_SPAWN_CONFIG.position.z
      ),
      rotation: new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, -1),
        new THREE.Vector3(
          VESSEL_SPAWN_CONFIG.facing.x,
          VESSEL_SPAWN_CONFIG.facing.y,
          VESSEL_SPAWN_CONFIG.facing.z
        ).normalize()
      ),
      velocity: new THREE.Vector3(0, 0, 0),
      angularVelocity: new THREE.Vector3(0, 0, 0),
    },
    bioState: { ...DEFAULT_BIO_STATE },
    visualConfig: { ...DEFAULT_VISUAL_CONFIG },
    physicsConfig: { ...DEFAULT_PHYSICS_CONFIG },
    isCalibrated: false,
    isSpawned: false,
    spawnTime: 0,
  };
}

/**
 * Persist vessel config to localStorage
 */
function persistVesselConfig(config: PersistedVesselConfig): void {
  try {
    localStorage.setItem(VESSEL_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('[VesselSlice] Failed to persist vessel config:', e);
  }
}

/**
 * Load persisted vessel config from localStorage
 */
function loadPersistedVesselConfig(): PersistedVesselConfig | null {
  try {
    const data = localStorage.getItem(VESSEL_STORAGE_KEY);
    if (data) {
      return JSON.parse(data) as PersistedVesselConfig;
    }
  } catch (e) {
    console.warn('[VesselSlice] Failed to load persisted vessel config:', e);
  }
  return null;
}

/**
 * Vessel slice creator
 * Note: This returns the slice that will be merged into the main store
 */
export const createVesselSlice = (
  set: (partial: Record<string, unknown>) => void,
  get: () => VesselSlice
): VesselSlice => ({
  // Initial state
  vessel: createInitialVesselState(),
  renderingMode: 'splat',

  // Actions
  setVesselPosition: (position) => {
    const current = get();
    set({
      vessel: {
        ...current.vessel,
        transform: {
          ...current.vessel.transform,
          position: position.clone(),
        },
      },
    });
    get().saveVesselConfig();
  },

  setVesselRotation: (rotation) => {
    const current = get();
    set({
      vessel: {
        ...current.vessel,
        transform: {
          ...current.vessel.transform,
          rotation: rotation.clone(),
        },
      },
    });
  },

  setVesselTransform: (transform) => {
    const current = get();
    set({
      vessel: {
        ...current.vessel,
        transform: {
          ...current.vessel.transform,
          ...transform,
        },
      },
    });
  },

  setVesselBioState: (bioState) => {
    const current = get();
    set({
      vessel: {
        ...current.vessel,
        bioState: {
          ...current.vessel.bioState,
          ...bioState,
          lastUpdate: Date.now(),
        },
      },
    });
  },

  setVesselVisualConfig: (config) => {
    const current = get();
    set({
      vessel: {
        ...current.vessel,
        visualConfig: {
          ...current.vessel.visualConfig,
          ...config,
        },
      },
    });
    get().saveVesselConfig();
  },

  setVesselCalibrated: (isCalibrated) => {
    const current = get();
    set({
      vessel: {
        ...current.vessel,
        isCalibrated,
      },
    });
    get().saveVesselConfig();
  },

  setVesselSpawned: (isSpawned) => {
    const current = get();
    set({
      vessel: {
        ...current.vessel,
        isSpawned,
        spawnTime: isSpawned ? Date.now() : current.vessel.spawnTime,
      },
    });
  },

  setVesselPath: (path) => {
    const current = get();
    set({
      vessel: {
        ...current.vessel,
        path,
      },
    });
  },

  setRenderingMode: (mode) => {
    set({ renderingMode: mode });
  },

  toggleRenderingMode: () => {
    const current = get();
    set({ renderingMode: current.renderingMode === 'splat' ? 'geometric' : 'splat' });
  },

  resetVessel: () => {
    set({ vessel: createInitialVesselState() });
    get().saveVesselConfig();
  },

  loadPersistedConfig: () => {
    const persisted = loadPersistedVesselConfig();
    if (persisted) {
      const current = get();
      set({
        vessel: {
          ...current.vessel,
          vesselId: persisted.vesselId,
          path: persisted.path,
          visualConfig: {
            ...current.vessel.visualConfig,
            ...persisted.visualConfig,
          },
          isCalibrated: persisted.isCalibrated,
        },
        renderingMode: persisted.path === 'A' ? 'splat' : 'geometric',
      });
    }
  },

  saveVesselConfig: () => {
    const vessel = get().vessel;
    const config: PersistedVesselConfig = {
      vesselId: vessel.vesselId,
      path: vessel.path,
      visualConfig: vessel.visualConfig,
      isCalibrated: vessel.isCalibrated,
      lastUpdated: Date.now(),
    };
    persistVesselConfig(config);
  },
});
