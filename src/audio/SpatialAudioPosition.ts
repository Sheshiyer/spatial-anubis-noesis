/**
 * SpatialAudioPosition — Web Audio spatial positioning
 * P4-S2-04: Spatial audio for engines
 *
 * 3D audio positioning using Web Audio PannerNode:
 * - Each engine has a positioned audio source
 * - Position matches 3D world coordinates
 * - Inverse distance rolloff model
 * - Integration with R3F useFrame for real-time updates
 *
 * Audio model:
 * - maxDistance: 50 units (full falloff)
 * - refDistance: 5 units (where volume starts decreasing)
 * - rolloffFactor: 1 (natural inverse distance)
 */

import * as THREE from 'three';
import { audioEngine } from './AudioEngine';

// ============================================================================
// Spatial Audio Types
// ============================================================================

export interface SpatialAudioSource {
  id: string;
  position: THREE.Vector3;
  panner: PannerNode;
  gain: GainNode;
  oscillator?: OscillatorNode;
  playing: boolean;
}

export interface SpatialAudioConfig {
  maxDistance: number;
  refDistance: number;
  rolloffFactor: number;
  coneInnerAngle: number;
  coneOuterAngle: number;
  coneOuterGain: number;
}

export const DEFAULT_SPATIAL_CONFIG: SpatialAudioConfig = {
  maxDistance: 50,
  refDistance: 5,
  rolloffFactor: 1,
  coneInnerAngle: 360,
  coneOuterAngle: 360,
  coneOuterGain: 0,
};

// ============================================================================
// SpatialAudioManager
// ============================================================================

export class SpatialAudioManager {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private listener: AudioListener | null = null;

  // Audio sources by ID (e.g., engine IDs)
  private sources = new Map<string, SpatialAudioSource>();

  private config: SpatialAudioConfig;

  constructor(config: Partial<SpatialAudioConfig> = {}) {
    this.config = { ...DEFAULT_SPATIAL_CONFIG, ...config };
  }

  /**
   * Initialize spatial audio system
   * Should be called after AudioEngine initialization
   */
  async initialize(context?: AudioContext): Promise<boolean> {
    if (!context) {
      // Try to get context from AudioEngine
      if (!audioEngine.isAudioInitialized()) {
        console.warn('[SpatialAudio] AudioEngine not initialized');
        return false;
      }

      // Access the private context via type assertion
      this.audioContext = (audioEngine as any).context as AudioContext;
    } else {
      this.audioContext = context;
    }

    if (!this.audioContext) {
      console.error('[SpatialAudio] No AudioContext available');
      return false;
    }

    // Create master gain for spatial audio
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.3; // Reduce spatial audio volume
    this.masterGain.connect(this.audioContext.destination);

    console.log('[SpatialAudio] Initialized');
    return true;
  }

  /**
   * Create a spatial audio source
   */
  createSource(id: string, position: THREE.Vector3, frequency: number = 220): SpatialAudioSource | null {
    if (!this.audioContext || !this.masterGain) {
      console.warn('[SpatialAudio] Not initialized');
      return null;
    }

    // Check if source already exists
    if (this.sources.has(id)) {
      console.warn('[SpatialAudio] Source already exists:', id);
      return this.sources.get(id)!;
    }

    // Create PannerNode for 3D positioning
    const panner = this.audioContext.createPanner();
    panner.panningModel = 'HRTF'; // Head-related transfer function for realistic 3D
    panner.distanceModel = 'inverse';
    panner.refDistance = this.config.refDistance;
    panner.maxDistance = this.config.maxDistance;
    panner.rolloffFactor = this.config.rolloffFactor;
    panner.coneInnerAngle = this.config.coneInnerAngle;
    panner.coneOuterAngle = this.config.coneOuterAngle;
    panner.coneOuterGain = this.config.coneOuterGain;

    // Set initial position
    panner.positionX.value = position.x;
    panner.positionY.value = position.y;
    panner.positionZ.value = position.z;

    // Create gain node for individual source volume control
    const gain = this.audioContext.createGain();
    gain.gain.value = 0.5;

    // Connect: source -> gain -> panner -> master
    gain.connect(panner);
    panner.connect(this.masterGain);

    const source: SpatialAudioSource = {
      id,
      position: position.clone(),
      panner,
      gain,
      playing: false,
    };

    this.sources.set(id, source);
    console.log('[SpatialAudio] Created source:', id);

    return source;
  }

