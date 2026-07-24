/**
 * Zone Audio Crossfade System
 * P4-S1-08: Zone-specific audio crossfade with 3-second transitions
 *
 * Manages smooth crossfading between zone soundscapes as the user
 * moves through the world. Detects zone boundary crossings and
 * transitions ambient audio accordingly.
 */

import type { BinauralZone } from './BinauralBeatSystem';

/** Zone audio source configuration */
export interface ZoneAudioSource {
  zone: BinauralZone;
  audioBuffer: AudioBuffer | null;
  url?: string;
  loop: boolean;
}

/** Zone audio crossfade constants */
const CROSSFADE_CONSTANTS = {
  TRANSITION_DURATION: 3.0, // 3 seconds
  RAMP_TIME_CONSTANT: 0.3,
  MIN_DISTANCE_FOR_CROSSFADE: 0.5, // Minimum movement to trigger crossfade
} as const;

/** Audio source node with gain control */
interface ManagedAudioSource {
  source: AudioBufferSourceNode | null;
  gain: GainNode;
  zone: BinauralZone;
  isActive: boolean;
}

/**
 * Zone Audio Crossfade System
 * Handles smooth transitions between zone-specific ambient soundscapes
 */
export class ZoneAudioCrossfade {
  private context: AudioContext | null = null;
  private destination: AudioNode | null = null;
  private sources: Map<BinauralZone, ManagedAudioSource> = new Map();
  private currentZone: BinauralZone = 'none';
  private previousZone: BinauralZone = 'none';
  private isTransitioning = false;
  private audioBuffers: Map<BinauralZone, AudioBuffer> = new Map();

  constructor() {}

  /**
   * Initialize the zone audio crossfade system
   */
  initialize(audioContext: AudioContext, destination: AudioNode): boolean {
    if (this.context) {
      console.warn('[ZoneAudioCrossfade] Already initialized');
      return true;
    }

    try {
      this.context = audioContext;
      this.destination = destination;

      console.log('[ZoneAudioCrossfade] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[ZoneAudioCrossfade] Failed to initialize:', error);
      return false;
    }
  }

  /**
   * Load audio buffer for a zone
   */
  async loadZoneAudio(
    zone: BinauralZone,
    url: string
  ): Promise<boolean> {
    if (!this.context) {
      console.warn('[ZoneAudioCrossfade] Not initialized');
      return false;
    }

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer);

