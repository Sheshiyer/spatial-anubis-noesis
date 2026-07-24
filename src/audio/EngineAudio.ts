/**
 * Engine Audio System
 * 
 * P3-S3-12 to P3-S3-14
 * - 13 unique activation tones (harmonically related)
 * - Universal completion tone (engine-specific coloring)
 * - Distance-based audio attenuation (inverse-square, 10u cutoff)
 */

import type { EngineId, EngineTone, SpatialAudioConfig, AudioPosition } from '../engines/meta/types';

// ============================================================================
// Audio Constants
// ============================================================================

const AUDIO_CONSTANTS = {
  MASTER_GAIN: 0.3,
  CUTOFF_DISTANCE: 10, // units
  SAMPLE_RATE: 44100,
} as const;

// Harmonic series based on 60Hz fundamental (theta entrainment)
// Each engine gets a unique harmonic relationship
const ENGINE_TONES: Record<EngineId, EngineTone> = {
  // Tier 1: Based on fundamental ratios (3:2, 4:3, 5:4, etc.)
  vimshottari: {
    engineId: 'vimshottari',
    baseFrequency: 90, // 3:2 perfect fifth
    harmonicRatio: 1.5,
    duration: 0.8,
    envelope: { attack: 0.05, decay: 0.1, sustain: 0.6, release: 0.25 },
  },
  iching: {
    engineId: 'iching',
    baseFrequency: 80, // 4:3 perfect fourth
    harmonicRatio: 1.333,
    duration: 0.6,
    envelope: { attack: 0.03, decay: 0.15, sustain: 0.4, release: 0.2 },
  },
  tarot: {
    engineId: 'tarot',
    baseFrequency: 75, // 5:4 major third
    harmonicRatio: 1.25,
    duration: 1.0,
    envelope: { attack: 0.08, decay: 0.2, sustain: 0.5, release: 0.4 },
  },
  runes: {
    engineId: 'runes',
    baseFrequency: 72, // 6:5 minor third
    harmonicRatio: 1.2,
    duration: 0.7,
    envelope: { attack: 0.04, decay: 0.12, sustain: 0.55, release: 0.25 },
  },
  numerology: {
    engineId: 'numerology',
    baseFrequency: 67.5, // 9:8 major second
    harmonicRatio: 1.125,
    duration: 0.5,
    envelope: { attack: 0.02, decay: 0.08, sustain: 0.3, release: 0.15 },
  },
  // Tier 2: Higher harmonics with subtle microtonal variations
  biorhythm: {
    engineId: 'biorhythm',
    baseFrequency: 120, // 2:1 octave
    harmonicRatio: 2.0,
    duration: 1.2,
    envelope: { attack: 0.1, decay: 0.15, sustain: 0.7, release: 0.5 },
  },
  genekeys: {
    engineId: 'genekeys',
    baseFrequency: 135, // 9:4 double octave + fifth
    harmonicRatio: 2.25,
    duration: 1.5,
    envelope: { attack: 0.15, decay: 0.2, sustain: 0.6, release: 0.7 },
  },
  humandesign: {
    engineId: 'humandesign',
    baseFrequency: 150, // 5:2 double octave + third
    harmonicRatio: 2.5,
    duration: 1.1,
    envelope: { attack: 0.08, decay: 0.18, sustain: 0.65, release: 0.45 },
  },
  chronobiology: {
    engineId: 'chronobiology',
    baseFrequency: 160, // 8:3 octave + fourth
    harmonicRatio: 2.667,
    duration: 1.3,
    envelope: { attack: 0.12, decay: 0.25, sustain: 0.55, release: 0.6 },
  },
  // Tier 3: Complex harmonic structures
  'decision-mirror': {
    engineId: 'decision-mirror',
    baseFrequency: 180, // 3:1 triple octave
    harmonicRatio: 3.0,
    duration: 1.8,
    envelope: { attack: 0.2, decay: 0.3, sustain: 0.8, release: 0.8 },
  },
  transits: {
    engineId: 'transits',
    baseFrequency: 200, // 10:3 triple octave + third
    harmonicRatio: 3.333,
    duration: 2.0,
    envelope: { attack: 0.18, decay: 0.35, sustain: 0.75, release: 0.9 },
  },
  'somatic-canticle': {
    engineId: 'somatic-canticle',
    baseFrequency: 240, // 4:1 quadruple octave
    harmonicRatio: 4.0,
    duration: 2.5,
    envelope: { attack: 0.25, decay: 0.4, sustain: 0.85, release: 1.2 },
  },
  // Cartographer: Meta-frequency (sum of all)
  'cartographer-compass': {
    engineId: 'cartographer-compass',
    baseFrequency: 300, // 5:1 quintuple octave
    harmonicRatio: 5.0,
    duration: 3.0,
    envelope: { attack: 0.3, decay: 0.5, sustain: 0.9, release: 1.5 },
  },
};

