/**
 * SparkJS Veil Configuration (P3-S1-14)
 * Semi-transparent splat curtain for Tarot Arcana
 */

export const SPARKJS_VEIL_CONFIG = {
  // Visual properties
  color: '#1A1A2E', // Deep Ink
  baseOpacity: 0.9,
  minDensity: 500,
  maxDensity: 5000,
  turbulence: 0.8,
  
  // Interaction properties
  resistanceMin: 20,   // Grasp stiffness at low coherence
  resistanceMax: 300,  // Grasp stiffness at high coherence
  
  // Animation
  pulseSpeed: 0.5,
  driftSpeed: 0.1,
};

/**
 * Calculate veil properties based on coherence
 */
export function computeVeilResistance(coherence: number): {
  opacity: number;
  graspStiffness: number;
  splatDensity: number;
} {
  const normalizedCoherence = Math.max(0, Math.min(100, coherence)) / 100;
  
  return {
    // Opacity decreases as coherence increases
    opacity: SPARKJS_VEIL_CONFIG.baseOpacity * (1 - normalizedCoherence * 0.8),
    
    // Grasp stiffness increases with coherence
    graspStiffness: 
      SPARKJS_VEIL_CONFIG.resistanceMin + 
      (SPARKJS_VEIL_CONFIG.resistanceMax - SPARKJS_VEIL_CONFIG.resistanceMin) * normalizedCoherence,
    
    // Splat density decreases with coherence (parts on approach)
    splatDensity: Math.floor(
      SPARKJS_VEIL_CONFIG.maxDensity - 
      (SPARKJS_VEIL_CONFIG.maxDensity - SPARKJS_VEIL_CONFIG.minDensity) * normalizedCoherence
    ),
  };
}
