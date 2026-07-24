/**
 * Binaural Beat System
 * P4-S1-06: Per-zone binaural beat frequencies with smooth crossfade
 *
 * Implements zone-specific binaural beat frequencies:
 * - Breathfield (North): 10Hz alpha
 * - Engines (East): 7.83Hz Schumann resonance
 * - Forge (West): 4Hz theta
 * - Threshold (South): 1Hz delta
 */

/** Zone identifiers for binaural beats */
export type BinauralZone = 'breathfield' | 'engines' | 'forge' | 'threshold' | 'none';

/** Binaural beat configuration for a zone */
export interface BinauralZoneConfig {
  zone: BinauralZone;
  carrierFrequency: number; // Base frequency (Hz)
  binauralOffset: number;   // Offset between ears (Hz)
  description: string;
}

/** Per-zone binaural configurations */
const ZONE_CONFIGS: Record<BinauralZone, BinauralZoneConfig> = {
  breathfield: {
    zone: 'breathfield',
    carrierFrequency: 200,
    binauralOffset: 10, // 10Hz alpha waves
    description: 'Alpha state - relaxed awareness',
  },
  engines: {
    zone: 'engines',
    carrierFrequency: 200,
    binauralOffset: 7.83, // 7.83Hz Schumann resonance
    description: 'Schumann resonance - earth frequency',
  },
  forge: {
    zone: 'forge',
    carrierFrequency: 200,
    binauralOffset: 4, // 4Hz theta waves
    description: 'Theta state - deep meditation',
  },
  threshold: {
    zone: 'threshold',
    carrierFrequency: 200,
    binauralOffset: 1, // 1Hz delta waves
    description: 'Delta state - deep healing',
  },
  none: {
    zone: 'none',
    carrierFrequency: 200,
    binauralOffset: 0,
    description: 'No binaural effect',
  },
};

/** Binaural beat system constants */
const BINAURAL_CONSTANTS = {
  CROSSFADE_DURATION: 3.0, // 3 seconds
  BASE_VOLUME: 0.08,
  RAMP_TIME_CONSTANT: 0.3, // For setTargetAtTime
} as const;

/**
 * Binaural Beat System
 * Manages stereo oscillators for binaural beat generation with zone-based frequencies
 */
export class BinauralBeatSystem {
  private context: AudioContext | null = null;
  private leftOscillator: OscillatorNode | null = null;
  private rightOscillator: OscillatorNode | null = null;
  private leftGain: GainNode | null = null;
  private rightGain: GainNode | null = null;
  private merger: ChannelMergerNode | null = null;
  private masterGain: GainNode | null = null;

  private currentZone: BinauralZone = 'none';
  private targetZone: BinauralZone = 'none';
  private isActive = false;
  private isTransitioning = false;

  constructor() {}

  /**
   * Initialize the binaural beat system
   * Must be called with an active AudioContext
   */
  initialize(audioContext: AudioContext, destination: AudioNode): boolean {
    if (this.context) {
      console.warn('[BinauralBeatSystem] Already initialized');
      return true;
    }

    try {
      this.context = audioContext;

      // Create stereo channel merger
      this.merger = this.context.createChannelMerger(2);

      // Create master gain for overall volume control
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = 0; // Start silent

      // Connect merger -> master gain -> destination
      this.merger.connect(this.masterGain);
      this.masterGain.connect(destination);

      // Create left channel oscillator + gain
      this.leftOscillator = this.context.createOscillator();
      this.leftOscillator.type = 'sine';
      this.leftOscillator.frequency.value = ZONE_CONFIGS.none.carrierFrequency;

      this.leftGain = this.context.createGain();
      this.leftGain.gain.value = BINAURAL_CONSTANTS.BASE_VOLUME;

      this.leftOscillator.connect(this.leftGain);
      this.leftGain.connect(this.merger, 0, 0); // Connect to left channel

      // Create right channel oscillator + gain
      this.rightOscillator = this.context.createOscillator();
      this.rightOscillator.type = 'sine';
      this.rightOscillator.frequency.value = ZONE_CONFIGS.none.carrierFrequency;

      this.rightGain = this.context.createGain();
      this.rightGain.gain.value = BINAURAL_CONSTANTS.BASE_VOLUME;

      this.rightOscillator.connect(this.rightGain);
      this.rightGain.connect(this.merger, 0, 1); // Connect to right channel

      // Start oscillators
      const now = this.context.currentTime;
      this.leftOscillator.start(now);
      this.rightOscillator.start(now);

      console.log('[BinauralBeatSystem] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[BinauralBeatSystem] Failed to initialize:', error);
      return false;
    }
  }

