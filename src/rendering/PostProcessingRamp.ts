/**
 * Post-Processing Ramp Controller
 * P4-S1-07: Post-processing intensity curves tied to zone position and bio-state
 *
 * Controls vignette intensity, film grain amount, and bloom threshold
 * based on:
 * - Zone position (each zone has different visual mood)
 * - Bio-state coherence (higher coherence = less grain, more bloom)
 */

import type { BinauralZone } from '../audio/BinauralBeatSystem';

/** Post-processing parameters */
export interface PostProcessingParams {
  vignetteIntensity: number;  // 0-1
  filmGrainAmount: number;     // 0-1
  bloomThreshold: number;      // 0-1
  bloomIntensity: number;      // 0-1
  saturation: number;          // 0.5-1.5
  contrast: number;            // 0.5-1.5
}

/** Zone-specific post-processing presets */
interface ZonePostProcessingPreset {
  zone: BinauralZone;
  vignette: number;
  grain: number;
  bloomThreshold: number;
  bloomIntensity: number;
  saturation: number;
  contrast: number;
  description: string;
}

/** Zone presets - each zone has a distinct visual mood */
const ZONE_PRESETS: Record<BinauralZone, ZonePostProcessingPreset> = {
  breathfield: {
    zone: 'breathfield',
    vignette: 0.2,      // Minimal vignette
    grain: 0.05,        // Very light grain
    bloomThreshold: 0.6, // Lower threshold = more bloom
    bloomIntensity: 0.8,
    saturation: 1.1,    // Slightly boosted
    contrast: 1.0,
    description: 'Bright, open, breathable',
  },
  engines: {
    zone: 'engines',
    vignette: 0.3,      // Moderate vignette
    grain: 0.15,        // Noticeable grain
    bloomThreshold: 0.7,
    bloomIntensity: 0.6,
    saturation: 1.0,
    contrast: 1.1,      // Slightly higher contrast
    description: 'Technical, focused',
  },
  forge: {
    zone: 'forge',
    vignette: 0.5,      // Strong vignette
    grain: 0.25,        // Heavy grain
    bloomThreshold: 0.5, // More bloom
    bloomIntensity: 0.9,
    saturation: 1.2,    // More saturated (warm)
    contrast: 1.2,      // Higher contrast
    description: 'Warm, intense, creative',
  },
  threshold: {
    zone: 'threshold',
    vignette: 0.7,      // Very strong vignette
    grain: 0.3,         // Very heavy grain
    bloomThreshold: 0.8, // Less bloom
    bloomIntensity: 0.4,
    saturation: 0.7,    // Desaturated
    contrast: 1.3,      // High contrast
    description: 'Dark, mysterious, liminal',
  },
  none: {
    zone: 'none',
    vignette: 0.1,
    grain: 0.05,
    bloomThreshold: 0.7,
    bloomIntensity: 0.5,
    saturation: 1.0,
    contrast: 1.0,
    description: 'Neutral',
  },
};

/** Bio-state coherence influence */
interface CoherenceInfluence {
  grainMultiplier: number;    // Higher coherence reduces grain
  bloomMultiplier: number;    // Higher coherence increases bloom
  vignetteMultiplier: number; // Higher coherence reduces vignette
}

/**
 * Calculate coherence influence on post-processing
 * Coherence range: 0-100
 */
function calculateCoherenceInfluence(coherence: number): CoherenceInfluence {
  // Normalize coherence to 0-1
  const coherenceNorm = Math.max(0, Math.min(100, coherence)) / 100;

  // Higher coherence = cleaner, more beautiful visuals
  return {
    grainMultiplier: 1.0 - coherenceNorm * 0.7,  // Reduce grain by up to 70%
    bloomMultiplier: 1.0 + coherenceNorm * 0.5,  // Increase bloom by up to 50%
    vignetteMultiplier: 1.0 - coherenceNorm * 0.4, // Reduce vignette by up to 40%
  };
}

/**
 * Post-Processing Ramp Controller
 * Manages visual post-processing parameters based on zone and bio-state
 */
export class PostProcessingRamp {
  private currentZone: BinauralZone = 'none';
  private targetZone: BinauralZone = 'none';
  private currentCoherence = 50; // 0-100
  private transitionProgress = 1.0; // 0-1, 1 = complete
  private transitionDuration = 3.0; // seconds
  private transitionStartTime = 0;

  private currentParams: PostProcessingParams;

  constructor() {
    // Initialize with neutral preset
    this.currentParams = this.presetToParams(ZONE_PRESETS.none, 50);
  }

