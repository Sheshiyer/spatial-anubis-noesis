/**
 * MediaPipe Failure Handler
 * P4-S2: MediaPipe model load failure fallback
 *
 * On MediaPipe model load failure: auto switch to mouse+keyboard.
 * Disables bio-tracking. Maps keyboard to gestures.
 */

export interface MediaPipeFailureState {
  modelsLoaded: boolean;
  failureReason: string | null;
  fallbackMode: 'keyboard-mouse' | null;
  failureTime: number | null;
  failedModels: string[];
}

export interface KeyboardGestureMapping {
  key: string;
  gesture: string;
  description: string;
}

const DEFAULT_KEYBOARD_MAPPINGS: KeyboardGestureMapping[] = [
  { key: 'w', gesture: 'forward', description: 'Move forward' },
  { key: 's', gesture: 'backward', description: 'Move backward' },
  { key: 'a', gesture: 'left', description: 'Move left' },
  { key: 'd', gesture: 'right', description: 'Move right' },
  { key: 'q', gesture: 'up', description: 'Move up' },
  { key: 'e', gesture: 'down', description: 'Move down' },
  { key: ' ', gesture: 'select', description: 'Select/Interact' },
  { key: 'Escape', gesture: 'cancel', description: 'Cancel/Back' },
  { key: 'r', gesture: 'reset', description: 'Reset position' },
];

export interface MediaPipeFailureHandlerOptions {
  showBanner?: boolean;
  showKeyboardHints?: boolean;
  customMappings?: KeyboardGestureMapping[];
}

const DEFAULT_OPTIONS: Required<Omit<MediaPipeFailureHandlerOptions, 'customMappings'>> = {
  showBanner: true,
  showKeyboardHints: true,
};

export class MediaPipeFailureHandler {
  private static instance: MediaPipeFailureHandler | null = null;
  private options: Required<Omit<MediaPipeFailureHandlerOptions, 'customMappings'>> & {
    customMappings?: KeyboardGestureMapping[];
  };
  private state: MediaPipeFailureState;
  private isActive = false;
  private banner: HTMLDivElement | null = null;
  private keyboardHints: HTMLDivElement | null = null;

  // Keyboard state
  private keyboardHandler: ((event: KeyboardEvent) => void) | null = null;
  private pressedKeys = new Set<string>();

  // Callbacks
  private failureCallbacks: Array<(reason: string, failedModels: string[]) => void> = [];
  private fallbackModeCallbacks: Array<() => void> = [];
  private gestureCallbacks: Array<(gesture: string, active: boolean) => void> = [];