  /**
   * Start binaural beats
   * Fades in master volume
   */
  start(initialZone: BinauralZone = 'none'): void {
    if (!this.context || !this.masterGain) {
      console.warn('[BinauralBeatSystem] Not initialized');
      return;
    }

    if (this.isActive) {
      return;
    }

    const now = this.context.currentTime;
    this.isActive = true;

    // Set initial zone frequencies
    this.setZoneFrequencies(initialZone, true);
    this.currentZone = initialZone;

    // Fade in master volume
    this.masterGain.gain.setValueAtTime(0, now);
    this.masterGain.gain.linearRampToValueAtTime(1.0, now + 1.0);

    console.log(`[BinauralBeatSystem] Started with zone: ${initialZone}`);
  }

  /**
   * Stop binaural beats
   * Fades out master volume
   */
  stop(): void {
    if (!this.context || !this.masterGain || !this.isActive) {
      return;
    }

    const now = this.context.currentTime;
    this.isActive = false;

    // Fade out master volume
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(0, now + 1.0);

    console.log('[BinauralBeatSystem] Stopped');
  }

  /**
   * Transition to a new zone
   * Smoothly crossfades frequencies over CROSSFADE_DURATION
   */
  transitionToZone(zone: BinauralZone): void {
    if (!this.context || !this.isActive) {
      return;
    }

    if (zone === this.currentZone) {
      return;
    }

    if (this.isTransitioning) {
      console.log('[BinauralBeatSystem] Already transitioning, queuing zone:', zone);
      this.targetZone = zone;
      return;
    }

    console.log(`[BinauralBeatSystem] Transitioning: ${this.currentZone} -> ${zone}`);

    this.isTransitioning = true;
    this.targetZone = zone;

    // Crossfade to new zone frequencies
    this.setZoneFrequencies(zone, false);

    // Mark transition complete after duration
    setTimeout(() => {
      this.currentZone = this.targetZone;
      this.isTransitioning = false;

      // Check if another zone transition was queued
      if (this.targetZone !== this.currentZone) {
        this.transitionToZone(this.targetZone);
      }
    }, BINAURAL_CONSTANTS.CROSSFADE_DURATION * 1000);
  }

  /**
   * Set zone frequencies for both oscillators
   * @param zone - Zone configuration to use
   * @param immediate - If true, set immediately; otherwise crossfade
   */
  private setZoneFrequencies(zone: BinauralZone, immediate: boolean): void {
    if (!this.context || !this.leftOscillator || !this.rightOscillator) {
      return;
    }

    const config = ZONE_CONFIGS[zone];
    const now = this.context.currentTime;

    // Left ear gets carrier frequency
    const leftFreq = config.carrierFrequency;
    // Right ear gets carrier + binaural offset
    const rightFreq = config.carrierFrequency + config.binauralOffset;

    if (immediate) {
      // Set immediately
      this.leftOscillator.frequency.setValueAtTime(leftFreq, now);
      this.rightOscillator.frequency.setValueAtTime(rightFreq, now);
    } else {
      // Smooth crossfade
      this.leftOscillator.frequency.setValueAtTime(
        this.leftOscillator.frequency.value,
        now
      );
      this.leftOscillator.frequency.linearRampToValueAtTime(
        leftFreq,
        now + BINAURAL_CONSTANTS.CROSSFADE_DURATION
      );

      this.rightOscillator.frequency.setValueAtTime(
        this.rightOscillator.frequency.value,
        now
      );
      this.rightOscillator.frequency.linearRampToValueAtTime(
        rightFreq,
        now + BINAURAL_CONSTANTS.CROSSFADE_DURATION
      );
    }
  }

