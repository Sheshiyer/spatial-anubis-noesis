/**
 * Sigil Strike Momentum Evaluation
 * P4-S1-19: Momentum evaluation at anvil sweet spot
 *
 * Base threshold: 12.0 momentum
 * Evaluates THROW/STRIKE gesture velocity at sweet spot hit.
 * Returns strike quality: weak/good/perfect based on momentum.
 */

import * as THREE from 'three';
import type { StrikeTier } from '../verbs/types';

/** Strike outcome tiers */
export type SigilStrikeTier = 'weak' | 'good' | 'perfect' | 'reckless';

/** Strike momentum thresholds */
export interface StrikeMomentumThresholds {
  /** Base threshold for valid strike */
  base: number;
  /** Weak strike range */
  weak: { min: number; max: number };
  /** Good strike range */
  good: { min: number; max: number };
  /** Perfect strike range */
  perfect: { min: number; max: number };
  /** Reckless strike threshold (shatters crystal) */
  reckless: number;
}

/** Default momentum thresholds */
export const DEFAULT_MOMENTUM_THRESHOLDS: StrikeMomentumThresholds = {
  base: 12.0,
  weak: { min: 5.0, max: 12.0 },
  good: { min: 12.0, max: 20.0 },
  perfect: { min: 20.0, max: 30.0 },
  reckless: 30.0,
};

/** Strike evaluation result */
export interface StrikeEvaluation {
  /** Strike tier */
  tier: SigilStrikeTier;
  /** Calculated momentum */
  momentum: number;
  /** Strike velocity */
  velocity: THREE.Vector3;
  /** Is valid strike (above base threshold) */
  isValid: boolean;
  /** Sweet spot quality (0-1) */
  sweetSpotQuality: number;
  /** Final score (momentum * sweetSpotQuality) */
  finalScore: number;
  /** Timestamp */
  timestamp: number;
}

/** Strike configuration */
export interface StrikeConfig {
  /** Momentum thresholds */
  thresholds: StrikeMomentumThresholds;
  /** Mass multiplier for momentum calculation */
  massMultiplier: number;
  /** Minimum sweet spot quality required */
  minSweetSpotQuality: number;
}

/** Default strike config */
export const DEFAULT_STRIKE_CONFIG: StrikeConfig = {
  thresholds: DEFAULT_MOMENTUM_THRESHOLDS,
  massMultiplier: 1.0,
  minSweetSpotQuality: 0.3,
};

/**
 * Calculate momentum from velocity and mass
 * Momentum = mass * |velocity|
 */
export function calculateMomentum(
  velocity: THREE.Vector3,
  mass: number = 1.0
): number {
  return velocity.length() * mass;
}

/**
 * Determine strike tier from momentum
 */
export function determineStrikeTier(
  momentum: number,
  thresholds: StrikeMomentumThresholds = DEFAULT_MOMENTUM_THRESHOLDS
): SigilStrikeTier {
  if (momentum >= thresholds.reckless) {
    return 'reckless';
  }
  if (momentum >= thresholds.perfect.min && momentum <= thresholds.perfect.max) {
    return 'perfect';
  }
  if (momentum >= thresholds.good.min && momentum <= thresholds.good.max) {
    return 'good';
  }
  return 'weak';
}

/**
 * Get tier color for visual feedback
 */
export function getTierColor(tier: SigilStrikeTier): string {
  switch (tier) {
    case 'perfect':
      return '#D4AF37'; // Bright Gold
    case 'good':
      return '#C5A442'; // Aged Gold
    case 'weak':
      return '#6B6B6B'; // Stone Grey
    case 'reckless':
      return '#DC143C'; // Crimson
  }
}

/**
 * Get tier description for UI
 */
export function getTierDescription(tier: SigilStrikeTier): string {
  switch (tier) {
    case 'perfect':
      return 'Perfect Strike - Sigil forged with precision';
    case 'good':
      return 'Good Strike - Sigil formed adequately';
    case 'weak':
      return 'Weak Strike - Insufficient force';
    case 'reckless':
      return 'Reckless Strike - Crystal shattered!';
  }
}