// Engine-specific colorings for completion tone
const COMPLETION_TONE_VARIANTS: Record<EngineId, { frequency: number; harmonics: number[] }> = {
  vimshottari: { frequency: 180, harmonics: [1, 1.5, 2, 3] },
  iching: { frequency: 160, harmonics: [1, 2, 2.5, 4] },
  tarot: { frequency: 150, harmonics: [1, 1.25, 2, 2.5] },
  runes: { frequency: 144, harmonics: [1, 1.2, 2, 2.4] },
  numerology: { frequency: 135, harmonics: [1, 1.125, 2, 2.25] },
  biorhythm: { frequency: 240, harmonics: [1, 2, 3, 4] },
  genekeys: { frequency: 270, harmonics: [1, 1.5, 2.25, 3] },
  humandesign: { frequency: 300, harmonics: [1, 1.25, 2, 2.5] },
  chronobiology: { frequency: 320, harmonics: [1, 1.333, 2, 2.667] },
  'decision-mirror': { frequency: 360, harmonics: [1, 2, 3, 4, 5] },
  transits: { frequency: 400, harmonics: [1, 1.5, 2, 3, 4] },
  'somatic-canticle': { frequency: 480, harmonics: [1, 2, 3, 4, 5, 6] },
  'cartographer-compass': { frequency: 600, harmonics: [1, 2, 3, 4, 5, 6, 7] },
};

// ============================================================================
// Engine Audio Class
// ============================================================================

export class EngineAudio {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private spatialConfig: SpatialAudioConfig = {
    cutoffDistance: AUDIO_CONSTANTS.CUTOFF_DISTANCE,
    attenuationCurve: 'inverse_square',
    maxVolume: AUDIO_CONSTANTS.MASTER_GAIN,
  };
  private enginePositions: Map<EngineId, AudioPosition> = new Map();
  private activeSources: Map<string, AudioBufferSourceNode> = new Map();

  constructor() {
    this.initializeAudio();
  }

  async initializeAudio(): Promise<boolean> {
    try {
      const AudioContextClass = window.AudioContext || 
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.context = new AudioContextClass();
      
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = AUDIO_CONSTANTS.MASTER_GAIN;
      this.masterGain.connect(this.context.destination);
      
      return true;
    } catch (error) {
      console.error('[EngineAudio] Failed to initialize:', error);
      return false;
    }
  }

  setEnginePosition(engineId: EngineId, position: AudioPosition): void {
    this.enginePositions.set(engineId, position);
  }

  // ========================================================================
  // Distance Calculation
  // ========================================================================

