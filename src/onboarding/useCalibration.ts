/**
 * useCalibration — React hook for calibration state management
 * 
 * Integrates:
 * - CalibrationStateMachine
 * - Face mesh alignment
 * - Audio feedback
 * - Persistence
 */

import { useCallback, useEffect, useRef } from 'react';
import { useStore, selectCalibrationState } from '../state/store';
import { CalibrationStateMachine } from './CalibrationStateMachine';
import type { CalibrationProgress, CalibrationStateValue, CalibrationMetrics } from '../types';
import type { FaceMeshResult } from '../bio/types';

export interface UseCalibrationReturn {
  // State
  calibrationState: CalibrationStateValue;
  alignmentScore: number;
  peakAlignmentScore: number;
  holdProgress: number;
  isComplete: boolean;
  isFailed: boolean;
  promptLevel: number;
  
  // Actions
  processFaceDetection: (faceResult: FaceMeshResult) => void;
  processFaceLost: () => void;
  reset: () => void;
  resume: (progress: CalibrationProgress) => void;
  
  // Machine access
  stateMachine: CalibrationStateMachine | null;
}

/**
 * React hook for calibration management
 */
export function useCalibration(
  callbacks?: {
    onComplete?: (metrics: CalibrationMetrics) => void;
    onFailure?: () => void;
    onStateChange?: (from: CalibrationStateValue, to: CalibrationStateValue) => void;
    onPrompt?: (type: 'pulse' | 'brighten' | 'reprompt') => void;
  }
): UseCalibrationReturn {
  const state = useStore(selectCalibrationState);
  
  const setCalibrationStateValue = useStore((s) => s.setCalibrationStateValue);
  const updateAlignmentScore = useStore((s) => s.updateAlignmentScore);
  const updateHoldDuration = useStore((s) => s.updateHoldDuration);
  const markCalibrationComplete = useStore((s) => s.markCalibrationComplete);
  const resetCalibration = useStore((s) => s.resetCalibration);
  const setPromptLevel = useStore((s) => s.setPromptLevel);
  const resumeCalibration = useStore((s) => s.resumeCalibration);
  
  // Create state machine ref
  const machineRef = useRef<CalibrationStateMachine | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastSaveRef = useRef<number>(0);
  
  // Initialize state machine
  useEffect(() => {
    machineRef.current = new CalibrationStateMachine(
      {},
      {
        onStateChange: (from, to) => {
          setCalibrationStateValue(to);
          callbacks?.onStateChange?.(from, to);
        },
        onPrompt: (type) => {
          const level = type === 'pulse' ? 1 : type === 'brighten' ? 2 : 3;
          setPromptLevel(level);
          callbacks?.onPrompt?.(type);
        },
        onComplete: (metrics) => {
          markCalibrationComplete(metrics);
          callbacks?.onComplete?.(metrics);
        },
        onFailure: () => {
          callbacks?.onFailure?.();
        },
      }
    );
    
    // Start tick loop
    const tick = (timestamp: number) => {
      machineRef.current?.processEvent({ type: 'TICK', timestamp });
      
      // Update hold duration in store
      const metrics = machineRef.current?.getMetrics();
      if (metrics) {
        updateHoldDuration(metrics.holdDuration);
      }
      
      rafRef.current = requestAnimationFrame(tick);
    };
    
    rafRef.current = requestAnimationFrame(tick);
    
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [callbacks, setCalibrationStateValue, setPromptLevel, markCalibrationComplete, updateHoldDuration]);
  
  // Process face detection
  const processFaceDetection = useCallback((faceResult: FaceMeshResult) => {
    if (!machineRef.current) return;
    
    machineRef.current.processEvent({ type: 'FACE_DETECTED', landmarks: faceResult.landmarks });
    
    // Update alignment score
    const alignment = machineRef.current.calculateAlignment(faceResult.landmarks);
    updateAlignmentScore(alignment.score);
  }, [updateAlignmentScore]);
  
  // Process face lost
  const processFaceLost = useCallback(() => {
    machineRef.current?.processEvent({ type: 'FACE_LOST' });
  }, []);
  
  // Reset calibration
  const reset = useCallback(() => {
    machineRef.current?.processEvent({ type: 'RESET' });
    resetCalibration();
  }, [resetCalibration]);
  
  // Resume from saved progress
  const resume = useCallback((progress: CalibrationProgress) => {
    machineRef.current?.processEvent({ type: 'RESUME', progress });
    resumeCalibration(progress);
  }, [resumeCalibration]);
  
  return {
    calibrationState: state.calibrationStateValue,
    alignmentScore: state.alignmentScore,
    peakAlignmentScore: state.peakAlignmentScore,
    holdProgress: state.holdProgress,
    isComplete: state.isCalibrationComplete,
    isFailed: state.calibrationStateValue === 'Failed',
    promptLevel: state.promptLevel,
    processFaceDetection,
    processFaceLost,
    reset,
    resume,
    stateMachine: machineRef.current,
  };
}
