/**
 * World Shaders Module
 * P2-S1: GLSL Shaders for World Loading & Rendering
 * 
 * Exports all shader-related utilities for world visualization:
 * - Ground ripple vertex displacement
 * - Reveal mask alpha blending
 * - Cardinal direction glow effects
 */

// Ground ripple shader
export {
  groundRippleVertexShader,
  groundRippleFragmentShader,
  createGroundRippleUniforms,
  createGroundRippleMaterial,
  updateRippleUniforms,
} from './groundRipple';

// Reveal mask shader
export {
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
} from './revealMask';

// Cardinal glow shader
export {
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
} from './cardinalGlow';

// Re-export types
export type {
  GroundRippleUniforms,
  RevealMaskUniforms,
  CardinalGlowUniforms,
} from '../types';