  private constructor(options: MediaPipeFailureHandlerOptions = {}) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };

    this.state = {
      modelsLoaded: false,
      failureReason: null,
      fallbackMode: null,
      failureTime: null,
      failedModels: [],
    };
  }

  static getInstance(options?: MediaPipeFailureHandlerOptions): MediaPipeFailureHandler {
    if (!MediaPipeFailureHandler.instance) {
      MediaPipeFailureHandler.instance = new MediaPipeFailureHandler(options);
    }
    return MediaPipeFailureHandler.instance;
  }

  /**
   * Initialize
   */
  init(): void {
    if (this.isActive) {
      console.log('[MediaPipeFailureHandler] Already initialized');
      return;
    }

    this.isActive = true;
    console.log('[MediaPipeFailureHandler] Initialized');
  }

  /**
   * Attempt to load MediaPipe models
   */
  async loadModels(
    modelLoaders: Array<{ name: string; loader: () => Promise<any> }>
  ): Promise<{ success: boolean; models?: any[] }> {
    const failedModels: string[] = [];
    const loadedModels: any[] = [];

    for (const { name, loader } of modelLoaders) {
      try {
        console.log(`[MediaPipeFailureHandler] Loading model: ${name}...`);
        const model = await loader();
        loadedModels.push(model);
        console.log(`[MediaPipeFailureHandler] Model loaded: ${name}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[MediaPipeFailureHandler] Failed to load model ${name}:`, errorMessage);
        failedModels.push(name);
      }
    }

    if (failedModels.length > 0) {
      this.handleFailure(
        `Failed to load ${failedModels.length} model(s): ${failedModels.join(', ')}`,
        failedModels
      );
      return { success: false };
    }

    this.state.modelsLoaded = true;
    console.log('[MediaPipeFailureHandler] All models loaded successfully');
    return { success: true, models: loadedModels };
  }

  /**
   * Handle MediaPipe failure
   */
  private handleFailure(reason: string, failedModels: string[]): void {
    console.error('[MediaPipeFailureHandler] MediaPipe failure:', reason);

    this.state.modelsLoaded = false;
    this.state.failureReason = reason;
    this.state.fallbackMode = 'keyboard-mouse';
    this.state.failureTime = performance.now();
    this.state.failedModels = failedModels;

    // Show banner
    if (this.options.showBanner) {
      this.showBanner();
    }

    // Notify failure callbacks
    this.failureCallbacks.forEach(callback => {
      try {
        callback(reason, failedModels);
      } catch (error) {
        console.error('[MediaPipeFailureHandler] Failure callback error:', error);
      }
    });

    // Enter fallback mode
    this.enterFallbackMode();
  }

  /**
   * Enter fallback mode (keyboard + mouse)
   */
  private enterFallbackMode(): void {
    console.log('[MediaPipeFailureHandler] Entering keyboard+mouse fallback mode');

    // Notify fallback mode callbacks
    this.fallbackModeCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('[MediaPipeFailureHandler] Fallback mode callback error:', error);
      }
    });

    // Enable keyboard controls
    this.enableKeyboardControls();

    // Show keyboard hints
    if (this.options.showKeyboardHints) {
      this.showKeyboardHints();
    }
  }

  /**
   * Enable keyboard controls
   */
  private enableKeyboardControls(): void {
    if (this.keyboardHandler) {
      return; // Already enabled
    }

    const mappings = this.options.customMappings || DEFAULT_KEYBOARD_MAPPINGS;

    this.keyboardHandler = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const mapping = mappings.find(m => m.key.toLowerCase() === key);

      if (!mapping) return;

      event.preventDefault();

      if (event.type === 'keydown') {
        if (!this.pressedKeys.has(key)) {
          this.pressedKeys.add(key);
          this.triggerGesture(mapping.gesture, true);
        }
      } else if (event.type === 'keyup') {
        this.pressedKeys.delete(key);
        this.triggerGesture(mapping.gesture, false);
      }
    };

    document.addEventListener('keydown', this.keyboardHandler);
    document.addEventListener('keyup', this.keyboardHandler);

    console.log('[MediaPipeFailureHandler] Keyboard controls enabled');
  }

  /**
   * Trigger gesture event
   */
  private triggerGesture(gesture: string, active: boolean): void {
    this.gestureCallbacks.forEach(callback => {
      try {
        callback(gesture, active);
      } catch (error) {
        console.error('[MediaPipeFailureHandler] Gesture callback error:', error);
      }
    });
  }

  /**
   * Show fallback mode banner
   */
  private showBanner(): void {
    if (this.banner) {
      this.banner.style.display = 'block';
      return;
    }

    this.banner = document.createElement('div');
    this.banner.style.cssText = `
      position: fixed;
      top: 1rem;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(197, 164, 66, 0.95);
      color: #0A0A0A;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 0.875rem;
      font-weight: 500;
      z-index: 9999;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;

    const icon = document.createElement('span');
    icon.textContent = 'ℹ️ ';
    icon.style.marginRight = '0.5rem';

    const text = document.createElement('span');
    text.textContent = 'Using keyboard + mouse controls (bio-tracking unavailable)';

    this.banner.appendChild(icon);
    this.banner.appendChild(text);
    document.body.appendChild(this.banner);

    console.log('[MediaPipeFailureHandler] Showing fallback mode banner');
  }

  /**
   * Show keyboard hints overlay
   */
  private showKeyboardHints(): void {
    if (this.keyboardHints) {
      this.keyboardHints.style.display = 'block';
      return;
    }

    const mappings = this.options.customMappings || DEFAULT_KEYBOARD_MAPPINGS;

    this.keyboardHints = document.createElement('div');
    this.keyboardHints.style.cssText = `
      position: fixed;
      bottom: 1rem;
      right: 1rem;
      background: rgba(10, 10, 10, 0.9);
      color: #F5F0E8;
      padding: 1rem;
      border-radius: 0.5rem;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 0.75rem;
      z-index: 9998;
      max-width: 200px;
      border: 1px solid rgba(197, 164, 66, 0.3);
    `;

    const title = document.createElement('div');
    title.textContent = 'Keyboard Controls';
    title.style.cssText = `
      font-weight: 600;
      color: #C5A442;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
    `;

    this.keyboardHints.appendChild(title);

    mappings.forEach(mapping => {
      const item = document.createElement('div');
      item.style.cssText = `
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.25rem;
        opacity: 0.9;
      `;

      const key = document.createElement('kbd');
      key.textContent = mapping.key.toUpperCase();
      key.style.cssText = `
        background: rgba(197, 164, 66, 0.2);
        padding: 0.125rem 0.375rem;
        border-radius: 0.25rem;
        font-family: monospace;
        font-size: 0.75rem;
      `;

      const desc = document.createElement('span');
      desc.textContent = mapping.description;
      desc.style.marginLeft = '0.5rem';

      item.appendChild(key);
      item.appendChild(desc);
      this.keyboardHints.appendChild(item);
    });

    document.body.appendChild(this.keyboardHints);

    console.log('[MediaPipeFailureHandler] Showing keyboard hints');
  }

  /**
   * Hide keyboard hints
   */
  hideKeyboardHints(): void {
    if (this.keyboardHints) {
      this.keyboardHints.style.display = 'none';
    }
  }

  /**
   * Get current state
   */
  getState(): MediaPipeFailureState {
    return { ...this.state };
  }

  /**
   * Check if models are loaded
   */
  areModelsLoaded(): boolean {
    return this.state.modelsLoaded;
  }

  /**
   * Check if in fallback mode
   */
  isInFallbackMode(): boolean {
    return this.state.fallbackMode !== null;
  }

  /**
   * Get pressed keys
   */
  getPressedKeys(): Set<string> {
    return new Set(this.pressedKeys);
  }

  /**
   * Subscribe to failure events
   */
  onFailure(callback: (reason: string, failedModels: string[]) => void): () => void {
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
   * Subscribe to gesture events
   */
  onGesture(callback: (gesture: string, active: boolean) => void): () => void {
    this.gestureCallbacks.push(callback);
    return () => {
      const index = this.gestureCallbacks.indexOf(callback);
      if (index !== -1) {
        this.gestureCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Clean up
   */
  destroy(): void {
    this.isActive = false;

    // Remove keyboard handler
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
      document.removeEventListener('keyup', this.keyboardHandler);
      this.keyboardHandler = null;
    }

    // Remove UI elements
    if (this.banner && this.banner.parentNode) {
      this.banner.parentNode.removeChild(this.banner);
      this.banner = null;
    }

    if (this.keyboardHints && this.keyboardHints.parentNode) {
      this.keyboardHints.parentNode.removeChild(this.keyboardHints);
      this.keyboardHints = null;
    }

    // Clear state
    this.pressedKeys.clear();

    // Clear callbacks
    this.failureCallbacks = [];
    this.fallbackModeCallbacks = [];
    this.gestureCallbacks = [];

    console.log('[MediaPipeFailureHandler] Destroyed');
  }
}

// Singleton export
export const mediaPipeFailureHandler = MediaPipeFailureHandler.getInstance();
