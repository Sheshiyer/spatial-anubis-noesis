/**
 * Pichet Witness Agent
 * P2-S3-07: Gravity modifier based on physical cycle score
 * - >70 -> 1.0x
 * - 50-70 -> 1.3x
 * - 30-50 -> 1.8x
 * - <30 -> 2.5x
 */

import {
  type PichetState,
  type PichetThresholds,
  type WitnessEvent,
  type WitnessEventListener,
  DEFAULT_PICHET_THRESHOLDS,
} from './types';

/** Pichet Witness Agent */
export class PichetAgent {
  private thresholds: PichetThresholds;
  private state: PichetState;
  private listeners: Set<WitnessEventListener> = new Set();
  private lastGravity = 1.0;

  constructor(thresholds: Partial<PichetThresholds> = {}) {
    this.thresholds = { ...DEFAULT_PICHET_THRESHOLDS, ...thresholds };
    this.state = {
      type: 'pichet',
      isActive: true,
      currentValue: 0,
      lastUpdate: Date.now(),
      physicalCycleScore: 0,
      currentGravity: 1.0,
      history: [],
    };
  }

  /** Get current state */
  getState(): PichetState {
    return { ...this.state };
  }

  /** Get current gravity multiplier */
  getGravity(): number {
    return this.state.currentGravity;
  }

  /** Get physical cycle score */
  getPhysicalCycleScore(): number {
    return this.state.physicalCycleScore;
  }

  /** Get gravity tier description */
  getGravityTier(): string {
    const score = this.state.physicalCycleScore;
    if (score > this.thresholds.highThreshold) return 'light';
    if (score > this.thresholds.mediumThreshold) return 'normal';
    if (score > this.thresholds.lowThreshold) return 'heavy';
    return 'crushing';
  }

  /** Update with physical cycle score */
  update(physicalCycleScore: number): void {
    const now = Date.now();
    const previousGravity = this.state.currentGravity;

    this.state.physicalCycleScore = physicalCycleScore;
    this.state.currentValue = physicalCycleScore;
    this.state.lastUpdate = now;

    // Calculate gravity multiplier
    const newGravity = this.calculateGravity(physicalCycleScore);

    if (newGravity !== previousGravity) {
      this.state.currentGravity = newGravity;
      this.lastGravity = newGravity;

      // Record in history
      this.state.history.push({
        timestamp: now,
        score: physicalCycleScore,
        gravity: newGravity,
      });

      // Keep only last 60 entries
      if (this.state.history.length > 60) {
        this.state.history.shift();
      }

      this.emit({
        type: 'gravity_changed',
        witness: 'pichet',
        value: newGravity,
        previousValue: previousGravity,
        timestamp: now,
        data: {
          score: physicalCycleScore,
          tier: this.getGravityTier(),
        },
      });
    }
  }

  /** Calculate gravity multiplier based on score */
  private calculateGravity(score: number): number {
    const {
      highThreshold,
      highMultiplier,
      mediumThreshold,
      mediumMultiplier,
      lowThreshold,
      lowMultiplier,
      veryLowMultiplier,
    } = this.thresholds;

    if (score > highThreshold) {
      return highMultiplier;
    } else if (score > mediumThreshold) {
      return mediumMultiplier;
    } else if (score > lowThreshold) {
      return lowMultiplier;
    } else {
      return veryLowMultiplier;
    }
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
        console.error('[Pichet] Event listener error:', err);
      }
    });
  }

  /** Reset agent state */
  reset(): void {
    this.state.physicalCycleScore = 0;
    this.state.currentGravity = 1.0;
    this.state.currentValue = 0;
    this.lastGravity = 1.0;
  }

  /** Update thresholds */
  setThresholds(thresholds: Partial<PichetThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
    // Recalculate gravity with new thresholds
    this.update(this.state.physicalCycleScore);
  }

  /** Get thresholds */
  getThresholds(): PichetThresholds {
    return { ...this.thresholds };
  }
}

/** Gravity multiplier lookup table */
export const GRAVITY_TIERS = [
  { min: 70, max: 100, multiplier: 1.0, name: 'light', description: 'Effortless movement' },
  { min: 50, max: 70, multiplier: 1.3, name: 'normal', description: 'Standard physics' },
  { min: 30, max: 50, multiplier: 1.8, name: 'heavy', description: 'Weighted movement' },
  { min: 0, max: 30, multiplier: 2.5, name: 'crushing', description: 'Burdened by chaos' },
] as const;

/** Get gravity tier info for a score */
export function getGravityTierInfo(score: number): typeof GRAVITY_TIERS[number] {
  return GRAVITY_TIERS.find((tier) => score >= tier.min && score <= tier.max) ?? GRAVITY_TIERS[3]!;
}

/** Gravity controller for physics world */
export class GravityController {
  private multiplier = 1.0;
  private baseGravity = -9.81;
  private targetGravity = -9.81;
  private currentGravity = -9.81;
  private smoothing = 0.1;
  private onGravityChange?: (gravity: number) => void;

  constructor(
    baseGravity = -9.81,
    onGravityChange?: (gravity: number) => void
  ) {
    this.baseGravity = baseGravity;
    this.targetGravity = baseGravity;
    this.currentGravity = baseGravity;
    this.onGravityChange = onGravityChange;
  }

  /** Set gravity multiplier */
  setMultiplier(multiplier: number): void {
    this.multiplier = multiplier;
    this.targetGravity = this.baseGravity * multiplier;
  }

  /** Update gravity with smoothing */
  update(deltaTime: number): number {
    // Smooth interpolation
    const lerpFactor = 1 - Math.exp(-this.smoothing * deltaTime * 60);
    this.currentGravity += (this.targetGravity - this.currentGravity) * lerpFactor;

    if (Math.abs(this.currentGravity - this.targetGravity) > 0.01) {
      this.onGravityChange?.(this.currentGravity);
    }

    return this.currentGravity;
  }

  /** Get current gravity */
  getGravity(): number {
    return this.currentGravity;
  }

  /** Get current multiplier */
  getMultiplier(): number {
    return this.multiplier;
  }

  /** Set smoothing factor */
  setSmoothing(smoothing: number): void {
    this.smoothing = smoothing;
  }
}

/** Factory functions */
export function createPichetAgent(thresholds?: Partial<PichetThresholds>): PichetAgent {
  return new PichetAgent(thresholds);
}

export function createGravityController(
  baseGravity?: number,
  onGravityChange?: (gravity: number) => void
): GravityController {
  return new GravityController(baseGravity, onGravityChange);
}
