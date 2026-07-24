/**
 * Aletheos Witness Agent
 * P2-S3-06: Friction modifier based on sustained coherence
 * - 30s -> friction 0.8
 * - 60s -> friction 0.5
 * - 120s -> friction 0.3 (flow state)
 */

import {
  type AletheosState,
  type AletheosThresholds,
  type WitnessEvent,
  type WitnessEventListener,
  DEFAULT_ALETHEOS_THRESHOLDS,
} from './types';

/** Aletheos Witness Agent */
export class AletheosAgent {
  private thresholds: AletheosThresholds;
  private state: AletheosState;
  private coherenceStartTime: number | null = null;
  private lastCoherence = 0;
  private listeners: Set<WitnessEventListener> = new Set();

  constructor(thresholds: Partial<AletheosThresholds> = {}) {
    this.thresholds = { ...DEFAULT_ALETHEOS_THRESHOLDS, ...thresholds };
    this.state = {
      type: 'aletheos',
      isActive: true,
      currentValue: 0,
      lastUpdate: Date.now(),
      sustainedDuration: 0,
      currentFriction: 1.0,
      flowStateAchieved: false,
      history: [],
    };
  }

  /** Get current state */
  getState(): AletheosState {
    return { ...this.state };
  }

  /** Get current friction value */
  getFriction(): number {
    return this.state.currentFriction;
  }

  /** Get sustained coherence duration */
  getSustainedDuration(): number {
    return this.state.sustainedDuration;
  }

  /** Check if flow state is achieved */
  isFlowState(): boolean {
    return this.state.flowStateAchieved;
  }

  /** Update with coherence value */
  update(coherence: number): void {
    const now = Date.now();
    const isAboveThreshold = coherence >= this.thresholds.coherenceThreshold;
    const wasAboveThreshold = this.lastCoherence >= this.thresholds.coherenceThreshold;

    // Track coherence duration
    if (isAboveThreshold) {
      if (!wasAboveThreshold) {
        // Just crossed above threshold
        this.coherenceStartTime = now;
      } else if (this.coherenceStartTime) {
        // Still above threshold, calculate duration
        this.state.sustainedDuration = (now - this.coherenceStartTime) / 1000;
      }
    } else {
      // Below threshold, reset
      if (wasAboveThreshold) {
        // Record the completed duration
        if (this.state.sustainedDuration > 0) {
          this.state.history.push({
            timestamp: now,
            duration: this.state.sustainedDuration,
            friction: this.state.currentFriction,
          });
          // Keep only last 60 entries
          if (this.state.history.length > 60) {
            this.state.history.shift();
          }
        }
      }
      this.coherenceStartTime = null;
      this.state.sustainedDuration = 0;
      this.state.flowStateAchieved = false;
    }

    this.lastCoherence = coherence;
    this.state.currentValue = coherence;
    this.state.lastUpdate = now;

    // Calculate friction based on duration
    const newFriction = this.calculateFriction();
    
    if (newFriction !== this.state.currentFriction) {
      const previousFriction = this.state.currentFriction;
      this.state.currentFriction = newFriction;
      
      this.emit({
        type: 'friction_changed',
        witness: 'aletheos',
        value: newFriction,
        previousValue: previousFriction,
        timestamp: now,
      });
    }

    // Check for flow state achievement
    if (!this.state.flowStateAchieved && 
        this.state.sustainedDuration >= this.thresholds.level3Duration) {
      this.state.flowStateAchieved = true;
      this.emit({
        type: 'flow_state_achieved',
        witness: 'aletheos',
        value: this.state.sustainedDuration,
        previousValue: 0,
        timestamp: now,
        data: { friction: this.state.currentFriction },
      });
    }
  }

  /** Calculate friction based on sustained duration */
  private calculateFriction(): number {
    const duration = this.state.sustainedDuration;
    const {
      level1Duration,
      level1Friction,
      level2Duration,
      level2Friction,
      level3Duration,
      level3Friction,
    } = this.thresholds;

    if (duration >= level3Duration) {
      return level3Friction;
    } else if (duration >= level2Duration) {
      return level2Friction;
    } else if (duration >= level1Duration) {
      return level1Friction;
    }

    // Default friction when not above threshold or below level 1
    return 1.0;
  }

  /** Subscribe to events */
  onEvent(listener: WitnessEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Emit event */
  private emit(event: WitnessEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error('[Aletheos] Event listener error:', err);
      }
    });
  }

  /** Reset agent state */
  reset(): void {
    this.coherenceStartTime = null;
    this.lastCoherence = 0;
    this.state.sustainedDuration = 0;
    this.state.currentFriction = 1.0;
    this.state.flowStateAchieved = false;
    this.state.currentValue = 0;
  }

  /** Update thresholds */
  setThresholds(thresholds: Partial<AletheosThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /** Get thresholds */
  getThresholds(): AletheosThresholds {
    return { ...this.thresholds };
  }
}

/** Coherence duration timer for tracking */
export class CoherenceDurationTimer {
  private duration = 0;
  private isRunning = false;
  private startTime = 0;
  private coherenceThreshold: number;
  private listeners: Array<(duration: number) => void> = [];

  constructor(coherenceThreshold = 70) {
    this.coherenceThreshold = coherenceThreshold;
  }

  /** Start tracking */
  start(): void {
    if (!this.isRunning) {
      this.isRunning = true;
      this.startTime = Date.now();
    }
  }

  /** Stop tracking */
  stop(): void {
    if (this.isRunning) {
      this.isRunning = false;
      this.duration = 0;
    }
  }

  /** Update with coherence value */
  update(coherence: number): void {
    const isAboveThreshold = coherence >= this.coherenceThreshold;

    if (isAboveThreshold && !this.isRunning) {
      this.start();
    } else if (!isAboveThreshold && this.isRunning) {
      this.stop();
    } else if (this.isRunning) {
      this.duration = (Date.now() - this.startTime) / 1000;
      this.notifyListeners();
    }
  }

  /** Get current duration */
  getDuration(): number {
    if (this.isRunning) {
      return (Date.now() - this.startTime) / 1000;
    }
    return this.duration;
  }

  /** Check if timer is running */
  isActive(): boolean {
    return this.isRunning;
  }

  /** Subscribe to duration updates */
  onDuration(callback: (duration: number) => void): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((cb) => cb(this.getDuration()));
  }
}

/** Factory functions */
export function createAletheosAgent(thresholds?: Partial<AletheosThresholds>): AletheosAgent {
  return new AletheosAgent(thresholds);
}

export function createCoherenceTimer(coherenceThreshold?: number): CoherenceDurationTimer {
  return new CoherenceDurationTimer(coherenceThreshold);
}
