/**
 * Dissolve Shader for INTEGRATED State
 * P2-S2-22: Alpha to 0 over 5s + gold particles
 */

import * as THREE from 'three';

/** Dissolve shader states */
export type DissolveState = 'idle' | 'dissolving' | 'complete';

/** Dissolve configuration */
export interface DissolveConfig {
  /** Dissolve duration in seconds */
  duration: number;
  /** Particle emission rate */
  particleRate: number;
  /** Gold particle color */
  particleColor: THREE.Color;
  /** Particle size */
  particleSize: number;
  /** Noise scale for dissolve pattern */
  noiseScale: number;
  /** Edge glow color */
  edgeColor: THREE.Color;
  /** Edge glow width */
  edgeWidth: number;
}

/** Default dissolve config */
export const DEFAULT_DISSOLVE_CONFIG: DissolveConfig = {
  duration: 5.0,
  particleRate: 50,
  particleColor: new THREE.Color(0xB8860B), // Aged Gold
  particleSize: 0.05,
  noiseScale: 4.0,
  edgeColor: new THREE.Color(0xFFD700), // Gold
  edgeWidth: 0.15,
};

/** Dissolve shader uniforms */
export interface DissolveUniforms {
  uTime: { value: number };
  uProgress: { value: number }; // 0-1 dissolve progress
  uNoiseScale: { value: number };
  uEdgeWidth: { value: number };
  uEdgeColor: { value: THREE.Color };
  uBaseColor: { value: THREE.Color };
  uParticleTime: { value: number };
}

/** Create default dissolve uniforms */
export function createDissolveUniforms(): DissolveUniforms {
  return {
    uTime: { value: 0 },
    uProgress: { value: 0 },
    uNoiseScale: { value: DEFAULT_DISSOLVE_CONFIG.noiseScale },
    uEdgeWidth: { value: DEFAULT_DISSOLVE_CONFIG.edgeWidth },
    uEdgeColor: { value: DEFAULT_DISSOLVE_CONFIG.edgeColor.clone() },
    uBaseColor: { value: new THREE.Color(0xffffff) },
    uParticleTime: { value: 0 },
  };
}

/**
 * Simplex 3D noise
 */
const simplexNoise = `
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
 * Dissolve vertex shader
 */
export const dissolveVertexShader = `
  uniform float uTime;
  uniform float uProgress;
  uniform float uNoiseScale;

  varying vec2 vUv;
  varying float vNoise;
  varying vec3 vPosition;
  varying vec3 vNormal;

  ${simplexNoise}

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);

    // Generate noise for this vertex
    vec3 noisePos = position * uNoiseScale + uTime * 0.2;
    vNoise = snoise(noisePos);

    // Displace vertices slightly based on dissolve progress
    float displacement = uProgress * vNoise * 0.1;
    vec3 displaced = position + normal * displacement;

    vPosition = displaced;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

/**
 * Dissolve fragment shader
 */
export const dissolveFragmentShader = `
  uniform float uTime;
  uniform float uProgress;
  uniform float uEdgeWidth;
  uniform vec3 uEdgeColor;
  uniform vec3 uBaseColor;

  varying vec2 vUv;
  varying float vNoise;
  varying vec3 vPosition;
  varying vec3 vNormal;

  void main() {
    // Normalize noise to 0-1 range
    float noiseVal = (vNoise + 1.0) * 0.5;

    // Dissolve threshold based on progress
    float threshold = uProgress;

    // Calculate dissolve edge
    float edgeLow = threshold - uEdgeWidth;
    float edgeHigh = threshold + uEdgeWidth;

    // Discard pixels below threshold (dissolved)
    if (noiseVal < edgeLow) {
      discard;
    }

    // Calculate alpha
    float alpha = smoothstep(edgeLow, edgeHigh, noiseVal);

    // Create glowing edge effect
    float edgeCenter = threshold;
    float edgeDist = abs(noiseVal - edgeCenter);
    float edgeGlow = 1.0 - smoothstep(0.0, uEdgeWidth * 0.5, edgeDist);

    // Base color with edge glow
    vec3 color = mix(uBaseColor, uEdgeColor, edgeGlow * 0.8);

    // Add fresnel rim lighting
    vec3 viewDir = normalize(cameraPosition - vPosition);
    float fresnel = 1.0 - abs(dot(viewDir, vNormal));
    fresnel = pow(fresnel, 2.0);
    color = mix(color, uEdgeColor, fresnel * 0.5);

    gl_FragColor = vec4(color, alpha);
  }
`;

