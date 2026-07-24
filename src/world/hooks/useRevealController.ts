/**
 * World Reveal Timing Controller
 * P2-S1-21: Orchestrate reveal sequence
 * 
 * Timeline:
 * - 0-1s: Ripple (ground displacement wave)
 * - 0.5-3s: Materialize (splat reveal)
 * - 2-3.5s: Glows (cardinal direction activation)
 * - 3-5s: Trail (path to Breathfield)
 * 
 * Total: 5 second reveal sequence with smooth overlapping transitions
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { 
  RevealPhase, 
  RevealState, 
  RevealSequenceConfig, 
  EasingType 
} from '../types';

interface UseRevealControllerOptions {
  /** Custom sequence configuration */
  config?: Partial<RevealSequenceConfig>;
  /** Callback when phase changes */
  onPhaseChange?: (phase: RevealPhase, progress: number) => void;
  /** Callback when sequence completes */
  onComplete?: () => void;
  /** Enable debug logging */
  debug?: boolean;
}

interface UseRevealControllerReturn {
  /** Current reveal state */
  state: RevealState;
  /** Whether reveal is active */
  isActive: boolean;
  /** Whether reveal is complete */
  isComplete: boolean;
  /** Start the reveal sequence */
  start: () => void;
  /** Stop/pause the reveal */
  stop: () => void;
  /** Reset to initial state */
  reset: () => void;
  /** Seek to specific time (ms) */
  seek: (timeMs: number) => void;
  /** Get progress for a specific phase (0-1) */
  getPhaseProgress: (phase: RevealPhase) => number;
}

// Default reveal sequence configuration
const DEFAULT_CONFIG: RevealSequenceConfig = {
  totalDuration: 5000, // 5 seconds total
  phases: {
    ripple: { start: 0, end: 1000 },         // 0-1s
    materialize: { start: 500, end: 3000 },  // 0.5-3s
    glows: { start: 2000, end: 3500 },       // 2-3.5s
    trail: { start: 3000, end: 5000 },      // 3-5s
  },
  easing: {
    ripple: 'easeOutCubic',
    materialize: 'easeInOutQuad',
    glows: 'easeOutCubic',
    trail: 'easeInOutQuad',
  },
};

