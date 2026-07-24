/**
 * Sigil Crystal Shatter Effect
 * P4-S1-20: Reckless strike crystal shatter
 *
 * Reckless strike (momentum > 30.0) breaks the crystal.
 * SparkJS shard particles flying outward.
 * Crystal fragments with physics.
 * If shattered, ritual must restart from stone.
 */

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, type RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';

/** Shard particle data */
interface ShardParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  rotation: THREE.Euler;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
}

/** Shatter configuration */
export interface ShatterConfig {
  /** Number of shard particles */
  shardCount: number;
  /** Explosion force multiplier */
  explosionForce: number;
  /** Shard lifetime (seconds) */
  shardLifetime: number;
  /** Shard base color (crystal color) */
  shardColor: THREE.Color;
  /** Glow color (Aged Gold) */
  glowColor: THREE.Color;
  /** Particle size range */
  sizeRange: { min: number; max: number };
}

/** Default shatter config */
export const DEFAULT_SHATTER_CONFIG: ShatterConfig = {
  shardCount: 50,
  explosionForce: 8.0,
  shardLifetime: 2.0,
  shardColor: new THREE.Color(0xC5A442), // Aged Gold
  glowColor: new THREE.Color(0xD4AF37), // Bright Gold
  sizeRange: { min: 0.05, max: 0.15 },
};

/** Shatter state */
export type ShatterState = 'idle' | 'shattering' | 'complete';

/** Shatter event data */
export interface ShatterEvent {
  /** Shatter position */
  position: THREE.Vector3;
  /** Impact momentum */
  momentum: number;
  /** Timestamp */
  timestamp: number;
}

/** Sigil Shatter component props */
export interface SigilShatterProps {
  /** Shatter position */
  position: [number, number, number];
  /** Impact momentum */
  momentum: number;
  /** Configuration override */
  config?: Partial<ShatterConfig>;
  /** Callback when shatter starts */
  onShatterStart?: (event: ShatterEvent) => void;
  /** Callback when shatter complete */
  onShatterComplete?: () => void;
  /** Auto-start shatter */
  autoStart?: boolean;
}

/**
 * Sigil Shatter R3F Component
 * Particle explosion effect with physics shards
 */
