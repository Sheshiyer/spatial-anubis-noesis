/**
 * Reduced Motion — P4-S2-05
 *
 * WCAG 2.3.3 (Animation from Interactions) support
 * Respects prefers-reduced-motion media query
 * Provides static alternatives for all animations
 */

import { useState, useEffect } from 'react';
import create from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================================
// Reduced Motion Store
// ============================================================================

interface ReducedMotionState {
  /** Is reduced motion enabled */
  enabled: boolean;
  /** Was it set by user or system preference */
  source: 'user' | 'system' | 'default';
  /** Enable/disable reduced motion */
  setEnabled: (enabled: boolean, source?: 'user' | 'system') => void;
  /** Toggle reduced motion */
  toggle: () => void;
}

export const useReducedMotionStore = create<ReducedMotionState>()(
  persist(
    (set, get) => ({
      enabled: false,
      source: 'default',

      setEnabled: (enabled: boolean, source: 'user' | 'system' = 'user') => {
        set({ enabled, source });

        // Apply CSS class to document
        if (enabled) {
          document.documentElement.classList.add('reduce-motion');
        } else {
          document.documentElement.classList.remove('reduce-motion');
        }

        console.log(`[ReducedMotion] ${enabled ? 'Enabled' : 'Disabled'} (source: ${source})`);
      },

      toggle: () => {
        const current = get().enabled;
        get().setEnabled(!current, 'user');
      },
    }),
    {
      name: 'noesis-reduced-motion',
      version: 1,
    }
  )
);

// ============================================================================
// System Preference Detection
// ============================================================================

/**
 * Detect prefers-reduced-motion media query
 */
export function detectSystemPreference(): boolean {
  if (typeof window === 'undefined') return false;

  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  return mediaQuery.matches;
}

/**
 * Listen for changes to prefers-reduced-motion
 */
export function listenToSystemPreference(callback: (enabled: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  const handleChange = (event: MediaQueryListEvent) => {
    callback(event.matches);
  };

  // Modern browsers
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }

  // Legacy browsers
  if (mediaQuery.addListener) {
    mediaQuery.addListener(handleChange);
    return () => {
      mediaQuery.removeListener(handleChange);
    };
  }

  return () => {};
}

// ============================================================================
// React Hook — useReducedMotion
// ============================================================================

/**
 * React hook to check if reduced motion is enabled
 *
 * @returns Whether reduced motion is enabled
 *
 * @example
 * ```tsx
 * function AnimatedElement() {
 *   const prefersReducedMotion = useReducedMotion();
 *
 *   return (
 *     <motion.div
 *       animate={prefersReducedMotion ? {} : { x: 100 }}
 *     />
 *   );
 * }
 * ```
 */
export function useReducedMotion(): boolean {
  const enabled = useReducedMotionStore((state) => state.enabled);
  return enabled;
}

/**
 * Hook that combines user preference and system preference
 */
export function useReducedMotionWithSystem(): boolean {
  const store = useReducedMotionStore();
  const [systemPrefers, setSystemPrefers] = useState(() => detectSystemPreference());

  useEffect(() => {
    // If system preference is enabled and user hasn't explicitly disabled it
    if (systemPrefers && store.source !== 'user') {
      store.setEnabled(true, 'system');
    }

    // Listen for changes
    const cleanup = listenToSystemPreference((enabled) => {
      setSystemPrefers(enabled);

      // Auto-enable if system preference changes and user hasn't overridden
      if (enabled && store.source !== 'user') {
        store.setEnabled(true, 'system');
      }
    });

    return cleanup;
  }, [systemPrefers, store]);

  return store.enabled;
}

// ============================================================================
// Animation Alternatives
// ============================================================================

/**
 * Get animation duration based on reduced motion setting
 *
 * @param normalDuration - Duration in ms for normal animation
 * @param reducedMotion - Is reduced motion enabled
 * @returns 0 if reduced motion, normal duration otherwise
 */
export function getAnimationDuration(normalDuration: number, reducedMotion: boolean): number {
  return reducedMotion ? 0 : normalDuration;
}

/**
 * Get transition style based on reduced motion
 */
export function getTransitionStyle(reducedMotion: boolean): React.CSSProperties {
  if (reducedMotion) {
    return {
      transition: 'none',
    };
  }

  return {
    transition: 'all 0.3s ease-in-out',
  };
}

/**
 * Particle count for reduced motion
 * Reduces particles to static dots
 */
export function getParticleCount(normalCount: number, reducedMotion: boolean): number {
  return reducedMotion ? Math.min(10, Math.floor(normalCount / 10)) : normalCount;
}

