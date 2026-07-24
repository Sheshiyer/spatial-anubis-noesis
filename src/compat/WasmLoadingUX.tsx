/**
 * WasmLoadingUX -- Graceful WASM loading failure UX component
 *
 * P4-S3-27: Loading states, retry with exponential backoff, fallback messaging
 *
 * Brand palette:
 *   Deep Ink   #0A0A0A  (background)
 *   Bone White #F5F0E8  (primary text)
 *   Aged Gold  #C5A442  (accents, interactive)
 *   Terracotta #C45B28  (error accents)
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WasmLoadingState = 'loading' | 'error' | 'retrying' | 'fallback';

export interface WasmLoadingFallbackProps {
  /** Called when the user or automatic retry fires. Receives the current attempt number (1-based). */
  onRetry?: (attempt: number) => void;
  /** Called when all retries are exhausted and the user is shown the fallback state. */
  onFallback?: () => void;
  /** Maximum number of retry attempts before entering fallback. Default 3. */
  maxRetries?: number;
  /** Override the initial state (useful for testing/storybook). Default 'loading'. */
  initialState?: WasmLoadingState;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BRAND = {
  deepInk: '#0A0A0A',
  boneWhite: '#F5F0E8',
  agedGold: '#C5A442',
  terracotta: '#C45B28',
} as const;

/** Exponential backoff delays in milliseconds: 1s, 2s, 4s */
const BACKOFF_DELAYS = [1000, 2000, 4000] as const;

// ---------------------------------------------------------------------------
// Styles (inline to avoid external CSS dependency)
// ---------------------------------------------------------------------------

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: BRAND.deepInk,
    color: BRAND.boneWhite,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    padding: '2rem',
    textAlign: 'center' as const,
  },

  spinner: {
    width: '48px',
    height: '48px',
    border: `3px solid ${BRAND.boneWhite}22`,
    borderTopColor: BRAND.agedGold,
    borderRadius: '50%',
    animation: 'wasm-spin 0.8s linear infinite',
    marginBottom: '1.5rem',
  },

  heading: {
    fontSize: '1.25rem',
    fontWeight: 600 as const,
    marginBottom: '0.75rem',
    color: BRAND.boneWhite,
  },

  message: {
    fontSize: '0.9375rem',
    lineHeight: 1.6,
    maxWidth: '420px',
    color: `${BRAND.boneWhite}cc`,
    marginBottom: '1.5rem',
  },

  retryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.625rem 1.5rem',
    backgroundColor: 'transparent',
    color: BRAND.agedGold,
    border: `1.5px solid ${BRAND.agedGold}`,
    borderRadius: '4px',
    fontSize: '0.875rem',
    fontWeight: 500 as const,
    cursor: 'pointer',
    transition: 'background-color 0.2s, color 0.2s',
    outline: 'none',
  },

  retryButtonHover: {
    backgroundColor: BRAND.agedGold,
    color: BRAND.deepInk,
  },

  retryButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed' as const,
  },

  attemptCounter: {
    fontSize: '0.75rem',
    color: `${BRAND.boneWhite}88`,
    marginTop: '1rem',
  },

  errorIcon: {
    fontSize: '2.5rem',
    marginBottom: '1rem',
    color: BRAND.terracotta,
  },

  countdown: {
    fontSize: '0.8125rem',
    color: BRAND.agedGold,
    marginBottom: '1rem',
  },
} as const;

// ---------------------------------------------------------------------------
// Keyframes injection (runs once)
// ---------------------------------------------------------------------------

let keyframesInjected = false;