export function SigilShatter({
  position,
  momentum,
  config: configOverride,
  onShatterStart,
  onShatterComplete,
  autoStart = true,
}: SigilShatterProps) {
  const config = { ...DEFAULT_SHATTER_CONFIG, ...configOverride };

  const particlesRef = useRef<ShardParticle[]>([]);
  const pointsRef = useRef<THREE.Points>(null);
  const stateRef = useRef<ShatterState>('idle');
  const elapsedTimeRef = useRef(0);

  const shatterPos = new THREE.Vector3(...position);

  // Initialize shatter particles
  const initializeShatter = () => {
    console.log('[SigilShatter] Initializing shatter particles');

    particlesRef.current = [];

    for (let i = 0; i < config.shardCount; i++) {
      // Random direction for explosion
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const force = config.explosionForce * (0.5 + Math.random() * 0.5);

      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * force,
        Math.abs(Math.cos(phi)) * force * 1.5, // Bias upward
        Math.sin(phi) * Math.sin(theta) * force
      );

      // Random angular velocity
      const angularVelocity = new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      );

      // Random size
      const size =
        config.sizeRange.min +
        Math.random() * (config.sizeRange.max - config.sizeRange.min);

      // Color variation (mix shard and glow colors)
      const colorMix = Math.random();
      const color = new THREE.Color().lerpColors(
        config.shardColor,
        config.glowColor,
        colorMix
      );

      particlesRef.current.push({
        position: shatterPos.clone(),
        velocity,
        angularVelocity,
        rotation: new THREE.Euler(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        ),
        life: 0,
        maxLife: config.shardLifetime * (0.8 + Math.random() * 0.4),
        size,
        color,
      });
    }

    stateRef.current = 'shattering';
    elapsedTimeRef.current = 0;

    // Fire start event
    if (onShatterStart) {
      onShatterStart({
        position: shatterPos,
        momentum,
        timestamp: performance.now(),
      });
    }
  };

  // Auto-start shatter on mount
  useEffect(() => {
    if (autoStart) {
      initializeShatter();
    }
  }, [autoStart]);

  // Update shatter particles
  useFrame((state, delta) => {
    if (stateRef.current !== 'shattering') return;

    elapsedTimeRef.current += delta;
    const particles = particlesRef.current;

    // Update particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Update life
      p.life += delta;

      // Update position (physics simulation)
      p.velocity.y -= 9.81 * delta; // Gravity
      p.position.add(p.velocity.clone().multiplyScalar(delta));

      // Update rotation
      p.rotation.x += p.angularVelocity.x * delta;
      p.rotation.y += p.angularVelocity.y * delta;
      p.rotation.z += p.angularVelocity.z * delta;

      // Fade velocity (air resistance)
      p.velocity.multiplyScalar(0.98);
    }

    // Update points geometry
    if (pointsRef.current) {
      const positions = new Float32Array(particles.length * 3);
      const colors = new Float32Array(particles.length * 3);
      const sizes = new Float32Array(particles.length);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const lifeRatio = p.life / p.maxLife;
        const alpha = 1 - lifeRatio; // Fade out

        positions[i * 3] = p.position.x;
        positions[i * 3 + 1] = p.position.y;
        positions[i * 3 + 2] = p.position.z;

        // Brighten color early, fade to base later
        const brightness = 1 + (1 - lifeRatio) * 2;
        colors[i * 3] = p.color.r * brightness;
        colors[i * 3 + 1] = p.color.g * brightness;
        colors[i * 3 + 2] = p.color.b * brightness;

        sizes[i] = p.size * alpha;
      }

      pointsRef.current.geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(positions, 3)
      );
      pointsRef.current.geometry.setAttribute(
        'color',
        new THREE.BufferAttribute(colors, 3)
      );
      pointsRef.current.geometry.setAttribute(
        'size',
        new THREE.BufferAttribute(sizes, 1)
      );

      pointsRef.current.geometry.attributes.position.needsUpdate = true;
      pointsRef.current.geometry.attributes.color.needsUpdate = true;
      pointsRef.current.geometry.attributes.size.needsUpdate = true;
    }

    // Check for completion
    const allExpired = particles.every(p => p.life >= p.maxLife);
    if (allExpired) {
      stateRef.current = 'complete';
      console.log('[SigilShatter] Shatter complete');

      if (onShatterComplete) {
        onShatterComplete();
      }
    }
  });

  return (
    <group>
      {/* Shatter particles */}
      {stateRef.current === 'shattering' && (
        <points ref={pointsRef}>
          <bufferGeometry />
          <pointsMaterial
            size={0.2}
            transparent
            vertexColors
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            sizeAttenuation
          />
        </points>
      )}

      {/* Flash light at shatter point */}
      {elapsedTimeRef.current < 0.2 && (
        <pointLight
          position={position}
          color={config.glowColor}
          intensity={50 * (1 - elapsedTimeRef.current / 0.2)}
          distance={10}
          decay={2}
        />
      )}
    </group>
  );
}

/**
 * Create physical shard fragments (optional, for more realistic physics)
 */
export function createPhysicalShards(
  position: THREE.Vector3,
  count: number = 8,
  explosionForce: number = 8.0
): Array<{
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  size: THREE.Vector3;
}> {
  const shards = [];

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const force = explosionForce * (0.5 + Math.random() * 0.5);

    const velocity = new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta) * force,
      Math.abs(Math.cos(phi)) * force * 1.5,
      Math.sin(phi) * Math.sin(theta) * force
    );

    const angularVelocity = new THREE.Vector3(
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10
    );

    const size = new THREE.Vector3(
      0.05 + Math.random() * 0.1,
      0.05 + Math.random() * 0.1,
      0.05 + Math.random() * 0.1
    );

    shards.push({
      position: position.clone(),
      velocity,
      angularVelocity,
      size,
    });
  }

  return shards;
}

/**
 * Trigger shatter sound effect (placeholder for audio integration)
 */
export function playShatterSound(momentum: number): void {
  const volume = Math.min(1, momentum / 40);
  console.log(`[SigilShatter] Play shatter sound at volume ${volume.toFixed(2)}`);
  // TODO: Integrate with AudioEngine
}
