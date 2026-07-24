/**
 * Vessel Color Grading Shader
 * P1-S1-10: Build vessel color grading system
 * P1-S1-33: Build vessel color transition smoothing
 * 
 * Interpolates vessel colors from Deep Ink (#1A1A2E) to Aged Gold (#B8860B)
 * based on coherence value with 500ms smoothing
 */

import * as THREE from 'three';

/** Brand colors */
export const BRAND_COLORS = {
  deepInk: new THREE.Color('#1A1A2E'),
  agedGold: new THREE.Color('#B8860B'),
  bone: new THREE.Color('#F5F0E8'),
  stoneGrey: new THREE.Color('#6B6B6B'),
  terracotta: new THREE.Color('#C65D3B'),
};

/**
 * Color grading vertex shader
 */
export const vesselColorGradingVertexShader = `
  uniform float uTime;
  uniform float uCoherence;
  uniform float uLqd;
  uniform float uEntropy;
  uniform float uBreathingPhase;
  uniform float uBaseScale;
  uniform float uBreathingIntensity;
  
  attribute float aRandom;
  attribute vec3 aOriginalPosition;
  
  varying vec3 vColor;
  varying float vAlpha;
  varying float vDepth;
  
  // Simplex noise function
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }
  
  void main() {
    // P1-S1-11: Breathing expansion effect
    // splat scale = 1.0 + lqd * baseScale * breathingIntensity
    float breathingScale = 1.0 + uLqd * uBaseScale * uBreathingIntensity;
    
    // P1-S1-24: Entropy-driven turbulence
    // 2-5 pixel displacement at entropy 1.0
    float turbulence = uEntropy * (5.0 / 100.0); // Normalize to approximate pixel space
    vec3 noisePos = aOriginalPosition * 10.0 + uTime * 2.0;
    float noiseVal = snoise(noisePos);
    vec3 turbulenceOffset = vec3(
      snoise(noisePos + vec3(100.0, 0.0, 0.0)),
      snoise(noisePos + vec3(0.0, 100.0, 0.0)),
      snoise(noisePos + vec3(0.0, 0.0, 100.0))
    ) * turbulence;
    
    // Apply position transformations
    vec3 finalPosition = position + turbulenceOffset;
    
    // Scale for breathing effect
    vec3 scaledPosition = finalPosition * breathingScale;
    
    vec4 mvPosition = modelViewMatrix * vec4(scaledPosition, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    // P1-S1-10: Color grading based on coherence
    // Deep Ink (#1A1A2E) to Aged Gold (#B8860B)
    vec3 deepInk = vec3(0.102, 0.102, 0.18);   // #1A1A2E
    vec3 agedGold = vec3(0.722, 0.525, 0.043); // #B8860B
    
    vColor = mix(deepInk, agedGold, uCoherence);
    
    // Depth for LOD/fog calculations
    vDepth = -mvPosition.z;
    
    // Alpha based on randomness for organic look
    vAlpha = 0.8 + aRandom * 0.2;
  }
`;

/**
 * Color grading fragment shader
 */
export const vesselColorGradingFragmentShader = `
  uniform float uEdgeFade;
  uniform float uTime;
  
  varying vec3 vColor;
  varying float vAlpha;
  varying float vDepth;
  
  void main() {
    // Distance-based fade for LOD transitions
    float distanceFade = 1.0 - smoothstep(10.0, 50.0, vDepth);
    
    // Combine alphas
    float finalAlpha = vAlpha * distanceFade * uEdgeFade;
    
    gl_FragColor = vec4(vColor, finalAlpha);
  }
`;

/**
 * Uniforms for vessel color grading shader
 */
export interface VesselColorGradingUniforms {
  uTime: { value: number };
  uCoherence: { value: number };
  uLqd: { value: number };
  uEntropy: { value: number };
  uBreathingPhase: { value: number };
  uBaseScale: { value: number };
  uBreathingIntensity: { value: number };
  uEdgeFade: { value: number };
}

/**
 * Create default uniforms for vessel color grading
 */
export function createVesselColorGradingUniforms(): VesselColorGradingUniforms {
  return {
    uTime: { value: 0 },
    uCoherence: { value: 0 },
    uLqd: { value: 0 },
    uEntropy: { value: 0 },
    uBreathingPhase: { value: 0 },
    uBaseScale: { value: 1.0 },
    uBreathingIntensity: { value: 0.1 },
    uEdgeFade: { value: 1.0 },
  };
}

/**
 * Color smoothing controller
 * P1-S1-33: Lerp color changes over 500ms
 */
export class ColorSmoothingController {
  private currentCoherence = 0;
  private targetCoherence = 0;
  private smoothingDuration = 0.5; // 500ms
  private lastUpdateTime = 0;

  /**
   * Update the target coherence value
   */
  setTarget(coherence: number): void {
    this.targetCoherence = Math.max(0, Math.min(1, coherence));
    if (this.lastUpdateTime === 0) {
      this.lastUpdateTime = performance.now();
    }
  }

  /**
   * Get smoothed coherence value
   * Call this every frame
   */
  update(): number {
    const now = performance.now();
    const deltaTime = (now - this.lastUpdateTime) / 1000;
    this.lastUpdateTime = now;

    // Lerp towards target
    const lerpFactor = Math.min(deltaTime / this.smoothingDuration, 1.0);
    this.currentCoherence += (this.targetCoherence - this.currentCoherence) * lerpFactor;

    return this.currentCoherence;
  }

  /**
   * Reset the controller
   */
  reset(): void {
    this.currentCoherence = 0;
    this.targetCoherence = 0;
    this.lastUpdateTime = 0;
  }

  /**
   * Get current smoothed value without updating
   */
  getCurrent(): number {
    return this.currentCoherence;
  }
}
