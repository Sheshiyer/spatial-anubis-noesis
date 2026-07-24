/**
 * WebGL Recovery Handler
 * P4-S2: webglcontextlost/restored handler
 *
 * Shows fallback UI on context loss.
 * Reinitializes renderer, reloads textures, restores scene on restore.
 */

export interface WebGLContextState {
  isContextLost: boolean;
  lossTime: number | null;
  restoreTime: number | null;
  lossCount: number;
}

export interface WebGLRecoveryOptions {
  autoRestore?: boolean;
  showFallbackUI?: boolean;
  maxRestoreAttempts?: number;
}

const DEFAULT_OPTIONS: Required<WebGLRecoveryOptions> = {
  autoRestore: true,
  showFallbackUI: true,
  maxRestoreAttempts: 3,
};

export class WebGLRecoveryHandler {
  private static instance: WebGLRecoveryHandler | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private options: Required<WebGLRecoveryOptions>;
  private contextState: WebGLContextState;
  private isActive = false;
  private restoreAttempts = 0;

  // Event handlers
  private contextLostHandler: ((event: Event) => void) | null = null;
  private contextRestoredHandler: ((event: Event) => void) | null = null;

  // Callbacks
  private contextLostCallbacks: Array<() => void> = [];
  private contextRestoredCallbacks: Array<() => void> = [];
  private restoreFailedCallbacks: Array<(attempts: number) => void> = [];

  // Fallback UI element
  private fallbackUI: HTMLDivElement | null = null;

  private constructor(options: WebGLRecoveryOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };

