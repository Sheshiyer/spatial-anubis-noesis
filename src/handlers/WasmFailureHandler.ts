/**
 * WASM Failure Handler
 * P4-S2: Rapier WASM initialization failure fallback
 *
 * On Rapier WASM init failure: static scene, click-based navigation.
 * Disables physics. Shows "reduced mode" banner.
 */

export interface WasmFailureState {
  wasmAvailable: boolean;
  failureReason: string | null;
  fallbackMode: boolean;
  failureTime: number | null;
}

export interface WasmFailureHandlerOptions {
  showBanner?: boolean;
  bannerDurationMs?: number;
  enableClickNavigation?: boolean;
}

const DEFAULT_OPTIONS: Required<WasmFailureHandlerOptions> = {
  showBanner: true,
  bannerDurationMs: 10000, // 10 seconds
  enableClickNavigation: true,
};

export class WasmFailureHandler {
  private static instance: WasmFailureHandler | null = null;
  private options: Required<WasmFailureHandlerOptions>;
  private state: WasmFailureState;
  private isActive = false;
  private banner: HTMLDivElement | null = null;
  private bannerTimeout: number | null = null;

  // Callbacks
  private failureCallbacks: Array<(reason: string) => void> = [];
  private fallbackModeCallbacks: Array<() => void> = [];

  private constructor(options: WasmFailureHandlerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };

