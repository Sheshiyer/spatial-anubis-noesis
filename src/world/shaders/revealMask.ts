/**
 * World Reveal Alpha Mask Shader
 * P2-S1-12: Distance-based splat reveal from center
 * 
 * Creates a smooth alpha mask that reveals splats from the center outward,
 * synced to loading progress for a dramatic world materialization effect.
 */

import * as THREE from 'three';
import type { RevealMaskUniforms } from '../types';

/**
 * Vertex shader for reveal mask
 * Passes world position for fragment distance calculation
 */
export const revealMaskVertexShader = `
  varying vec3 vWorldPosition;
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

/**
 * Fragment shader for reveal mask
 * Applies distance-based alpha reveal with smooth edges
 */
export const revealMaskFragmentShader = `
  uniform float uRevealRadius;
  uniform float uMaxRadius;
  uniform vec3 uOrigin;
  uniform float uEdgeSmoothness;
  uniform float uGlobalAlpha;
  
  varying vec3 vWorldPosition;
  varying vec2 vUv;
  
  // Noise function for organic reveal edge
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 4; i++) {
      value += amplitude * noise(p);
      p *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }
  
  void main() {
    // Calculate distance from reveal origin
    float dist = distance(vWorldPosition.xz, uOrigin.xz);
    
    // Create organic edge variation using FBM noise
    vec2 noiseCoord = vWorldPosition.xz * 0.1;
    float edgeNoise = fbm(noiseCoord) * 2.0;
    
    // Adjusted reveal radius with noise
    float adjustedRadius = uRevealRadius + edgeNoise * uEdgeSmoothness;
    
    // Calculate reveal mask
    // Inside the radius = fully visible (1.0)
    // Outside = invisible (0.0)
    // Smooth transition at the edge
    float revealEdge = uEdgeSmoothness * 3.0;
    float mask = 1.0 - smoothstep(
      adjustedRadius - revealEdge,
      adjustedRadius + revealEdge,
      dist
    );
    
    // Apply global alpha (for overall fade control)
    float alpha = mask * uGlobalAlpha;
    
    // Output reveal mask as alpha
    // RGB channels can be used for debug visualization
    gl_FragColor = vec4(vec3(mask), alpha);
  }
`;

/**
 * Splat reveal shader integration
 * This modifies standard splat rendering to include reveal mask
 */
export const splatRevealVertexShader = `
  attribute vec4 color;
  attribute vec3 splatCenter;

  uniform float uRevealRadius;
  uniform vec3 uOrigin;
  uniform float uEdgeSmoothness;
  
  varying vec4 vColor;
  varying float vReveal;
  
  void main() {
    // Transform to world space for reveal calculation
    vec4 worldPosition = modelMatrix * vec4(splatCenter, 1.0);
    
    // Calculate reveal factor based on distance from origin
    float dist = distance(worldPosition.xz, uOrigin.xz);
    float revealEdge = uEdgeSmoothness * 5.0;
    vReveal = 1.0 - smoothstep(
      uRevealRadius - revealEdge,
      uRevealRadius + revealEdge,
      dist
    );
    
    // Standard position transform
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vColor = color;
  }
`;

/**
 * Fragment shader for splats with reveal mask
 */
export const splatRevealFragmentShader = `
  uniform float uGlobalAlpha;
  
  varying vec4 vColor;
  varying float vReveal;
  
  void main() {
    // Apply reveal to alpha
    float alpha = vColor.a * vReveal * uGlobalAlpha;
    
    // Discard fully transparent pixels
    if (alpha < 0.01) discard;
    
    gl_FragColor = vec4(vColor.rgb, alpha);
  }
`;

/**
 * Create default uniform values for reveal mask shader
 */
export function createRevealMaskUniforms(
  overrides?: Partial<RevealMaskUniforms>
): RevealMaskUniforms {
  return {
    uRevealRadius: 0,
    uMaxRadius: 100,
    uOrigin: new THREE.Vector3(0, 0, 0),
    uEdgeSmoothness: 2.0,
    uGlobalAlpha: 1.0,
    ...overrides,
  };
}

/**
 * Create a Three.js ShaderMaterial for reveal mask
 */
export function createRevealMaskMaterial(
  uniforms?: Partial<RevealMaskUniforms>
): THREE.ShaderMaterial {
  const uniformValues = createRevealMaskUniforms(uniforms);
  
  return new THREE.ShaderMaterial({
    vertexShader: revealMaskVertexShader,
    fragmentShader: revealMaskFragmentShader,
    uniforms: {
      uRevealRadius: { value: uniformValues.uRevealRadius },
      uMaxRadius: { value: uniformValues.uMaxRadius },
      uOrigin: { value: uniformValues.uOrigin },
      uEdgeSmoothness: { value: uniformValues.uEdgeSmoothness },
      uGlobalAlpha: { value: uniformValues.uGlobalAlpha },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
}

/**
 * Create splat material with reveal mask
 */
export function createSplatRevealMaterial(
  uniforms?: Partial<RevealMaskUniforms>
): THREE.ShaderMaterial {
  const uniformValues = createRevealMaskUniforms(uniforms);
  
  return new THREE.ShaderMaterial({
    vertexShader: splatRevealVertexShader,
    fragmentShader: splatRevealFragmentShader,
    uniforms: {
      uRevealRadius: { value: uniformValues.uRevealRadius },
      uOrigin: { value: uniformValues.uOrigin },
      uEdgeSmoothness: { value: uniformValues.uEdgeSmoothness },
      uGlobalAlpha: { value: uniformValues.uGlobalAlpha },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
}

/**
 * Update reveal mask progress
 * @param material The shader material to update
 * @param progress Progress value 0-1
 * @param maxRadius Maximum reveal radius
 */
export function updateRevealProgress(
  material: THREE.ShaderMaterial,
  progress: number,
  maxRadius?: number
): void {
  const radius = material.uniforms.uRevealRadius || { value: 0 };
  const maxR = maxRadius || material.uniforms.uMaxRadius?.value || 100;
  
  radius.value = progress * maxR;
  material.uniforms.uRevealRadius = radius;
}

/**
 * Easing functions for smooth reveal animation
 */
export const revealEasing = {
  linear: (t: number): number => t,
  easeInQuad: (t: number): number => t * t,
  easeOutQuad: (t: number): number => 1 - (1 - t) * (1 - t),
  easeInOutQuad: (t: number): number =>
    t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  easeOutCubic: (t: number): number => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t: number): number =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
};

/**
 * Apply easing to reveal progress
 */
export function easeRevealProgress(
  progress: number,
  easingType: keyof typeof revealEasing
): number {
  return revealEasing[easingType](Math.max(0, Math.min(1, progress)));
}
