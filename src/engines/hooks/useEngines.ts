/**
 * React Hook: useEngines
 * Provides access to the Engine Manager from React components
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import type { EngineManager } from '../EngineManager';
import type { EngineId, EngineState, EngineEvent } from '../types';
import type { Tier2EngineStates, Tier3EngineStates } from '../tier2/types';
import { createEngineManager } from '../EngineManager';

// Singleton instance
let globalEngineManager: EngineManager | null = null;

function getGlobalEngineManager(): EngineManager {
  if (!globalEngineManager) {
    globalEngineManager = createEngineManager();
  }
  return globalEngineManager;
}

/**
 * Hook for accessing engine manager state and actions
 */
export function useEngines() {
  const engineManager = useRef(getGlobalEngineManager());
  const [state, setState] = useState(engineManager.current.getState());
  const [tier2States, setTier2States] = useState(engineManager.current.getTier2States());
  const [tier3States, setTier3States] = useState(engineManager.current.getTier3States());

  // Refresh state
  const refreshState = useCallback(() => {
    setState(engineManager.current.getState());
    setTier2States(engineManager.current.getTier2States());
    setTier3States(engineManager.current.getTier3States());
  }, []);

  // Unlock an engine
  const unlockEngine = useCallback(async (engineId: EngineId) => {
    await engineManager.current.unlockEngine(engineId);
    refreshState();
  }, [refreshState]);

  // Set active engine
  const setActiveEngine = useCallback((engineId: EngineId | null) => {
    engineManager.current.setActiveEngine(engineId);
    refreshState();
  }, [refreshState]);

  // Get convergence analysis
  const getConvergenceAnalysis = useCallback(async () => {
    return await engineManager.current.getConvergenceAnalysis();
  }, []);

  // Subscribe to engine events
  useEffect(() => {
    const unsubscribe = engineManager.current.onEvent('biorhythm', () => {
      refreshState();
    });
    
    return () => {
      unsubscribe();
    };
  }, [refreshState]);

  return {
    // State
    engines: state.engines,
    activeEngine: state.activeEngine,
    tier2Progress: state.tier2Progress,
    tier3Progress: state.tier3Progress,
    globalConvergence: state.globalConvergence,
    tier2States,
    tier3States,
    
    // Actions
    unlockEngine,
    setActiveEngine,
    getConvergenceAnalysis,
    refreshState,
    
    // Direct manager access for advanced use
    engineManager: engineManager.current,
  };
}

/**
 * Hook for a specific engine's state
 */
export function useEngine(engineId: EngineId) {
  const engineManager = useRef(getGlobalEngineManager());
  const [engineState, setEngineState] = useState<EngineState>(
    engineManager.current.getState().engines[engineId]
  );

  useEffect(() => {
    const unsubscribe = engineManager.current.onEvent(engineId, () => {
      setEngineState(engineManager.current.getState().engines[engineId]);
    });

    return () => {
      unsubscribe();
    };
  }, [engineId]);

  const refresh = useCallback(async () => {
    await engineManager.current.refreshEngine(engineId);
    setEngineState(engineManager.current.getState().engines[engineId]);
  }, [engineId]);

  return {
    state: engineState,
    refresh,
    unlock: () => engineManager.current.unlockEngine(engineId),
  };
}

/**
 * Hook for engine unlock animations
 */
export function useUnlockAnimations() {
  const engineManager = useRef(getGlobalEngineManager());
  const [animations, setAnimations] = useState(
    engineManager.current.getActiveUnlockAnimations()
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimations(engineManager.current.getActiveUnlockAnimations());
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return animations;
}