    this.state = {
      wasmAvailable: true,
      failureReason: null,
      fallbackMode: false,
      failureTime: null,
    };
  }

  static getInstance(options?: WasmFailureHandlerOptions): WasmFailureHandler {
    if (!WasmFailureHandler.instance) {
      WasmFailureHandler.instance = new WasmFailureHandler(options);
    }
    return WasmFailureHandler.instance;
  }

  /**
   * Initialize
   */
  init(): void {
    if (this.isActive) {
      console.log('[WasmFailureHandler] Already initialized');
      return;
    }

    this.isActive = true;

    // Check WASM support
    const wasmSupported = this.checkWasmSupport();
    if (!wasmSupported) {
      this.handleFailure('WebAssembly not supported in this browser');
    }

    console.log('[WasmFailureHandler] Initialized, WASM supported:', wasmSupported);
  }

  /**
   * Check if WASM is supported
   */
  private checkWasmSupport(): boolean {
    try {
      if (typeof WebAssembly === 'object' &&
          typeof WebAssembly.instantiate === 'function') {
        // Try to create a minimal WASM module
        const module = new WebAssembly.Module(
          Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00)
        );
        return module instanceof WebAssembly.Module;
      }
      return false;
    } catch (error) {
      console.error('[WasmFailureHandler] WASM support check failed:', error);
      return false;
    }
  }

  /**
   * Attempt to initialize Rapier WASM
   */
  async initializeRapier(rapierInit: () => Promise<any>): Promise<{ success: boolean; rapier?: any }> {
    try {
      console.log('[WasmFailureHandler] Initializing Rapier WASM...');

      const rapier = await rapierInit();

      console.log('[WasmFailureHandler] Rapier WASM initialized successfully');
      this.state.wasmAvailable = true;
      this.state.fallbackMode = false;

      return { success: true, rapier };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[WasmFailureHandler] Rapier WASM initialization failed:', errorMessage);

      this.handleFailure(`Rapier initialization failed: ${errorMessage}`);

      return { success: false };
    }
  }

  /**
   * Handle WASM failure
   */
  private handleFailure(reason: string): void {
    console.error('[WasmFailureHandler] WASM failure:', reason);

    this.state.wasmAvailable = false;
    this.state.failureReason = reason;
    this.state.fallbackMode = true;
    this.state.failureTime = performance.now();

    // Show banner
    if (this.options.showBanner) {
      this.showBanner();
    }

    // Notify failure callbacks
    this.failureCallbacks.forEach(callback => {
      try {
        callback(reason);
      } catch (error) {
        console.error('[WasmFailureHandler] Failure callback error:', error);
      }
    });

    // Enter fallback mode
    this.enterFallbackMode();
  }

  /**
   * Enter fallback mode (static scene, click navigation)
   */
  private enterFallbackMode(): void {
    console.log('[WasmFailureHandler] Entering fallback mode');

    // Notify fallback mode callbacks
    this.fallbackModeCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('[WasmFailureHandler] Fallback mode callback error:', error);
      }
    });

    // Enable click navigation if configured
    if (this.options.enableClickNavigation) {
      this.enableClickNavigation();
    }
  }

  /**
   * Enable click-based navigation
   */
  private enableClickNavigation(): void {
    console.log('[WasmFailureHandler] Click-based navigation enabled');

    // This would be implemented by the application
    // The handler just signals that click navigation should be enabled
  }

  /**
   * Show reduced mode banner
   */
  private showBanner(): void {
    if (this.banner) {
      this.banner.style.display = 'block';
      return;
    }

    // Create banner
    this.banner = document.createElement('div');
    this.banner.style.cssText = `
      position: fixed;
      top: 1rem;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(197, 91, 40, 0.95);
      color: #F5F0E8;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 0.875rem;
      font-weight: 500;
      z-index: 9999;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(197, 164, 66, 0.3);
    `;

    const icon = document.createElement('span');
    icon.textContent = '⚠️ ';
    icon.style.marginRight = '0.5rem';

    const text = document.createElement('span');
    text.textContent = 'Running in reduced mode (physics disabled)';

    this.banner.appendChild(icon);
    this.banner.appendChild(text);
    document.body.appendChild(this.banner);

    console.log('[WasmFailureHandler] Showing reduced mode banner');

    // Auto-hide after duration
    if (this.options.bannerDurationMs > 0) {
      this.bannerTimeout = window.setTimeout(() => {
        this.hideBanner();
      }, this.options.bannerDurationMs);
    }
  }

  /**
   * Hide banner
   */
  private hideBanner(): void {
    if (this.banner) {
      this.banner.style.display = 'none';
      console.log('[WasmFailureHandler] Hiding reduced mode banner');
    }

    if (this.bannerTimeout !== null) {
      clearTimeout(this.bannerTimeout);
      this.bannerTimeout = null;
    }
  }

  /**
   * Remove banner completely
   */
  private removeBanner(): void {
    if (this.banner && this.banner.parentNode) {
      this.banner.parentNode.removeChild(this.banner);
      this.banner = null;
    }

    if (this.bannerTimeout !== null) {
      clearTimeout(this.bannerTimeout);
      this.bannerTimeout = null;
    }
  }

  /**
   * Get current state
   */
  getState(): WasmFailureState {
    return { ...this.state };
  }

  /**
   * Check if WASM is available
   */
  isWasmAvailable(): boolean {
    return this.state.wasmAvailable;
  }

  /**
   * Check if in fallback mode
   */
  isInFallbackMode(): boolean {
    return this.state.fallbackMode;
  }

  /**
   * Get failure reason
   */
  getFailureReason(): string | null {
    return this.state.failureReason;
  }

  /**
   * Subscribe to failure events
   */
  onFailure(callback: (reason: string) => void): () => void {
    this.failureCallbacks.push(callback);
    return () => {
      const index = this.failureCallbacks.indexOf(callback);
      if (index !== -1) {
        this.failureCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to fallback mode events
   */
  onFallbackMode(callback: () => void): () => void {
    this.fallbackModeCallbacks.push(callback);
    return () => {
      const index = this.fallbackModeCallbacks.indexOf(callback);
      if (index !== -1) {
        this.fallbackModeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Reset state
   */
  reset(): void {
    this.state = {
      wasmAvailable: true,
      failureReason: null,
      fallbackMode: false,
      failureTime: null,
    };

    this.hideBanner();

    console.log('[WasmFailureHandler] Reset');
  }

  /**
   * Clean up
   */
  destroy(): void {
    this.isActive = false;

    // Remove banner
    this.removeBanner();

    // Clear callbacks
    this.failureCallbacks = [];
    this.fallbackModeCallbacks = [];

    console.log('[WasmFailureHandler] Destroyed');
  }
}

// Singleton export
export const wasmFailureHandler = WasmFailureHandler.getInstance();

/**
 * Physics fallback interface for when WASM is unavailable
 */
export interface PhysicsFallback {
  enabled: false;
  mode: 'static';

  // No-op methods
  step: () => void;
  addBody: () => null;
  removeBody: () => void;
  setBodyPosition: () => void;
}

/**
 * Create a physics fallback object
 */
export function createPhysicsFallback(): PhysicsFallback {
  return {
    enabled: false,
    mode: 'static',
    step: () => {},
    addBody: () => null,
    removeBody: () => {},
    setBodyPosition: () => {},
  };
}
