/**
 * Zone Boundary Transitions Hook
 * P2-S3-11: Multi-parameter zone transition system
 * - Gravity: 2s lerp
 * - Fog: 2s ease
 * - Color: 1.5s HSL
 * - Audio: 3s crossfade
 * - Bloom: instant
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import * as THREE from 'three';

/** Zone transition states */
export type ZoneTransitionState = 'idle' | 'transitioning' | 'complete';

/** Zone configuration */
export interface ZoneConfig {
  id: string;
  name: string;
  gravity: number;
  fogDensity: number;
  fogColor: THREE.Color;
  ambientColor: THREE.Color;
  bloomIntensity: number;
  audioTrack: string;
}

/** Transition timing configuration */
export interface TransitionTiming {
  /** Gravity transition duration (seconds) */
  gravity: number;
  /** Fog transition duration (seconds) */
  fog: number;
  /** Color transition duration (seconds) */
  color: number;
  /** Audio crossfade duration (seconds) */
  audio: number;
  /** Bloom is instant */
  bloom: 0;
}

/** Default transition timing */
export const DEFAULT_TRANSITION_TIMING: TransitionTiming = {
  gravity: 2.0,
  fog: 2.0,
  color: 1.5,
  audio: 3.0,
  bloom: 0,
};

/** Zone transition controller */
export class ZoneTransitionController {
  private timing: TransitionTiming;
  private state: ZoneTransitionState = 'idle';
  private currentZone: ZoneConfig | null = null;
  private activeTransition: {
    fromZone: ZoneConfig;
    toZone: ZoneConfig;
    startTime: number;
    progress: number;
  } | null = null;

  // Current interpolated values
  private currentGravity = -9.81;
  private currentFogDensity = 0.01;
  private currentFogColor = new THREE.Color();
  private currentAmbientColor = new THREE.Color();
  private currentBloomIntensity = 0;

  // Callbacks
  private onGravityChange?: (gravity: number) => void;
  private onFogChange?: (density: number, color: THREE.Color) => void;
  private onColorChange?: (ambient: THREE.Color) => void;
  private onAudioChange?: (fromTrack: string, toTrack: string, progress: number) => void;
  private onBloomChange?: (intensity: number) => void;

  constructor(
    timing: Partial<TransitionTiming> = {},
    callbacks: {
      onGravityChange?: (gravity: number) => void;
      onFogChange?: (density: number, color: THREE.Color) => void;
      onColorChange?: (ambient: THREE.Color) => void;
      onAudioChange?: (fromTrack: string, toTrack: string, progress: number) => void;
      onBloomChange?: (intensity: number) => void;
    } = {}
  ) {
    this.timing = { ...DEFAULT_TRANSITION_TIMING, ...timing };
    this.onGravityChange = callbacks.onGravityChange;
    this.onFogChange = callbacks.onFogChange;
    this.onColorChange = callbacks.onColorChange;
    this.onAudioChange = callbacks.onAudioChange;
    this.onBloomChange = callbacks.onBloomChange;
  }

  /** Start zone transition */
  startTransition(fromZone: ZoneConfig, toZone: ZoneConfig): void {
    if (this.state === 'transitioning') {
      console.warn('[ZoneTransition] Transition already in progress');
      return;
    }

    this.state = 'transitioning';
    this.activeTransition = {
      fromZone,
      toZone,
      startTime: Date.now(),
      progress: 0,
    };

    // Apply instant bloom
    this.currentBloomIntensity = toZone.bloomIntensity;
    this.onBloomChange?.(this.currentBloomIntensity);

    console.log(`[ZoneTransition] ${fromZone.name} -> ${toZone.name}`);
  }

