/**
 * Biome Transition Shaders
 * P2-S3-05: Dissolve between Dasha worlds
 * Noise-based pattern, 3 second duration
 */

import * as THREE from 'three';

/** Biome transition states */
export type BiomeTransitionState = 'idle' | 'transitioning' | 'complete';

/** Biome transition configuration */
export interface BiomeTransitionConfig {
  /** Transition duration in seconds */
  duration: number;
  /** Noise scale for dissolve pattern */
  noiseScale: number;
  /** Edge width for dissolve effect */
  edgeWidth: number;
  /** Edge color during transition */
  edgeColor: THREE.Color;
}

/** Default transition config */
export const DEFAULT_BIOME_TRANSITION_CONFIG: BiomeTransitionConfig = {
  duration: 3.0,
  noiseScale: 3.0,
  edgeWidth: 0.1,
  edgeColor: new THREE.Color(0xB8860B), // Aged Gold
};

/** Biome transition uniforms */
export interface BiomeTransitionUniforms {
  uTime: { value: number };
  uProgress: { value: number }; // 0-1 transition progress
  uNoiseScale: { value: number };
  uEdgeWidth: { value: number };
  uEdgeColor: { value: THREE.Color };
  uFromTexture: { value: THREE.Texture | null };
  uToTexture: { value: THREE.Texture | null };
}

/** Create default biome transition uniforms */
export function createBiomeTransitionUniforms(): BiomeTransitionUniforms {
  return {
    uTime: { value: 0 },
    uProgress: { value: 0 },
    uNoiseScale: { value: DEFAULT_BIOME_TRANSITION_CONFIG.noiseScale },
    uEdgeWidth: { value: DEFAULT_BIOME_TRANSITION_CONFIG.edgeWidth },
    uEdgeColor: { value: DEFAULT_BIOME_TRANSITION_CONFIG.edgeColor.clone() },
    uFromTexture: { value: null },
    uToTexture: { value: null },
  };
}

/**
 * Simplex 3D noise function
 */
const simplex3D = `
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
`;

/**
 * Biome dissolve vertex shader
 */
export const biomeDissolveVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * Biome dissolve fragment shader
 * Noise-based dissolve pattern between two biomes
 */
export const biomeDissolveFragmentShader = `
  uniform float uTime;
  uniform float uProgress;
  uniform float uNoiseScale;
  uniform float uEdgeWidth;
  uniform vec3 uEdgeColor;
  uniform sampler2D uFromTexture;
  uniform sampler2D uToTexture;

  varying vec2 vUv;

  ${simplex3D}

  void main() {
    // Sample both textures
    vec4 fromColor = texture2D(uFromTexture, vUv);
    vec4 toColor = texture2D(uToTexture, vUv);

    // Generate noise pattern for dissolve
    vec3 noisePos = vec3(vUv * uNoiseScale, uTime * 0.1);
    float noiseVal = snoise(noisePos);
    
    // Add detail noise
    float detailNoise = snoise(noisePos * 2.0 + vec3(100.0));
    noiseVal = noiseVal * 0.7 + detailNoise * 0.3;

    // Normalize noise to 0-1
    noiseVal = (noiseVal + 1.0) * 0.5;

    // Calculate dissolve threshold based on progress
    float threshold = uProgress;

    // Create dissolve edge
    float edgeLow = threshold - uEdgeWidth * 0.5;
    float edgeHigh = threshold + uEdgeWidth * 0.5;
    
    // Determine which biome is visible
    float dissolveMask = smoothstep(edgeLow, edgeHigh, noiseVal);

    // Create glowing edge
    float edgeCenter = (edgeLow + edgeHigh) * 0.5;
    float edgeDist = abs(noiseVal - threshold);
    float edgeGlow = 1.0 - smoothstep(0.0, uEdgeWidth * 0.5, edgeDist);

    // Mix colors
    vec3 finalColor = mix(fromColor.rgb, toColor.rgb, dissolveMask);
    
    // Add edge glow
    finalColor = mix(finalColor, uEdgeColor, edgeGlow * 0.5);

    // Calculate alpha
    float alpha = mix(fromColor.a, toColor.a, dissolveMask);

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

/** Create biome transition material */
export function createBiomeTransitionMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: biomeDissolveVertexShader,
    fragmentShader: biomeDissolveFragmentShader,
    uniforms: createBiomeTransitionUniforms(),
    transparent: true,
    depthWrite: false,
  });
}

/** Biome transition controller */
export class BiomeTransitionController {
  private uniforms: BiomeTransitionUniforms;
  private config: BiomeTransitionConfig;
  private state: BiomeTransitionState = 'idle';
  private currentProgress = 0;
  private fromBiome: string | null = null;
  private toBiome: string | null = null;

  constructor(config: Partial<BiomeTransitionConfig> = {}) {
    this.config = { ...DEFAULT_BIOME_TRANSITION_CONFIG, ...config };
    this.uniforms = createBiomeTransitionUniforms();
    this.uniforms.uNoiseScale.value = this.config.noiseScale;
    this.uniforms.uEdgeWidth.value = this.config.edgeWidth;
    this.uniforms.uEdgeColor.value = this.config.edgeColor.clone();
  }

  /** Get uniforms for shader material */
  getUniforms(): BiomeTransitionUniforms {
    return this.uniforms;
  }

  /** Get current transition state */
  getState(): BiomeTransitionState {
    return this.state;
  }

  /** Check if currently transitioning */
  isTransitioning(): boolean {
    return this.state === 'transitioning';
  }

  /** Start a biome transition */
  startTransition(fromBiome: string, toBiome: string): void {
    if (this.state === 'transitioning') {
      console.warn('[BiomeTransition] Transition already in progress');
      return;
    }

    this.fromBiome = fromBiome;
    this.toBiome = toBiome;
    this.currentProgress = 0;
    this.state = 'transitioning';
    this.uniforms.uProgress.value = 0;

    console.log(`[BiomeTransition] Starting transition: ${fromBiome} -> ${toBiome}`);
  }

  /** Update transition progress */
  update(deltaTime: number): void {
    if (this.state !== 'transitioning') {
      return;
    }

    // Update progress
    this.currentProgress += deltaTime / this.config.duration;

    if (this.currentProgress >= 1.0) {
      this.currentProgress = 1.0;
      this.state = 'complete';
      this.uniforms.uProgress.value = 1.0;
      console.log('[BiomeTransition] Transition complete');
    } else {
      this.uniforms.uProgress.value = this.currentProgress;
    }

    // Update time for noise animation
    this.uniforms.uTime.value += deltaTime;
  }

  /** Reset transition state */
  reset(): void {
    this.state = 'idle';
    this.currentProgress = 0;
    this.uniforms.uProgress.value = 0;
    this.fromBiome = null;
    this.toBiome = null;
  }

  /** Set biome textures */
  setTextures(fromTexture: THREE.Texture, toTexture: THREE.Texture): void {
    this.uniforms.uFromTexture.value = fromTexture;
    this.uniforms.uToTexture.value = toTexture;
  }

  /** Get current progress (0-1) */
  getProgress(): number {
    return this.currentProgress;
  }

  /** Get source biome */
  getFromBiome(): string | null {
    return this.fromBiome;
  }

  /** Get destination biome */
  getToBiome(): string | null {
    return this.toBiome;
  }
}

/** Factory function */
export function createBiomeTransitionController(
  config?: Partial<BiomeTransitionConfig>
): BiomeTransitionController {
  return new BiomeTransitionController(config);
}
