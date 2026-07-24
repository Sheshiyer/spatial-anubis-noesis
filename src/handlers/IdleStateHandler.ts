/**
 * Idle State Handler
 * P4-S2: Idle state detection and ambient mode
 *
 * 10s no input → Cartographer nudge
 * 30s → ambient mode (lower tick rate, disable physics, reduce render resolution)
 */

export type IdleState = 'active' | 'nudge' | 'ambient';

export interface IdleStateHandlerOptions {
  nudgeThresholdMs?: number;
  ambientThresholdMs?: number;
  monitorMouse?: boolean;
  monitorKeyboard?: boolean;
  monitorTouch?: boolean;
}

const DEFAULT_OPTIONS: Required<IdleStateHandlerOptions> = {
  nudgeThresholdMs: 10000, // 10 seconds
  ambientThresholdMs: 30000, // 30 seconds
  monitorMouse: true,
  monitorKeyboard: true,
  monitorTouch: true,
};

export interface AmbientModeSettings {
  tickRate: number; // Hz
  physicsEnabled: boolean;
  renderResolution: number; // multiplier
  audioVolume: number; // 0-1
}

const AMBIENT_SETTINGS: AmbientModeSettings = {
  tickRate: 15, // reduced from 60Hz
  physicsEnabled: false,
  renderResolution: 0.75, // 75% resolution
  audioVolume: 0.5, // 50% volume
};

export class IdleStateHandler {
  private static instance: IdleStateHandler | null = null;
  private options: Required<IdleStateHandlerOptions>;
  private lastActivityTime = 0;
  private currentState: IdleState = 'active';
  private isActive = false;
  private checkInterval: number | null = null;

  // Event handlers
  private mouseHandler: ((e: MouseEvent) => void) | null = null;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private touchHandler: ((e: TouchEvent) => void) | null = null;
  private wheelHandler: ((e: WheelEvent) => void) | null = null;

  // Callbacks
  private nudgeCallbacks: Array<() => void> = [];
  private ambientEnterCallbacks: Array<(settings: AmbientModeSettings) => void> = [];
  private ambientExitCallbacks: Array<() => void> = [];
  private stateChangeCallbacks: Array<(state: IdleState) => void> = [];

