/**
 * World Module
 * P2-S1: Frontend World Loading & Rendering
 * 
 * This module provides progressive world loading, LOD management,
 * shader effects, and physics integration for Spatial Anubis.
 * 
 * @module world
 */

// ============================================================================
// Types
// ============================================================================

export type {
  // World Assets
  WorldAssets,
  WorldMetadata,
  DashaPlanet,
  BiomeConfig,
  WorldBounds,
  CardinalZones,
  ZoneConfig,
  
  // Loading State
  LoadingPhase,
  RevealPhase,
  LoadingProgress,
  LODTier,
  LODConfig,
  
  // Reveal Sequence
  RevealSequenceConfig,
  EasingType,
  RevealState,
  
  // Shader Uniforms
  GroundRippleUniforms,
  RevealMaskUniforms,
  CardinalGlowUniforms,
  
  // Collision & Trail
  CollisionMeshData,
  LoadedCollider,
  TrailConfig,
  TrailParticle,
} from './types';

// ============================================================================
// Shaders
// ============================================================================

export {
  // Ground ripple
  groundRippleVertexShader,
  groundRippleFragmentShader,
  createGroundRippleUniforms,
  createGroundRippleMaterial,
  updateRippleUniforms,
  
  // Reveal mask
  revealMaskVertexShader,
  revealMaskFragmentShader,
  splatRevealVertexShader,
  splatRevealFragmentShader,
  createRevealMaskUniforms,
  createRevealMaskMaterial,
  createSplatRevealMaterial,
  updateRevealProgress,
  revealEasing,
  easeRevealProgress,
  
  // Cardinal glow
  cardinalGlowVertexShader,
  cardinalGlowFragmentShader,
  simpleGlowVertexShader,
  simpleGlowFragmentShader,
  createCardinalGlowUniforms,
  createCardinalGlowMaterial,
  createCardinalGlowEffectUniforms,
  updateGlowIntensity,
  updateGlowPosition,
  animateGlowIntensities,
} from './shaders';

// ============================================================================
// Hooks
// ============================================================================

export {
  useWorldLoader,
  useCollisionLoader,
  useWorldLOD,
  useWorldLODManager,
  useRevealController,
  getRevealPhaseTimings,
  getActivePhasesAtTime,
  useCartographerTrail,
  createTrailGeometry,
  trailParticleVertexShader,
  trailParticleFragmentShader,
} from './hooks';

export type {
  UseWorldLoaderOptions,
  UseWorldLoaderReturn,
  UseCollisionLoaderOptions,
  UseCollisionLoaderReturn,
  UseWorldLODOptions,
  UseWorldLODReturn,
  UseRevealControllerOptions,
  UseRevealControllerReturn,
  UseCartographerTrailOptions,
  UseCartographerTrailReturn,
} from './hooks/types';

// ============================================================================
// Components
// ============================================================================

export {
  ProgressiveWorldLoader,
  GroundRippleMesh,
  GroundRippleEffect,
  CardinalGlows,
  CartographerTrail,
  WorldRenderer,
  PresetWorldRenderer,
} from './components';

export type {
  ProgressiveWorldLoaderProps,
  GroundRippleMeshProps,
  CardinalGlowsProps,
  CartographerTrailProps,
  WorldRendererProps,
} from './components';

// ============================================================================
// Constants
// ============================================================================

/** Default world bounds radius */
export const DEFAULT_WORLD_RADIUS = 50;

/** Default reveal sequence timing (ms) */
export const DEFAULT_REVEAL_TIMING = {
  ripple: { start: 0, end: 1000 },
  materialize: { start: 500, end: 3000 },
  glows: { start: 2000, end: 3500 },
  trail: { start: 3000, end: 5000 },
} as const;

/** Default LOD configuration */
export const DEFAULT_LOD_CONFIG = {
  maxSplats: {
    low: 50000,
    medium: 175000,
    high: 500000,
  },
  distanceThresholds: {
    low: 80,
    medium: 40,
    high: 0,
  },
  qualityMultiplier: {
    low: 0.4,
    medium: 0.7,
    high: 1.0,
  },
} as const;

/** Brand colors for cardinal directions */
export const CARDINAL_COLORS = {
  north: '#B8860B', // Aged Gold
  east: '#C65D3B',  // Terracotta
  south: '#F5F0E8', // Bone
  west: '#6B6B6B',  // Stone Grey
} as const;

/** All 9 Dasha planets */
export const DASHA_PLANETS = [
  'Sun',
  'Moon',
  'Mars',
  'Mercury',
  'Jupiter',
  'Venus',
  'Saturn',
  'Rahu',
  'Ketu',
] as const;
