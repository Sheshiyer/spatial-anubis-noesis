/**
 * FogBank — SparkJS-based volumetric fog system for zone boundaries
 * P4-S1-01: Per-zone fog density control
 *
 * Each cardinal zone (North/Breathfield, East/Engines, West/Forge, South/Threshold)
 * has configurable fog density that dissipates on unlock.
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SplatPool, type SplatData } from '../../rendering/sparkjs';

/** Zone identifier */
export type ZoneId = 'north' | 'east' | 'west' | 'south';

/** Per-zone fog configuration */
export interface ZoneFogConfig {
  /** Zone identifier */
  zone: ZoneId;
  /** Fog density 0-1 (0 = no fog, 1 = thick fog) */
  density: number;
  /** Fog color */
  color: THREE.Color;
  /** Zone center position */
  position: THREE.Vector3;
  /** Zone boundary radius */
  radius: number;
  /** Particle count */
  particleCount: number;
  /** Particle size */
  particleSize: number;
  /** Whether zone is unlocked (true = fog dissipates) */
  isUnlocked: boolean;
}

/** Default fog configurations for all zones */
export const DEFAULT_ZONE_FOG_CONFIGS: Record<ZoneId, Omit<ZoneFogConfig, 'isUnlocked'>> = {
  north: {
    zone: 'north',
    density: 0.3, // North (Breathfield) always unlocked, light fog
    color: new THREE.Color('#F5F0E8'), // Bone White
    position: new THREE.Vector3(0, 0, 50),
    radius: 20,
    particleCount: 3000,
    particleSize: 0.5,
  },
  east: {
    zone: 'east',
    density: 0.8, // Heavy fog until breath-sync
    color: new THREE.Color('#C45B28'), // Terracotta
    position: new THREE.Vector3(50, 0, 0),
    radius: 20,
    particleCount: 5000,
    particleSize: 0.6,
  },
  west: {
    zone: 'west',
    density: 0.85, // Heavy fog until engine ritual
    color: new THREE.Color('#6B6B6B'), // Stone Grey
    position: new THREE.Vector3(-50, 0, 0),
    radius: 20,
    particleCount: 5000,
    particleSize: 0.6,
  },
  south: {
    zone: 'south',
    density: 0.9, // Heaviest fog until sigil forge
    color: new THREE.Color('#0A0A0A'), // Deep Ink
    position: new THREE.Vector3(0, 0, -50),
    radius: 20,
    particleCount: 6000,
    particleSize: 0.7,
  },
};

/** FogBank component props */
export interface FogBankProps {
  /** Zone configuration */
  config: ZoneFogConfig;
  /** Dissipation speed (0-1, higher = faster) */
  dissipationSpeed?: number;
  /** Time-based animation enabled */
  animate?: boolean;
}

/**
 * Generate fog particles within a spherical zone boundary
 */
function generateFogParticles(config: ZoneFogConfig): SplatData[] {
  const particles: SplatData[] = [];
  const { position, radius, particleCount, particleSize, color, density } = config;

  for (let i = 0; i < particleCount; i++) {
    // Random spherical distribution
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = Math.cbrt(Math.random()) * radius; // Cubic root for uniform distribution

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    particles.push({
      position: new THREE.Vector3(
        position.x + x,
        position.y + y,
        position.z + z
      ),
      scale: new THREE.Vector3(
        particleSize * (0.8 + Math.random() * 0.4),
        particleSize * (0.8 + Math.random() * 0.4),
        particleSize * 0.5
      ),
      rotation: new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        )
      ),
      color: color.clone(),
      alpha: density * (0.3 + Math.random() * 0.2), // Varied opacity
    });
  }

  return particles;
}

/**
 * FogBank Component — Volumetric fog rendering for zone boundaries
 *
 * @example
 * ```tsx
 * <FogBank
 *   config={{
 *     ...DEFAULT_ZONE_FOG_CONFIGS.east,
 *     isUnlocked: false,
 *   }}
 *   dissipationSpeed={0.5}
 *   animate
 * />
 * ```
 */