function injectKeyframes(): void {
  if (keyframesInjected || typeof document === 'undefined') return;
  keyframesInjected = true;

  const styleEl = document.createElement('style');
  styleEl.textContent = `
    @keyframes wasm-spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleEl);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * WasmLoadingFallback -- a self-contained React component that handles
 * WASM loading failure UX with automatic retries, a manual retry button,
 * and a graceful fallback state.
 */
export function WasmLoadingFallback({
  onRetry,
  onFallback,
  maxRetries = 3,
  initialState = 'loading',
}: WasmLoadingFallbackProps) {
  const [state, setState] = useState<WasmLoadingState>(initialState);
  const [attempt, setAttempt] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [buttonHovered, setButtonHovered] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Inject CSS keyframes on mount
  useEffect(() => {
    injectKeyframes();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  /**
   * Trigger a retry with exponential backoff.
   * Transitions: error -> retrying -> (onRetry fires) -> loading or fallback
   */
  const doRetry = useCallback(() => {
    const nextAttempt = attempt + 1;

    if (nextAttempt > maxRetries) {
      setState('fallback');
      onFallback?.();
      return;
    }

    setAttempt(nextAttempt);
    setState('retrying');

    const delayIndex = Math.min(nextAttempt - 1, BACKOFF_DELAYS.length - 1);
    const delay = BACKOFF_DELAYS[delayIndex] ?? 4000;
    const delaySec = Math.ceil(delay / 1000);
    setCountdown(delaySec);

    // Countdown ticker
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Fire retry callback after delay
    timerRef.current = setTimeout(() => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      setCountdown(0);
      onRetry?.(nextAttempt);
      setState('loading');
    }, delay);
  }, [attempt, maxRetries, onFallback, onRetry]);

  /**
   * Notify the component that loading failed.
   * Call this imperatively from the parent after a WASM load error.
   */
  const notifyError = useCallback(() => {
    setState('error');
  }, []);

  // Expose notifyError via a data attribute for parent integration
  // (Parents can also just set initialState='error' or use a ref pattern.)
  // We'll also auto-retry on first error.
  useEffect(() => {
    if (state === 'error' && attempt === 0) {
      // Auto-trigger first retry
      doRetry();
    }
  }, [state, attempt, doRetry]);

  // Expose notifyError for imperative usage.  Since this is a simple
  // component, we expose it via a window event pattern.
  useEffect(() => {
    const handler = () => notifyError();
    window.addEventListener('wasm-load-error', handler);
    return () => window.removeEventListener('wasm-load-error', handler);
  }, [notifyError]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  // -- Loading state --
  if (state === 'loading') {
    return (
      <div
        style={styles.container}
        role="status"
        aria-live="polite"
        aria-label="Loading WebAssembly module"
      >
        <div style={styles.spinner} aria-hidden="true" />
        <p style={styles.heading}>Preparing experience</p>
        <p style={styles.message}>
          Loading required modules. This may take a moment on first visit.
        </p>
      </div>
    );
  }

  // -- Retrying state --
  if (state === 'retrying') {
    return (
      <div
        style={styles.container}
        role="status"
        aria-live="polite"
        aria-label={`Retrying WebAssembly load, attempt ${attempt} of ${maxRetries}`}
      >
        <div style={styles.spinner} aria-hidden="true" />
        <p style={styles.heading}>Retrying</p>
        {countdown > 0 && (
          <p style={styles.countdown} aria-live="polite">
            Next attempt in {countdown}s
          </p>
        )}
        <p style={styles.message}>
          Attempting to reload the required module.
        </p>
        <p style={styles.attemptCounter}>
          Attempt {attempt} of {maxRetries}
        </p>
      </div>
    );
  }

  // -- Error state (between retries, manual retry available) --
  if (state === 'error') {
    const canRetry = attempt < maxRetries;

    return (
      <div
        style={styles.container}
        role="alert"
        aria-live="assertive"
        aria-label="WebAssembly loading failed"
      >
        <div style={styles.errorIcon} aria-hidden="true">
          !
        </div>
        <p style={styles.heading}>Loading failed</p>
        <p style={styles.message}>
          A required module could not be loaded. This may be due to a
          network issue or browser limitation.
        </p>
        {canRetry && (
          <button
            type="button"
            onClick={doRetry}
            onMouseEnter={() => setButtonHovered(true)}
            onMouseLeave={() => setButtonHovered(false)}
            onFocus={() => setButtonHovered(true)}
            onBlur={() => setButtonHovered(false)}
            style={{
              ...styles.retryButton,
              ...(buttonHovered ? styles.retryButtonHover : {}),
            }}
            aria-label={`Retry loading, attempt ${attempt + 1} of ${maxRetries}`}
          >
            Retry
          </button>
        )}
        <p style={styles.attemptCounter}>
          {attempt > 0 ? `${attempt} of ${maxRetries} attempts used` : ''}
        </p>
      </div>
    );
  }

  // -- Fallback state (all retries exhausted) --
  return (
    <div
      style={styles.container}
      role="alert"
      aria-live="assertive"
      aria-label="WebAssembly not supported or unavailable"
    >
      <div style={styles.errorIcon} aria-hidden="true">
        !
      </div>
      <p style={styles.heading}>Unable to load experience</p>
      <p style={styles.message}>
        This experience requires WebAssembly. Your browser may not support
        it, or a network error prevented the module from loading.
      </p>
      <p style={{ ...styles.message, fontSize: '0.8125rem' }}>
        Please try a recent version of Chrome, Safari, or Firefox. If
        the issue persists, check your network connection and try again
        later.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        onMouseEnter={() => setButtonHovered(true)}
        onMouseLeave={() => setButtonHovered(false)}
        onFocus={() => setButtonHovered(true)}
        onBlur={() => setButtonHovered(false)}
        style={{
          ...styles.retryButton,
          ...(buttonHovered ? styles.retryButtonHover : {}),
        }}
        aria-label="Reload the page"
      >
        Reload page
      </button>
    </div>
  );
}
