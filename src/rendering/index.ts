/**
 * Rendering module — Three.js/R3F scene setup, SparkJS integration, LOD management
 * 
 * P1-S1 Rendering Implementation:
 * - SparkJS Dynamic Cloud (P1-S1-08)
 * - Pixel-to-3D mapping (P1-S1-09)
 * - Vessel LOD system (P1-S1-44)
 * - Efficient texture upload (P1-S1-43)
 */

// SparkJS Gaussian Splat System
export {
  SparkJSRenderer,
  SplatPool,
  mapPixelToCurved3D,
  generateSplatCloudFromMask,
  DEFAULT_VESSEL_SPLAT_CONFIG,
  type SplatData,
  type SplatConfig,
} from './sparkjs';

// Test cube (P0 legacy)
export { TestCube } from './TestCube';
