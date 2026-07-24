/**
 * World Module Hooks
 * P2-S1: Custom React hooks for world loading and rendering
 */

export { useWorldLoader } from './useWorldLoader';
export { useCollisionLoader } from './useCollisionLoader';
export { useWorldLOD, useWorldLODManager } from './useWorldLOD';
export { useRevealController, getRevealPhaseTimings, getActivePhasesAtTime } from './useRevealController';
export { 
  useCartographerTrail, 
  createTrailGeometry,
  trailParticleVertexShader,
  trailParticleFragmentShader,
} from './useCartographerTrail';

// Re-export types
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
} from './types';