/**
 * Should skip animation entirely
 */
export function shouldSkipAnimation(reducedMotion: boolean): boolean {
  return reducedMotion;
}

// ============================================================================
// CSS Class Name Helpers
// ============================================================================

/**
 * Get class name that includes reduced motion modifier if needed
 *
 * @example
 * ```tsx
 * const className = getMotionClassName('vessel-orbit', prefersReducedMotion);
 * // Returns: 'vessel-orbit' or 'vessel-orbit vessel-orbit--reduced-motion'
 * ```
 */
export function getMotionClassName(baseClassName: string, reducedMotion: boolean): string {
  if (reducedMotion) {
    return `${baseClassName} ${baseClassName}--reduced-motion`;
  }
  return baseClassName;
}

// ============================================================================
// R3F Animation Helpers
// ============================================================================

/**
 * Get spring config for react-spring animations
 */
export function getSpringConfig(reducedMotion: boolean) {
  if (reducedMotion) {
    return {
      tension: 500,
      friction: 100,
      immediate: true,
    };
  }

  return {
    tension: 170,
    friction: 26,
    immediate: false,
  };
}

/**
 * Get rotation animation props for R3F
 */
export function getRotationAnimation(
  normalSpeed: number,
  reducedMotion: boolean
): { speed: number; enabled: boolean } {
  return {
    speed: reducedMotion ? 0 : normalSpeed,
    enabled: !reducedMotion,
  };
}

/**
 * Get particle system config for reduced motion
 */
export function getParticleConfig(reducedMotion: boolean) {
  if (reducedMotion) {
    return {
      count: 10,
      velocity: 0,
      turbulence: 0,
      renderAsStatic: true,
    };
  }

  return {
    count: 1000,
    velocity: 1,
    turbulence: 0.5,
    renderAsStatic: false,
  };
}

// ============================================================================
// Vessel Animation Overrides
// ============================================================================

export interface VesselAnimationConfig {
  /** Enable rotation */
  enableRotation: boolean;
  /** Rotation speed multiplier */
  rotationSpeed: number;
  /** Enable floating animation */
  enableFloating: boolean;
  /** Enable particle effects */
  enableParticles: boolean;
  /** Particle count */
  particleCount: number;
  /** Enable transitions */
  enableTransitions: boolean;
  /** Transition duration (ms) */
  transitionDuration: number;
}

/**
 * Get vessel animation config based on reduced motion
 */
export function getVesselAnimationConfig(reducedMotion: boolean): VesselAnimationConfig {
  if (reducedMotion) {
    return {
      enableRotation: false,
      rotationSpeed: 0,
      enableFloating: false,
      enableParticles: true, // Keep particles but as static dots
      particleCount: 10,
      enableTransitions: false,
      transitionDuration: 0,
    };
  }

  return {
    enableRotation: true,
    rotationSpeed: 1,
    enableFloating: true,
    enableParticles: true,
    particleCount: 1000,
    enableTransitions: true,
    transitionDuration: 300,
  };
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize reduced motion support
 * Detects system preference and applies initial state
 */
export function initializeReducedMotion(): void {
  const systemPrefers = detectSystemPreference();
  const store = useReducedMotionStore.getState();

  // If user hasn't explicitly set preference, use system
  if (store.source === 'default' && systemPrefers) {
    store.setEnabled(true, 'system');
  } else if (store.enabled) {
    // Apply saved preference
    document.documentElement.classList.add('reduce-motion');
  }

  console.log('[ReducedMotion] Initialized', {
    enabled: store.enabled,
    source: store.source,
    systemPrefers,
  });
}

// ============================================================================
// Global CSS Injection
// ============================================================================

/**
 * Inject global CSS for reduced motion
 * Called once at app startup
 */
export function injectReducedMotionCSS(): void {
  const styleId = 'reduced-motion-styles';

  // Don't inject twice
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    /* Reduced Motion Global Styles */
    .reduce-motion *,
    .reduce-motion *::before,
    .reduce-motion *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }

    /* Pause all CSS animations in reduced motion */
    .reduce-motion * {
      animation-play-state: paused !important;
    }

    /* Hide animated particles */
    .reduce-motion .particle-system--animated {
      display: none;
    }

    /* Show static particles */
    .reduce-motion .particle-system--static {
      display: block;
    }

    /* Remove transform transitions */
    .reduce-motion .vessel-transform {
      transition: none !important;
    }
  `;

  document.head.appendChild(style);
}
