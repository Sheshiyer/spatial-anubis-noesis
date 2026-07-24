/**
 * ZoneTeleport — Binaural frequency transitions during zone movement
 * P4-S1-25: Crossfade binaural frequencies as vessel moves between zones
 *
 * Smooth binaural audio transitions over boundary crossing.
 * Each zone has a characteristic binaural frequency that fades in/out.
 */

import * as THREE from 'three';
import type { ZoneId } from './FogBank';

/** Binaural frequency configuration per zone */
export interface ZoneBinauralConfig {
  /** Zone identifier */
  zone: ZoneId;
  /** Binaural beat frequency (Hz) */
  frequency: number;
  /** Base carrier frequency (Hz) */
  carrierFrequency: number;
  /** Zone center position */
  center: THREE.Vector3;
  /** Influence radius */
  radius: number;
}

/** Default binaural configurations for all zones */
export const DEFAULT_ZONE_BINAURAL_CONFIGS: Record<ZoneId, ZoneBinauralConfig> = {
  north: {
    zone: 'north',
    frequency: 7.83, // Schumann Resonance (theta/alpha border)
    carrierFrequency: 200,
    center: new THREE.Vector3(0, 0, 50),
    radius: 30,
  },
  east: {
    zone: 'east',
    frequency: 4.5, // Theta (deep meditation, breath awareness)
    carrierFrequency: 180,
    center: new THREE.Vector3(50, 0, 0),
    radius: 30,
  },
  west: {
    zone: 'west',
    frequency: 10, // Alpha (relaxed focus, ritual work)
    carrierFrequency: 220,
    center: new THREE.Vector3(-50, 0, 0),
    radius: 30,
  },
  south: {
    zone: 'south',
    frequency: 1.5, // Delta (deep states, sigil work)
    carrierFrequency: 160,
    center: new THREE.Vector3(0, 0, -50),
    radius: 30,
  },
};

/** Zone audio influence */
interface ZoneInfluence {
  zone: ZoneId;
  distance: number;
  influence: number; // 0-1
}

/**
 * Calculate zone influence based on distance
 * Uses smooth falloff curve
 */
function calculateInfluence(distance: number, radius: number): number {
  if (distance >= radius) return 0;

  // Smooth cosine falloff
  const t = distance / radius;
  return Math.cos(t * Math.PI * 0.5);
}

/**
 * Binaural frequency crossfade controller
 * Manages smooth transitions between zone-specific binaural frequencies
 */
export class ZoneBinauralController {
  private configs: Record<ZoneId, ZoneBinauralConfig>;
  private audioContext: AudioContext | null = null;
  private oscillators: Map<ZoneId, { left: OscillatorNode; right: OscillatorNode; gain: GainNode }>;
  private masterGain: GainNode | null = null;
  private isInitialized = false;
  private currentInfluences: Map<ZoneId, number> = new Map();

  constructor(
    customConfigs?: Partial<Record<ZoneId, ZoneBinauralConfig>>,
    audioContext?: AudioContext
  ) {
    this.configs = {
      ...DEFAULT_ZONE_BINAURAL_CONFIGS,
      ...customConfigs,
    };

    this.oscillators = new Map();

    if (audioContext) {
      this.initialize(audioContext);
    }
  }

  /**
   * Initialize audio context and oscillators
   */
  initialize(audioContext: AudioContext): void {
    if (this.isInitialized) return;

    this.audioContext = audioContext;
    this.masterGain = audioContext.createGain();
    this.masterGain.gain.value = 0.15; // Subtle background binaural
    this.masterGain.connect(audioContext.destination);

    // Create oscillator pair for each zone
    const zones: ZoneId[] = ['north', 'east', 'west', 'south'];

    zones.forEach((zone) => {
      const config = this.configs[zone];

      // Left ear (carrier frequency)
      const leftOsc = audioContext.createOscillator();
      leftOsc.frequency.value = config.carrierFrequency;
      leftOsc.type = 'sine';

      // Right ear (carrier + binaural beat)
      const rightOsc = audioContext.createOscillator();
      rightOsc.frequency.value = config.carrierFrequency + config.frequency;
      rightOsc.type = 'sine';

      // Individual gain control for this zone
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0; // Start silent
      gainNode.connect(this.masterGain!);

      // Create stereo merger
      const merger = audioContext.createChannelMerger(2);
      leftOsc.connect(merger, 0, 0);
      rightOsc.connect(merger, 0, 1);
      merger.connect(gainNode);

      // Start oscillators
      leftOsc.start();
      rightOsc.start();

      this.oscillators.set(zone, { left: leftOsc, right: rightOsc, gain: gainNode });
      this.currentInfluences.set(zone, 0);
    });

    this.isInitialized = true;
    console.log('[ZoneBinaural] Initialized binaural frequency system');
  }