  /** Update transition */
  update(deltaTime: number): void {
    if (this.state !== 'transitioning' || !this.activeTransition) {
      return;
    }

    const now = Date.now();
    const elapsed = (now - this.activeTransition.startTime) / 1000;

    // Update gravity (2s lerp)
    const gravityProgress = Math.min(1, elapsed / this.timing.gravity);
    this.currentGravity = this.lerp(
      this.activeTransition.fromZone.gravity,
      this.activeTransition.toZone.gravity,
      this.smoothstep(gravityProgress)
    );
    this.onGravityChange?.(this.currentGravity);

    // Update fog (2s ease)
    const fogProgress = Math.min(1, elapsed / this.timing.fog);
    const fogEase = this.easeInOutCubic(fogProgress);
    this.currentFogDensity = this.lerp(
      this.activeTransition.fromZone.fogDensity,
      this.activeTransition.toZone.fogDensity,
      fogEase
    );
    this.currentFogColor.lerpColors(
      this.activeTransition.fromZone.fogColor,
      this.activeTransition.toZone.fogColor,
      fogEase
    );
    this.onFogChange?.(this.currentFogDensity, this.currentFogColor);

    // Update ambient color (1.5s HSL)
    const colorProgress = Math.min(1, elapsed / this.timing.color);
    this.currentAmbientColor.lerpColors(
      this.activeTransition.fromZone.ambientColor,
      this.activeTransition.toZone.ambientColor,
      this.smoothstep(colorProgress)
    );
    this.onColorChange?.(this.currentAmbientColor);

    // Update audio (3s crossfade)
    const audioProgress = Math.min(1, elapsed / this.timing.audio);
    this.onAudioChange?.(
      this.activeTransition.fromZone.audioTrack,
      this.activeTransition.toZone.audioTrack,
      audioProgress
    );

    // Check completion
    const maxDuration = Math.max(
      this.timing.gravity,
      this.timing.fog,
      this.timing.color,
      this.timing.audio
    );

    this.activeTransition.progress = Math.min(1, elapsed / maxDuration);

    if (elapsed >= maxDuration) {
      this.completeTransition();
    }
  }

  /** Complete current transition */
  private completeTransition(): void {
    if (!this.activeTransition) return;

    this.currentZone = this.activeTransition.toZone;
    this.state = 'complete';

    console.log(`[ZoneTransition] Complete: ${this.currentZone.name}`);

    setTimeout(() => {
      this.state = 'idle';
      this.activeTransition = null;
    }, 0);
  }

  /** Get current transition state */
  getState(): ZoneTransitionState {
    return this.state;
  }

  /** Check if transitioning */
  isTransitioning(): boolean {
    return this.state === 'transitioning';
  }

  /** Get current transition progress (0-1) */
  getProgress(): number {
    return this.activeTransition?.progress ?? 0;
  }

  /** Get current zone */
  getCurrentZone(): ZoneConfig | null {
    return this.currentZone;
  }

  /** Get current interpolated values */
  getCurrentValues() {
    return {
      gravity: this.currentGravity,
      fogDensity: this.currentFogDensity,
      fogColor: this.currentFogColor.clone(),
      ambientColor: this.currentAmbientColor.clone(),
      bloomIntensity: this.currentBloomIntensity,
    };
  }

  /** Set zone instantly (no transition) */
  setZone(zone: ZoneConfig): void {
    this.currentZone = zone;
    this.currentGravity = zone.gravity;
    this.currentFogDensity = zone.fogDensity;
    this.currentFogColor.copy(zone.fogColor);
    this.currentAmbientColor.copy(zone.ambientColor);
    this.currentBloomIntensity = zone.bloomIntensity;

    this.onGravityChange?.(this.currentGravity);
    this.onFogChange?.(this.currentFogDensity, this.currentFogColor);
    this.onColorChange?.(this.currentAmbientColor);
    this.onBloomChange?.(this.currentBloomIntensity);

    this.state = 'idle';
    this.activeTransition = null;
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private smoothstep(t: number): number {
    return t * t * (3 - 2 * t);
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /** Reset controller */
  reset(): void {
    this.state = 'idle';
    this.activeTransition = null;
    this.currentZone = null;
  }
}

/** Create default zone config */
export function createZoneConfig(
  id: string,
  name: string,
  overrides: Partial<ZoneConfig> = {}
): ZoneConfig {
  return {
    id,
    name,
    gravity: -9.81,
    fogDensity: 0.01,
    fogColor: new THREE.Color(0x1a1a2e),
    ambientColor: new THREE.Color(0x404060),
    bloomIntensity: 0.5,
    audioTrack: 'default',
    ...overrides,
  };
}

/** React hook for zone transitions */
export function useZoneTransition(timing: Partial<TransitionTiming> = {}) {
  const controllerRef = useRef(new ZoneTransitionController(timing));
  const [state, setState] = useState<ZoneTransitionState>('idle');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let animationId: number;

    const update = () => {
      controllerRef.current.update(0.016); // Assume 60fps
      setState(controllerRef.current.getState());
      setProgress(controllerRef.current.getProgress());
      animationId = requestAnimationFrame(update);
    };

    animationId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationId);
  }, []);

  const startTransition = useCallback((from: ZoneConfig, to: ZoneConfig) => {
    controllerRef.current.startTransition(from, to);
  }, []);

  const setZone = useCallback((zone: ZoneConfig) => {
    controllerRef.current.setZone(zone);
  }, []);

  return {
    state,
    progress,
    startTransition,
    setZone,
    currentValues: controllerRef.current.getCurrentValues(),
    controller: controllerRef.current,
  };
}
