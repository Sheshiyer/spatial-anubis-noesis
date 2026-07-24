/**
 * useDescent — React hook for managing the Descent sequence
 * 
 * Implements timing milestones:
 * - T+0ms: Black
 * - T+1000ms: Deep Ink
 * - T+2000ms: First Light
 * - T+3000ms: Cartographer
 * - T+4000ms: Audio Onset
 * - T+5000ms: Complete
 */

import { useCallback, useEffect, useRef } from 'react';
import { useStore, selectExtendedOnboardingState } from '../state/store';
import { audioEngine } from '../audio/AudioEngine';
import type { ExtendedDescentPhase } from '../types';

// Timing milestones in milliseconds
const MILESTONES: Record<ExtendedDescentPhase, number> = {
  Black: 0,
  DeepInk: 1000,
  FirstLight: 2000,
  Cartographer: 3000,
  AudioOnset: 4000,
  Complete: 5000,
};

export interface UseDescentReturn {
  // State
  phase: ExtendedDescentPhase;
  elapsedMs: number;
  isComplete: boolean;
  isReturningUser: boolean;
  
  // Actions
  start: () => void;
  skip: () => void;
  replay: () => void;
}

/**
 * React hook for Descent sequence management
 */
export function useDescent(
  callbacks?: {
    onPhaseChange?: (phase: ExtendedDescentPhase) => void;
    onComplete?: () => void;
  }
): UseDescentReturn {
  const state = useStore(selectExtendedOnboardingState);
  
  const setExtendedDescentPhase = useStore((s) => s.setExtendedDescentPhase);
  const markExtendedDescentComplete = useStore((s) => s.markExtendedDescentComplete);
  const updateDescentElapsed = useStore((s) => s.updateDescentElapsed);
  const resetExtendedOnboarding = useStore((s) => s.resetExtendedOnboarding);
  const initializeAudio = useStore((s) => s.initializeAudio);
  
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const startedRef = useRef(false);
  const audioStartedRef = useRef(false);
  
  // Determine current phase based on elapsed time
  const getPhaseForElapsed = useCallback((elapsed: number): ExtendedDescentPhase => {
    if (elapsed >= MILESTONES.Complete) return 'Complete';
    if (elapsed >= MILESTONES.AudioOnset) return 'AudioOnset';
    if (elapsed >= MILESTONES.Cartographer) return 'Cartographer';
    if (elapsed >= MILESTONES.FirstLight) return 'FirstLight';
    if (elapsed >= MILESTONES.DeepInk) return 'DeepInk';
    return 'Black';
  }, []);
  
  // Handle phase entry
  const handlePhaseEntry = useCallback(async (phase: ExtendedDescentPhase) => {
    callbacks?.onPhaseChange?.(phase);
    
    switch (phase) {
      case 'AudioOnset':
        // P1-S2-06: Start 60Hz drone at T+4000ms
        if (!audioStartedRef.current) {
          await initializeAudio();
          await audioEngine.startDrone({
            frequency: 60,
            targetGain: 0.12,
            rampDuration: 3,
          });
          audioStartedRef.current = true;
        }
        break;
        
      case 'Complete':
        // Mark descent as complete
        markExtendedDescentComplete();
        callbacks?.onComplete?.();
        break;
    }
  }, [callbacks, initializeAudio, markExtendedDescentComplete]);
  
  // Animation frame loop
  const tick = useCallback((timestamp: number) => {
    if (!startTimeRef.current) {
      startTimeRef.current = timestamp;
    }
    
    const elapsed = timestamp - startTimeRef.current;
    updateDescentElapsed(elapsed);
    
    // Check for phase changes
    const newPhase = getPhaseForElapsed(elapsed);
    if (newPhase !== state.extendedDescentPhase) {
      setExtendedDescentPhase(newPhase);
      handlePhaseEntry(newPhase);
    }
    
    // Continue if not complete
    if (elapsed < MILESTONES.Complete + 100) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [state.extendedDescentPhase, updateDescentElapsed, setExtendedDescentPhase, getPhaseForElapsed, handlePhaseEntry]);
  
  // Start the descent
  const start = useCallback(() => {
    if (startedRef.current) return;
    
    startedRef.current = true;
    startTimeRef.current = 0;
    setExtendedDescentPhase('Black');
    
    rafRef.current = requestAnimationFrame(tick);
  }, [setExtendedDescentPhase, tick]);
  
  // Skip the descent
  const skip = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    
    setExtendedDescentPhase('Complete');
    markExtendedDescentComplete();
    
    // Start audio anyway
    initializeAudio().then(() => {
      audioEngine.startDrone({ rampDuration: 1 });
    });
  }, [setExtendedDescentPhase, markExtendedDescentComplete, initializeAudio]);
  
  // Replay the descent
  const replay = useCallback(() => {
    // Reset
    startedRef.current = false;
    audioStartedRef.current = false;
    startTimeRef.current = 0;
    
    resetExtendedOnboarding();
    
    // Stop audio
    audioEngine.stopDrone(0.5);
    
    // Start again
    start();
  }, [resetExtendedOnboarding, start]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);
  
  return {
    phase: state.extendedDescentPhase,
    elapsedMs: 0, // Would need to track this separately or from store
    isComplete: state.extendedDescentComplete,
    isReturningUser: state.extendedIsReturningUser,
    start,
    skip,
    replay,
  };
}