  /**
   * Update binaural mix based on vessel position
   * Call this in your render loop
   */
  update(vesselPosition: THREE.Vector3, deltaTime: number): void {
    if (!this.isInitialized || !this.audioContext) return;

    // Calculate influence from each zone
    const zones: ZoneId[] = ['north', 'east', 'west', 'south'];
    const influences: ZoneInfluence[] = [];
    let totalInfluence = 0;

    zones.forEach((zone) => {
      const config = this.configs[zone];
      const distance = vesselPosition.distanceTo(config.center);
      const influence = calculateInfluence(distance, config.radius);

      influences.push({ zone, distance, influence });
      totalInfluence += influence;
    });

    // Normalize influences (ensure they sum to 1 or less)
    if (totalInfluence > 1) {
      influences.forEach((inf) => {
        inf.influence /= totalInfluence;
      });
    }

    // Smooth crossfade to target influences
    const smoothingFactor = 1 - Math.exp(-deltaTime * 2); // Exponential smoothing

    influences.forEach(({ zone, influence }) => {
      const currentInfluence = this.currentInfluences.get(zone) || 0;
      const newInfluence = currentInfluence + (influence - currentInfluence) * smoothingFactor;

      this.currentInfluences.set(zone, newInfluence);

      // Update gain
      const osc = this.oscillators.get(zone);
      if (osc) {
        osc.gain.gain.setTargetAtTime(
          newInfluence,
          this.audioContext.currentTime,
          0.1 // Time constant for smooth transition
        );
      }
    });
  }

  /**
   * Set master binaural volume (0-1)
   */
  setMasterVolume(volume: number): void {
    if (!this.masterGain) return;

    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.masterGain.gain.setTargetAtTime(
      clampedVolume * 0.15,
      this.audioContext!.currentTime,
      0.1
    );
  }

  /**
   * Get current zone influences
   */
  getCurrentInfluences(): Map<ZoneId, number> {
    return new Map(this.currentInfluences);
  }

  /**
   * Get dominant zone (zone with highest influence)
   */
  getDominantZone(): { zone: ZoneId; influence: number } | null {
    let maxInfluence = 0;
    let dominantZone: ZoneId | null = null;

    this.currentInfluences.forEach((influence, zone) => {
      if (influence > maxInfluence) {
        maxInfluence = influence;
        dominantZone = zone;
      }
    });

    return dominantZone ? { zone: dominantZone, influence: maxInfluence } : null;
  }

  /**
   * Update zone binaural configuration
   */
  updateZoneConfig(zone: ZoneId, config: Partial<ZoneBinauralConfig>): void {
    this.configs[zone] = {
      ...this.configs[zone],
      ...config,
    };

    // Update oscillator frequencies if initialized
    if (this.isInitialized) {
      const osc = this.oscillators.get(zone);
      if (osc) {
        const newConfig = this.configs[zone];
        osc.left.frequency.setValueAtTime(
          newConfig.carrierFrequency,
          this.audioContext!.currentTime
        );
        osc.right.frequency.setValueAtTime(
          newConfig.carrierFrequency + newConfig.frequency,
          this.audioContext!.currentTime
        );
      }
    }
  }

  /**
   * Fade out all binaural frequencies
   */
  fadeOut(duration = 1.0): void {
    if (!this.isInitialized || !this.audioContext) return;

    const now = this.audioContext.currentTime;

    this.oscillators.forEach((osc) => {
      osc.gain.gain.setTargetAtTime(0, now, duration / 3);
    });

    console.log(`[ZoneBinaural] Fading out over ${duration}s`);
  }

  /**
   * Fade in binaural frequencies
   */
  fadeIn(duration = 1.0): void {
    if (!this.isInitialized || !this.audioContext) return;

    console.log(`[ZoneBinaural] Fading in over ${duration}s`);
    // Natural fade-in happens through update() based on vessel position
  }

  /**
   * Dispose of audio resources
   */
  dispose(): void {
    if (!this.isInitialized) return;

    this.oscillators.forEach((osc) => {
      osc.left.stop();
      osc.right.stop();
      osc.gain.disconnect();
    });

    if (this.masterGain) {
      this.masterGain.disconnect();
    }

    this.oscillators.clear();
    this.isInitialized = false;

    console.log('[ZoneBinaural] Disposed audio resources');
  }
}

/**
 * Factory function
 */
export function createZoneBinauralController(
  customConfigs?: Partial<Record<ZoneId, ZoneBinauralConfig>>,
  audioContext?: AudioContext
): ZoneBinauralController {
  return new ZoneBinauralController(customConfigs, audioContext);
}

/**
 * Calculate interpolated binaural frequency between two zones
 * Useful for smooth transitions
 */
export function interpolateBinauralFrequency(
  fromZone: ZoneId,
  toZone: ZoneId,
  t: number
): number {
  const fromConfig = DEFAULT_ZONE_BINAURAL_CONFIGS[fromZone];
  const toConfig = DEFAULT_ZONE_BINAURAL_CONFIGS[toZone];

  return fromConfig.frequency + (toConfig.frequency - fromConfig.frequency) * t;
}

/**
 * Get recommended binaural frequency for a ritual type
 */
export function getRecommendedBinauralForRitual(ritualType: string): number {
  const ritualFrequencies: Record<string, number> = {
    'breath-sync': 4.5, // Theta - deep meditation
    'engine-ritual': 10, // Alpha - focused work
    'sigil-forge': 1.5, // Delta - deep creation
    meditation: 7.83, // Schumann - grounding
  };

  return ritualFrequencies[ritualType] || 7.83;
}