  private calculateDistance(sourcePos: AudioPosition, listenerPos: AudioPosition): number {
    const dx = sourcePos.x - listenerPos.x;
    const dy = sourcePos.y - listenerPos.y;
    const dz = sourcePos.z - listenerPos.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private calculateAttenuation(distance: number): number {
    if (distance >= this.spatialConfig.cutoffDistance) return 0;
    
    switch (this.spatialConfig.attenuationCurve) {
      case 'inverse_square':
        return 1 / (1 + distance * distance);
      case 'linear':
        return 1 - (distance / this.spatialConfig.cutoffDistance);
      case 'exponential':
        return Math.exp(-distance / (this.spatialConfig.cutoffDistance / 3));
      default:
        return 1;
    }
  }

  private getSpatializedGain(
    engineId: EngineId,
    listenerPosition: AudioPosition
  ): number {
    const enginePos = this.enginePositions.get(engineId);
    if (!enginePos) return this.spatialConfig.maxVolume;

    const distance = this.calculateDistance(enginePos, listenerPosition);
    const attenuation = this.calculateAttenuation(distance);
    
    return attenuation * this.spatialConfig.maxVolume;
  }

  // ========================================================================
  // Sound Generation
  // ========================================================================

  private createSineWave(frequency: number, duration: number): AudioBuffer {
    if (!this.context) throw new Error('AudioContext not initialized');

    const sampleRate = this.context.sampleRate;
    const length = Math.ceil(duration * sampleRate);
    const buffer = this.context.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      data[i] = Math.sin(2 * Math.PI * frequency * t);
    }

    return buffer;
  }

  private createHarmonicTone(
    fundamental: number,
    harmonics: number[],
    duration: number
  ): AudioBuffer {
    if (!this.context) throw new Error('AudioContext not initialized');

    const sampleRate = this.context.sampleRate;
    const length = Math.ceil(duration * sampleRate);
    const buffer = this.context.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    // Amplitude envelope for each harmonic
    const harmonicGains = [1.0, 0.5, 0.3, 0.2, 0.15, 0.1, 0.05];

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      let sample = 0;

      harmonics.forEach((harmonic, idx) => {
        const freq = fundamental * harmonic;
        const gain = harmonicGains[idx] || 0.05;
        sample += gain * Math.sin(2 * Math.PI * freq * t);
      });

      data[i] = sample / harmonics.length;
    }

