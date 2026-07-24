/**
 * Shaders module — custom GLSL shaders, material definitions, breathfield effects
 * 
 * P1-S1 Shader Implementation:
 * - Smoothstep edge blur (P1-S1-07)
 * - Bilateral filter (P1-S1-25)
 * - Color grading (P1-S1-10, P1-S1-33)
 * - Breathing effect (P1-S1-11)
 * - Turbulence (P1-S1-24)
 * - Edge transparency (P1-S1-23)
 * 
 * P2-S3 Shader Implementation:
 * - Breathfield flow field (P2-S3-02)
 * - Post-processing PIP uniforms (P2-S3-04)
 * - Biome transition dissolve (P2-S3-05)
 * - Dissolve for INTEGRATED state (P2-S2-22)
 * - Zone transition shaders (P2-S3-11)
 */

// Segmentation shaders
export {
  segmentationBlurVertexShader,
  segmentationBlurFragmentShader,
  bilateralFilterFragmentShader,
  createSegmentationBlurUniforms,
  type SegmentationBlurUniforms,
  type BilateralFilterParams,
  DEFAULT_BILATERAL_PARAMS,
} from './segmentationBlur';

// Vessel color grading
export {
  vesselColorGradingVertexShader,
  vesselColorGradingFragmentShader,
  createVesselColorGradingUniforms,
  ColorSmoothingController,
  BRAND_COLORS,
  type VesselColorGradingUniforms,
} from './vesselColorGrading';

// Breathfield flow field shader (P2-S3-02)
export {
  breathfieldVertexShader,
  breathfieldFragmentShader,
  createBreathfieldUniforms,
  createBreathfieldMaterial,
  updateBreathfieldFromPIP,
  updateBreathfieldTime,
  type BreathfieldUniforms,
} from './breathfield';

// Post-processing PIP uniforms (P2-S3-04)
export {
  chromaticAberrationFragmentShader,
  pipResponsiveFragmentShader,
  createPIPPostProcessingUniforms,
  createPIPPostProcessingController,
  updatePostProcessingFromPIP,
  mapEntropyToChromaticAberration,
  DEFAULT_CHROMATIC_CONFIG,
  type PIPPostProcessingUniforms,
  type ChromaticAberrationConfig,
  type PIPPostProcessingController,
} from './postProcessing';

// Biome transition shaders (P2-S3-05)
export {
  biomeDissolveVertexShader,
  biomeDissolveFragmentShader,
  createBiomeTransitionUniforms,
  createBiomeTransitionMaterial,
  createBiomeTransitionController,
  DEFAULT_BIOME_TRANSITION_CONFIG,
  type BiomeTransitionUniforms,
  type BiomeTransitionConfig,
  type BiomeTransitionState,
  type BiomeTransitionController,
} from './biomeTransition';

// Dissolve shader for INTEGRATED state (P2-S2-22)
export {
  dissolveVertexShader,
  dissolveFragmentShader,
  goldParticleVertexShader,
  goldParticleFragmentShader,
  createDissolveUniforms,
  createDissolveMaterial,
  createGoldParticleMaterial,
  createDissolveController,
  DEFAULT_DISSOLVE_CONFIG,
  type DissolveUniforms,
  type DissolveConfig,
  type DissolveState,
  type DissolveController,
} from './dissolve';

// Zone transition shaders (P2-S3-11)
export {
  hslColorTransitionFragmentShader,
  fogTransitionFragmentShader,
  fullscreenVertexShader,
  createZoneTransitionUniforms,
  createZoneShaderController,
  type ZoneTransitionUniforms,
  type ZoneShaderController,
} from './zoneShaders';

/** RGB color components */
export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

// Color utilities
export function hexToRgb(hex: string): RGBColor | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  
  const r = result[1];
  const g = result[2];
  const b = result[3];
  
  if (r === undefined || g === undefined || b === undefined) return null;
  
  return {
    r: parseInt(r, 16) / 255,
    g: parseInt(g, 16) / 255,
    b: parseInt(b, 16) / 255,
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Lerp between two colors
 */
export function lerpColor(color1: string, color2: string, t: number): string | null {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  
  if (!c1 || !c2) return null;
  
  const r = c1.r + (c2.r - c1.r) * t;
  const g = c1.g + (c2.g - c1.g) * t;
  const b = c1.b + (c2.b - c1.b) * t;
  
  return rgbToHex(r, g, b);
}

/**
 * Lerp between two RGB colors (guaranteed non-null)
 */
export function lerpRGB(c1: RGBColor, c2: RGBColor, t: number): RGBColor {
  return {
    r: c1.r + (c2.r - c1.r) * t,
    g: c1.g + (c2.g - c1.g) * t,
    b: c1.b + (c2.b - c1.b) * t,
  };
}
