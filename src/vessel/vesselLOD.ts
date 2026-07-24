/**
 * Vessel Level of Detail (LOD) System
 * P1-S1-44: Implement vessel LOD
 * - Full splat cloud under 15u
 * - Reduced under 30u
 * - Point light over 30u
 */

import * as THREE from 'three';
import { VESSEL_LOD_THRESHOLDS } from '../types/vessel';

/** LOD level types */
export type LODLevel = 'full' | 'reduced' | 'point';

/** LOD configuration */
export interface LODConfig {
  fullThreshold: number;
  reducedThreshold: number;
  reducedSplatRatio: number;
  pointIntensity: number;
  pointDistance: number;
  transitionSmoothing: number;
}

/** Default LOD config */
export const DEFAULT_LOD_CONFIG: LODConfig = {
  fullThreshold: VESSEL_LOD_THRESHOLDS.full,
  reducedThreshold: VESSEL_LOD_THRESHOLDS.reduced,
  reducedSplatRatio: 0.5, // 50% of splats when reduced
  pointIntensity: 2.0,
  pointDistance: 10.0,
  transitionSmoothing: 0.1,
};

/** LOD state */
export interface LODState {
  level: LODLevel;
  distance: number;
  splatCount: number;
  visibility: number;
}

/**
 * Calculate LOD level based on distance to camera
 */
export function calculateLODLevel(
  vesselPosition: THREE.Vector3,
  cameraPosition: THREE.Vector3,
  config: LODConfig = DEFAULT_LOD_CONFIG
): LODState {
  const distance = vesselPosition.distanceTo(cameraPosition);

  let level: LODLevel;
  let splatCount: number;

  if (distance < config.fullThreshold) {
    level = 'full';
    splatCount = 7500; // Full splat count
  } else if (distance < config.reducedThreshold) {
    level = 'reduced';
    splatCount = Math.floor(7500 * config.reducedSplatRatio); // 50% splats
  } else {
    level = 'point';
    splatCount = 0; // No splats, just point light
  }

  // Calculate visibility (fade between LODs)
  let visibility = 1.0;
  if (distance < config.fullThreshold + 2) {
    visibility = 1.0 - (distance - config.fullThreshold) / 2;
    visibility = Math.max(0, Math.min(1, visibility));
  }

  return {
    level,
    distance,
    splatCount,
    visibility,
  };
}

/**
 * LOD controller for vessel
 */
export class VesselLODController {
  private config: LODConfig;
  private currentState: LODState;
  private pointLight: THREE.PointLight | null = null;
  private transitionProgress = 1.0;

  constructor(config: Partial<LODConfig> = {}) {
    this.config = { ...DEFAULT_LOD_CONFIG, ...config };
    this.currentState = {
      level: 'full',
      distance: 0,
      splatCount: 7500,
      visibility: 1.0,
    };
  }

  /**
   * Update LOD based on camera distance
   */
  update(
    vesselPosition: THREE.Vector3,
    cameraPosition: THREE.Vector3,
    splatMesh: THREE.Points
  ): LODState {
    const newState = calculateLODLevel(vesselPosition, cameraPosition, this.config);

    // Handle LOD transitions
    if (newState.level !== this.currentState.level) {
      this.transitionProgress = 0.0;
    }

    // Smooth transition
    this.transitionProgress = Math.min(
      this.transitionProgress + this.config.transitionSmoothing,
      1.0
    );

    // Update splat mesh draw range
    if (splatMesh.geometry) {
      splatMesh.geometry.setDrawRange(0, newState.splatCount);
      
      // Adjust visibility
      splatMesh.visible = newState.level !== 'point';
      if (splatMesh.material) {
        (splatMesh.material as THREE.Material).opacity = newState.visibility;
      }
    }

    // Update point light
    this.updatePointLight(vesselPosition, newState);

    this.currentState = newState;
    return newState;
  }

  /**
   * Get or create point light for distant LOD
   */
  getPointLight(): THREE.PointLight {
    if (!this.pointLight) {
      this.pointLight = new THREE.PointLight('#B8860B', 0, this.config.pointDistance);
      this.pointLight.name = 'vessel-lod-point';
    }
    return this.pointLight;
  }

  /**
   * Update point light based on LOD
   */
  private updatePointLight(position: THREE.Vector3, state: LODState): void {
    if (!this.pointLight) return;

    this.pointLight.position.copy(position);

    if (state.level === 'point') {
      // Ramp up intensity when transitioning to point-only
      this.pointLight.intensity = this.config.pointIntensity * this.transitionProgress;
    } else {
      // Fade out point light when close
      this.pointLight.intensity = 0;
    }
  }

  /**
   * Get current LOD state
   */
  getState(): LODState {
    return this.currentState;
  }

  /**
   * Check if vessel is visible at distance
   */
  isVisibleAtDistance(distance: number): boolean {
    return distance < this.config.reducedThreshold + 10; // Some fade distance
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    if (this.pointLight) {
      this.pointLight.dispose();
      this.pointLight = null;
    }
  }
}
