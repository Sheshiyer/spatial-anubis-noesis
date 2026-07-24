/**
 * Tier 1 Ancient Instruments - Shared Infrastructure
 * P3-S1-27 to 33
 */

// Types
export * from './types';

// State Management
export { useTier1EngineStore } from './engineStore';
export type { Tier1EngineStore } from './engineStore';

// 3D Text System
export { Text3D, FloatingText, useTypewriter } from './Text3D';

// Filament Connections
export { FilamentConnections, ParticleBurst, LoadingGlow } from './FilamentConnections';

// Spatial Configuration
export {
  EAST_WING_CENTER,
  TIER_1_RADIUS,
  TIER_1_Y_OFFSET,
  TIER_1_ANGLES,
  ENGINE_POSITIONS,
  getAbsolutePosition,
} from './types';