// Easing functions
const easingFunctions: Record<EasingType, (t: number) => number> = {
  linear: (t) => t,
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => 1 - (1 - t) * (1 - t),
  easeInOutQuad: (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
};

/**
 * Apply easing to raw progress
 */
function applyEasing(progress: number, easing: EasingType): number {
  const clamped = Math.max(0, Math.min(1, progress));
  return easingFunctions[easing](clamped);
}

/**
 * Determine current phase based on elapsed time
 */
function getPhaseAtTime(elapsed: number, config: RevealSequenceConfig): RevealPhase {
  if (elapsed < config.phases.ripple.end) {
    return 'ripple';
  } else if (elapsed < config.phases.materialize.end) {
    return 'materialize';
  } else if (elapsed < config.phases.glows.end) {
    return 'glows';
  } else if (elapsed < config.phases.trail.end) {
    return 'trail';
  } else {
    return 'complete';
  }
}

/**
 * Calculate phase progress (0-1) for a given time
 */
function getPhaseProgressAtTime(
  phase: RevealPhase,
  elapsed: number,
  config: RevealSequenceConfig
): number {
  if (phase === 'none' || phase === 'complete') {
    return phase === 'complete' ? 1 : 0;
  }
  
  const phaseConfig = config.phases[phase];
  const rawProgress = (elapsed - phaseConfig.start) / (phaseConfig.end - phaseConfig.start);
  
  return applyEasing(rawProgress, config.easing[phase]);
}

/**
 * Calculate overall progress (0-1)
 */
function getOverallProgress(elapsed: number, config: RevealSequenceConfig): number {
  return Math.min(1, elapsed / config.totalDuration);
}

/**
 * World reveal timing controller hook
 */
export function useRevealController(
  options: UseRevealControllerOptions = {}
): UseRevealControllerReturn {
  const { config: customConfig, onPhaseChange, onComplete, debug } = options;
  
  // Merge config
  const config: RevealSequenceConfig = {
    ...DEFAULT_CONFIG,
    ...customConfig,
    phases: { ...DEFAULT_CONFIG.phases, ...customConfig?.phases },
    easing: { ...DEFAULT_CONFIG.easing, ...customConfig?.easing },
  };
  
  // State
  const [state, setState] = useState<RevealState>({
    phase: 'none',
    phaseProgress: 0,
    overallProgress: 0,
    isActive: false,
  });
  
  const [isComplete, setIsComplete] = useState(false);
  
  // Refs for animation loop
  const isRunningRef = useRef(false);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  const previousPhaseRef = useRef<RevealPhase>('none');
  
  /**
   * Update reveal state based on elapsed time
   */
  const updateReveal = useCallback((elapsed: number) => {
    const currentPhase = getPhaseAtTime(elapsed, config);
    const phaseProgress = getPhaseProgressAtTime(currentPhase, elapsed, config);
    const overallProgress = getOverallProgress(elapsed, config);
    
    // Check for phase change
    if (currentPhase !== previousPhaseRef.current) {
      if (debug) {
        console.log(`[useRevealController] Phase: ${previousPhaseRef.current} → ${currentPhase}`);
      }
      onPhaseChange?.(currentPhase, phaseProgress);
      previousPhaseRef.current = currentPhase;
    }
    
    // Update state
    setState({
      phase: currentPhase,
      phaseProgress,
      overallProgress,
      isActive: true,
    });
    
    // Check for completion
    if (elapsed >= config.totalDuration) {
      setIsComplete(true);
      isRunningRef.current = false;
      onComplete?.();
      if (debug) {
        console.log('[useRevealController] Reveal complete');
      }
      return;
    }
    
    // Continue animation
    if (isRunningRef.current) {
      animationFrameRef.current = requestAnimationFrame(() => {
        const now = performance.now();
        const totalElapsed = pausedTimeRef.current + (now - startTimeRef.current);
        updateReveal(totalElapsed);
      });
    }
  }, [config, onPhaseChange, onComplete, debug]);
  
  /**
   * Start the reveal sequence
   */
  const start = useCallback(() => {
    if (isRunningRef.current) return;
    
    if (debug) {
      console.log('[useRevealController] Starting reveal sequence');
    }
    
    isRunningRef.current = true;
    startTimeRef.current = performance.now();
    pausedTimeRef.current = 0;
    setIsComplete(false);
    
    updateReveal(0);
  }, [updateReveal, debug]);
  
  /**
   * Stop/pause the reveal
   */
  const stop = useCallback(() => {
    if (!isRunningRef.current) return;
    
    isRunningRef.current = false;
    cancelAnimationFrame(animationFrameRef.current);
    
    // Save elapsed time for resume
    const now = performance.now();
    pausedTimeRef.current += now - startTimeRef.current;
    
    setState(prev => ({ ...prev, isActive: false }));
    
    if (debug) {
      console.log('[useRevealController] Stopped at:', pausedTimeRef.current);
    }
  }, [debug]);
  
  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    isRunningRef.current = false;
    cancelAnimationFrame(animationFrameRef.current);
    
    startTimeRef.current = 0;
    pausedTimeRef.current = 0;
    previousPhaseRef.current = 'none';
    
    setState({
      phase: 'none',
      phaseProgress: 0,
      overallProgress: 0,
      isActive: false,
    });
    setIsComplete(false);
    
    if (debug) {
      console.log('[useRevealController] Reset');
    }
  }, [debug]);
  
  /**
   * Seek to specific time
   */
  const seek = useCallback((timeMs: number) => {
    pausedTimeRef.current = Math.max(0, Math.min(config.totalDuration, timeMs));
    
    if (!isRunningRef.current) {
      // Just update state without running
      const currentPhase = getPhaseAtTime(pausedTimeRef.current, config);
      const phaseProgress = getPhaseProgressAtTime(currentPhase, pausedTimeRef.current, config);
      const overallProgress = getOverallProgress(pausedTimeRef.current, config);
      
      setState({
        phase: currentPhase,
        phaseProgress,
        overallProgress,
        isActive: false,
      });
    }
    
    if (debug) {
      console.log('[useRevealController] Seek to:', timeMs);
    }
  }, [config, debug]);
  
  /**
   * Get progress for a specific phase (0-1)
   */
  const getPhaseProgress = useCallback((phase: RevealPhase): number => {
    if (phase === state.phase) {
      return state.phaseProgress;
    }
    
    // Check if phase has already passed
    const phaseOrder: RevealPhase[] = ['none', 'ripple', 'materialize', 'glows', 'trail', 'complete'];
    const currentIdx = phaseOrder.indexOf(state.phase);
    const targetIdx = phaseOrder.indexOf(phase);
    
    if (targetIdx < currentIdx) {
      return 1; // Phase already completed
    } else if (targetIdx > currentIdx) {
      return 0; // Phase not started
    }
    
    return 0;
  }, [state.phase, state.phaseProgress]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);
  
  return {
    state,
    isActive: state.isActive,
    isComplete,
    start,
    stop,
    reset,
    seek,
    getPhaseProgress,
  };
}

/**
 * Get phase timing info for external synchronization
 */
export function getRevealPhaseTimings(config?: Partial<RevealSequenceConfig>) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  return mergedConfig.phases;
}

/**
 * Calculate which phases are active at a given time
 */
export function getActivePhasesAtTime(
  timeMs: number,
  config?: Partial<RevealSequenceConfig>
): RevealPhase[] {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const phases: RevealPhase[] = [];
  
  if (timeMs < mergedConfig.phases.ripple.end) phases.push('ripple');
  if (timeMs >= mergedConfig.phases.materialize.start && timeMs < mergedConfig.phases.materialize.end) {
    phases.push('materialize');
  }
  if (timeMs >= mergedConfig.phases.glows.start && timeMs < mergedConfig.phases.glows.end) {
    phases.push('glows');
  }
  if (timeMs >= mergedConfig.phases.trail.start && timeMs < mergedConfig.phases.trail.end) {
    phases.push('trail');
  }
  if (timeMs >= mergedConfig.totalDuration) phases.push('complete');
  
  return phases;
}

export default useRevealController;
