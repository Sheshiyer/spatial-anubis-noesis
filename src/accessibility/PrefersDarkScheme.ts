/**
 * Prefers Dark Scheme — P4-S2-09
 *
 * Enforces dark mode for NOESIS
 * Prevents light mode leaks and ensures consistent dark theme
 * Respects prefers-color-scheme but always maintains dark aesthetic
 */

import { useEffect } from 'react';

// ============================================================================
// Dark Scheme Detection
// ============================================================================

/**
 * Detect system color scheme preference
 */
export function detectColorScheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';

  const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  return darkModeQuery.matches ? 'dark' : 'light';
}

/**
 * Listen for color scheme changes
 */
export function listenToColorScheme(callback: (scheme: 'light' | 'dark') => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handleChange = (event: MediaQueryListEvent) => {
    callback(event.matches ? 'dark' : 'light');
  };

  // Modern browsers
  if (darkModeQuery.addEventListener) {
    darkModeQuery.addEventListener('change', handleChange);
    return () => {
      darkModeQuery.removeEventListener('change', handleChange);
    };
  }

  // Legacy browsers
  if (darkModeQuery.addListener) {
    darkModeQuery.addListener(handleChange);
    return () => {
      darkModeQuery.removeListener(handleChange);
    };
  }

  return () => {};
}

// ============================================================================
// Dark Mode Enforcement
// ============================================================================

/**
 * Enforce dark mode by setting color-scheme CSS property
 * Prevents browser from applying light mode styles
 */
export function enforceDarkMode(): void {
  // Set color-scheme to dark
  document.documentElement.style.setProperty('color-scheme', 'dark');

  // Add dark class
  document.documentElement.classList.add('dark');
  document.documentElement.classList.add('noesis-dark');

  // Set meta theme-color
  let metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (!metaThemeColor) {
    metaThemeColor = document.createElement('meta');
    metaThemeColor.setAttribute('name', 'theme-color');
    document.head.appendChild(metaThemeColor);
  }
  metaThemeColor.setAttribute('content', '#0A0A0A');

  console.log('[PrefersDarkScheme] Dark mode enforced');
}

/**
 * Prevent light mode leaks by overriding system defaults
 */
export function preventLightModeLeaks(): void {
  // Override any light mode CSS custom properties
  const root = document.documentElement;

  // Ensure backgrounds are always dark
  root.style.setProperty('background-color', '#0A0A0A');
  root.style.setProperty('color', '#F5F0E8');

  // Prevent white flashes on page load
  document.body.style.backgroundColor = '#0A0A0A';
  document.body.style.color = '#F5F0E8';

  // Override potential light mode from system
  const style = document.createElement('style');
  style.id = 'dark-mode-enforcement';
  style.textContent = `
    /* Force Dark Mode — NOESIS is always dark */
    :root {
      color-scheme: dark;
      background: #0A0A0A;
      color: #F5F0E8;
    }

    body {
      background: #0A0A0A;
      color: #F5F0E8;
    }

    /* Override any light mode from libraries */
    * {
      color-scheme: dark;
    }

    /* Prevent white backgrounds from leaking through */
    canvas {
      background: transparent;
    }

    /* Ensure inputs respect dark mode */
    input,
    textarea,
    select {
      background-color: #1A1A1A;
      color: #F5F0E8;
      border: 1px solid #6B6B6B;
    }

    /* Placeholder text */
    ::placeholder {
      color: #6B6B6B;
    }

    /* Scrollbar dark mode */
    ::-webkit-scrollbar {
      background: #0A0A0A;
    }

    ::-webkit-scrollbar-thumb {
      background: #6B6B6B;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: #C5A442;
    }
  `;

  // Remove existing enforcement style if present
  const existing = document.getElementById('dark-mode-enforcement');
  if (existing) {
    existing.remove();
  }

  document.head.appendChild(style);
}

// ============================================================================
// React Hook — useDarkSchemeEnforcement
// ============================================================================

/**
 * React hook to enforce dark scheme and prevent light mode leaks
 *
 * @example
 * ```tsx
 * function App() {
 *   useDarkSchemeEnforcement();
 *
 *   return <div>Always dark</div>;
 * }
 * ```
 */
