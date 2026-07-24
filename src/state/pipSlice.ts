/**
 * PIP Slice for Zustand Store
 * P2-S3-19: Witness Agent stores in Zustand
 */

import type { PIPData, PIPConnectionState, PIPHealthStatus } from '../pip/types';

/** PIP slice state */
export interface PIPSlice {
  // PIP Data
  pipData: PIPData | null;
  pipConnectionState: PIPConnectionState;
  pipHealth: PIPHealthStatus;
  
  // PIP Actions
  setPIPData: (data: PIPData) => void;
  setPIPConnectionState: (state: PIPConnectionState) => void;
  setPIPHealth: (health: PIPHealthStatus) => void;
  clearPIPData: () => void;
}

/** Create PIP slice */
export function createPIPSlice(
  set: (partial: Record<string, unknown>) => void,
  get: () => PIPSlice
): PIPSlice {
  return {
    // Initial state
    pipData: null,
    pipConnectionState: 'disconnected',
    pipHealth: {
      state: 'disconnected',
      lastUpdateAt: null,
      updateRate: 0,
      reconnectAttempts: 0,
      latencyMs: 0,
      isHealthy: false,
    },

    // Actions
    setPIPData: (data: PIPData) => {
      set({ pipData: data });
    },

    setPIPConnectionState: (state: PIPConnectionState) => {
      set({ pipConnectionState: state });
    },

    setPIPHealth: (health: PIPHealthStatus) => {
      set({ pipHealth: health });
    },

    clearPIPData: () => {
      set({ pipData: null });
    },
  };
}

/** PIP selectors */
export const selectPIPData = (state: PIPSlice) => state.pipData;
export const selectPIPConnectionState = (state: PIPSlice) => state.pipConnectionState;
export const selectPIPHealth = (state: PIPSlice) => state.pipHealth;
export const selectIsPIPConnected = (state: PIPSlice) => 
  state.pipConnectionState === 'connected' || state.pipConnectionState === 'fallback';
export const selectIsPIPHealthy = (state: PIPSlice) => state.pipHealth.isHealthy;
