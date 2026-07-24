/**
 * Posture detection module
 * P1-S1-14: Implement posture detection
 * - Upright vs slouched classification
 * - Normalized posture quality score (0-1)
 * - Transition detection within 500ms
 */

import { type FaceMeshResult, type PostureResult, MEDIAPIPE_CONSTANTS } from './types';
import { FACE_LANDMARK_INDICES } from './faceMesh';

export interface PostureOptions {
  transitionWindowMs?: number;
  uprightThreshold?: number;
  slouchedThreshold?: number;
}

export class PostureDetector {
  private options: Required<PostureOptions>;
  private history: Array<{ score: number; timestamp: number }> = [];
  private lastResult: PostureResult | null = null;
  private stateChangeTime = 0;

  constructor(options: PostureOptions = {}) {
    this.options = {
      transitionWindowMs: MEDIAPIPE_CONSTANTS.POSTURE_TRANSITION_MS,
      uprightThreshold: 0.8,
      slouchedThreshold: 0.4,
      ...options,
    };
  }

  detect(faceMesh: FaceMeshResult | null): PostureResult {
    const timestamp = performance.now();

    if (!faceMesh) {
      // Return last known result or neutral if no history
      return this.lastResult ?? {
        isUpright: true,
        qualityScore: 0.5,
        shoulderLevel: 0,
        headPosition: { x: 0.5, y: 0.5, z: 0 },
        timestamp,
      };
    }

    const { landmarks } = faceMesh;

    // Get relevant landmarks
    const leftEye = landmarks[FACE_LANDMARK_INDICES.LEFT_EYE_OUTER];
    const rightEye = landmarks[FACE_LANDMARK_INDICES.RIGHT_EYE_OUTER];
    const nose = landmarks[FACE_LANDMARK_INDICES.NOSE_TIP];
    const chin = landmarks[FACE_LANDMARK_INDICES.CHIN];
    const leftEar = landmarks[FACE_LANDMARK_INDICES.LEFT_EAR];
    const rightEar = landmarks[FACE_LANDMARK_INDICES.RIGHT_EAR];

    // Calculate shoulder level (proxy using eye-ear relationship)
    // In upright posture, eyes should be above ears
    const eyeLevel = (leftEye.y + rightEye.y) / 2;
    const earLevel = (leftEar.y + rightEar.y) / 2;
    const shoulderLevel = earLevel - eyeLevel; // Positive = eyes above ears (upright)

    // Calculate head position metrics
    const headPosition = {
      x: nose.x,
      y: nose.y,
      z: nose.z,
    };

    // Calculate vertical alignment (chin should be below nose in upright)
    const chinNoseOffset = chin.y - nose.y;

    // Calculate symmetry (horizontal alignment)
    const eyeSymmetry = Math.abs(leftEye.y - rightEye.y);
    const earSymmetry = Math.abs(leftEar.y - rightEar.y);

    // Combine metrics into quality score
    // Upright indicators:
    // 1. Eyes significantly above ears
    // 2. Chin below nose
    // 3. Relatively symmetric

    let qualityScore = 0.5; // Start neutral

    // Eye-ear relationship (main indicator)
    // Normalized: 0.1+ is good upright, 0 is neutral, negative is slouched
    const eyeEarScore = Math.min(1, Math.max(0, shoulderLevel * 5 + 0.5));
    qualityScore = qualityScore * 0.3 + eyeEarScore * 0.7;

    // Chin-nose relationship
    const chinScore = chinNoseOffset > 0 ? Math.min(1, chinNoseOffset * 3) : 0;
    qualityScore = qualityScore * 0.8 + chinScore * 0.2;

    // Symmetry penalty (asymmetric posture reduces score)
    const symmetryPenalty = (eyeSymmetry + earSymmetry) * 2;
    qualityScore = Math.max(0, qualityScore - symmetryPenalty);

    // Clamp to 0-1 range
    qualityScore = Math.min(1, Math.max(0, qualityScore));

    // Add to history for temporal smoothing
    this.history.push({ score: qualityScore, timestamp });
    this.cleanupHistory(timestamp);

    // Calculate smoothed score
    const smoothedScore = this.calculateSmoothedScore();

    // Determine upright/slouched state
    const isUpright = smoothedScore >= this.options.uprightThreshold;

    // Check for transition (within 500ms window)
    const isTransitioning = this.isInTransition(timestamp);

    const result: PostureResult = {
      isUpright,
      qualityScore: smoothedScore,
      shoulderLevel,
      headPosition,
      timestamp,
    };

    // Track state changes
    if (this.lastResult && this.lastResult.isUpright !== isUpright) {
      this.stateChangeTime = timestamp;
    }

    this.lastResult = result;
    return result;
  }

  setOptions(options: Partial<PostureOptions>): void {
    this.options = { ...this.options, ...options };
  }

  reset(): void {
    this.history = [];
    this.lastResult = null;
    this.stateChangeTime = 0;
  }

  private cleanupHistory(currentTimestamp: number): void {
    const cutoff = currentTimestamp - this.options.transitionWindowMs;
    while (this.history.length > 0 && this.history[0].timestamp < cutoff) {
      this.history.shift();
    }
  }

  private calculateSmoothedScore(): number {
    if (this.history.length === 0) {
      return 0.5;
    }

    // Weighted average favoring more recent samples
    let totalWeight = 0;
    let weightedSum = 0;

    for (let i = 0; i < this.history.length; i++) {
      const weight = (i + 1) / this.history.length; // Higher weight for recent
      weightedSum += this.history[i].score * weight;
      totalWeight += weight;
    }

    return weightedSum / totalWeight;
  }

  private isInTransition(currentTimestamp: number): boolean {
    return (currentTimestamp - this.stateChangeTime) < this.options.transitionWindowMs;
  }
}

// Factory function
export function createPostureDetector(options?: PostureOptions): PostureDetector {
  return new PostureDetector(options);
}

// Simple posture check for quick detection
export function quickPostureCheck(faceMesh: FaceMeshResult): 'upright' | 'neutral' | 'slouched' {
  const { landmarks } = faceMesh;

  const leftEye = landmarks[FACE_LANDMARK_INDICES.LEFT_EYE_OUTER];
  const rightEye = landmarks[FACE_LANDMARK_INDICES.RIGHT_EYE_OUTER];
  const leftEar = landmarks[FACE_LANDMARK_INDICES.LEFT_EAR];
  const rightEar = landmarks[FACE_LANDMARK_INDICES.RIGHT_EAR];

  const eyeLevel = (leftEye.y + rightEye.y) / 2;
  const earLevel = (leftEar.y + rightEar.y) / 2;
  const shoulderLevel = earLevel - eyeLevel;

  // Thresholds for quick classification
  if (shoulderLevel > 0.08) return 'upright';
  if (shoulderLevel < 0.02) return 'slouched';
  return 'neutral';
}