  private constructor(options: IdleStateHandlerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  static getInstance(options?: IdleStateHandlerOptions): IdleStateHandler {
    if (!IdleStateHandler.instance) {
      IdleStateHandler.instance = new IdleStateHandler(options);
    }
    return IdleStateHandler.instance;
  }

  /**
   * Initialize and start monitoring
   */
  init(): void {
    if (this.isActive) {
      console.log('[IdleStateHandler] Already initialized');
      return;
    }

    this.lastActivityTime = performance.now();
    this.currentState = 'active';
    this.isActive = true;

    // Set up event listeners
    if (this.options.monitorMouse) {
      this.mouseHandler = () => this.recordActivity();
      document.addEventListener('mousemove', this.mouseHandler, { passive: true });
      document.addEventListener('mousedown', this.mouseHandler, { passive: true });
    }

    if (this.options.monitorKeyboard) {
      this.keyHandler = () => this.recordActivity();
      document.addEventListener('keydown', this.keyHandler, { passive: true });
    }

    if (this.options.monitorTouch) {
      this.touchHandler = () => this.recordActivity();
      document.addEventListener('touchstart', this.touchHandler, { passive: true });
      document.addEventListener('touchmove', this.touchHandler, { passive: true });
    }

    // Monitor wheel events (for mouse wheel and trackpad)
    this.wheelHandler = () => this.recordActivity();
    document.addEventListener('wheel', this.wheelHandler, { passive: true });

    // Start checking for idle state
    this.checkInterval = window.setInterval(() => {
      this.checkIdleState();
    }, 1000); // Check every second

    console.log('[IdleStateHandler] Initialized');
  }

  /**
   * Record user activity
   */
  private recordActivity(): void {
    const wasAmbient = this.currentState === 'ambient';

    this.lastActivityTime = performance.now();

    // Exit ambient mode if we were in it
    if (wasAmbient) {
      this.setState('active');
      this.notifyAmbientExit();
    } else if (this.currentState !== 'active') {
      this.setState('active');
    }
  }

  /**
   * Check current idle state
   */
  private checkIdleState(): void {
    if (!this.isActive) return;

    const now = performance.now();
    const idleTime = now - this.lastActivityTime;

    if (idleTime >= this.options.ambientThresholdMs && this.currentState !== 'ambient') {
      // Enter ambient mode
      this.setState('ambient');
      this.notifyAmbientEnter();

    } else if (idleTime >= this.options.nudgeThresholdMs && this.currentState === 'active') {
      // Show nudge
      this.setState('nudge');
      this.notifyNudge();
    }
  }

  /**
   * Set idle state and notify listeners
   */
  private setState(state: IdleState): void {
    if (this.currentState === state) return;

    const previousState = this.currentState;
    this.currentState = state;

    console.log(`[IdleStateHandler] State change: ${previousState} → ${state}`);

    this.stateChangeCallbacks.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('[IdleStateHandler] State change callback error:', error);
      }
    });
  }

  /**
   * Notify nudge callbacks
   */
  private notifyNudge(): void {
    console.log('[IdleStateHandler] Triggering Cartographer nudge');

    this.nudgeCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('[IdleStateHandler] Nudge callback error:', error);
      }
    });
  }

  /**
   * Notify ambient mode enter
   */
  private notifyAmbientEnter(): void {
    console.log('[IdleStateHandler] Entering ambient mode');

    this.ambientEnterCallbacks.forEach(callback => {
      try {
        callback(AMBIENT_SETTINGS);
      } catch (error) {
        console.error('[IdleStateHandler] Ambient enter callback error:', error);
      }
    });
  }

  /**
   * Notify ambient mode exit
   */
  private notifyAmbientExit(): void {
    console.log('[IdleStateHandler] Exiting ambient mode');

    this.ambientExitCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('[IdleStateHandler] Ambient exit callback error:', error);
      }
    });
  }

  /**
   * Get current idle state
   */
  getState(): IdleState {
    return this.currentState;
  }

  /**
   * Get time since last activity (ms)
   */
  getIdleTime(): number {
    return performance.now() - this.lastActivityTime;
  }

  /**
   * Check if in ambient mode
   */
  isInAmbientMode(): boolean {
    return this.currentState === 'ambient';
  }

  /**
   * Subscribe to nudge events
   */
  onNudge(callback: () => void): () => void {
    this.nudgeCallbacks.push(callback);
    return () => {
      const index = this.nudgeCallbacks.indexOf(callback);
      if (index !== -1) {
        this.nudgeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to ambient mode enter
   */
  onAmbientEnter(callback: (settings: AmbientModeSettings) => void): () => void {
    this.ambientEnterCallbacks.push(callback);
    return () => {
      const index = this.ambientEnterCallbacks.indexOf(callback);
      if (index !== -1) {
        this.ambientEnterCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to ambient mode exit
   */
  onAmbientExit(callback: () => void): () => void {
    this.ambientExitCallbacks.push(callback);
    return () => {
      const index = this.ambientExitCallbacks.indexOf(callback);
      if (index !== -1) {
        this.ambientExitCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(callback: (state: IdleState) => void): () => void {
    this.stateChangeCallbacks.push(callback);
    return () => {
      const index = this.stateChangeCallbacks.indexOf(callback);
      if (index !== -1) {
        this.stateChangeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Manually trigger activity (useful for programmatic events)
   */
  markActivity(): void {
    this.recordActivity();
  }

  /**
   * Reset idle timer
   */
  reset(): void {
    this.lastActivityTime = performance.now();
    this.setState('active');
    console.log('[IdleStateHandler] Reset');
  }

  /**
   * Clean up
   */
  destroy(): void {
    this.isActive = false;

    // Clear interval
    if (this.checkInterval !== null) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    // Remove event listeners
    if (this.mouseHandler) {
      document.removeEventListener('mousemove', this.mouseHandler);
      document.removeEventListener('mousedown', this.mouseHandler);
    }

    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler);
    }

    if (this.touchHandler) {
      document.removeEventListener('touchstart', this.touchHandler);
      document.removeEventListener('touchmove', this.touchHandler);
    }

    if (this.wheelHandler) {
      document.removeEventListener('wheel', this.wheelHandler);
    }

    // Clear callbacks
    this.nudgeCallbacks = [];
    this.ambientEnterCallbacks = [];
    this.ambientExitCallbacks = [];
    this.stateChangeCallbacks = [];

    console.log('[IdleStateHandler] Destroyed');
  }
}

// Singleton export
export const idleStateHandler = IdleStateHandler.getInstance();
