/**
 * Cardinal Direction Glow Effects
 * P2-S1-13: N/E/S/W atmospheric lights with shader post-processing
 * 
 * Creates four directional glow effects at cardinal positions,
 * with configurable color and intensity per zone.
 */

import * as THREE from 'three';
import type { CardinalGlowUniforms, CardinalZones } from '../types';

/**
 * Vertex shader for cardinal glow post-processing
 * Full-screen quad with world-space ray calculation
 */
export const cardinalGlowVertexShader = `
  varying vec2 vUv;
  varying vec3 vViewPosition;
  varying vec3 vWorldDirection;
  
  void main() {
    vUv = uv;
    
    // Calculate view position and world direction for ray marching
    vec4 viewPosition = inverse(projectionMatrix) * vec4(position.xy, 1.0, 1.0);
    vViewPosition = viewPosition.xyz / viewPosition.w;
    
    vec4 worldPosition = inverse(viewMatrix) * vec4(vViewPosition, 1.0);
    vWorldDirection = normalize(worldPosition.xyz - cameraPosition);
    
    gl_Position = vec4(position.xy, 1.0, 1.0);
  }
`;

/**
 * Fragment shader for cardinal glow
 * Volumetric glow effect originating from cardinal direction points
 */
export const cardinalGlowFragmentShader = `
  uniform vec4 uNorthGlow;  // xyz = position, w = intensity
  uniform vec4 uEastGlow;
  uniform vec4 uSouthGlow;
  uniform vec4 uWestGlow;
  uniform vec3 uCameraPosition;
  uniform float uFalloff;
  uniform vec2 uResolution;
  uniform sampler2D uSceneTexture;
  uniform sampler2D uDepthTexture;
  uniform mat4 uInverseViewMatrix;
  uniform mat4 uInverseProjectionMatrix;
  
  varying vec2 vUv;
  varying vec3 vWorldDirection;
  
  // Brand colors for each direction (can be overridden via uniforms)
  const vec3 NORTH_COLOR = vec3(0.722, 0.525, 0.043);   // Aged Gold #B8860B
  const vec3 EAST_COLOR = vec3(0.776, 0.365, 0.231);    // Terracotta #C65D3B
  const vec3 SOUTH_COLOR = vec3(0.961, 0.941, 0.910);   // Bone #F5F0E8
  const vec3 WEST_COLOR = vec3(0.420, 0.420, 0.420);    // Stone Grey #6B6B6B
  
  // Depth reconstruction
  float getDepth(vec2 uv) {
    return texture2D(uDepthTexture, uv).r;
  }
  
  vec3 getWorldPosition(vec2 uv, float depth) {
    vec4 clipSpace = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
    vec4 viewSpace = uInverseProjectionMatrix * clipSpace;
    viewSpace /= viewSpace.w;
    vec4 worldSpace = uInverseViewMatrix * viewSpace;
    return worldSpace.xyz;
  }
  
  // Volumetric glow calculation
  float calculateGlow(vec3 worldPos, vec3 glowPos, float intensity, float radius) {
    float dist = distance(worldPos, glowPos);
    
    // Inverse square falloff with configurable power
    float falloff = 1.0 / (1.0 + pow(dist / radius, uFalloff));
    
    // Soft fade at edges
    float edgeFade = smoothstep(radius * 2.0, 0.0, dist);
    
    return intensity * falloff * edgeFade;
  }
  
  // Ray marching for volumetric effect
  vec3 calculateVolumetricGlow(vec3 rayOrigin, vec3 rayDir, vec3 glowPos, vec3 color, float intensity, float radius) {
    vec3 accumGlow = vec3(0.0);
    float stepSize = 2.0;
    float maxDist = radius * 3.0;
    int steps = 16;
    
    for (int i = 0; i < 16; i++) {
      if (float(i) * stepSize > maxDist) break;
      
      vec3 samplePos = rayOrigin + rayDir * (float(i) * stepSize);
      float sampleGlow = calculateGlow(samplePos, glowPos, intensity, radius);
      
      // Density falloff with height
      float heightFade = exp(-abs(samplePos.y - glowPos.y) * 0.1);
      
      accumGlow += color * sampleGlow * stepSize * 0.1 * heightFade;
    }
    
    return accumGlow;
  }
  
  void main() {
    // Sample scene color
    vec3 sceneColor = texture2D(uSceneTexture, vUv).rgb;
    float depth = getDepth(vUv);
    vec3 worldPos = getWorldPosition(vUv, depth);
    
    // Camera ray for volumetric calculation
    vec3 rayOrigin = uCameraPosition;
    vec3 rayDir = normalize(vWorldDirection);
    
    // Calculate glow from each cardinal direction
    vec3 totalGlow = vec3(0.0);
    
    // North glow (Gold)
    if (uNorthGlow.w > 0.0) {
      totalGlow += calculateVolumetricGlow(
        rayOrigin, rayDir, 
        uNorthGlow.xyz, 
        NORTH_COLOR, 
        uNorthGlow.w, 
        20.0
      );
    }
    
    // East glow (Terracotta)
    if (uEastGlow.w > 0.0) {
      totalGlow += calculateVolumetricGlow(
        rayOrigin, rayDir, 
        uEastGlow.xyz, 
        EAST_COLOR, 
        uEastGlow.w, 
        20.0
      );
    }
    
    // South glow (Bone)
    if (uSouthGlow.w > 0.0) {
      totalGlow += calculateVolumetricGlow(
        rayOrigin, rayDir, 
        uSouthGlow.xyz, 
        SOUTH_COLOR, 
        uSouthGlow.w, 
        20.0
      );
    }
    
    // West glow (Stone)
    if (uWestGlow.w > 0.0) {
      totalGlow += calculateVolumetricGlow(
        rayOrigin, rayDir, 
        uWestGlow.xyz, 
        WEST_COLOR, 
        uWestGlow.w, 
        20.0
      );
    }
    
    // Add subtle atmospheric scattering
    float height = worldPos.y;
    vec3 atmosphericColor = vec3(0.102, 0.102, 0.180) * 0.3; // Deep Ink
    float atmosphericDensity = exp(-height * 0.05) * (1.0 - depth);
    
    // Blend scene with glow
    vec3 finalColor = sceneColor + totalGlow + atmosphericColor * atmosphericDensity;
    
    // Tone mapping for HDR-like effect
    finalColor = finalColor / (1.0 + finalColor);
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

/**
 * Simplified glow shader for direct rendering (no post-processing)
 */
export const simpleGlowFragmentShader = `
  uniform vec4 uNorthGlow;
  uniform vec4 uEastGlow;
  uniform vec4 uSouthGlow;
  uniform vec4 uWestGlow;
  uniform vec3 uCameraPosition;
  uniform float uFalloff;
  
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  
  // Brand colors
  const vec3 NORTH_COLOR = vec3(0.722, 0.525, 0.043);   // Aged Gold
  const vec3 EAST_COLOR = vec3(0.776, 0.365, 0.231);    // Terracotta
  const vec3 SOUTH_COLOR = vec3(0.961, 0.941, 0.910);   // Bone
  const vec3 WEST_COLOR = vec3(0.420, 0.420, 0.420);    // Stone Grey
  
  float calculatePointGlow(vec3 worldPos, vec3 glowPos, float intensity) {
    float dist = distance(worldPos, glowPos);
    return intensity / (1.0 + dist * dist * uFalloff);
  }
  
  void main() {
    vec3 worldPos = vWorldPosition;
    
    // Calculate glow contribution from each direction
    vec3 glowColor = vec3(0.0);
    float totalGlow = 0.0;
    
    glowColor += NORTH_COLOR * calculatePointGlow(worldPos, uNorthGlow.xyz, uNorthGlow.w);
    glowColor += EAST_COLOR * calculatePointGlow(worldPos, uEastGlow.xyz, uEastGlow.w);
    glowColor += SOUTH_COLOR * calculatePointGlow(worldPos, uSouthGlow.xyz, uSouthGlow.w);
    glowColor += WEST_COLOR * calculatePointGlow(worldPos, uWestGlow.xyz, uWestGlow.w);
    
    totalGlow = calculatePointGlow(worldPos, uNorthGlow.xyz, uNorthGlow.w) +
                calculatePointGlow(worldPos, uEastGlow.xyz, uEastGlow.w) +
                calculatePointGlow(worldPos, uSouthGlow.xyz, uSouthGlow.w) +
                calculatePointGlow(worldPos, uWestGlow.xyz, uWestGlow.w);
    
    // Fresnel rim effect
    vec3 viewDir = normalize(uCameraPosition - worldPos);
    float fresnel = pow(1.0 - dot(viewDir, vNormal), 2.0);
    
    // Base color
    vec3 baseColor = vec3(0.102, 0.102, 0.180);
    
    // Combine
    vec3 finalColor = baseColor + glowColor * 0.5 + glowColor * fresnel * 0.5;
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

/**
 * Vertex shader for simple glow
 */
export const simpleGlowVertexShader = `
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * Create default uniform values for cardinal glow shader
 */
export function createCardinalGlowUniforms(
  zones?: Partial<CardinalZones>,
  overrides?: Partial<CardinalGlowUniforms>
): CardinalGlowUniforms {
  // Default zone positions at 50 units from center
  const defaultRadius = 50;
  
  return {
    uNorthGlow: new THREE.Vector4(0, 5, -defaultRadius, 1.0),
    uEastGlow: new THREE.Vector4(defaultRadius, 5, 0, 1.0),
    uSouthGlow: new THREE.Vector4(0, 5, defaultRadius, 1.0),
    uWestGlow: new THREE.Vector4(-defaultRadius, 5, 0, 1.0),
    uCameraPosition: new THREE.Vector3(0, 0, 0),
    uFalloff: 0.005,
    ...overrides,
  };
}

/**
 * Create a Three.js ShaderMaterial for cardinal glow
 */
export function createCardinalGlowMaterial(
  zones?: Partial<CardinalZones>,
  overrides?: Partial<CardinalGlowUniforms>
): THREE.ShaderMaterial {
  const uniformValues = createCardinalGlowUniforms(zones, overrides);
  
  return new THREE.ShaderMaterial({
    vertexShader: simpleGlowVertexShader,
    fragmentShader: simpleGlowFragmentShader,
    uniforms: {
      uNorthGlow: { value: uniformValues.uNorthGlow },
      uEastGlow: { value: uniformValues.uEastGlow },
      uSouthGlow: { value: uniformValues.uSouthGlow },
      uWestGlow: { value: uniformValues.uWestGlow },
      uCameraPosition: { value: uniformValues.uCameraPosition },
      uFalloff: { value: uniformValues.uFalloff },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/**
 * Create post-processing effect uniforms for EffectComposer
 */
export function createCardinalGlowEffectUniforms(
  zones?: Partial<CardinalZones>
): Record<string, THREE.IUniform> {
  const uniformValues = createCardinalGlowUniforms(zones);
  
  return {
    uNorthGlow: { value: uniformValues.uNorthGlow },
    uEastGlow: { value: uniformValues.uEastGlow },
    uSouthGlow: { value: uniformValues.uSouthGlow },
    uWestGlow: { value: uniformValues.uWestGlow },
    uCameraPosition: { value: uniformValues.uCameraPosition },
    uFalloff: { value: uniformValues.uFalloff },
    uResolution: { value: new THREE.Vector2(1920, 1080) },
  };
}

/**
 * Update glow intensity for a direction
 */
export function updateGlowIntensity(
  material: THREE.ShaderMaterial,
  direction: 'north' | 'east' | 'south' | 'west',
  intensity: number
): void {
  const uniformName = `u${direction.charAt(0).toUpperCase()}${direction.slice(1)}Glow` as const;
  const uniform = material.uniforms[uniformName];
  if (uniform) {
    uniform.value.w = Math.max(0, intensity);
  }
}

/**
 * Update glow position for a direction
 */
export function updateGlowPosition(
  material: THREE.ShaderMaterial,
  direction: 'north' | 'east' | 'south' | 'west',
  position: THREE.Vector3
): void {
  const uniformName = `u${direction.charAt(0).toUpperCase()}${direction.slice(1)}Glow` as const;
  const uniform = material.uniforms[uniformName];
  if (uniform) {
    uniform.value.x = position.x;
    uniform.value.y = position.y;
    uniform.value.z = position.z;
  }
}

/**
 * Animate glow intensities for reveal sequence
 * @returns Array of intensity values for each direction
 */
export function animateGlowIntensities(
  progress: number,
  baseIntensity: number = 1.0
): { north: number; east: number; south: number; west: number } {
  // Staggered reveal: N → E → S → W
  const staggerOffset = 0.15;
  
  return {
    north: Math.min(1, Math.max(0, (progress) / staggerOffset)) * baseIntensity,
    east: Math.min(1, Math.max(0, (progress - staggerOffset) / staggerOffset)) * baseIntensity,
    south: Math.min(1, Math.max(0, (progress - staggerOffset * 2) / staggerOffset)) * baseIntensity,
    west: Math.min(1, Math.max(0, (progress - staggerOffset * 3) / staggerOffset)) * baseIntensity,
  };
}
