/**
 * Head-Tilt Inspection System
 * P4-S1-11: Head-tilt inspection for Somatic Canticle engagement
 *
 * When user looks down (head tilt > 15 degrees), the Somatic Canticle
 * artifact opens/engages. Uses bio headTilt data.
 */

import type { HeadTiltResult, HeadTiltVector } from '../../bio/types';

/** Head tilt inspection result */
export interface HeadTiltInspectionResult {
  /** Is artifact engaged (looking down) */
  isEngaged: boolean;
  /** Head tilt angle in degrees (forward tilt) */
  tiltAngle: number;
  /** Engagement strength (0-1) */
  engagementStrength: number;
  /** Is user looking down intentionally */
  isIntentional: boolean;
}

/** Head tilt inspection configuration */
export interface HeadTiltInspectionConfig {
  /** Minimum tilt angle to engage (degrees) */
  minTiltAngle: number;
  /** Maximum tilt angle for full engagement (degrees) */
  maxTiltAngle: number;
  /** Minimum duration to confirm intentional look (seconds) */
  intentionalDuration: number;
  /** Debounce time for engagement toggle (seconds) */
  debounceTime: number;
}

/** Default configuration */
const DEFAULT_CONFIG: HeadTiltInspectionConfig = {
  minTiltAngle: 15,
  maxTiltAngle: 45,
  intentionalDuration: 0.5,
  debounceTime: 0.3,
};

/**
 * Head Tilt Inspection System
 * Monitors head tilt to detect when user is looking down at chest/artifact
 */
export class HeadTiltInspection {
  private config: HeadTiltInspectionConfig;
  private isEngaged = false;
  private tiltStartTime = 0;
  private lastToggleTime = 0;
  private tiltDuration = 0;

  constructor(config: Partial<HeadTiltInspectionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Update inspection state with new head tilt data
   */
  update(headTilt: HeadTiltResult, currentTime: number): HeadTiltInspectionResult {
    const pitchAngle = Math.abs(headTilt.vector.pitch);

    // Check if user is tilting head forward/down
    const isTiltingDown = headTilt.vector.pitch > 0 && pitchAngle >= this.config.minTiltAngle;

    // Calculate engagement strength (0-1 based on tilt angle)
    let engagementStrength = 0;
    if (isTiltingDown) {
      engagementStrength = Math.min(
        1.0,
        (pitchAngle - this.config.minTiltAngle) /
          (this.config.maxTiltAngle - this.config.minTiltAngle)
      );
    }

    // Track tilt duration
    if (isTiltingDown) {
      if (this.tiltStartTime === 0) {
        this.tiltStartTime = currentTime;
      }
      this.tiltDuration = currentTime - this.tiltStartTime;
    } else {
      this.tiltStartTime = 0;
      this.tiltDuration = 0;
    }

    // Check if intentional (sustained for minimum duration)
    const isIntentional = this.tiltDuration >= this.config.intentionalDuration;

    // Update engagement state with debouncing
    const timeSinceLastToggle = currentTime - this.lastToggleTime;
    const canToggle = timeSinceLastToggle >= this.config.debounceTime;

    if (canToggle) {
      if (!this.isEngaged && isIntentional) {
        // Engage artifact
        this.isEngaged = true;
        this.lastToggleTime = currentTime;
        console.log('[HeadTiltInspection] Artifact engaged');
      } else if (this.isEngaged && !isTiltingDown) {
        // Disengage when user stops tilting
        this.isEngaged = false;
        this.lastToggleTime = currentTime;
        console.log('[HeadTiltInspection] Artifact disengaged');
      }
    }

    return {
      isEngaged: this.isEngaged,
      tiltAngle: pitchAngle,
      engagementStrength,
      isIntentional,
    };
  }

  /**
   * Force engagement state
   */
  setEngaged(engaged: boolean): void {
    this.isEngaged = engaged;
  }

  /**
   * Get current engagement state
   */
  getEngagementState(): boolean {
    return this.isEngaged;
  }

  /**
   * Reset inspection state
   */
  reset(): void {
    this.isEngaged = false;
    this.tiltStartTime = 0;
    this.lastToggleTime = 0;
    this.tiltDuration = 0;
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<HeadTiltInspectionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): HeadTiltInspectionConfig {
    return { ...this.config };
  }
}

/**
 * Create head tilt inspection system
 */
export function createHeadTiltInspection(
  config?: Partial<HeadTiltInspectionConfig>
): HeadTiltInspection {
  return new HeadTiltInspection(config);
}

/**
 * Calculate head tilt angle from head tilt vector
 */
export function calculateHeadTiltAngle(tiltVector: HeadTiltVector): number {
  // Forward tilt is positive pitch
  return Math.abs(tiltVector.pitch);
}

/**
 * Check if user is looking down based on head tilt
 */
export function isLookingDown(
  tiltVector: HeadTiltVector,
  minAngle: number = DEFAULT_CONFIG.minTiltAngle
): boolean {
  const angle = calculateHeadTiltAngle(tiltVector);
  return tiltVector.pitch > 0 && angle >= minAngle;
}
