/**
 * Ground Ripple Vertex Shader
 * P2-S1-11: Radial displacement wave from center
 * 
 * Creates an expanding ripple effect on the ground mesh vertices,
 * simulating a shockwave emanating from the world origin during reveal.
 */

import * as THREE from 'three';
import type { GroundRippleUniforms } from '../types';

/**
 * Vertex shader for ground ripple displacement
 * Displaces vertices along their normals based on radial distance from origin
 */
export const groundRippleVertexShader = `
  uniform float uTime;
  uniform vec3 uOrigin;
  uniform float uSpeed;
  uniform float uAmplitude;
  uniform float uFrequency;
  uniform float uDecay;
  
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying float vRippleIntensity;
  
  // Simplex noise for organic variation
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
  
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                        -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                           + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                            dot(x12.zw,x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }
  
  void main() {
    vNormal = normal;
    
    // Calculate distance from ripple origin
    vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    vWorldPosition = worldPos;
    
    float dist = distance(worldPos.xz, uOrigin.xz);
    
    // Ripple expands outward over time
    float rippleFront = uTime * uSpeed;
    
    // Calculate ripple wave at this distance
    // Only apply ripple if the wave front has reached this point
    float ripple = 0.0;
    float intensity = 0.0;
    
    if (dist < rippleFront + 5.0) {
      // Distance from current wave front
      float waveOffset = dist - rippleFront;
      
      // Sinusoidal wave with decay based on distance from front
      float wave = sin(waveOffset * uFrequency - uTime * 3.0);
      
      // Envelope that peaks at the wave front and decays behind
      float envelope = exp(-abs(waveOffset) * uDecay);
      
      // Additional radial decay
      float radialDecay = exp(-dist * 0.1);
      
      // Organic noise variation
      float noise = snoise(worldPos.xz * 0.5 + uTime * 0.2) * 0.3;
      
      ripple = wave * envelope * radialDecay * (1.0 + noise);
      intensity = envelope * radialDecay;
    }
    
    vRippleIntensity = intensity;
    
    // Displace vertex along normal
    vec3 displaced = position + normal * ripple * uAmplitude;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

/**
 * Fragment shader for ground ripple
 * Visualizes the ripple with color and glow
 */
export const groundRippleFragmentShader = `
  uniform float uTime;
  uniform vec3 uOrigin;
  
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying float vRippleIntensity;
  
  // Brand colors
  const vec3 DEEP_INK = vec3(0.102, 0.102, 0.180);    // #1A1A2E
  const vec3 BONE = vec3(0.961, 0.941, 0.910);        // #F5F0E8
  const vec3 AGED_GOLD = vec3(0.722, 0.525, 0.043);   // #B8860B
  const vec3 STONE_GREY = vec3(0.420, 0.420, 0.420);  // #6B6B6B
  
  void main() {
    // Base color
    vec3 baseColor = mix(DEEP_INK, STONE_GREY, 0.3);
    
    // Add ripple glow
    float glow = vRippleIntensity * 0.8;
    vec3 rippleColor = mix(BONE, AGED_GOLD, vRippleIntensity);
    
    // Mix base with ripple
    vec3 finalColor = mix(baseColor, rippleColor, glow);
    
    // Add fresnel rim lighting
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - dot(viewDirection, vNormal), 2.0);
    finalColor += AGED_GOLD * fresnel * 0.3;
    
    // Distance fade for seamless blending
    float dist = distance(vWorldPosition.xz, uOrigin.xz);
    float fade = smoothstep(80.0, 100.0, dist);
    finalColor = mix(finalColor, DEEP_INK, fade * 0.5);
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

/**
 * Create default uniform values for ground ripple shader
 */
export function createGroundRippleUniforms(
  overrides?: Partial<GroundRippleUniforms>
): GroundRippleUniforms {
  return {
    uTime: 0,
    uOrigin: new THREE.Vector3(0, 0, 0),
    uSpeed: 15.0,       // Units per second
    uAmplitude: 0.5,    // Maximum displacement in units
    uFrequency: 2.0,    // Wave cycles per unit
    uDecay: 0.8,        // Wave decay rate
    ...overrides,
  };
}

/**
 * Create a Three.js ShaderMaterial for ground ripple
 */
export function createGroundRippleMaterial(
  uniforms?: Partial<GroundRippleUniforms>
): THREE.ShaderMaterial {
  const uniformValues = createGroundRippleUniforms(uniforms);
  
  return new THREE.ShaderMaterial({
    vertexShader: groundRippleVertexShader,
    fragmentShader: groundRippleFragmentShader,
    uniforms: {
      uTime: { value: uniformValues.uTime },
      uOrigin: { value: uniformValues.uOrigin },
      uSpeed: { value: uniformValues.uSpeed },
      uAmplitude: { value: uniformValues.uAmplitude },
      uFrequency: { value: uniformValues.uFrequency },
      uDecay: { value: uniformValues.uDecay },
    },
    transparent: false,
    side: THREE.DoubleSide,
  });
}

/**
 * Update ripple shader uniforms
 */
export function updateRippleUniforms(
  material: THREE.ShaderMaterial,
  time: number,
  origin?: THREE.Vector3
): void {
  material.uniforms.uTime.value = time;
  if (origin) {
    material.uniforms.uOrigin.value.copy(origin);
  }
}