export function useDarkSchemeEnforcement(): void {
  useEffect(() => {
    // Enforce dark mode immediately
    enforceDarkMode();
    preventLightModeLeaks();

    // Listen for system changes and re-enforce
    const cleanup = listenToColorScheme((scheme) => {
      if (scheme === 'light') {
        console.warn('[PrefersDarkScheme] System switched to light mode, but NOESIS remains dark');
      }
      // Always enforce dark regardless of system preference
      enforceDarkMode();
    });

    return cleanup;
  }, []);
}

// ============================================================================
// React Hook — useSystemColorScheme
// ============================================================================

/**
 * Hook to detect system color scheme (for informational purposes only)
 * NOESIS always renders dark, but we can inform the user
 *
 * @returns Current system color scheme preference
 *
 * @example
 * ```tsx
 * function SystemInfo() {
 *   const systemScheme = useSystemColorScheme();
 *
 *   return (
 *     <div>
 *       Your system prefers: {systemScheme}
 *       <br />
 *       NOESIS is always dark
 *     </div>
 *   );
 * }
 * ```
 */
export function useSystemColorScheme(): 'light' | 'dark' {
  const [scheme, setScheme] = useSystemColorSchemeState();

  useEffect(() => {
    // Set initial value
    setScheme(detectColorScheme());

    // Listen for changes
    const cleanup = listenToColorScheme(setScheme);

    return cleanup;
  }, []);

  return scheme;
}

/**
 * Helper state hook for useSystemColorScheme
 */
function useSystemColorSchemeState(): ['light' | 'dark', (scheme: 'light' | 'dark') => void] {
  const [scheme, setScheme] = React.useState<'light' | 'dark'>('dark');
  return [scheme, setScheme];
}

// Import React for useState
import React from 'react';

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize dark scheme enforcement
 * Call ASAP in application startup (before React renders)
 */
export function initializeDarkScheme(): void {
  // Run immediately, even before React mounts
  enforceDarkMode();
  preventLightModeLeaks();

  console.log('[PrefersDarkScheme] Initialized — NOESIS is always dark');
}

// ============================================================================
// Critical CSS Injection (Blocking)
// ============================================================================

/**
 * Inject critical dark mode CSS synchronously
 * Prevents white flash on initial page load
 *
 * This should be called in the HTML <head> via a script tag:
 * <script>
 *   document.documentElement.style.colorScheme = 'dark';
 *   document.documentElement.style.background = '#0A0A0A';
 * </script>
 */
export function injectCriticalDarkCSS(): string {
  return `
    <style id="critical-dark-mode">
      :root {
        color-scheme: dark;
        background: #0A0A0A;
        color: #F5F0E8;
      }
      body {
        background: #0A0A0A;
        color: #F5F0E8;
        margin: 0;
        padding: 0;
      }
      /* Prevent white flash */
      #root {
        background: #0A0A0A;
        min-height: 100vh;
      }
    </style>
  `;
}

// ============================================================================
// Export Utilities
// ============================================================================

/**
 * Check if element has accidentally light background
 * Useful for debugging light mode leaks
 */
export function detectLightModeLeaks(element: HTMLElement = document.body): boolean {
  const bg = window.getComputedStyle(element).backgroundColor;

  // Parse RGB
  const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return false;

  const [, r, g, b] = match.map(Number);

  // Check if background is too light (brightness > 128)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  if (brightness > 128) {
    console.warn('[PrefersDarkScheme] Light mode leak detected:', element, { bg, brightness });
    return true;
  }

  return false;
}

/**
 * Scan entire document for light mode leaks
 */
export function scanForLightModeLeaks(): Array<{ element: HTMLElement; bg: string }> {
  const leaks: Array<{ element: HTMLElement; bg: string }> = [];

  document.querySelectorAll('*').forEach((el) => {
    if (el instanceof HTMLElement && detectLightModeLeaks(el)) {
      const bg = window.getComputedStyle(el).backgroundColor;
      leaks.push({ element: el, bg });
    }
  });

  return leaks;
}