    this.contextState = {
      isContextLost: false,
      lossTime: null,
      restoreTime: null,
      lossCount: 0,
    };
  }

  static getInstance(options?: WebGLRecoveryOptions): WebGLRecoveryHandler {
    if (!WebGLRecoveryHandler.instance) {
      WebGLRecoveryHandler.instance = new WebGLRecoveryHandler(options);
    }
    return WebGLRecoveryHandler.instance;
  }

  /**
   * Initialize with canvas element
   */
  init(canvas: HTMLCanvasElement): void {
    if (this.isActive && this.canvas === canvas) {
      console.log('[WebGLRecoveryHandler] Already initialized with this canvas');
      return;
    }

    // Clean up previous
    this.destroy();

    this.canvas = canvas;
    this.isActive = true;
    this.restoreAttempts = 0;

    // Set up event listeners
    this.contextLostHandler = (event: Event) => {
      event.preventDefault(); // Prevent default browser behavior
      this.handleContextLost();
    };

    this.contextRestoredHandler = () => {
      this.handleContextRestored();
    };

    canvas.addEventListener('webglcontextlost', this.contextLostHandler, false);
    canvas.addEventListener('webglcontextrestored', this.contextRestoredHandler, false);

    console.log('[WebGLRecoveryHandler] Initialized');
  }

  /**
   * Handle WebGL context lost
   */
  private handleContextLost(): void {
    console.error('[WebGLRecoveryHandler] WebGL context lost');

    this.contextState.isContextLost = true;
    this.contextState.lossTime = performance.now();
    this.contextState.lossCount++;

    // Show fallback UI
    if (this.options.showFallbackUI) {
      this.showFallbackUI();
    }

    // Notify listeners
    this.contextLostCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('[WebGLRecoveryHandler] Context lost callback error:', error);
      }
    });

    // Attempt to restore if auto-restore is enabled
    if (this.options.autoRestore) {
      this.attemptRestore();
    }
  }

  /**
   * Handle WebGL context restored
   */
  private handleContextRestored(): void {
    console.log('[WebGLRecoveryHandler] WebGL context restored');

    this.contextState.isContextLost = false;
    this.contextState.restoreTime = performance.now();
    this.restoreAttempts = 0;

    // Hide fallback UI
    this.hideFallbackUI();

    // Notify listeners to reinitialize
    this.contextRestoredCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('[WebGLRecoveryHandler] Context restored callback error:', error);
      }
    });

    // Log recovery time
    if (this.contextState.lossTime !== null) {
      const recoveryTime = this.contextState.restoreTime - this.contextState.lossTime;
      console.log(`[WebGLRecoveryHandler] Context recovered in ${recoveryTime.toFixed(0)}ms`);
    }
  }

  /**
   * Attempt to restore WebGL context
   */
  private attemptRestore(): void {
    if (!this.canvas) return;

    this.restoreAttempts++;

    if (this.restoreAttempts > this.options.maxRestoreAttempts) {
      console.error('[WebGLRecoveryHandler] Max restore attempts reached');

      // Notify failure
      this.restoreFailedCallbacks.forEach(callback => {
        try {
          callback(this.restoreAttempts);
        } catch (error) {
          console.error('[WebGLRecoveryHandler] Restore failed callback error:', error);
        }
      });

      return;
    }

    console.log(`[WebGLRecoveryHandler] Restore attempt ${this.restoreAttempts}/${this.options.maxRestoreAttempts}`);

    // Get WebGL context and try to restore
    const gl = this.canvas.getContext('webgl2') || this.canvas.getContext('webgl');

    if (gl && 'loseContext' in gl) {
      const ext = gl.getExtension('WEBGL_lose_context');
      if (ext) {
        // Force context restore
        setTimeout(() => {
          ext.restoreContext();
        }, 1000);
      }
    }
  }

  /**
   * Show fallback UI
   */
  private showFallbackUI(): void {
    if (this.fallbackUI) {
      this.fallbackUI.style.display = 'flex';
      return;
    }

    // Create fallback UI
    this.fallbackUI = document.createElement('div');
    this.fallbackUI.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #0A0A0A;
      color: #F5F0E8;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: system-ui, -apple-system, sans-serif;
      z-index: 10000;
      gap: 1rem;
    `;

    const title = document.createElement('h2');
    title.textContent = 'Graphics Context Lost';
    title.style.cssText = `
      font-size: 1.5rem;
      font-weight: 600;
      color: #C5A442;
      margin: 0;
    `;

    const message = document.createElement('p');
    message.textContent = 'Attempting to recover...';
    message.style.cssText = `
      font-size: 1rem;
      color: #F5F0E8;
      opacity: 0.8;
      margin: 0;
    `;

    const spinner = document.createElement('div');
    spinner.style.cssText = `
      width: 3rem;
      height: 3rem;
      border: 3px solid #C5A442;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    `;

    // Add spinner animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `;

    this.fallbackUI.appendChild(title);
    this.fallbackUI.appendChild(message);
    this.fallbackUI.appendChild(spinner);
    document.head.appendChild(style);
    document.body.appendChild(this.fallbackUI);

    console.log('[WebGLRecoveryHandler] Showing fallback UI');
  }

  /**
   * Hide fallback UI
   */
  private hideFallbackUI(): void {
    if (this.fallbackUI) {
      this.fallbackUI.style.display = 'none';
      console.log('[WebGLRecoveryHandler] Hiding fallback UI');
    }
  }

  /**
   * Remove fallback UI completely
   */
  private removeFallbackUI(): void {
    if (this.fallbackUI && this.fallbackUI.parentNode) {
      this.fallbackUI.parentNode.removeChild(this.fallbackUI);
      this.fallbackUI = null;
    }
  }

  /**
   * Get context state
   */
  getContextState(): WebGLContextState {
    return { ...this.contextState };
  }

  /**
   * Check if context is lost
   */
  isContextLost(): boolean {
    return this.contextState.isContextLost;
  }

  /**
   * Get recovery time (if recovered)
   */
  getRecoveryTime(): number | null {
    if (this.contextState.lossTime === null || this.contextState.restoreTime === null) {
      return null;
    }
    return this.contextState.restoreTime - this.contextState.lossTime;
  }

  /**
   * Subscribe to context lost events
   */
  onContextLost(callback: () => void): () => void {
    this.contextLostCallbacks.push(callback);
    return () => {
      const index = this.contextLostCallbacks.indexOf(callback);
      if (index !== -1) {
        this.contextLostCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to context restored events
   */
  onContextRestored(callback: () => void): () => void {
    this.contextRestoredCallbacks.push(callback);
    return () => {
      const index = this.contextRestoredCallbacks.indexOf(callback);
      if (index !== -1) {
        this.contextRestoredCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to restore failed events
   */
  onRestoreFailed(callback: (attempts: number) => void): () => void {
    this.restoreFailedCallbacks.push(callback);
    return () => {
      const index = this.restoreFailedCallbacks.indexOf(callback);
      if (index !== -1) {
        this.restoreFailedCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Reset state
   */
  reset(): void {
    this.contextState = {
      isContextLost: false,
      lossTime: null,
      restoreTime: null,
      lossCount: 0,
    };
    this.restoreAttempts = 0;
    this.hideFallbackUI();
    console.log('[WebGLRecoveryHandler] Reset');
  }

  /**
   * Clean up
   */
  destroy(): void {
    this.isActive = false;

    // Remove event listeners
    if (this.canvas && this.contextLostHandler) {
      this.canvas.removeEventListener('webglcontextlost', this.contextLostHandler);
    }

    if (this.canvas && this.contextRestoredHandler) {
      this.canvas.removeEventListener('webglcontextrestored', this.contextRestoredHandler);
    }

    // Remove fallback UI
    this.removeFallbackUI();

    // Clear callbacks
    this.contextLostCallbacks = [];
    this.contextRestoredCallbacks = [];
    this.restoreFailedCallbacks = [];

    this.canvas = null;

    console.log('[WebGLRecoveryHandler] Destroyed');
  }
}

// Singleton export
export const webglRecoveryHandler = WebGLRecoveryHandler.getInstance();
