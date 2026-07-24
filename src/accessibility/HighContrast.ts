/**
 * High Contrast Mode — P4-S2-06
 *
 * WCAG AA enhanced contrast mode
 * Brighter text, stronger borders, larger focus indicators
 * For users with low vision or screen visibility issues
 */

import { useState, useEffect } from 'react';
import create from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================================
// High Contrast Store
// ============================================================================

interface HighContrastState {
  /** Is high contrast enabled */
  enabled: boolean;
  /** Enable/disable high contrast */
  setEnabled: (enabled: boolean) => void;
  /** Toggle high contrast */
  toggle: () => void;
}

export const useHighContrastStore = create<HighContrastState>()(
  persist(
    (set, get) => ({
      enabled: false,

      setEnabled: (enabled: boolean) => {
        set({ enabled });

        // Apply CSS class to document
        if (enabled) {
          document.documentElement.classList.add('high-contrast');
          applyHighContrastStyles();
        } else {
          document.documentElement.classList.remove('high-contrast');
          removeHighContrastStyles();
        }

        console.log(`[HighContrast] ${enabled ? 'Enabled' : 'Disabled'}`);
      },

      toggle: () => {
        const current = get().enabled;
        get().setEnabled(!current);
      },
    }),
    {
      name: 'noesis-high-contrast',
      version: 1,
    }
  )
);

// ============================================================================
// High Contrast Color Overrides
// ============================================================================

/** High contrast color palette */
export const HIGH_CONTRAST_PALETTE = {
  // Brighter white for maximum contrast
  text: '#FFFFFF',
  // Pure black background
  background: '#000000',
  // Bright aged gold for accents
  accent: '#FFD700',
  // Bright terracotta for warnings/errors
  warning: '#FF6B3D',
  // Brighter grey for secondary text
  secondary: '#CCCCCC',
  // Strong borders
  border: '#FFFFFF',
} as const;

/**
 * Apply high contrast CSS custom properties
 */
function applyHighContrastStyles(): void {
  const root = document.documentElement;

  // Color overrides
  root.style.setProperty('--color-text', HIGH_CONTRAST_PALETTE.text);
  root.style.setProperty('--color-background', HIGH_CONTRAST_PALETTE.background);
  root.style.setProperty('--color-accent', HIGH_CONTRAST_PALETTE.accent);
  root.style.setProperty('--color-warning', HIGH_CONTRAST_PALETTE.warning);
  root.style.setProperty('--color-secondary', HIGH_CONTRAST_PALETTE.secondary);
  root.style.setProperty('--color-border', HIGH_CONTRAST_PALETTE.border);

  // Border widths
  root.style.setProperty('--border-width-normal', '2px');
  root.style.setProperty('--border-width-thick', '3px');

  // Focus indicator size
  root.style.setProperty('--focus-ring-width', '4px');
  root.style.setProperty('--focus-ring-offset', '3px');

  // Font weights
  root.style.setProperty('--font-weight-normal', '500');
  root.style.setProperty('--font-weight-bold', '700');
}

/**
 * Remove high contrast overrides (restore defaults)
 */
function removeHighContrastStyles(): void {
  const root = document.documentElement;

  // Remove overrides
  root.style.removeProperty('--color-text');
  root.style.removeProperty('--color-background');
  root.style.removeProperty('--color-accent');
  root.style.removeProperty('--color-warning');
  root.style.removeProperty('--color-secondary');
  root.style.removeProperty('--color-border');
  root.style.removeProperty('--border-width-normal');
  root.style.removeProperty('--border-width-thick');
  root.style.removeProperty('--focus-ring-width');
  root.style.removeProperty('--focus-ring-offset');
  root.style.removeProperty('--font-weight-normal');
  root.style.removeProperty('--font-weight-bold');
}

// ============================================================================
// React Hook — useHighContrast
// ============================================================================

/**
 * React hook to check if high contrast is enabled
 *
 * @returns Whether high contrast is enabled
 *
 * @example
 * ```tsx
 * function Button() {
 *   const highContrast = useHighContrast();
 *
 *   return (
 *     <button
 *       style={{
 *         border: highContrast ? '2px solid white' : '1px solid grey'
 *       }}
 *     >
 *       Click Me
 *     </button>
 *   );
 * }
 * ```
 */
export function useHighContrast(): boolean {
  const enabled = useHighContrastStore((state) => state.enabled);
  return enabled;
}

// ============================================================================
// System Preference Detection
// ============================================================================

/**
 * Detect prefers-contrast media query
 */
export function detectSystemContrastPreference(): 'no-preference' | 'more' | 'less' | 'custom' {
  if (typeof window === 'undefined') return 'no-preference';

  // Check for high contrast preference
  const moreContrastQuery = window.matchMedia('(prefers-contrast: more)');
  if (moreContrastQuery.matches) return 'more';

  const lessContrastQuery = window.matchMedia('(prefers-contrast: less)');
  if (lessContrastQuery.matches) return 'less';

  const customContrastQuery = window.matchMedia('(prefers-contrast: custom)');
  if (customContrastQuery.matches) return 'custom';

  return 'no-preference';
}

/**
 * Hook that respects system contrast preference
 */