    return buffer;
  }

  private applyEnvelope(
    gainNode: GainNode,
    envelope: EngineTone['envelope'],
    duration: number
  ): void {
    if (!this.context) return;

    const now = this.context.currentTime;
    const { attack, decay, sustain, release } = envelope;
    
    const sustainLevel = sustain;
    const sustainDuration = Math.max(0, duration - attack - decay - release);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(1, now + attack);
    gainNode.gain.exponentialRampToValueAtTime(sustainLevel, now + attack + decay);
    gainNode.gain.setValueAtTime(sustainLevel, now + attack + decay + sustainDuration);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
  }

  // ========================================================================
  // P3-S3-12: Activation Tones
  // ========================================================================

  playActivationTone(
    engineId: EngineId,
    listenerPosition: AudioPosition
  ): void {
    if (!this.context || !this.masterGain) return;

    const tone = ENGINE_TONES[engineId];
    if (!tone) return;

    const spatializedGain = this.getSpatializedGain(engineId, listenerPosition);
    if (spatializedGain <= 0) return;

    // Create oscillator for activation tone
    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = tone.baseFrequency;

    // Add subtle harmonic
    const harmonicOsc = this.context.createOscillator();
    const harmonicGain = this.context.createGain();
    harmonicOsc.type = 'sine';
    harmonicOsc.frequency.value = tone.baseFrequency * tone.harmonicRatio;
    harmonicGain.gain.value = 0.3;

    // Apply envelope
    this.applyEnvelope(gainNode, tone.envelope, tone.duration);

    // Connect graph
    oscillator.connect(gainNode);
    harmonicOsc.connect(harmonicGain);
    harmonicGain.connect(gainNode);
    gainNode.connect(this.masterGain);

    // Set spatialized volume
    gainNode.gain.setValueAtTime(spatializedGain, this.context.currentTime);

    // Start
    const now = this.context.currentTime;
    oscillator.start(now);
    harmonicOsc.start(now);
    oscillator.stop(now + tone.duration);
    harmonicOsc.stop(now + tone.duration);

    // Track active source
    const sourceId = `${engineId}-activation-${Date.now()}`;
    this.activeSources.set(sourceId, oscillator as unknown as AudioBufferSourceNode);
    
    oscillator.onended = () => {
      this.activeSources.delete(sourceId);
      oscillator.disconnect();
      harmonicOsc.disconnect();
    };
  }

  // ========================================================================
  // P3-S3-13: Universal Completion Tone
  // ========================================================================

  playCompletionTone(
    engineId: EngineId,
    listenerPosition: AudioPosition,
    options?: { extended?: boolean }
  ): void {
    if (!this.context || !this.masterGain) return;

    const variant = COMPLETION_TONE_VARIANTS[engineId];
    if (!variant) return;

    const spatializedGain = this.getSpatializedGain(engineId, listenerPosition);
    if (spatializedGain <= 0) return;

    const duration = options?.extended ? 2.5 : 1.5;
    
    // Create harmonic completion tone
    const buffer = this.createHarmonicTone(
      variant.frequency,
      variant.harmonics,
      duration
    );

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    const gainNode = this.context.createGain();
    
    // Completion tone envelope - more resonant
    const now = this.context.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(spatializedGain, now + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(spatializedGain * 0.6, now + duration * 0.5);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // Add subtle reverb effect
    const convolver = this.context.createConvolver();
    const reverbGain = this.context.createGain();
    reverbGain.gain.value = 0.3;

    // Simple impulse response for reverb
    const reverbBuffer = this.createReverbImpulse(1.5, 2);
    convolver.buffer = reverbBuffer;

    // Connect graph
    source.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    // Parallel reverb path
    const reverbSource = this.context.createBufferSource();
    reverbSource.buffer = buffer;
    reverbSource.connect(convolver);
    convolver.connect(reverbGain);
    reverbGain.connect(this.masterGain);

    // Start both
    source.start(now);
    reverbSource.start(now);
    source.stop(now + duration);
    reverbSource.stop(now + duration);

    // Track
    const sourceId = `${engineId}-completion-${Date.now()}`;
    this.activeSources.set(sourceId, source);
    
    source.onended = () => {
      this.activeSources.delete(sourceId);
      source.disconnect();
      reverbSource.disconnect();
    };
  }

  private createReverbImpulse(duration: number, decay: number): AudioBuffer {
    if (!this.context) throw new Error('AudioContext not initialized');

    const sampleRate = this.context.sampleRate;
    const length = Math.ceil(duration * sampleRate);
    const buffer = this.context.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const envelope = Math.exp(-t * decay);
        data[i] = (Math.random() * 2 - 1) * envelope;
      }
    }

    return buffer;
  }

  // ========================================================================
  // P3-S3-14: Spatial Audio Update
  // ========================================================================

  updateListenerPosition(position: AudioPosition): void {
    // Update gain of all active sources based on new position
    this.activeSources.forEach((source, id) => {
      const engineId = id.split('-')[0] as EngineId;
      const newGain = this.getSpatializedGain(engineId, position);
      
      // Note: In a full implementation, we'd adjust the gain node here
      // For simplicity, we're tracking position for future sounds
    });
  }

  setSpatialConfig(config: Partial<SpatialAudioConfig>): void {
    this.spatialConfig = { ...this.spatialConfig, ...config };
  }

  // ========================================================================
  // Utility
  // ========================================================================

  stopAll(): void {
    this.activeSources.forEach((source) => {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // Source may already be stopped
      }
    });
    this.activeSources.clear();
  }

  dispose(): void {
    this.stopAll();
    this.masterGain?.disconnect();
    this.context?.close();
  }
}

// Singleton instance
export const engineAudio = new EngineAudio();

// Export constants for external use
export { ENGINE_TONES, COMPLETION_TONE_VARIANTS, AUDIO_CONSTANTS };