export function FogBank({
  config,
  dissipationSpeed = 0.5,
  animate = true
}: FogBankProps) {
  const meshRef = useRef<THREE.Points>(null);
  const poolRef = useRef<SplatPool | null>(null);
  const currentDensity = useRef(config.density);
  const targetDensity = useRef(config.isUnlocked ? 0 : config.density);
  const timeRef = useRef(0);

  // Initialize splat pool
  const particles = useMemo(() => generateFogParticles(config), [config.zone]);

  // Create geometry and material
  const { geometry, material } = useMemo(() => {
    const pool = new SplatPool(config.particleCount);
    poolRef.current = pool;

    // Fill pool with particles
    particles.forEach((particle, i) => {
      pool.setSplat(i, particle);
    });
    pool.setActiveCount(particles.length);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pool.getPositionArray(), 3));
    geo.setAttribute('scale', new THREE.BufferAttribute(pool.getScaleArray(), 3));
    geo.setAttribute('rotation', new THREE.BufferAttribute(pool.getRotationArray(), 4));
    geo.setAttribute('color', new THREE.BufferAttribute(pool.getColorArray(), 3));
    geo.setAttribute('alpha', new THREE.BufferAttribute(pool.getAlphaArray(), 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uDensity: { value: config.density },
        uFogColor: { value: config.color },
      },
      vertexShader: fogVertexShader,
      fragmentShader: fogFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { geometry: geo, material: mat };
  }, [config.zone, config.particleCount, particles]);

  // Update fog density and animation
  useFrame((state, delta) => {
    if (!meshRef.current || !material.uniforms) return;

    // Update target density based on unlock state
    targetDensity.current = config.isUnlocked ? 0 : config.density;

    // Smooth density transition
    const densityDiff = targetDensity.current - currentDensity.current;
    currentDensity.current += densityDiff * dissipationSpeed * delta * 2;

    // Update uniforms
    material.uniforms.uDensity.value = currentDensity.current;
    material.uniforms.uFogColor.value = config.color;

    if (animate) {
      timeRef.current += delta;
      material.uniforms.uTime.value = timeRef.current;
    }

    // Update alpha attribute for density changes
    if (poolRef.current) {
      const alphaArray = poolRef.current.getAlphaArray();
      particles.forEach((particle, i) => {
        alphaArray[i] = particle.alpha * currentDensity.current;
      });
      const alphaAttr = geometry.getAttribute('alpha');
      if (alphaAttr) alphaAttr.needsUpdate = true;
    }
  });

  return (
    <points ref={meshRef} geometry={geometry} material={material} frustumCulled={false} />
  );
}

/** Fog vertex shader */
const fogVertexShader = `
  attribute vec3 scale;
  attribute vec4 rotation;
  attribute vec3 color;
  attribute float alpha;

  uniform float uTime;
  uniform float uDensity;

  varying vec3 vColor;
  varying float vAlpha;

  vec3 rotateByQuaternion(vec3 v, vec4 q) {
    return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
  }

  void main() {
    vColor = color;
    vAlpha = alpha * uDensity;

    // Gentle drift animation
    vec3 driftOffset = vec3(
      sin(uTime * 0.2 + position.x * 0.1) * 0.3,
      cos(uTime * 0.15 + position.y * 0.1) * 0.2,
      sin(uTime * 0.1 + position.z * 0.1) * 0.3
    );

    vec3 animated = position + driftOffset;
    vec3 transformed = rotateByQuaternion(animated, rotation) * scale;

    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = 100.0 * scale.x * (10.0 / -mvPosition.z);
  }
`;

/** Fog fragment shader */
const fogFragmentShader = `
  uniform vec3 uFogColor;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);

    if (dist > 0.5) discard;

    // Soft gaussian falloff
    float gaussian = exp(-dist * dist * 6.0);

    // Mix particle color with fog color
    vec3 finalColor = mix(vColor, uFogColor, 0.5);

    gl_FragColor = vec4(finalColor, vAlpha * gaussian);
  }
`;

/**
 * Multi-zone fog system wrapper
 * Renders fog for all zones based on unlock state
 */
export interface MultiZoneFogProps {
  /** Zone unlock states */
  unlockStates: Record<ZoneId, boolean>;
  /** Custom fog configs (optional) */
  configs?: Partial<Record<ZoneId, Partial<ZoneFogConfig>>>;
  /** Global dissipation speed */
  dissipationSpeed?: number;
}

export function MultiZoneFog({
  unlockStates,
  configs = {},
  dissipationSpeed = 0.5
}: MultiZoneFogProps) {
  const zones: ZoneId[] = ['north', 'east', 'west', 'south'];

  return (
    <>
      {zones.map((zone) => {
        const defaultConfig = DEFAULT_ZONE_FOG_CONFIGS[zone];
        const customConfig = configs[zone] || {};

        const finalConfig: ZoneFogConfig = {
          ...defaultConfig,
          ...customConfig,
          isUnlocked: unlockStates[zone],
        };

        return (
          <FogBank
            key={zone}
            config={finalConfig}
            dissipationSpeed={dissipationSpeed}
            animate
          />
        );
      })}
    </>
  );
}
