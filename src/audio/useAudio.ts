/**
 * useAudio — React hook for audio control
 * 
 * Provides:
 * - Audio initialization
 * - Mute/unmute toggle
 * - Drone control
 * - THOOM playback
 */

import { useCallback, useEffect, useRef } from 'react';
import { useStore } from '../state/store';
import { audioEngine } from './AudioEngine';

export interface UseAudioReturn {
  // State
  isInitialized: boolean;
  isMuted: boolean;
  masterGain: number;
  isDucked: boolean;

  // Actions
  initialize: () => Promise<boolean>;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
  setMasterGain: (gain: number) => void;
  startDrone: () => Promise<void>;
  stopDrone: () => void;
  playThoom: () => void;
  setDucked: (ducked: boolean) => void;
}

/**
 * React hook for audio control
 */
export function useAudio(): UseAudioReturn {
  // Use individual primitive selectors to avoid infinite re-render loop
  // (object-returning selectors create new refs every call in Zustand v5)
  const isAudioInitialized = useStore((s) => s.isAudioInitialized);
  const isMuted = useStore((s) => s.isMuted);
  const masterGain = useStore((s) => s.masterGain);
  const isDucked = useStore((s) => s.isDucked);

  const initializeAudio = useStore((s) => s.initializeAudio);
  const toggleMuteStore = useStore((s) => s.toggleMute);
  const setMutedStore = useStore((s) => s.setMuted);
  const setMasterGainStore = useStore((s) => s.setMasterGain);
  const setDuckedStore = useStore((s) => s.setDucked);
  
  const droneStartedRef = useRef(false);
  
  // Initialize audio on user interaction
  const initialize = useCallback(async (): Promise<boolean> => {
    const success = await initializeAudio();
    
    if (success) {
      // Resume audio context if suspended
      await audioEngine.resume();
    }
    
    return success;
  }, [initializeAudio]);
  
  // Start the ambient drone
  const startDrone = useCallback(async (): Promise<void> => {
    if (!droneStartedRef.current) {
      await audioEngine.startDrone();
      droneStartedRef.current = true;
    }
  }, []);
  
  // Stop the drone
  const stopDrone = useCallback((): void => {
    audioEngine.stopDrone();
    droneStartedRef.current = false;
  }, []);
  
  // Play THOOM sound
  const playThoom = useCallback((): void => {
    audioEngine.playThoom();
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Don't stop drone on unmount, let it continue
    };
  }, []);
  
  return {
    isInitialized: isAudioInitialized,
    isMuted,
    masterGain,
    isDucked,
    initialize,
    toggleMute: toggleMuteStore,
    setMuted: setMutedStore,
    setMasterGain: setMasterGainStore,
    startDrone,
    stopDrone,
    playThoom,
    setDucked: setDuckedStore,
  };
}