/**
 * Sigil Strike Evaluator
 * Evaluates strike quality based on momentum and sweet spot
 */
export class SigilStrikeEvaluator {
  private config: StrikeConfig;
  private lastEvaluation: StrikeEvaluation | null = null;

  constructor(config: Partial<StrikeConfig> = {}) {
    this.config = { ...DEFAULT_STRIKE_CONFIG, ...config };
  }

  /**
   * Evaluate strike momentum and sweet spot quality
   *
   * @param velocity - Strike velocity vector
   * @param mass - Object mass
   * @param sweetSpotQuality - Sweet spot quality (0-1)
   * @returns Strike evaluation result
   */
  evaluate(
    velocity: THREE.Vector3,
    mass: number = 1.0,
    sweetSpotQuality: number = 1.0
  ): StrikeEvaluation {
    // Calculate momentum
    const momentum = calculateMomentum(
      velocity,
      mass * this.config.massMultiplier
    );

    // Determine base tier from momentum
    const tier = determineStrikeTier(momentum, this.config.thresholds);

    // Check if valid (above base threshold and minimum sweet spot quality)
    const isValid =
      momentum >= this.config.thresholds.base &&
      sweetSpotQuality >= this.config.minSweetSpotQuality;

    // Calculate final score (momentum weighted by sweet spot quality)
    const finalScore = momentum * sweetSpotQuality;

    // Create evaluation result
    const evaluation: StrikeEvaluation = {
      tier,
      momentum,
      velocity: velocity.clone(),
      isValid,
      sweetSpotQuality,
      finalScore,
      timestamp: performance.now(),
    };

    this.lastEvaluation = evaluation;

    console.log('[SigilStrike] Evaluation:', {
      tier,
      momentum: momentum.toFixed(2),
      sweetSpotQuality: sweetSpotQuality.toFixed(2),
      finalScore: finalScore.toFixed(2),
      isValid,
    });

    return evaluation;
  }

  /**
   * Get last evaluation result
   */
  getLastEvaluation(): StrikeEvaluation | null {
    return this.lastEvaluation;
  }

  /**
   * Check if strike will shatter crystal
   */
  willShatter(momentum: number): boolean {
    return momentum >= this.config.thresholds.reckless;
  }

  /**
   * Get momentum threshold for tier
   */
  getThresholdForTier(tier: SigilStrikeTier): number {
    switch (tier) {
      case 'weak':
        return this.config.thresholds.weak.min;
      case 'good':
        return this.config.thresholds.good.min;
      case 'perfect':
        return this.config.thresholds.perfect.min;
      case 'reckless':
        return this.config.thresholds.reckless;
    }
  }

  /**
   * Get visual feedback intensity (0-1) for current momentum
   */
  getFeedbackIntensity(momentum: number): number {
    const maxMomentum = this.config.thresholds.reckless;
    return Math.min(1, momentum / maxMomentum);
  }

  /**
   * Reset evaluator state
   */
  reset(): void {
    this.lastEvaluation = null;
  }
}

/**
 * Factory function to create strike evaluator
 */
export function createSigilStrikeEvaluator(
  config?: Partial<StrikeConfig>
): SigilStrikeEvaluator {
  return new SigilStrikeEvaluator(config);
}

/**
 * Quick strike validation (no evaluator instance needed)
 */
export function validateStrike(
  velocity: THREE.Vector3,
  mass: number = 1.0,
  sweetSpotQuality: number = 1.0,
  thresholds: StrikeMomentumThresholds = DEFAULT_MOMENTUM_THRESHOLDS
): boolean {
  const momentum = calculateMomentum(velocity, mass);
  return (
    momentum >= thresholds.base &&
    sweetSpotQuality >= 0.3 &&
    momentum < thresholds.reckless
  );
}

/**
 * Map StrikeTier to SigilStrikeTier
 */
export function mapVerbTierToSigilTier(verbTier: StrikeTier): SigilStrikeTier {
  switch (verbTier) {
    case 'Perfect':
      return 'perfect';
    case 'Adequate':
      return 'good';
    case 'Weak':
      return 'weak';
    case 'Reckless':
      return 'reckless';
  }
}
