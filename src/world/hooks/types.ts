/**
 * Hook Type Definitions
 * P2-S1: TypeScript types for world module hooks
 */

import type * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import type { 
  LoadingProgress, 
  LODTier, 
  CollisionMeshData, 
  LoadedCollider,
  RevealPhase,
  RevealState,
  RevealSequenceConfig,
  TrailConfig,
  TrailParticle,
  WorldAssets,
  LODConfig,
} from '../types';

// ============================================================================
// useWorldLoader Types
// ============================================================================

export interface UseWorldLoaderOptions {
  /** Low quality splat count */
  lowQualitySplats?: number;
  /** Medium quality splat count */
  mediumQualitySplats?: number;
  /** High quality splat count */
  highQualitySplats?: number;
  /** Target time for blurry visible (ms) */
  blurryVisibleTarget?: number;
  /** Target time for full quality (ms) */
  fullQualityTarget?: number;
}

export interface UseWorldLoaderReturn {
  /** Current loading progress */
  progress: LoadingProgress;
  /** Whether loading is complete */
  isComplete: boolean;
  /** Error if loading failed */
  error: Error | null;
  /** Start loading a world */
  loadWorld: (assets: WorldAssets) => Promise<void>;
  /** Reset loader state */
  reset: () => void;
  /** Loaded splat data by LOD tier */
  splatData: Record<LODTier, ArrayBuffer | null>;
  /** Currently active LOD tier for rendering */
  activeTier: LODTier;
}

// ============================================================================
// useCollisionLoader Types
// ============================================================================

export interface UseCollisionLoaderOptions {
  /** Rapier world instance */
  rapier: typeof RAPIER | null;
  /** Physics world */
  physicsWorld: RAPIER.World | null;
  /** Enable debug logging */
  debug?: boolean;
}

export interface UseCollisionLoaderReturn {
  /** Whether collision mesh is loaded */
  isLoaded: boolean;
  /** Error if loading failed */
  error: Error | null;
  /** The loaded collider (if any) */
  collider: LoadedCollider | null;
  /** Raw collision mesh data */
  meshData: CollisionMeshData | null;
  /** Load collision mesh from URL */
  loadCollisionMesh: (url: string) => Promise<void>;
  /** Create collider from extracted data */
  createCollider: (data: CollisionMeshData) => Promise<LoadedCollider>;
  /** Remove collider from world */
  removeCollider: () => void;
  /** Reset loader state */
  reset: () => void;
}

// ============================================================================
// useWorldLOD Types
// ============================================================================

export interface UseWorldLODOptions {
  /** LOD configuration */
  lodConfig?: Partial<LODConfig>;
  /** Hysteresis margin (distance units) */
  hysteresisMargin?: number;
  /** Minimum time between LOD switches (ms) */
  minSwitchInterval?: number;
  /** Callback when LOD changes */
  onLODChange?: (tier: LODTier, previousTier: LODTier) => void;
  /** Enable debug logging */
  debug?: boolean;
}

export interface UseWorldLODReturn {
  /** Current LOD tier */
  currentTier: LODTier;
  /** Current quality multiplier (0-1) */
  qualityMultiplier: number;
  /** Maximum splats for current tier */
  maxSplats: number;
  /** Update LOD based on camera distance */
  updateDistance: (distance: number) => void;
  /** Force set LOD tier */
  setTier: (tier: LODTier) => void;
  /** Get LOD info for a distance */
  getLODInfo: (distance: number) => { tier: LODTier; maxSplats: number; quality: number };
  /** Whether LOD is currently switching */
  isTransitioning: boolean;
}

// ============================================================================
// useRevealController Types
// ============================================================================

export interface UseRevealControllerOptions {
  /** Custom sequence configuration */
  config?: Partial<RevealSequenceConfig>;
  /** Callback when phase changes */
  onPhaseChange?: (phase: RevealPhase, progress: number) => void;
  /** Callback when sequence completes */
  onComplete?: () => void;
  /** Enable debug logging */
  debug?: boolean;
}

export interface UseRevealControllerReturn {
  /** Current reveal state */
  state: RevealState;
  /** Whether reveal is active */
  isActive: boolean;
  /** Whether reveal is complete */
  isComplete: boolean;
  /** Start the reveal sequence */
  start: () => void;
  /** Stop/pause the reveal */
  stop: () => void;
  /** Reset to initial state */
  reset: () => void;
  /** Seek to specific time (ms) */
  seek: (timeMs: number) => void;
  /** Get progress for a specific phase (0-1) */
  getPhaseProgress: (phase: RevealPhase) => number;
}

// ============================================================================
// useCartographerTrail Types
// ============================================================================

export interface UseCartographerTrailOptions {
  /** Trail configuration */
  config?: Partial<TrailConfig>;
  /** Target position (Breathfield) */
  targetPosition?: THREE.Vector3;
  /** Source position (current vessel position) */
  sourcePosition?: THREE.Vector3;
  /** Whether trail is active */
  active?: boolean;
  /** Enable debug logging */
  debug?: boolean;
}

export interface UseCartographerTrailReturn {
  /** Current trail particles */
  particles: TrailParticle[];
  /** Whether trail is active */
  isActive: boolean;
  /** Start the trail animation */
  start: (source: THREE.Vector3, target: THREE.Vector3) => void;
  /** Stop the trail */
  stop: () => void;
  /** Update trail (call each frame) */
  update: (deltaTime: number, sourcePosition: THREE.Vector3) => void;
  /** Get spline path points */
  getPathPoints: (divisions?: number) => THREE.Vector3[];
  /** Reset trail */
  reset: () => void;
}
