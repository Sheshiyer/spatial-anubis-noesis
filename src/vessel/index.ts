/**
 * Vessel module — user representation, MediaPipe body tracking, head-tilt navigation
 * 
 * P1-S1 Implementation:
 * - Smoothstep edge blur shader (P1-S1-07)
 * - SparkJS Dynamic Cloud (P1-S1-08)
 * - Pixel-to-3D mapping (P1-S1-09)
 * - Color grading system (P1-S1-10)
 * - Breathing expansion effect (P1-S1-11)
 * - Path B geometric fallback (P1-S1-20)
 * - Mouse/keyboard controls (P1-S1-21)
 * - Physics sync (P1-S1-22)
 * - Splat transparency (P1-S1-23)
 * - Turbulence parameter (P1-S1-24)
 * - Bilateral filter (P1-S1-25)
 * - Spawn position (P1-S1-26)
 * - Speed curve (P1-S1-27)
 * - Rotation damping (P1-S1-28)
 * - Physics body config (P1-S1-30)
 * - Color transition smoothing (P1-S1-33)
 * - Zustand slice (P1-S1-36)
 * - Rendering toggle (P1-S1-37)
 * - Bounding box (P1-S1-40)
 * - Texture upload (P1-S1-43)
 * - LOD system (P1-S1-44)
 * - Raycast system (P1-S1-46)
 * - Light emission (P1-S1-47)
 * - Rendering test (P1-S1-49)
 * - State persistence (P1-S1-50)
 */

// Main vessel components
export { VesselRenderer, useVesselRendering } from './VesselRenderer';
export { SplatVessel } from './SplatVessel';
export { GeometricVessel } from './GeometricVessel';

// Main vessel hook
export {
  useVessel,
  useVesselPhysics,
  useVesselRenderingState,
  type UseVesselOptions,
} from './useVessel';

// Physics
export {
  VesselPhysicsController,
  getVesselPhysicsController,
  resetVesselPhysics,
  type VesselPhysicsBodyConfig,
  DEFAULT_VESSEL_PHYSICS_CONFIG,
} from './vesselPhysics';

// Controls
export {
  useVesselKeyboardControls,
  useVesselMouseControls,
  useVesselZoomControls,
  usePathBControls,
} from './vesselControls';

// LOD
export {
  VesselLODController,
  calculateLODLevel,
  type LODLevel,
  type LODConfig,
  type LODState,
  DEFAULT_LOD_CONFIG,
} from './vesselLOD';

// Segmentation
export {
  SegmentationTextureManager,
  applyBilateralFilter,
  measureMaskNoise,
  type SegmentationTextureConfig,
  DEFAULT_SEGMENTATION_TEXTURE_CONFIG,
} from './segmentationTexture';

// Testing
export {
  VesselTestController,
  VesselTestResults,
  useVesselTest,
  type VesselTestResult,
  type VesselTestConfig,
  DEFAULT_TEST_CONFIG,
} from './VesselTest';

// Re-export types
export type { VesselRendererProps } from './VesselRenderer';
export type { SplatVesselProps } from './SplatVessel';
export type { GeometricVesselProps } from './GeometricVessel';
