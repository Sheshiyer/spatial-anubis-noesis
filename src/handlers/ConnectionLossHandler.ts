/**
 * Connection Loss Handler
 * P4-S2: Persist state to localStorage on connection loss
 *
 * Exponential backoff retry (1s→2s→4s→8s→16s max)
 * Restore state on reconnect
 */

export interface ConnectionState {
  isOnline: boolean;
  lastOnlineTime: number;
  reconnectAttempts: number;
  maxReconnectDelay: number;
}

export interface PersistedState {
  timestamp: number;
  vesselPosition?: { x: number; y: number; z: number };
  vesselRotation?: { x: number; y: number; z: number; w: number };
  currentWorld?: string;
  calibrationState?: any;
  sessionData?: any;
}

export interface ConnectionLossHandlerOptions {
  maxRetries?: number;
  maxRetryDelay?: number;
  persistKey?: string;
}

const DEFAULT_OPTIONS: Required<ConnectionLossHandlerOptions> = {
  maxRetries: 10,
  maxRetryDelay: 16000, // 16 seconds
  persistKey: 'spatial_anubis_connection_state',
};

export class ConnectionLossHandler {
  private static instance: ConnectionLossHandler | null = null;
  private options: Required<ConnectionLossHandlerOptions>;
  private connectionState: ConnectionState;
  private isActive = false;
  private retryTimeout: number | null = null;

  // Event handlers
  private onlineHandler: (() => void) | null = null;
  private offlineHandler: (() => void) | null = null;

  // Callbacks
  private connectionLostCallbacks: Array<() => void> = [];
  private connectionRestoredCallbacks: Array<(state: PersistedState | null) => void> = [];
  private retryCallbacks: Array<(attempt: number, delay: number) => void> = [];

  private constructor(options: ConnectionLossHandlerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };

    this.connectionState = {
      isOnline: navigator.onLine,
      lastOnlineTime: performance.now(),
      reconnectAttempts: 0,
      maxReconnectDelay: this.options.maxRetryDelay,
    };
  }

  static getInstance(options?: ConnectionLossHandlerOptions): ConnectionLossHandler {
    if (!ConnectionLossHandler.instance) {
      ConnectionLossHandler.instance = new ConnectionLossHandler(options);
    }
    return ConnectionLossHandler.instance;
  }

  /**
   * Initialize and start monitoring
   */
  init(): void {
    if (this.isActive) {
      console.log('[ConnectionLossHandler] Already initialized');
      return;
    }

    this.isActive = true;
    this.connectionState.isOnline = navigator.onLine;

    // Set up event listeners
    this.onlineHandler = () => this.handleOnline();
    this.offlineHandler = () => this.handleOffline();

    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);

    console.log('[ConnectionLossHandler] Initialized, online:', this.connectionState.isOnline);

    // Try to restore previous state if we're online
    if (this.connectionState.isOnline) {
      const restored = this.restoreState();
      if (restored) {
        console.log('[ConnectionLossHandler] Restored previous state');
      }
    }
  }

  /**
   * Handle online event
   */
  private handleOnline(): void {
    console.log('[ConnectionLossHandler] Connection restored');

    this.connectionState.isOnline = true;
    this.connectionState.lastOnlineTime = performance.now();

    // Clear retry timeout
    if (this.retryTimeout !== null) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    // Restore state
    const restoredState = this.restoreState();

    // Notify listeners
    this.connectionRestoredCallbacks.forEach(callback => {
      try {
        callback(restoredState);
      } catch (error) {
        console.error('[ConnectionLossHandler] Connection restored callback error:', error);
      }
    });

    // Reset retry counter
    this.connectionState.reconnectAttempts = 0;
  }

  /**
   * Handle offline event
   */
  private handleOffline(): void {
    console.warn('[ConnectionLossHandler] Connection lost');

    this.connectionState.isOnline = false;

    // Persist current state immediately
    this.persistCurrentState();

    // Notify listeners
    this.connectionLostCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('[ConnectionLossHandler] Connection lost callback error:', error);
      }
    });

    // Start retry sequence
    this.startRetrySequence();
  }

  /**
   * Start exponential backoff retry sequence
   */
  private startRetrySequence(): void {
    if (this.retryTimeout !== null) {
      return; // Already retrying
    }

    const attempt = this.connectionState.reconnectAttempts;

    if (attempt >= this.options.maxRetries) {
      console.warn('[ConnectionLossHandler] Max retries reached');
      return;
    }

    // Calculate delay: 1s, 2s, 4s, 8s, 16s (max)
    const delay = Math.min(
      Math.pow(2, attempt) * 1000,
      this.options.maxRetryDelay
    );

    console.log(`[ConnectionLossHandler] Retry ${attempt + 1}/${this.options.maxRetries} in ${delay}ms`);

    // Notify retry callbacks
    this.retryCallbacks.forEach(callback => {
      try {
        callback(attempt + 1, delay);
      } catch (error) {
        console.error('[ConnectionLossHandler] Retry callback error:', error);
      }
    });

    this.retryTimeout = window.setTimeout(() => {
      this.retryTimeout = null;
      this.connectionState.reconnectAttempts++;

      // Check if we're online now
      if (navigator.onLine) {
        this.handleOnline();
      } else {
        // Continue retry sequence
        this.startRetrySequence();
      }
    }, delay);
  }

  /**
   * Persist current application state
   */
  persistCurrentState(customState?: Partial<PersistedState>): void {
    try {
      const state: PersistedState = {
        timestamp: Date.now(),
        ...customState,
      };

      localStorage.setItem(this.options.persistKey, JSON.stringify(state));
      console.log('[ConnectionLossHandler] State persisted to localStorage');

    } catch (error) {
      console.error('[ConnectionLossHandler] Failed to persist state:', error);
    }
  }

  /**
   * Restore state from localStorage
   */
  restoreState(): PersistedState | null {
    try {
      const saved = localStorage.getItem(this.options.persistKey);
      if (!saved) return null;

      const state = JSON.parse(saved) as PersistedState;

      // Check if state is recent (within 1 hour)
      const age = Date.now() - state.timestamp;
      if (age > 60 * 60 * 1000) {
        console.log('[ConnectionLossHandler] Saved state too old, ignoring');
        localStorage.removeItem(this.options.persistKey);
        return null;
      }

      console.log('[ConnectionLossHandler] Restored state from localStorage, age:', age, 'ms');
      return state;

    } catch (error) {
      console.error('[ConnectionLossHandler] Failed to restore state:', error);
      return null;
    }
  }

  /**
   * Clear persisted state
   */
  clearPersistedState(): void {
    try {
      localStorage.removeItem(this.options.persistKey);
      console.log('[ConnectionLossHandler] Cleared persisted state');
    } catch (error) {
      console.error('[ConnectionLossHandler] Failed to clear persisted state:', error);
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  /**
   * Check if online
   */
  isOnline(): boolean {
    return this.connectionState.isOnline;
  }

  /**
   * Get time since last online (ms)
   */
  getTimeSinceOnline(): number {
    return performance.now() - this.connectionState.lastOnlineTime;
  }

  /**
   * Subscribe to connection lost events
   */
  onConnectionLost(callback: () => void): () => void {
    this.connectionLostCallbacks.push(callback);
    return () => {
      const index = this.connectionLostCallbacks.indexOf(callback);
      if (index !== -1) {
        this.connectionLostCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to connection restored events
   */
  onConnectionRestored(callback: (state: PersistedState | null) => void): () => void {
    this.connectionRestoredCallbacks.push(callback);
    return () => {
      const index = this.connectionRestoredCallbacks.indexOf(callback);
      if (index !== -1) {
        this.connectionRestoredCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to retry events
   */
  onRetry(callback: (attempt: number, delay: number) => void): () => void {
    this.retryCallbacks.push(callback);
    return () => {
      const index = this.retryCallbacks.indexOf(callback);
      if (index !== -1) {
        this.retryCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Reset retry counter
   */
  reset(): void {
    this.connectionState.reconnectAttempts = 0;

    if (this.retryTimeout !== null) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    console.log('[ConnectionLossHandler] Reset');
  }

  /**
   * Clean up
   */
  destroy(): void {
    this.isActive = false;

    // Clear retry timeout
    if (this.retryTimeout !== null) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    // Remove event listeners
    if (this.onlineHandler) {
      window.removeEventListener('online', this.onlineHandler);
    }

    if (this.offlineHandler) {
      window.removeEventListener('offline', this.offlineHandler);
    }

    // Clear callbacks
    this.connectionLostCallbacks = [];
    this.connectionRestoredCallbacks = [];
    this.retryCallbacks = [];

    console.log('[ConnectionLossHandler] Destroyed');
  }
}

// Singleton export
export const connectionLossHandler = ConnectionLossHandler.getInstance();
