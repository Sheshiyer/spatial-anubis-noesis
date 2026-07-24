/**
 * Zustand Store — Application state management
 * 
 * Combines:
 * - Vessel slice (P1-S1-36)
 * - Audio slice (P1-S2-37, P1-S2-44)
 * - Calibration slice (P1-S2-18, P1-S2-43)
 * - Onboarding slice (P1-S2-50)
 * - ThresholdState integration
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  CalibrationStateValue,
  CalibrationMetrics,
  CalibrationProgress,
  DescentPhase,
  VesselType,
} from '../types';
import { audioEngine } from '../audio/AudioEngine';
import { thresholdState } from './ThresholdState';
import { createVesselSlice, type VesselSlice } from './vesselSlice';
import { createPIPSlice, type PIPSlice } from './pipSlice';
import { createWitnessSlice, type WitnessSlice } from './witnessSlice';

// ============================================================================
// Audio Slice
// ============================================================================

export interface AudioSlice {
  isAudioInitialized: boolean;
  isMuted: boolean;
  masterGain: number;
  droneGain: number;
  isDucked: boolean;
  initializeAudio: () => Promise<boolean>;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
  setMasterGain: (gain: number) => void;
  setDucked: (ducked: boolean) => void;
}

const createAudioSlice = (set: (partial: Record<string, unknown>) => void): AudioSlice => ({
  isAudioInitialized: false,
  isMuted: thresholdState.getAudioPreferences().muted,
  masterGain: thresholdState.getAudioPreferences().masterGain,
  droneGain: 0.12,
  isDucked: false,
  
  initializeAudio: async () => {
    const success = await audioEngine.initialize();
    if (success) {
      set({ isAudioInitialized: true });
      
      // Apply saved mute state
      const prefs = thresholdState.getAudioPreferences();
      audioEngine.setMuted(prefs.muted);
    }
    return success;
  },
  
  toggleMute: () => {
    const newMuted = audioEngine.toggleMute();
    thresholdState.setAudioPreferences({ muted: newMuted });
    set({ isMuted: newMuted });
  },
  
  setMuted: (muted: boolean) => {
    audioEngine.setMuted(muted);
    thresholdState.setAudioPreferences({ muted });
    set({ isMuted: muted });
  },
  
  setMasterGain: (gain: number) => {
    const clampedGain = Math.max(0, Math.min(1, gain));
    thresholdState.setAudioPreferences({ masterGain: clampedGain });
    set({ masterGain: clampedGain });
  },
  
  setDucked: (ducked: boolean) => {
    audioEngine.setDucked(ducked);
    set({ isDucked: ducked });
  },
});

// ============================================================================
// Calibration Slice
// ============================================================================

export interface CalibrationSlice {
  calibrationState: CalibrationStateValue;
  alignmentScore: number;
  peakAlignmentScore: number;
  holdDuration: number;
  holdProgress: number;
  calibrationStartTime: number | null;
  calibrationTimeoutAt: number | null;
  isCalibrationComplete: boolean;
  lastCalibrationMetrics: CalibrationMetrics | null;
  promptLevel: number;
  setCalibrationState: (state: CalibrationStateValue) => void;
  updateAlignmentScore: (score: number) => void;
  updateHoldDuration: (duration: number) => void;
  markCalibrationComplete: (metrics: CalibrationMetrics) => void;
  resetCalibration: () => void;
  setPromptLevel: (level: number) => void;
  resumeCalibration: (progress: CalibrationProgress) => void;
}

const createCalibrationSlice = (set: (partial: Record<string, unknown>) => void, get: () => StoreState): CalibrationSlice => ({
  calibrationState: 'Waiting',
  alignmentScore: 0,
  peakAlignmentScore: 0,
  holdDuration: 0,
  holdProgress: 0,
  calibrationStartTime: null,
  calibrationTimeoutAt: null,
  isCalibrationComplete: false,
  lastCalibrationMetrics: null,
  promptLevel: 0,
  
  setCalibrationState: (calibrationState: CalibrationStateValue) => {
    set({ calibrationState });
    
    // Auto-duck audio during Aligning/Holding
    if (calibrationState === 'Aligning' || calibrationState === 'Holding') {
      audioEngine.setDucked(true);
    } else {
      audioEngine.setDucked(false);
    }
  },
  
  updateAlignmentScore: (score: number) => {
    const storeState = get();
    const previousScore = storeState.alignmentScore;
    
    // Play feedback tones when crossing thresholds
    audioEngine.playFeedbackTone(score, previousScore);
    
    set({
      alignmentScore: score,
      peakAlignmentScore: Math.max(storeState.peakAlignmentScore, score),
    });
  },
  
  updateHoldDuration: (duration: number) => {
    set({ 
      holdDuration: duration,
      holdProgress: Math.min(1, duration / 3000),
    });
  },
  
  markCalibrationComplete: (metrics: CalibrationMetrics) => {
    thresholdState.recordCalibration(metrics);
    
    set({
      isCalibrationComplete: true,
      calibrationState: 'Complete',
      lastCalibrationMetrics: metrics,
      holdProgress: 1,
    });
    
    // Play THOOM on completion
    audioEngine.playThoom();
    
    // Release audio ducking
    audioEngine.setDucked(false);
  },
  
  resetCalibration: () => {
    set({
      calibrationState: 'Waiting',
      alignmentScore: 0,
      peakAlignmentScore: 0,
      holdDuration: 0,
      holdProgress: 0,
      calibrationStartTime: null,
      calibrationTimeoutAt: null,
      isCalibrationComplete: false,
      promptLevel: 0,
    });
    
    audioEngine.setDucked(false);
  },
  
  setPromptLevel: (level: number) => {
    set({ promptLevel: level });
  },
  
  resumeCalibration: (progress: CalibrationProgress) => {
    set({
      calibrationState: progress.state,
      alignmentScore: progress.metrics.alignmentScore,
      peakAlignmentScore: progress.metrics.peakAlignmentScore,
      holdDuration: progress.metrics.holdDuration,
      holdProgress: progress.metrics.holdDuration / 3000,
      calibrationTimeoutAt: progress.timeoutAt,
    });
  },
});

// ============================================================================
// Onboarding Slice
// ============================================================================

export interface OnboardingSlice {
  descentPhase: DescentPhase;
  descentComplete: boolean;
  isReturningUser: boolean;
  vesselType: VesselType;
  currentPath: 'A' | 'B' | null;
  descentElapsedMs: number;
  setDescentPhase: (phase: DescentPhase) => void;
  markDescentComplete: () => void;
  setReturningUser: (isReturning: boolean) => void;
  setVesselType: (type: VesselType) => void;
  setCurrentPath: (path: 'A' | 'B') => void;
  updateDescentElapsed: (ms: number) => void;
  resetOnboarding: () => void;
}

const createOnboardingSlice = (set: (partial: Record<string, unknown>) => void): OnboardingSlice => ({
  descentPhase: 'black',
  descentComplete: thresholdState.hasCompletedDescent(),
  isReturningUser: thresholdState.isReturningUser(),
  vesselType: null,
  currentPath: null,
  descentElapsedMs: 0,
  
  setDescentPhase: (descentPhase: DescentPhase) => {
    set({ descentPhase });
  },
  
  markDescentComplete: () => {
    thresholdState.recordDescentComplete();
    set({ descentComplete: true });
  },
  
  setReturningUser: (isReturningUser: boolean) => {
    set({ isReturningUser });
  },
  
  setVesselType: (vesselType: VesselType) => {
    set({ vesselType });
  },
  
  setCurrentPath: (currentPath: 'A' | 'B') => {
    set({ currentPath });
  },
  
  updateDescentElapsed: (ms: number) => {
    set({ descentElapsedMs: ms });
  },
  
  resetOnboarding: () => {
    set({
      descentPhase: 'black',
      descentComplete: false,
      descentElapsedMs: 0,
    });
  },
});

// ============================================================================
// Session Slice
// ============================================================================

export interface SessionSlice {
  visitCount: number;
  isFirstRun: boolean;
  isRecalibrationRequired: boolean;
  sessionStarted: boolean;
  initializeSession: () => void;
  endSession: () => void;
}

const createSessionSlice = (set: (partial: Record<string, unknown>) => void): SessionSlice => ({
  visitCount: thresholdState.getVisitCount(),
  isFirstRun: thresholdState.isFirstRun(),
  isRecalibrationRequired: thresholdState.isRecalibrationRequired(),
  sessionStarted: false,
  
  initializeSession: () => {
    thresholdState.startSession();
    
    set({
      visitCount: thresholdState.getVisitCount(),
      isFirstRun: thresholdState.isFirstRun(),
      isRecalibrationRequired: thresholdState.isRecalibrationRequired(),
      sessionStarted: true,
    });
  },
  
  endSession: () => {
    thresholdState.endSession();
    set({ sessionStarted: false });
  },
});

// ============================================================================
// Combined Store
// ============================================================================

export interface StoreState extends
  VesselSlice,
  AudioSlice,
  CalibrationSlice,
  OnboardingSlice,
  SessionSlice,
  PIPSlice,
  WitnessSlice {}

export const useStore = create<StoreState>()(
  subscribeWithSelector((set, get) => ({
    ...createVesselSlice(set, get as () => VesselSlice),
    ...createAudioSlice(set),
    ...createCalibrationSlice(set, get as () => StoreState),
    ...createOnboardingSlice(set),
    ...createSessionSlice(set),
    ...createPIPSlice(set, get as () => StoreState),
    ...createWitnessSlice(set, get as () => StoreState),
  }))
);

// ============================================================================
// Selectors (for performance)
// ============================================================================

export const selectVesselState = (state: StoreState) => ({
  vessel: state.vessel,
  renderingMode: state.renderingMode,
});

export const selectAudioState = (state: StoreState) => ({
  isAudioInitialized: state.isAudioInitialized,
  isMuted: state.isMuted,
  masterGain: state.masterGain,
  isDucked: state.isDucked,
});

export const selectCalibrationState = (state: StoreState) => ({
  calibrationState: state.calibrationState,
  alignmentScore: state.alignmentScore,
  peakAlignmentScore: state.peakAlignmentScore,
  holdProgress: state.holdProgress,
  isCalibrationComplete: state.isCalibrationComplete,
  promptLevel: state.promptLevel,
});

export const selectOnboardingState = (state: StoreState) => ({
  descentPhase: state.descentPhase,
  descentComplete: state.descentComplete,
  isReturningUser: state.isReturningUser,
  vesselType: state.vesselType,
});

export const selectSessionState = (state: StoreState) => ({
  visitCount: state.visitCount,
  isFirstRun: state.isFirstRun,
  isRecalibrationRequired: state.isRecalibrationRequired,
});
