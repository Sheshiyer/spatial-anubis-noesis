/**
 * Vessel type definitions
 * P1-S1-17: Define vessel state schema
 */

import type { Vector3, Quaternion } from 'three';

/** Vessel unique identifier */
export type VesselId = string;

/** Vessel rendering path type */
export type VesselPath = 'A' | 'B';

/** Bio-signal state for vessel visual feedback */
export interface VesselBioState {
  /** Coherence 0.0-1.0, drives color grading (Deep Ink to Aged Gold) */
  coherence: number;
  /** LQD (Linear Quantum Drive) 0.0-1.0, drives breathing effect */
  lqd: number;
  /** Entropy 0.0-1.0, drives turbulence/noise */
  entropy: number;
  /** Breath phase 0.0-1.0 (inhale/exhale cycle) */
  breathPhase: number;
  /** Last update timestamp */
  lastUpdate: number;
}

/** Vessel visual configuration */
export interface VesselVisualConfig {
  /** Base color in Deep Ink state */
  baseColor: string;
  /** Peak color at full coherence */
  peakColor: string;
  /** Splat scale multiplier */
  baseSplatScale: number;
  /** Breathing expansion percentage (0.05-0.15) */
  breathingIntensity: number;
  /** Edge transparency falloff in pixels */
  edgeBlurPixels: number;
  /** Turbulence displacement at entropy 1.0 (pixels) */
  maxTurbulence: number;
  /** Light emission intensity at LQD 1.0 */
  maxLightIntensity: number;
  /** Segmentation mask quality preset */
  maskQuality: 'fast' | 'balanced' | 'quality';
}

/** Vessel transform state */
export interface VesselTransform {
  position: Vector3;
  rotation: Quaternion;
  velocity: Vector3;
  angularVelocity: Vector3;
}

/** Physics configuration for vessel */
export interface VesselPhysicsConfig {
  mass: number;
  maxVelocity: number;
  accelerationTime: number;
  linearDampingBase: number;
  linearDampingSluggish: number;
  rotationDamping: number;
  lockedAxes: {
    x: boolean;
    y: boolean;
    z: boolean;
  };
}

/** Complete vessel state */
export interface VesselState {
  vesselId: VesselId;
  path: VesselPath;
  transform: VesselTransform;
  bioState: VesselBioState;
  visualConfig: VesselVisualConfig;
  physicsConfig: VesselPhysicsConfig;
  isCalibrated: boolean;
  isSpawned: boolean;
  spawnTime: number;
}

/** Vessel rendering mode for toggle */
export type VesselRenderingMode = 'splat' | 'geometric';

/** Vessel LOD level based on distance */
export type VesselLODLevel = 'full' | 'reduced' | 'point';

/** Segmentation mask data */
export interface SegmentationMask {
  width: number;
  height: number;
  data: Uint8Array | Uint8ClampedArray;
  timestamp: number;
}

/** Webcam frame data */
export interface WebcamFrame {
  video: HTMLVideoElement;
  width: number;
  height: number;
  timestamp: number;
}

/** Vessel navigation input */
export interface VesselNavigationInput {
  /** Forward/backward tilt (-1 to 1) */
  tiltX: number;
  /** Left/right tilt (-1 to 1) */
  tiltY: number;
  /** Deadzone applied */
  isActive: boolean;
}

/** Vessel collision state */
export interface VesselCollision {
  isColliding: boolean;
  collisionPoint: Vector3 | null;
  collisionNormal: Vector3 | null;
  otherBodyId: string | null;
}

/** Raycast result for vessel interaction */
export interface VesselRaycastResult {
  hit: boolean;
  distance: number;
  point: Vector3 | null;
  objectId: string | null;
}

/** Vessel proximity event */
export interface VesselProximityEvent {
  type: 'approach' | 'near' | 'leave';
  objectId: string;
  distance: number;
  timestamp: number;
}

/** Persisted vessel configuration */
export interface PersistedVesselConfig {
  vesselId: VesselId;
  path: VesselPath;
  visualConfig: VesselVisualConfig;
  isCalibrated: boolean;
  lastUpdated: number;
}

/** Default vessel visual config */
export const DEFAULT_VISUAL_CONFIG: VesselVisualConfig = {
  baseColor: '#1A1A2E',
  peakColor: '#B8860B',
  baseSplatScale: 1.0,
  breathingIntensity: 0.1,
  edgeBlurPixels: 6,
  maxTurbulence: 5,
  maxLightIntensity: 2.0,
  maskQuality: 'balanced',
};

/** Default physics config */
export const DEFAULT_PHYSICS_CONFIG: VesselPhysicsConfig = {
  mass: 1.0,
  maxVelocity: 8.0,
  accelerationTime: 0.5,
  linearDampingBase: 0.5,
  linearDampingSluggish: 5.0,
  rotationDamping: 2.0,
  lockedAxes: {
    x: true,
    y: false,
    z: true,
  },
};

/** Default bio state */
export const DEFAULT_BIO_STATE: VesselBioState = {
  coherence: 0.0,
  lqd: 0.0,
  entropy: 0.0,
  breathPhase: 0.0,
  lastUpdate: 0,
};

/** Vessel spawn configuration */
export const VESSEL_SPAWN_CONFIG = {
  position: { x: 0, y: 1.7, z: 0 },
  facing: { x: 0, y: 0, z: -50 },
  spawnDelay: 200,
};

/** LOD distance thresholds */
export const VESSEL_LOD_THRESHOLDS = {
  full: 15,
  reduced: 30,
};

/** Vessel raycast configuration */
export const VESSEL_RAYCAST_CONFIG = {
  range: 10,
  maxResults: 5,
};
