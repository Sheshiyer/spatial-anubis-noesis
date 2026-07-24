/**
 * Ritual Interrupt Handler
 * P4-S2: Handle ritual interruptions
 *
 * Saves checkpoint when ritual is interrupted.
 * On return: offers resume or abandon choice.
 */

export interface RitualCheckpoint {
  ritualId: string;
  ritualName: string;
  phase: string;
  progress: number; // 0-1
  timestamp: number;
  state: any; // Ritual-specific state
}

export interface RitualInterruptHandlerOptions {
  maxCheckpointAge?: number; // ms
  persistKey?: string;
}

const DEFAULT_OPTIONS: Required<RitualInterruptHandlerOptions> = {
  maxCheckpointAge: 24 * 60 * 60 * 1000, // 24 hours
  persistKey: 'spatial_anubis_ritual_checkpoint',
};

export class RitualInterruptHandler {
  private static instance: RitualInterruptHandler | null = null;
  private options: Required<RitualInterruptHandlerOptions>;
  private currentCheckpoint: RitualCheckpoint | null = null;
  private isActive = false;

  // Callbacks
  private interruptCallbacks: Array<(checkpoint: RitualCheckpoint) => void> = [];
  private resumeCallbacks: Array<(checkpoint: RitualCheckpoint) => void> = [];
  private abandonCallbacks: Array<(checkpoint: RitualCheckpoint) => void> = [];