      this.audioBuffers.set(zone, audioBuffer);
      console.log(`[ZoneAudioCrossfade] Loaded audio for zone: ${zone}`);
      return true;
    } catch (error) {
      console.error(`[ZoneAudioCrossfade] Failed to load audio for zone ${zone}:`, error);
      return false;
    }
  }

  /**
   * Set audio buffer for a zone directly
   */
  setZoneAudioBuffer(zone: BinauralZone, buffer: AudioBuffer): void {
    this.audioBuffers.set(zone, buffer);
    console.log(`[ZoneAudioCrossfade] Set audio buffer for zone: ${zone}`);
  }

  /**
   * Create and prepare an audio source for a zone
   */
  private createAudioSource(zone: BinauralZone): ManagedAudioSource | null {
    if (!this.context || !this.destination) {
      return null;
    }

    const audioBuffer = this.audioBuffers.get(zone);
    if (!audioBuffer) {
      console.warn(`[ZoneAudioCrossfade] No audio buffer for zone: ${zone}`);
      return null;
    }

    // Create gain node for volume control
    const gain = this.context.createGain();
    gain.gain.value = 0; // Start silent
    gain.connect(this.destination);

    // Create buffer source
    const source = this.context.createBufferSource();
    source.buffer = audioBuffer;
    source.loop = true;
    source.connect(gain);

    return {
      source,
      gain,
      zone,
      isActive: false,
    };
  }

  /**
   * Start playing audio for a zone
   */
  private startZoneAudio(zone: BinauralZone, fadeIn: boolean = true): void {
    if (!this.context) {
      return;
    }

    // Check if source already exists and is active
    let managedSource = this.sources.get(zone);
    if (managedSource?.isActive) {
      return;
    }

    // Create new audio source
    managedSource = this.createAudioSource(zone);
    if (!managedSource) {
      return;
    }

    // Start playing
    const now = this.context.currentTime;
    managedSource.source!.start(now);
    managedSource.isActive = true;

    // Fade in if requested
    if (fadeIn) {
      managedSource.gain.gain.setValueAtTime(0, now);
      managedSource.gain.gain.linearRampToValueAtTime(
        1.0,
        now + CROSSFADE_CONSTANTS.TRANSITION_DURATION
      );
    } else {
      managedSource.gain.gain.setValueAtTime(1.0, now);
    }

    this.sources.set(zone, managedSource);
    console.log(`[ZoneAudioCrossfade] Started audio for zone: ${zone}`);
  }

  /**
   * Stop playing audio for a zone
   */
  private stopZoneAudio(zone: BinauralZone, fadeOut: boolean = true): void {
    if (!this.context) {
      return;
    }

    const managedSource = this.sources.get(zone);
    if (!managedSource || !managedSource.isActive) {
      return;
    }

    const now = this.context.currentTime;

    if (fadeOut) {
      // Fade out
      managedSource.gain.gain.setValueAtTime(managedSource.gain.gain.value, now);
      managedSource.gain.gain.linearRampToValueAtTime(
        0,
        now + CROSSFADE_CONSTANTS.TRANSITION_DURATION
      );

      // Stop after fade completes
      setTimeout(() => {
        if (managedSource.source) {
          try {
            managedSource.source.stop();
          } catch {
            // Source may already be stopped
          }
          managedSource.source.disconnect();
        }
        managedSource.gain.disconnect();
        managedSource.isActive = false;
        this.sources.delete(zone);
      }, CROSSFADE_CONSTANTS.TRANSITION_DURATION * 1000);
    } else {
      // Stop immediately
      if (managedSource.source) {
        try {
          managedSource.source.stop();
        } catch {
          // Source may already be stopped
        }
        managedSource.source.disconnect();
      }
      managedSource.gain.disconnect();
      managedSource.isActive = false;
      this.sources.delete(zone);
    }

    console.log(`[ZoneAudioCrossfade] Stopped audio for zone: ${zone}`);
  }

  /**
   * Transition to a new zone
   * Crossfades from current zone audio to new zone audio
   */
  transitionToZone(newZone: BinauralZone): void {
    if (!this.context) {
      console.warn('[ZoneAudioCrossfade] Not initialized');
      return;
    }

    if (newZone === this.currentZone) {
      return;
    }

    if (this.isTransitioning) {
      console.log('[ZoneAudioCrossfade] Transition already in progress');
      return;
    }

    console.log(`[ZoneAudioCrossfade] Transitioning: ${this.currentZone} -> ${newZone}`);

    this.isTransitioning = true;
    this.previousZone = this.currentZone;
    this.currentZone = newZone;

    const now = this.context.currentTime;

    // Fade out previous zone
    if (this.previousZone !== 'none') {
      const prevSource = this.sources.get(this.previousZone);
      if (prevSource?.isActive) {
        prevSource.gain.gain.setValueAtTime(prevSource.gain.gain.value, now);
        prevSource.gain.gain.linearRampToValueAtTime(
          0,
          now + CROSSFADE_CONSTANTS.TRANSITION_DURATION
        );

        // Clean up after fade
        setTimeout(() => {
          this.stopZoneAudio(this.previousZone, false);
        }, CROSSFADE_CONSTANTS.TRANSITION_DURATION * 1000);
      }
    }

    // Fade in new zone
    if (newZone !== 'none') {
      this.startZoneAudio(newZone, true);
    }

    // Mark transition complete
    setTimeout(() => {
      this.isTransitioning = false;
    }, CROSSFADE_CONSTANTS.TRANSITION_DURATION * 1000);
  }

  /**
   * Detect zone boundary crossing and trigger crossfade
   * Called from position update loop
   */
  updateZone(zone: BinauralZone): void {
    if (zone !== this.currentZone && !this.isTransitioning) {
      this.transitionToZone(zone);
    }
  }

  /**
   * Get current zone
   */
  getCurrentZone(): BinauralZone {
    return this.currentZone;
  }

  /**
   * Check if transitioning
   */
  isInTransition(): boolean {
    return this.isTransitioning;
  }

  /**
   * Set master volume for all zone audio
   */
  setMasterVolume(volume: number): void {
    if (!this.context) {
      return;
    }

    const clampedVolume = Math.max(0, Math.min(1, volume));

    this.sources.forEach((managedSource) => {
      if (managedSource.isActive) {
        const now = this.context!.currentTime;
        managedSource.gain.gain.setTargetAtTime(
          clampedVolume,
          now,
          CROSSFADE_CONSTANTS.RAMP_TIME_CONSTANT
        );
      }
    });
  }

  /**
   * Stop all zone audio
   */
  stopAll(): void {
    this.sources.forEach((_, zone) => {
      this.stopZoneAudio(zone, false);
    });
    this.currentZone = 'none';
    this.previousZone = 'none';
    this.isTransitioning = false;
  }

  /**
   * Dispose of all audio resources
   */
  dispose(): void {
    this.stopAll();
    this.audioBuffers.clear();
    this.sources.clear();
    this.context = null;
    this.destination = null;

    console.log('[ZoneAudioCrossfade] Disposed');
  }
}

/** Export constants for external use */
export { CROSSFADE_CONSTANTS };