export function useHighContrastWithSystem(): boolean {
  const store = useHighContrastStore();
  const [systemPreference, setSystemPreference] = useState(() => detectSystemContrastPreference());

  useEffect(() => {
    // Auto-enable if system requests more contrast
    if (systemPreference === 'more') {
      store.setEnabled(true);
    }

    // Listen for changes
    if (typeof window !== 'undefined') {
      const moreContrastQuery = window.matchMedia('(prefers-contrast: more)');
      const handleChange = (e: MediaQueryListEvent) => {
        setSystemPreference(e.matches ? 'more' : 'no-preference');
        if (e.matches) {
          store.setEnabled(true);
        }
      };

      if (moreContrastQuery.addEventListener) {
        moreContrastQuery.addEventListener('change', handleChange);
        return () => {
          moreContrastQuery.removeEventListener('change', handleChange);
        };
      }
    }
  }, [systemPreference, store]);

  return store.enabled;
}

// ============================================================================
// Style Helpers
// ============================================================================

/**
 * Get border style based on high contrast setting
 */
export function getBorderStyle(highContrast: boolean): React.CSSProperties {
  if (highContrast) {
    return {
      border: `2px solid ${HIGH_CONTRAST_PALETTE.border}`,
    };
  }

  return {
    border: '1px solid #6B6B6B',
  };
}

/**
 * Get text style based on high contrast setting
 */
export function getTextStyle(highContrast: boolean): React.CSSProperties {
  if (highContrast) {
    return {
      color: HIGH_CONTRAST_PALETTE.text,
      fontWeight: 500,
    };
  }

  return {
    color: '#F5F0E8',
    fontWeight: 400,
  };
}

/**
 * Get focus style based on high contrast setting
 */
export function getFocusStyle(highContrast: boolean): React.CSSProperties {
  if (highContrast) {
    return {
      outline: `4px solid ${HIGH_CONTRAST_PALETTE.accent}`,
      outlineOffset: '3px',
    };
  }

  return {
    outline: '3px solid #C5A442',
    outlineOffset: '2px',
  };
}

/**
 * Get button style based on high contrast setting
 */
export function getButtonStyle(highContrast: boolean): React.CSSProperties {
  if (highContrast) {
    return {
      backgroundColor: HIGH_CONTRAST_PALETTE.background,
      color: HIGH_CONTRAST_PALETTE.text,
      border: `2px solid ${HIGH_CONTRAST_PALETTE.border}`,
      fontWeight: 500,
    };
  }

  return {
    backgroundColor: '#0A0A0A',
    color: '#F5F0E8',
    border: '1px solid #6B6B6B',
    fontWeight: 400,
  };
}

/**
 * Get class name with high contrast modifier
 */
export function getHighContrastClassName(baseClassName: string, highContrast: boolean): string {
  if (highContrast) {
    return `${baseClassName} ${baseClassName}--high-contrast`;
  }
  return baseClassName;
}

// ============================================================================
// R3F Material Overrides
// ============================================================================

/**
 * Get material props for R3F with high contrast
 */
export function getHighContrastMaterialProps(highContrast: boolean) {
  if (highContrast) {
    return {
      emissive: '#FFFFFF',
      emissiveIntensity: 0.3,
      metalness: 0,
      roughness: 0.1,
    };
  }

  return {
    emissive: '#000000',
    emissiveIntensity: 0,
    metalness: 0.5,
    roughness: 0.5,
  };
}

/**
 * Get outline pass intensity for high contrast
 */
export function getOutlineIntensity(highContrast: boolean): number {
  return highContrast ? 1.5 : 1.0;
}

/**
 * Get glow intensity for high contrast
 */
export function getGlowIntensity(highContrast: boolean): number {
  return highContrast ? 2.0 : 1.0;
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize high contrast support
 * Detects system preference and applies initial state
 */
export function initializeHighContrast(): void {
  const systemPreference = detectSystemContrastPreference();
  const store = useHighContrastStore.getState();

  // Auto-enable for users with system preference
  if (systemPreference === 'more' && !store.enabled) {
    store.setEnabled(true);
  } else if (store.enabled) {
    // Apply saved preference
    document.documentElement.classList.add('high-contrast');
    applyHighContrastStyles();
  }

  console.log('[HighContrast] Initialized', {
    enabled: store.enabled,
    systemPreference,
  });
}

// ============================================================================
// Global CSS Injection
// ============================================================================

/**
 * Inject global CSS for high contrast mode
 * Called once at app startup
 */
export function injectHighContrastCSS(): void {
  const styleId = 'high-contrast-styles';

  // Don't inject twice
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    /* High Contrast Global Styles */
    .high-contrast {
      color-scheme: dark;
    }

    /* Stronger borders everywhere */
    .high-contrast * {
      border-width: 2px;
    }

    /* Enhanced focus indicators */
    .high-contrast *:focus {
      outline: 4px solid #FFD700;
      outline-offset: 3px;
    }

    /* Button styles */
    .high-contrast button,
    .high-contrast [role="button"] {
      border: 2px solid #FFFFFF !important;
      color: #FFFFFF !important;
      font-weight: 500 !important;
    }

    /* Link styles */
    .high-contrast a {
      color: #FFD700 !important;
      text-decoration: underline;
    }

    /* Stronger text */
    .high-contrast p,
    .high-contrast span,
    .high-contrast div {
      font-weight: 500;
    }

    /* Headings */
    .high-contrast h1,
    .high-contrast h2,
    .high-contrast h3 {
      font-weight: 700;
      color: #FFFFFF;
    }

    /* Remove subtle backgrounds */
    .high-contrast .subtle-bg {
      background: #000000 !important;
    }

    /* Engine artifacts get stronger outlines */
    .high-contrast .engine-artifact {
      outline: 2px solid #FFFFFF;
    }

    /* PIP gets stronger border */
    .high-contrast .pip-container {
      border: 3px solid #FFD700 !important;
    }
  `;

  document.head.appendChild(style);
}
