/**
 * Witness Slice for Zustand Store
 * P2-S3-19: Witness Agent stores in Zustand
 * - aletheosFriction
 * - pichetGravity
 * - coherence duration tracking
 * - history tracking
 */

import type { GateCheckResult } from '../witness/types';

/** Witness history entry */
export interface WitnessHistoryEntry {
  timestamp: number;
  friction: number;
  gravity: number;
  coherenceDuration: number;
  flowState: boolean;
}

/** Witness slice state */
export interface WitnessSlice {
  // Aletheos state
  aletheosFriction: number;
  coherenceDuration: number; // seconds above threshold
  flowStateAchieved: boolean;
  lastFlowStateAt: number | null;
  
  // Pichet state
  pichetGravity: number;
  physicalCycleScore: number;
  gravityTier: string;
  
  // Gate Check
  gateCheckResult: GateCheckResult;
  canProceedWithRitual: boolean;
  
  // History (last 60 seconds)
  witnessHistory: WitnessHistoryEntry[];
  
  // Actions
  setAletheosFriction: (friction: number) => void;
  setCoherenceDuration: (duration: number) => void;
  setFlowStateAchieved: (achieved: boolean) => void;
  setPichetGravity: (gravity: number) => void;
  setPhysicalCycleScore: (score: number) => void;
  setGravityTier: (tier: string) => void;
  setGateCheckResult: (result: GateCheckResult) => void;
  addHistoryEntry: (entry: WitnessHistoryEntry) => void;
  clearWitnessHistory: () => void;
  resetWitnessState: () => void;
}

/** Default gate check result */
const defaultGateCheckResult: GateCheckResult = {
  allowed: true,
  friction: 1.0,
  gravity: 1.0,
  blockReason: null,
  timestamp: Date.now(),
};

/** Create Witness slice */
export function createWitnessSlice(
  set: (partial: Record<string, unknown>) => void,
  get: () => WitnessSlice
): WitnessSlice {
  return {
    // Initial state
    aletheosFriction: 1.0,
    coherenceDuration: 0,
    flowStateAchieved: false,
    lastFlowStateAt: null,
    
    pichetGravity: 1.0,
    physicalCycleScore: 50,
    gravityTier: 'normal',
    
    gateCheckResult: defaultGateCheckResult,
    canProceedWithRitual: true,
    
    witnessHistory: [],

    // Actions
    setAletheosFriction: (friction: number) => {
      set({ aletheosFriction: friction });
    },

    setCoherenceDuration: (duration: number) => {
      set({ coherenceDuration: duration });
    },

    setFlowStateAchieved: (achieved: boolean) => {
      set({ 
        flowStateAchieved: achieved,
        lastFlowStateAt: achieved ? Date.now() : get().lastFlowStateAt,
      });
    },

    setPichetGravity: (gravity: number) => {
      set({ pichetGravity: gravity });
    },

    setPhysicalCycleScore: (score: number) => {
      set({ physicalCycleScore: score });
    },

    setGravityTier: (tier: string) => {
      set({ gravityTier: tier });
    },

    setGateCheckResult: (result: GateCheckResult) => {
      set({ 
        gateCheckResult: result,
        canProceedWithRitual: result.allowed,
      });
    },

    addHistoryEntry: (entry: WitnessHistoryEntry) => {
      const current = get().witnessHistory;
      const newHistory = [...current, entry].slice(-60); // Keep last 60 entries
      set({ witnessHistory: newHistory });
    },

    clearWitnessHistory: () => {
      set({ witnessHistory: [] });
    },

    resetWitnessState: () => {
      set({
        aletheosFriction: 1.0,
        coherenceDuration: 0,
        flowStateAchieved: false,
        pichetGravity: 1.0,
        physicalCycleScore: 50,
        gravityTier: 'normal',
        gateCheckResult: defaultGateCheckResult,
        canProceedWithRitual: true,
        witnessHistory: [],
      });
    },
  };
}

/** Witness selectors */
export const selectAletheosState = (state: WitnessSlice) => ({
  friction: state.aletheosFriction,
  coherenceDuration: state.coherenceDuration,
  flowStateAchieved: state.flowStateAchieved,
  lastFlowStateAt: state.lastFlowStateAt,
});

export const selectPichetState = (state: WitnessSlice) => ({
  gravity: state.pichetGravity,
  physicalCycleScore: state.physicalCycleScore,
  gravityTier: state.gravityTier,
});

export const selectGateCheckState = (state: WitnessSlice) => ({
  canProceed: state.canProceedWithRitual,
  result: state.gateCheckResult,
});

export const selectWitnessHistory = (state: WitnessSlice) => state.witnessHistory;