  private constructor(options: RitualInterruptHandlerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  static getInstance(options?: RitualInterruptHandlerOptions): RitualInterruptHandler {
    if (!RitualInterruptHandler.instance) {
      RitualInterruptHandler.instance = new RitualInterruptHandler(options);
    }
    return RitualInterruptHandler.instance;
  }

  /**
   * Initialize
   */
  init(): void {
    if (this.isActive) {
      console.log('[RitualInterruptHandler] Already initialized');
      return;
    }

    this.isActive = true;

    // Try to restore previous checkpoint
    const restored = this.restoreCheckpoint();
    if (restored) {
      console.log('[RitualInterruptHandler] Restored checkpoint:', restored.ritualId);
      this.currentCheckpoint = restored;
    }

    console.log('[RitualInterruptHandler] Initialized');
  }

  /**
   * Save checkpoint when ritual is interrupted
   */
  saveCheckpoint(checkpoint: Omit<RitualCheckpoint, 'timestamp'>): void {
    const fullCheckpoint: RitualCheckpoint = {
      ...checkpoint,
      timestamp: Date.now(),
    };

    this.currentCheckpoint = fullCheckpoint;

    // Persist to localStorage
    try {
      localStorage.setItem(this.options.persistKey, JSON.stringify(fullCheckpoint));
      console.log('[RitualInterruptHandler] Checkpoint saved:', checkpoint.ritualId, 'phase:', checkpoint.phase);
    } catch (error) {
      console.error('[RitualInterruptHandler] Failed to save checkpoint:', error);
    }

    // Notify listeners
    this.interruptCallbacks.forEach(callback => {
      try {
        callback(fullCheckpoint);
      } catch (error) {
        console.error('[RitualInterruptHandler] Interrupt callback error:', error);
      }
    });
  }

  /**
   * Restore checkpoint from localStorage
   */
  private restoreCheckpoint(): RitualCheckpoint | null {
    try {
      const saved = localStorage.getItem(this.options.persistKey);
      if (!saved) return null;

      const checkpoint = JSON.parse(saved) as RitualCheckpoint;

      // Check if checkpoint is too old
      const age = Date.now() - checkpoint.timestamp;
      if (age > this.options.maxCheckpointAge) {
        console.log('[RitualInterruptHandler] Checkpoint too old, discarding (age:', age, 'ms)');
        localStorage.removeItem(this.options.persistKey);
        return null;
      }

      console.log('[RitualInterruptHandler] Restored checkpoint from localStorage');
      return checkpoint;

    } catch (error) {
      console.error('[RitualInterruptHandler] Failed to restore checkpoint:', error);
      return null;
    }
  }

  /**
   * Get current checkpoint
   */
  getCheckpoint(): RitualCheckpoint | null {
    return this.currentCheckpoint ? { ...this.currentCheckpoint } : null;
  }

  /**
   * Check if there's a valid checkpoint
   */
  hasCheckpoint(): boolean {
    return this.currentCheckpoint !== null;
  }

  /**
   * Resume ritual from checkpoint
   */
  resumeRitual(): RitualCheckpoint | null {
    if (!this.currentCheckpoint) {
      console.warn('[RitualInterruptHandler] No checkpoint to resume');
      return null;
    }

    const checkpoint = this.currentCheckpoint;

    console.log('[RitualInterruptHandler] Resuming ritual:', checkpoint.ritualId);

    // Notify listeners
    this.resumeCallbacks.forEach(callback => {
      try {
        callback(checkpoint);
      } catch (error) {
        console.error('[RitualInterruptHandler] Resume callback error:', error);
      }
    });

    return checkpoint;
  }

  /**
   * Abandon ritual checkpoint
   */
  abandonRitual(): void {
    if (!this.currentCheckpoint) {
      console.warn('[RitualInterruptHandler] No checkpoint to abandon');
      return;
    }

    const checkpoint = this.currentCheckpoint;

    console.log('[RitualInterruptHandler] Abandoning ritual:', checkpoint.ritualId);

    // Notify listeners
    this.abandonCallbacks.forEach(callback => {
      try {
        callback(checkpoint);
      } catch (error) {
        console.error('[RitualInterruptHandler] Abandon callback error:', error);
      }
    });

    // Clear checkpoint
    this.clearCheckpoint();
  }

  /**
   * Clear current checkpoint
   */
  clearCheckpoint(): void {
    this.currentCheckpoint = null;

    try {
      localStorage.removeItem(this.options.persistKey);
      console.log('[RitualInterruptHandler] Checkpoint cleared');
    } catch (error) {
      console.error('[RitualInterruptHandler] Failed to clear checkpoint:', error);
    }
  }

  /**
   * Update checkpoint progress
   */
  updateProgress(ritualId: string, phase: string, progress: number, state?: any): void {
    if (!this.currentCheckpoint || this.currentCheckpoint.ritualId !== ritualId) {
      console.warn('[RitualInterruptHandler] Cannot update progress: no matching checkpoint');
      return;
    }

    this.currentCheckpoint.phase = phase;
    this.currentCheckpoint.progress = progress;
    if (state !== undefined) {
      this.currentCheckpoint.state = state;
    }
    this.currentCheckpoint.timestamp = Date.now();

    // Update localStorage
    try {
      localStorage.setItem(this.options.persistKey, JSON.stringify(this.currentCheckpoint));
    } catch (error) {
      console.error('[RitualInterruptHandler] Failed to update checkpoint:', error);
    }
  }

  /**
   * Get checkpoint age (ms)
   */
  getCheckpointAge(): number | null {
    if (!this.currentCheckpoint) return null;
    return Date.now() - this.currentCheckpoint.timestamp;
  }

  /**
   * Check if checkpoint is expired
   */
  isCheckpointExpired(): boolean {
    const age = this.getCheckpointAge();
    if (age === null) return true;
    return age > this.options.maxCheckpointAge;
  }

  /**
   * Subscribe to interrupt events
   */
  onInterrupt(callback: (checkpoint: RitualCheckpoint) => void): () => void {
    this.interruptCallbacks.push(callback);
    return () => {
      const index = this.interruptCallbacks.indexOf(callback);
      if (index !== -1) {
        this.interruptCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to resume events
   */
  onResume(callback: (checkpoint: RitualCheckpoint) => void): () => void {
    this.resumeCallbacks.push(callback);
    return () => {
      const index = this.resumeCallbacks.indexOf(callback);
      if (index !== -1) {
        this.resumeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to abandon events
   */
  onAbandon(callback: (checkpoint: RitualCheckpoint) => void): () => void {
    this.abandonCallbacks.push(callback);
    return () => {
      const index = this.abandonCallbacks.indexOf(callback);
      if (index !== -1) {
        this.abandonCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Clean up
   */
  destroy(): void {
    this.isActive = false;

    // Clear callbacks
    this.interruptCallbacks = [];
    this.resumeCallbacks = [];
    this.abandonCallbacks = [];

    console.log('[RitualInterruptHandler] Destroyed');
  }
}

// Singleton export
export const ritualInterruptHandler = RitualInterruptHandler.getInstance();

/**
 * Ritual resume UI component helper
 */
export interface ResumeUIOptions {
  onResume: () => void;
  onAbandon: () => void;
  checkpoint: RitualCheckpoint;
}

export function createResumeUI(options: ResumeUIOptions): HTMLDivElement {
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #0A0A0A;
    color: #F5F0E8;
    padding: 2rem;
    border-radius: 0.5rem;
    border: 2px solid #C5A442;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    font-family: system-ui, -apple-system, sans-serif;
    z-index: 10000;
    max-width: 400px;
  `;

  const title = document.createElement('h2');
  title.textContent = 'Resume Ritual?';
  title.style.cssText = `
    font-size: 1.5rem;
    font-weight: 600;
    color: #C5A442;
    margin: 0 0 1rem 0;
  `;

  const info = document.createElement('div');
  info.style.cssText = `
    margin-bottom: 1.5rem;
    line-height: 1.5;
    opacity: 0.9;
  `;

  const ritualName = document.createElement('p');
  ritualName.textContent = `Ritual: ${options.checkpoint.ritualName}`;
  ritualName.style.margin = '0 0 0.5rem 0';

  const phase = document.createElement('p');
  phase.textContent = `Phase: ${options.checkpoint.phase}`;
  phase.style.margin = '0 0 0.5rem 0';

  const progress = document.createElement('p');
  progress.textContent = `Progress: ${Math.round(options.checkpoint.progress * 100)}%`;
  progress.style.margin = '0';

  info.appendChild(ritualName);
  info.appendChild(phase);
  info.appendChild(progress);

  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = `
    display: flex;
    gap: 1rem;
  `;

  const resumeButton = document.createElement('button');
  resumeButton.textContent = 'Resume';
  resumeButton.style.cssText = `
    flex: 1;
    padding: 0.75rem;
    background: #C5A442;
    color: #0A0A0A;
    border: none;
    border-radius: 0.25rem;
    font-weight: 600;
    cursor: pointer;
    font-size: 1rem;
  `;
  resumeButton.onclick = () => {
    options.onResume();
    container.remove();
  };

  const abandonButton = document.createElement('button');
  abandonButton.textContent = 'Start Fresh';
  abandonButton.style.cssText = `
    flex: 1;
    padding: 0.75rem;
    background: transparent;
    color: #F5F0E8;
    border: 1px solid #C5A442;
    border-radius: 0.25rem;
    font-weight: 600;
    cursor: pointer;
    font-size: 1rem;
  `;
  abandonButton.onclick = () => {
    options.onAbandon();
    container.remove();
  };

  buttonContainer.appendChild(resumeButton);
  buttonContainer.appendChild(abandonButton);

  container.appendChild(title);
  container.appendChild(info);
  container.appendChild(buttonContainer);

  return container;
}
