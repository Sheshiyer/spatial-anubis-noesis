/**
 * Tab Visibility Handler
 * P4-S2: document.visibilitychange handler
 *
 * Pause physics+rendering+audio on hidden.
 * Resume with delta clamp on visible.
 */

export interface TabVisibilityState {
  isVisible: boolean;
  hiddenTime: number | null;
  visibleTime: number | null;
  hiddenDuration: number;
  pauseCount: number;
}

export interface TabVisibilityHandlerOptions {
  pausePhysics?: boolean;
  pauseRendering?: boolean;
  pauseAudio?: boolean;
  maxDeltaClamp?: number; // ms
}

const DEFAULT_OPTIONS: Required<TabVisibilityHandlerOptions> = {
  pausePhysics: true,
  pauseRendering: true,
  pauseAudio: true,
  maxDeltaClamp: 100, // Clamp delta to 100ms max when resuming
};

export class TabVisibilityHandler {
  private static instance: TabVisibilityHandler | null = null;
  private options: Required<TabVisibilityHandlerOptions>;
  private state: TabVisibilityState;
  private isActive = false;
  private visibilityChangeHandler: (() => void) | null = null;

  // Callbacks
  private hiddenCallbacks: Array<() => void> = [];
  private visibleCallbacks: Array<(hiddenDuration: number) => void> = [];

  private constructor(options: TabVisibilityHandlerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };

    this.state = {
      isVisible: !document.hidden,
      hiddenTime: null,
      visibleTime: null,
      hiddenDuration: 0,
      pauseCount: 0,
    };
  }

  static getInstance(options?: TabVisibilityHandlerOptions): TabVisibilityHandler {
    if (!TabVisibilityHandler.instance) {
      TabVisibilityHandler.instance = new TabVisibilityHandler(options);
    }
    return TabVisibilityHandler.instance;
  }

  /**
   * Initialize and start monitoring
   */
  init(): void {
    if (this.isActive) {
      console.log('[TabVisibilityHandler] Already initialized');
      return;
    }

    this.isActive = true;
    this.state.isVisible = !document.hidden;

    // Set up visibility change listener
    this.visibilityChangeHandler = () => this.handleVisibilityChange();
    document.addEventListener('visibilitychange', this.visibilityChangeHandler);

    console.log('[TabVisibilityHandler] Initialized, visible:', this.state.isVisible);
  }

  /**
   * Handle visibility change event
   */
  private handleVisibilityChange(): void {
    if (document.hidden) {
      this.handleHidden();
    } else {
      this.handleVisible();
    }
  }

  /**
   * Handle tab becoming hidden
   */
  private handleHidden(): void {
    console.log('[TabVisibilityHandler] Tab hidden, pausing...');

    this.state.isVisible = false;
    this.state.hiddenTime = performance.now();
    this.state.pauseCount++;

    // Notify listeners to pause
    this.hiddenCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('[TabVisibilityHandler] Hidden callback error:', error);
      }
    });
  }

  /**
   * Handle tab becoming visible
   */
  private handleVisible(): void {
    const now = performance.now();

    // Calculate how long tab was hidden
    let hiddenDuration = 0;
    if (this.state.hiddenTime !== null) {
      hiddenDuration = now - this.state.hiddenTime;
    }

    console.log('[TabVisibilityHandler] Tab visible, resuming... (was hidden for', hiddenDuration.toFixed(0), 'ms)');

    this.state.isVisible = true;
    this.state.visibleTime = now;
    this.state.hiddenDuration = hiddenDuration;

    // Notify listeners to resume with clamped delta
    const clampedDuration = Math.min(hiddenDuration, this.options.maxDeltaClamp);

    this.visibleCallbacks.forEach(callback => {
      try {
        callback(clampedDuration);
      } catch (error) {
        console.error('[TabVisibilityHandler] Visible callback error:', error);
      }
    });

    // Reset hidden time
    this.state.hiddenTime = null;
  }

  /**
   * Get current state
   */
  getState(): TabVisibilityState {
    return { ...this.state };
  }

  /**
   * Check if tab is visible
   */
  isTabVisible(): boolean {
    return this.state.isVisible;
  }

  /**
   * Get time hidden (ms) if currently hidden
   */
  getTimeHidden(): number | null {
    if (!this.state.hiddenTime) return null;
    return performance.now() - this.state.hiddenTime;
  }

  /**
   * Get last hidden duration
   */
  getLastHiddenDuration(): number {
    return this.state.hiddenDuration;
  }

  /**
   * Subscribe to tab hidden events
   */
  onHidden(callback: () => void): () => void {
    this.hiddenCallbacks.push(callback);
    return () => {
      const index = this.hiddenCallbacks.indexOf(callback);
      if (index !== -1) {
        this.hiddenCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to tab visible events
   */
  onVisible(callback: (hiddenDuration: number) => void): () => void {
    this.visibleCallbacks.push(callback);
    return () => {
      const index = this.visibleCallbacks.indexOf(callback);
      if (index !== -1) {
        this.visibleCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Reset state
   */
  reset(): void {
    this.state = {
      isVisible: !document.hidden,
      hiddenTime: null,
      visibleTime: null,
      hiddenDuration: 0,
      pauseCount: 0,
    };

    console.log('[TabVisibilityHandler] Reset');
  }

  /**
   * Clean up
   */
  destroy(): void {
    this.isActive = false;

    // Remove visibility change listener
    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
      this.visibilityChangeHandler = null;
    }

    // Clear callbacks
    this.hiddenCallbacks = [];
    this.visibleCallbacks = [];

    console.log('[TabVisibilityHandler] Destroyed');
  }
}

// Singleton export
export const tabVisibilityHandler = TabVisibilityHandler.getInstance();

/**
 * Helper to create a delta time manager that respects visibility
 */
export class DeltaTimeManager {
  private lastTime = performance.now();
  private isPaused = false;

  constructor(
    private maxDelta: number = 100,
    private handler: TabVisibilityHandler = tabVisibilityHandler
  ) {
    // Subscribe to visibility changes
    handler.onHidden(() => this.pause());
    handler.onVisible(() => this.resume());
  }

  /**
   * Get delta time (clamped)
   */
  getDelta(): number {
    if (this.isPaused) {
      return 0;
    }

    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;

    // Clamp to max delta
    return Math.min(delta, this.maxDelta);
  }

  /**
   * Pause delta calculations
   */
  pause(): void {
    this.isPaused = true;
  }

  /**
   * Resume delta calculations
   */
  resume(): void {
    this.isPaused = false;
    // Reset lastTime to prevent large delta on resume
    this.lastTime = performance.now();
  }

  /**
   * Reset timer
   */
  reset(): void {
    this.lastTime = performance.now();
  }
}
