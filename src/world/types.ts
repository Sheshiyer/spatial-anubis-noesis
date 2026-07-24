/**
 * World module type definitions
 * P2-S1: World Loading & Rendering Types
 */

import type * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';

// ============================================================================
// World Asset Types
// ============================================================================

export interface WorldAssets {
  /** URL to the Gaussian splat file (.splat or .ply) */
  splatUrl: string;
  /** URL to the collision mesh GLB */
  collisionMeshUrl: string;
  /** World metadata */
  metadata: WorldMetadata;
}

export interface WorldMetadata {
  /** World ID */
  id: string;
  /** Dasha planet this world represents */
  dashaPlanet: DashaPlanet;
  /** Biome configuration */
  biome: BiomeConfig;
  /** Bounds of the world */
  bounds: WorldBounds;
  /** Cardinal zone configurations */
  zones: CardinalZones;
}

export type DashaPlanet = 
  | 'Sun' 
  | 'Moon' 
  | 'Mars' 
  | 'Mercury' 
  | 'Jupiter' 
  | 'Venus' 
  | 'Saturn' 
  | 'Rahu' 
  | 'Ketu';

export interface BiomeConfig {
  /** Material keywords for this biome */
  materialKeywords: string[];
  /** Lighting preset name */
  lightingPreset: string;
  /** Fog density (0-1) */
  fogDensity: number;
  /** Fog color hex */
  fogColor: string;
  /** Ambient light color hex */
  ambientColor: string;
}

export interface WorldBounds {
  min: THREE.Vector3;
  max: THREE.Vector3;
  center: THREE.Vector3;
  radius: number;
}

export interface CardinalZones {
  north: ZoneConfig;
  east: ZoneConfig;
  south: ZoneConfig;
  west: ZoneConfig;
}

export interface ZoneConfig {
  /** Position in world space */
  position: THREE.Vector3;
  /** Glow color */
  glowColor: string;
  /** Glow intensity */
  intensity: number;
  /** Glow radius */
  radius: number;
}

// ============================================================================
// Loading State Types
// ============================================================================

export type LoadingPhase = 
  | 'idle'
  | 'downloading'
  | 'parsing'
  | 'ready';

export type RevealPhase = 
  | 'none'
  | 'ripple'
  | 'materialize'
  | 'glows'
  | 'trail'
  | 'complete';

export interface LoadingProgress {
  /** Current phase */
  phase: LoadingPhase;
  /** Overall progress 0-1 */
  overall: number;
  /** Download progress 0-1 */
  download: number;
  /** LOD tier currently loaded */
  lodTier: LODTier;
  /** Time elapsed since start */
  elapsedMs: number;
}

export type LODTier = 'low' | 'medium' | 'high';

export interface LODConfig {
  /** Max splats for each tier */
  maxSplats: Record<LODTier, number>;
  /** Distance thresholds for tier switching */
  distanceThresholds: Record<LODTier, number>;
  /** Quality multiplier (affects rendering detail) */
  qualityMultiplier: Record<LODTier, number>;
}

// ============================================================================
// Reveal Sequence Types
// ============================================================================

export interface RevealSequenceConfig {
  /** Total duration in ms */
  totalDuration: number;
  /** Phase timings in ms */
  phases: {
    ripple: { start: number; end: number };
    materialize: { start: number; end: number };
    glows: { start: number; end: number };
    trail: { start: number; end: number };
  };
  /** Easing functions per phase */
  easing: {
    ripple: EasingType;
    materialize: EasingType;
    glows: EasingType;
    trail: EasingType;
  };
}

export type EasingType = 
  | 'linear'
  | 'easeInQuad'
  | 'easeOutQuad'
  | 'easeInOutQuad'
  | 'easeOutCubic'
  | 'easeInOutCubic';

export interface RevealState {
  /** Current phase */
  phase: RevealPhase;
  /** Progress within current phase 0-1 */
  phaseProgress: number;
  /** Overall reveal progress 0-1 */
  overallProgress: number;
  /** Whether reveal is active */
  isActive: boolean;
}

// ============================================================================
// Shader Uniform Types
// ============================================================================

export interface GroundRippleUniforms {
  /** Time in seconds */
  uTime: number;
  /** Ripple origin position */
  uOrigin: THREE.Vector3;
  /** Ripple expansion speed */
  uSpeed: number;
  /** Ripple amplitude */
  uAmplitude: number;
  /** Ripple frequency */
  uFrequency: number;
  /** Ripple decay */
  uDecay: number;
}

export interface RevealMaskUniforms {
  /** Current reveal radius */
  uRevealRadius: number;
  /** Maximum reveal radius */
  uMaxRadius: number;
  /** Reveal origin */
  uOrigin: THREE.Vector3;
  /** Smoothness of the reveal edge */
  uEdgeSmoothness: number;
  /** Overall alpha multiplier */
  uGlobalAlpha: number;
}

export interface CardinalGlowUniforms {
  /** North glow position and color (xyz, w=intensity) */
  uNorthGlow: THREE.Vector4;
  /** East glow position and color */
  uEastGlow: THREE.Vector4;
  /** South glow position and color */
  uSouthGlow: THREE.Vector4;
  /** West glow position and color */
  uWestGlow: THREE.Vector4;
  /** Camera position */
  uCameraPosition: THREE.Vector3;
  /** Glow falloff power */
  uFalloff: number;
}

// ============================================================================
// Collision Mesh Types
// ============================================================================

export interface CollisionMeshData {
  /** Vertices as flat array [x,y,z, x,y,z, ...] */
  vertices: Float32Array;
  /** Indices as flat array [i0,i1,i2, i3,i4,i5, ...] */
  indices: Uint32Array;
  /** Triangle count */
  triangleCount: number;
  /** World bounds */
  bounds: WorldBounds;
}

export interface LoadedCollider {
  /** The Rapier collider handle */
  handle: RAPIER.Collider;
  /** Associated rigid body (if any) */
  body?: RAPIER.RigidBody;
}

// ============================================================================
// Trail System Types
// ============================================================================

export interface TrailConfig {
  /** Trail duration in seconds */
  duration: number;
  /** Number of particles */
  particleCount: number;
  /** Particle size */
  particleSize: number;
  /** Start color */
  startColor: THREE.Color;
  /** End color */
  endColor: THREE.Color;
  /** Spline control points */
  controlPoints: THREE.Vector3[];
}

export interface TrailParticle {
  /** Current position */
  position: THREE.Vector3;
  /** Life remaining 0-1 */
  life: number;
  /** Current size */
  size: number;
  /** Current color */
  color: THREE.Color;
  /** Velocity */
  velocity: THREE.Vector3;
}

// ============================================================================
// World State Store Types
// ============================================================================

export interface WorldState {
  /** Current world assets */
  currentWorld: WorldAssets | null;
  /** Loading progress */
  loadingProgress: LoadingProgress;
  /** Reveal state */
  revealState: RevealState;
  /** Whether collision mesh is loaded */
  collisionReady: boolean;
  /** Current LOD tier */
  currentLOD: LODTier;
  /** Camera distance to world center */
  cameraDistance: number;
}

export interface WorldActions {
  /** Start loading a world */
  loadWorld: (assets: WorldAssets) => Promise<void>;
  /** Start the reveal sequence */
  startReveal: () => void;
  /** Update LOD based on camera distance */
  updateLOD: (distance: number) => void;
  /** Set collision ready state */
  setCollisionReady: (ready: boolean) => void;
  /** Reset world state */
  reset: () => void;
}