/** Gold particle vertex shader */
export const goldParticleVertexShader = `
  uniform float uTime;
  uniform float uParticleTime;
  uniform float uParticleSize;

  attribute vec3 aVelocity;
  attribute float aBirthTime;
  attribute float aLife;

  varying float vAlpha;
  varying float vGlow;

  void main() {
    // Calculate particle age
    float age = uParticleTime - aBirthTime;
    float lifeRatio = age / aLife;

    // Discard if dead
    if (lifeRatio >= 1.0 || lifeRatio < 0.0) {
      gl_Position = vec4(0.0);
      return;
    }

    // Update position based on velocity
    vec3 pos = position + aVelocity * age;
    
    // Add gravity
    pos.y -= 2.0 * age * age;

    // Fade out over life
    vAlpha = 1.0 - lifeRatio;
    vAlpha *= smoothstep(0.0, 0.1, lifeRatio); // Fade in

    // Glow is strongest in middle of life
    vGlow = sin(lifeRatio * 3.14159);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = uParticleSize * (100.0 / -mvPosition.z) * vGlow;
  }
`;

/** Gold particle fragment shader */
export const goldParticleFragmentShader = `
  uniform vec3 uParticleColor;

  varying float vAlpha;
  varying float vGlow;

  void main() {
    // Circular particle
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    
    if (dist > 0.5) {
      discard;
    }

    // Soft edge
    float softEdge = 1.0 - smoothstep(0.3, 0.5, dist);

    // Gold color with glow
    vec3 color = uParticleColor * (1.0 + vGlow * 2.0);

    gl_FragColor = vec4(color, vAlpha * softEdge);
  }
`;

/** Create dissolve material */
export function createDissolveMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: dissolveVertexShader,
    fragmentShader: dissolveFragmentShader,
    uniforms: createDissolveUniforms(),
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/** Create gold particle material */
export function createGoldParticleMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: goldParticleVertexShader,
    fragmentShader: goldParticleFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uParticleTime: { value: 0 },
      uParticleSize: { value: DEFAULT_DISSOLVE_CONFIG.particleSize },
      uParticleColor: { value: DEFAULT_DISSOLVE_CONFIG.particleColor.clone() },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

/** Dissolve controller */
export class DissolveController {
  private config: DissolveConfig;
  private uniforms: DissolveUniforms;
  private state: DissolveState = 'idle';
  private currentProgress = 0;
  private particleTime = 0;
  private particles: Array<{
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    birthTime: number;
    life: number;
  }> = [];

  constructor(config: Partial<DissolveConfig> = {}) {
    this.config = { ...DEFAULT_DISSOLVE_CONFIG, ...config };
    this.uniforms = createDissolveUniforms();
    this.uniforms.uNoiseScale.value = this.config.noiseScale;
    this.uniforms.uEdgeWidth.value = this.config.edgeWidth;
    this.uniforms.uEdgeColor.value = this.config.edgeColor.clone();
  }

  /** Get dissolve uniforms */
  getUniforms(): DissolveUniforms {
    return this.uniforms;
  }

  /** Get current state */
  getState(): DissolveState {
    return this.state;
  }

  /** Start dissolve effect */
  start(): void {
    if (this.state === 'dissolving') {
      return;
    }

    this.currentProgress = 0;
    this.particleTime = 0;
    this.particles = [];
    this.state = 'dissolving';
    this.uniforms.uProgress.value = 0;
  }

  /** Update dissolve progress */
  update(deltaTime: number, objectPosition?: THREE.Vector3): void {
    if (this.state !== 'dissolving') {
      return;
    }

    // Update progress
    this.currentProgress += deltaTime / this.config.duration;
    this.uniforms.uProgress.value = this.currentProgress;
    this.uniforms.uTime.value += deltaTime;

    // Update particles
    this.particleTime += deltaTime;
    this.uniforms.uParticleTime.value = this.particleTime;

    // Spawn new particles
    if (objectPosition && this.currentProgress < 0.8) {
      this.spawnParticles(deltaTime, objectPosition);
    }

    // Check completion
    if (this.currentProgress >= 1.0) {
      this.currentProgress = 1.0;
      this.state = 'complete';
    }
  }

  /** Spawn gold particles from object surface */
  private spawnParticles(deltaTime: number, position: THREE.Vector3): void {
    const particlesToSpawn = Math.floor(this.config.particleRate * deltaTime);

    for (let i = 0; i < particlesToSpawn; i++) {
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize().multiplyScalar(Math.random() * 0.5);

      this.particles.push({
        position: position.clone().add(offset),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          Math.random() * 2,
          (Math.random() - 0.5) * 2
        ),
        birthTime: this.particleTime,
        life: 1.0 + Math.random() * 1.5,
      });
    }
  }

  /** Get active particles */
  getParticles(): typeof this.particles {
    // Filter out dead particles
    return this.particles.filter(
      (p) => this.particleTime - p.birthTime < p.life
    );
  }

  /** Reset dissolve */
  reset(): void {
    this.state = 'idle';
    this.currentProgress = 0;
    this.particleTime = 0;
    this.particles = [];
    this.uniforms.uProgress.value = 0;
  }

  /** Get current progress */
  getProgress(): number {
    return this.currentProgress;
  }
}

/** Factory function */
export function createDissolveController(
  config?: Partial<DissolveConfig>
): DissolveController {
  return new DissolveController(config);
}