  /**
   * Convert zone preset to params with coherence influence
   */
  private presetToParams(
    preset: ZonePostProcessingPreset,
    coherence: number
  ): PostProcessingParams {
    const influence = calculateCoherenceInfluence(coherence);

    return {
      vignetteIntensity: preset.vignette * influence.vignetteMultiplier,
      filmGrainAmount: preset.grain * influence.grainMultiplier,
      bloomThreshold: preset.bloomThreshold,
      bloomIntensity: preset.bloomIntensity * influence.bloomMultiplier,
      saturation: preset.saturation,
      contrast: preset.contrast,
    };
  }

  /**
   * Interpolate between two parameter sets
   */
  private lerpParams(
    from: PostProcessingParams,
    to: PostProcessingParams,
    t: number
  ): PostProcessingParams {
    const smoothT = t * t * (3 - 2 * t); // Smoothstep

    return {
      vignetteIntensity: from.vignetteIntensity + (to.vignetteIntensity - from.vignetteIntensity) * smoothT,
      filmGrainAmount: from.filmGrainAmount + (to.filmGrainAmount - from.filmGrainAmount) * smoothT,
      bloomThreshold: from.bloomThreshold + (to.bloomThreshold - from.bloomThreshold) * smoothT,
      bloomIntensity: from.bloomIntensity + (to.bloomIntensity - from.bloomIntensity) * smoothT,
      saturation: from.saturation + (to.saturation - from.saturation) * smoothT,
      contrast: from.contrast + (to.contrast - from.contrast) * smoothT,
    };
  }

  /**
   * Start transition to new zone
   */
  transitionToZone(zone: BinauralZone, duration: number = 3.0): void {
    if (zone === this.currentZone) {
      return;
    }

    console.log(`[PostProcessingRamp] Transitioning: ${this.currentZone} -> ${zone}`);

    this.targetZone = zone;
    this.transitionProgress = 0;
    this.transitionDuration = duration;
    this.transitionStartTime = performance.now() / 1000;
  }

  /**
   * Update coherence value
   */
  setCoherence(coherence: number): void {
    this.currentCoherence = Math.max(0, Math.min(100, coherence));
  }

  /**
   * Update post-processing parameters
   * Call this every frame
   */
  update(deltaTime: number): PostProcessingParams {
    // Update transition progress
    if (this.transitionProgress < 1.0) {
      const currentTime = performance.now() / 1000;
      const elapsed = currentTime - this.transitionStartTime;
      this.transitionProgress = Math.min(1.0, elapsed / this.transitionDuration);

      if (this.transitionProgress >= 1.0) {
        this.currentZone = this.targetZone;
        console.log(`[PostProcessingRamp] Transition complete to ${this.currentZone}`);
      }
    }

    // Calculate current and target params
    const currentPreset = ZONE_PRESETS[this.currentZone];
    const targetPreset = ZONE_PRESETS[this.targetZone];

    const currentParams = this.presetToParams(currentPreset, this.currentCoherence);
    const targetParams = this.presetToParams(targetPreset, this.currentCoherence);

    // Interpolate if transitioning
    if (this.transitionProgress < 1.0) {
      this.currentParams = this.lerpParams(currentParams, targetParams, this.transitionProgress);
    } else {
      this.currentParams = currentParams;
    }

    return this.currentParams;
  }

  /**
   * Get current parameters without updating
   */
  getParams(): PostProcessingParams {
    return { ...this.currentParams };
  }

  /**
   * Get current zone
   */
  getCurrentZone(): BinauralZone {
    return this.currentZone;
  }

  /**
   * Get target zone
   */
  getTargetZone(): BinauralZone {
    return this.targetZone;
  }

  /**
   * Check if transitioning
   */
  isTransitioning(): boolean {
    return this.transitionProgress < 1.0;
  }

  /**
   * Get transition progress (0-1)
   */
  getTransitionProgress(): number {
    return this.transitionProgress;
  }

  /**
   * Reset to neutral zone
   */
  reset(): void {
    this.currentZone = 'none';
    this.targetZone = 'none';
    this.transitionProgress = 1.0;
    this.currentCoherence = 50;
    this.currentParams = this.presetToParams(ZONE_PRESETS.none, 50);
  }

  /**
   * Set zone immediately without transition
   */
  setZoneImmediate(zone: BinauralZone): void {
    this.currentZone = zone;
    this.targetZone = zone;
    this.transitionProgress = 1.0;
    this.currentParams = this.presetToParams(ZONE_PRESETS[zone], this.currentCoherence);
  }
}

/**
 * Create post-processing ramp controller
 */
export function createPostProcessingRamp(): PostProcessingRamp {
  return new PostProcessingRamp();
}

/** Export zone presets for external use */
export { ZONE_PRESETS };