  /**
   * Update based on user position
   * Automatically transitions between zones based on position
   */
  updatePosition(x: number, y: number, z: number): void {
    // Determine zone from position
    // Assuming world is oriented: North=+z, East=+x, South=-z, West=-x
    const zone = this.determineZoneFromPosition(x, y, z);

    if (zone !== this.currentZone && !this.isTransitioning) {
      this.transitionToZone(zone);
    }
  }

  /**
   * Determine zone from world position
   * This is a placeholder - should be replaced with actual zone detection logic
   */
  private determineZoneFromPosition(x: number, y: number, z: number): BinauralZone {
    // Simple quadrant-based zone detection
    // Replace with actual zone boundary detection
    const angle = Math.atan2(z, x); // Angle in radians
    const distance = Math.sqrt(x * x + z * z);

    // If very close to center, no zone
    if (distance < 2) {
      return 'none';
    }

    // Divide world into quadrants
    // North (Breathfield): 45° to 135° (π/4 to 3π/4)
    // East (Engines): -45° to 45° (-π/4 to π/4)
    // South (Threshold): -135° to -45° (-3π/4 to -π/4)
    // West (Forge): 135° to 225° (3π/4 to 5π/4, or 3π/4 to -3π/4)

    if (angle >= Math.PI / 4 && angle < (3 * Math.PI) / 4) {
      return 'breathfield'; // North
    } else if (angle >= (-Math.PI / 4) && angle < Math.PI / 4) {
      return 'engines'; // East
    } else if (angle >= (-3 * Math.PI) / 4 && angle < (-Math.PI / 4)) {
      return 'threshold'; // South
    } else {
      return 'forge'; // West
    }
  }

  /**
   * Set master volume
   */
  setVolume(volume: number): void {
    if (!this.masterGain || !this.context) {
      return;
    }

    const clampedVolume = Math.max(0, Math.min(1, volume));
    const now = this.context.currentTime;

    this.masterGain.gain.setTargetAtTime(
      clampedVolume,
      now,
      BINAURAL_CONSTANTS.RAMP_TIME_CONSTANT
    );
  }

  /**
   * Get current zone configuration
   */
  getCurrentZone(): BinauralZone {
    return this.currentZone;
  }

  /**
   * Get zone configuration
   */
  getZoneConfig(zone: BinauralZone): BinauralZoneConfig {
    return ZONE_CONFIGS[zone];
  }

  /**
   * Check if active
   */
  isPlaying(): boolean {
    return this.isActive;
  }

  /**
   * Dispose of all audio resources
   */
  dispose(): void {
    if (this.leftOscillator) {
      try {
        this.leftOscillator.stop();
      } catch {
        // Oscillator may already be stopped
      }
      this.leftOscillator.disconnect();
    }

    if (this.rightOscillator) {
      try {
        this.rightOscillator.stop();
      } catch {
        // Oscillator may already be stopped
      }
      this.rightOscillator.disconnect();
    }

    this.leftGain?.disconnect();
    this.rightGain?.disconnect();
    this.merger?.disconnect();
    this.masterGain?.disconnect();

    this.context = null;
    this.leftOscillator = null;
    this.rightOscillator = null;
    this.leftGain = null;
    this.rightGain = null;
    this.merger = null;
    this.masterGain = null;

    this.isActive = false;
    this.isTransitioning = false;

    console.log('[BinauralBeatSystem] Disposed');
  }
}

/** Export zone configs for external use */
export { ZONE_CONFIGS, BINAURAL_CONSTANTS };