  /**
   * Play a tone at the spatial source position
   */
  playTone(id: string, frequency: number = 220, duration?: number): boolean {
    const source = this.sources.get(id);
    if (!source || !this.audioContext) {
      console.warn('[SpatialAudio] Source not found:', id);
      return false;
    }

    // Stop existing oscillator if any
    if (source.oscillator) {
      source.oscillator.stop();
      source.oscillator.disconnect();
    }

    // Create oscillator
    const oscillator = this.audioContext.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;

    // Connect to source gain
    oscillator.connect(source.gain);

    // Start oscillator
    const now = this.audioContext.currentTime;
    oscillator.start(now);

    if (duration) {
      // Fade out and stop
      source.gain.gain.setValueAtTime(0.5, now);
      source.gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      oscillator.stop(now + duration);
    }

    source.oscillator = oscillator;
    source.playing = true;

    return true;
  }

  /**
   * Stop playing the source
   */
  stopTone(id: string, fadeOut: number = 0.1): boolean {
    const source = this.sources.get(id);
    if (!source || !source.oscillator || !this.audioContext) {
      return false;
    }

    const now = this.audioContext.currentTime;

    // Fade out
    source.gain.gain.setValueAtTime(source.gain.gain.value, now);
    source.gain.gain.exponentialRampToValueAtTime(0.001, now + fadeOut);

    // Stop oscillator
    source.oscillator.stop(now + fadeOut);
    source.playing = false;

    return true;
  }

  /**
   * Update source position (call from useFrame)
   */
  updateSourcePosition(id: string, position: THREE.Vector3): boolean {
    const source = this.sources.get(id);
    if (!source) {
      return false;
    }

    // Update position
    source.position.copy(position);

    // Update panner position
    source.panner.positionX.value = position.x;
    source.panner.positionY.value = position.y;
    source.panner.positionZ.value = position.z;

    return true;
  }

  /**
   * Update listener position (camera)
   */
  updateListenerPosition(camera: THREE.Camera): void {
    if (!this.audioContext) return;

    const listener = this.audioContext.listener;

    // Get camera world position and orientation
    camera.updateMatrixWorld();

    const position = new THREE.Vector3();
    const forward = new THREE.Vector3();
    const up = new THREE.Vector3();

    camera.getWorldPosition(position);
    camera.getWorldDirection(forward);
    up.copy(camera.up);

    // Update listener position
    if (listener.positionX) {
      listener.positionX.value = position.x;
      listener.positionY.value = position.y;
      listener.positionZ.value = position.z;
    } else {
      // Fallback for older browsers
      (listener as any).setPosition(position.x, position.y, position.z);
    }

    // Update listener orientation
    if (listener.forwardX) {
      listener.forwardX.value = forward.x;
      listener.forwardY.value = forward.y;
      listener.forwardZ.value = forward.z;
      listener.upX.value = up.x;
      listener.upY.value = up.y;
      listener.upZ.value = up.z;
    } else {
      // Fallback for older browsers
      (listener as any).setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z);
    }
  }

  /**
   * Set source gain
   */
  setSourceGain(id: string, gain: number): boolean {
    const source = this.sources.get(id);
    if (!source || !this.audioContext) {
      return false;
    }

    const now = this.audioContext.currentTime;
    source.gain.gain.setTargetAtTime(gain, now, 0.1);

    return true;
  }

  /**
   * Set master gain for all spatial audio
   */
  setMasterGain(gain: number): void {
    if (!this.masterGain || !this.audioContext) return;

    const now = this.audioContext.currentTime;
    this.masterGain.gain.setTargetAtTime(gain, now, 0.1);
  }

  /**
   * Get source by ID
   */
  getSource(id: string): SpatialAudioSource | undefined {
    return this.sources.get(id);
  }

  /**
   * Check if source exists
   */
  hasSource(id: string): boolean {
    return this.sources.has(id);
  }

  /**
   * Get all source IDs
   */
  getSourceIds(): string[] {
    return Array.from(this.sources.keys());
  }

  /**
   * Remove a source
   */
  removeSource(id: string): boolean {
    const source = this.sources.get(id);
    if (!source) {
      return false;
    }

    // Stop and disconnect
    if (source.oscillator) {
      source.oscillator.stop();
      source.oscillator.disconnect();
    }

    source.gain.disconnect();
    source.panner.disconnect();

    this.sources.delete(id);
    console.log('[SpatialAudio] Removed source:', id);

    return true;
  }

  /**
   * Get distance from listener to source
   */
  getDistanceToListener(id: string, camera: THREE.Camera): number | null {
    const source = this.sources.get(id);
    if (!source) {
      return null;
    }

    camera.updateMatrixWorld();
    const listenerPos = new THREE.Vector3();
    camera.getWorldPosition(listenerPos);

    return source.position.distanceTo(listenerPos);
  }

  /**
   * Clear all sources
   */
  clearAllSources(): void {
    for (const id of this.sources.keys()) {
      this.removeSource(id);
    }
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    this.clearAllSources();

    if (this.masterGain) {
      this.masterGain.disconnect();
      this.masterGain = null;
    }

    this.audioContext = null;
    this.listener = null;
  }
}

// Export singleton instance
export const spatialAudio = new SpatialAudioManager();
