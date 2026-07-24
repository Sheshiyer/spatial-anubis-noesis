/**
 * Post-Processing PIP Uniforms
 * P2-S3-04: ChromaticAberration 0->0.5 with entropy
 * Real-time shader uniform updates
 */

import * as THREE from 'three';
import type { PIPData } from '../pip/types';

/** Post-processing PIP uniforms */
export interface PIPPostProcessingUniforms {
  uEntropy: { value: number };
  uCoherence: { value: number };
  uLQD: { value: number };
  uBreathPhase: { value: number };
  uChromaticAberration: { value: number };
  uTime: { value: number };
  uResolution: { value: THREE.Vector2 };
}

/** Create default post-processing uniforms */
export function createPIPPostProcessingUniforms(
  width: number,
  height: number
): PIPPostProcessingUniforms {
  return {
    uEntropy: { value: 0 },
    uCoherence: { value: 50 },
    uLQD: { value: 50 },
    uBreathPhase: { value: 0.5 },
    uChromaticAberration: { value: 0 },
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(width, height) },
  };
}

/** Chromatic aberration configuration */
export interface ChromaticAberrationConfig {
  /** Minimum entropy (maps to 0 aberration) */
  minEntropy: number;
  /** Maximum entropy (maps to maxAberration) */
  maxEntropy: number;
  /** Maximum aberration offset */
  maxAberration: number;
}

/** Default chromatic aberration config */
export const DEFAULT_CHROMATIC_CONFIG: ChromaticAberrationConfig = {
  minEntropy: 0,
  maxEntropy: 100,
  maxAberration: 0.5,
};

/**
 * Map entropy to chromatic aberration
 * Entropy 0-100 -> ChromaticAberration 0-0.5
 */
export function mapEntropyToChromaticAberration(
  entropy: number,
  config: Partial<ChromaticAberrationConfig> = {}
): number {
  const fullConfig = { ...DEFAULT_CHROMATIC_CONFIG, ...config };
  const { minEntropy, maxEntropy, maxAberration } = fullConfig;

  // Clamp entropy
  const clampedEntropy = Math.max(minEntropy, Math.min(maxEntropy, entropy));

  // Normalize to 0-1
  const normalized = (clampedEntropy - minEntropy) / (maxEntropy - minEntropy);

  // Apply easing for smoother transition
  const eased = normalized * normalized * (3 - 2 * normalized); // Smoothstep

  return eased * maxAberration;
}

/** Update post-processing uniforms from PIP data */
export function updatePostProcessingFromPIP(
  uniforms: PIPPostProcessingUniforms,
  data: PIPData,
  chromaticConfig?: Partial<ChromaticAberrationConfig>
): void {
  // Normalize values from 0-100 to 0-1 where needed
  uniforms.uEntropy.value = data.entropy;
  uniforms.uCoherence.value = data.coherence;
  uniforms.uLQD.value = data.lqd;
  uniforms.uBreathPhase.value = data.breathPhase;

  // Map entropy to chromatic aberration
  uniforms.uChromaticAberration.value = mapEntropyToChromaticAberration(
    data.entropy,
    chromaticConfig
  );
}

/**
 * Chromatic aberration fragment shader
 * Applies RGB channel separation based on entropy
 */
export const chromaticAberrationFragmentShader = `
  uniform sampler2D tDiffuse;
  uniform float uChromaticAberration;
  uniform vec2 uResolution;

  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;

    // Calculate direction from center
    vec2 center = vec2(0.5);
    vec2 dir = uv - center;
    float dist = length(dir);
    vec2 offset = normalize(dir) * uChromaticAberration * 0.02 * dist;

    // Sample RGB channels with offset
    float r = texture2D(tDiffuse, uv + offset).r;
    float g = texture2D(tDiffuse, uv).g;
    float b = texture2D(tDiffuse, uv - offset).b;

    gl_FragColor = vec4(r, g, b, 1.0);
  }
`;

/**
 * PIP-responsive post-processing pass
 * Combines multiple effects based on PIP metrics
 */
export const pipResponsiveFragmentShader = `
  uniform sampler2D tDiffuse;
  uniform float uEntropy;
  uniform float uCoherence;
  uniform float uLQD;
  uniform float uBreathPhase;
  uniform float uChromaticAberration;
  uniform float uTime;
  uniform vec2 uResolution;

  varying vec2 vUv;

  // Simplex noise
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
    vec2 uv = vUv;

    // Chromatic aberration
    vec2 center = vec2(0.5);
    vec2 dir = uv - center;
    float dist = length(dir);
    vec2 aberrationOffset = normalize(dir) * uChromaticAberration * 0.02 * dist;

    // Sample with chromatic aberration
    float r = texture2D(tDiffuse, uv + aberrationOffset).r;
    float g = texture2D(tDiffuse, uv).g;
    float b = texture2D(tDiffuse, uv - aberrationOffset).b;
    vec3 color = vec3(r, g, b);

    // Entropy-based noise/grain
    float entropyNorm = uEntropy / 100.0;
    float noiseVal = snoise(vec3(uv * 500.0, uTime * 10.0));
    float grain = noiseVal * entropyNorm * 0.05;
    color += grain;

    // Coherence-based saturation adjustment
    float coherenceNorm = uCoherence / 100.0;
    float saturationBoost = 0.8 + coherenceNorm * 0.4;
    vec3 gray = vec3(dot(color, vec3(0.299, 0.587, 0.114)));
    color = mix(gray, color, saturationBoost);

    // LQD-based vignette (lower LQD = stronger vignette)
    float lqdNorm = uLQD / 100.0;
    float vignetteStrength = (1.0 - lqdNorm) * 0.5;
    float vignette = 1.0 - dist * vignetteStrength;
    color *= vignette;

    // Breath phase subtle pulse
    float breathPulse = 1.0 + sin(uBreathPhase * 3.14159 * 2.0) * 0.02 * coherenceNorm;
    color *= breathPulse;

    gl_FragColor = vec4(color, 1.0);
  }
`;

/** Post-processing controller for PIP integration */
export class PIPPostProcessingController {
  private uniforms: PIPPostProcessingUniforms;
  private chromaticConfig: ChromaticAberrationConfig;

  constructor(width: number, height: number, chromaticConfig?: Partial<ChromaticAberrationConfig>) {
    this.uniforms = createPIPPostProcessingUniforms(width, height);
    this.chromaticConfig = { ...DEFAULT_CHROMATIC_CONFIG, ...chromaticConfig };
  }

  /** Get uniforms for shader */
  getUniforms(): PIPPostProcessingUniforms {
    return this.uniforms;
  }

  /** Update from PIP data */
  update(data: PIPData, deltaTime: number): void {
    updatePostProcessingFromPIP(this.uniforms, data, this.chromaticConfig);
    this.uniforms.uTime.value += deltaTime;
  }

  /** Update resolution */
  setResolution(width: number, height: number): void {
    this.uniforms.uResolution.value.set(width, height);
  }

  /** Get current chromatic aberration value */
  getChromaticAberration(): number {
    return this.uniforms.uChromaticAberration.value;
  }
}

/** Factory function */
export function createPIPPostProcessingController(
  width: number,
  height: number,
  chromaticConfig?: Partial<ChromaticAberrationConfig>
): PIPPostProcessingController {
  return new PIPPostProcessingController(width, height, chromaticConfig);
}
