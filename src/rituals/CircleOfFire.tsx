/**
 * Circle of Fire Ritual Component
 * P4-S1-16: Fire circle collider and ignition effect
 *
 * Circle of Fire at West zone position (-35, 0, 0).
 * When Stone of Intention enters, it ignites with SparkJS fire particles.
 * Rapier sensor collider detects stone entry.
 */

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, type RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { RITUAL_COLLISION_LAYER } from './StoneOfIntention';

/** Fire circle configuration */
export interface FireCircleConfig {
  /** Circle position (West zone) */
  position: THREE.Vector3;
  /** Circle radius */
  radius: number;
  /** Fire particle count */
  particleCount: number;
  /** Fire color (Terracotta) */
  fireColor: THREE.Color;
  /** Ember color (Aged Gold) */
  emberColor: THREE.Color;
  /** Flame height */
  flameHeight: number;
}

/** Default fire circle config */
export const DEFAULT_FIRE_CIRCLE_CONFIG: FireCircleConfig = {
  position: new THREE.Vector3(-35, 0, 0),
  radius: 2.0,
  particleCount: 300,
  fireColor: new THREE.Color(0xC45B28), // Terracotta
  emberColor: new THREE.Color(0xC5A442), // Aged Gold
  flameHeight: 3.0,
};

/** Fire state */
export interface FireState {
  /** Is fire ignited */
  isIgnited: boolean;
  /** Fire intensity (0-1) */
  intensity: number;
  /** Has stone entered */
  hasStoneEntered: boolean;
  /** Burn progress (0-1) */
  burnProgress: number;
}

/** Fire particle */
interface FireParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
}

/** Circle of Fire component props */
export interface CircleOfFireProps {
  /** Position override */
  position?: [number, number, number];
  /** Configuration override */
  config?: Partial<FireCircleConfig>;
  /** Callback when stone enters */
  onStoneEnter?: () => void;
  /** Callback when burning starts */
  onIgnite?: () => void;
  /** Callback when burn complete */
  onBurnComplete?: () => void;
}

/**
 * Circle of Fire R3F Component
 * Sensor collider with fire particle effect
 */
export function CircleOfFire({
  position,
  config: configOverride,
  onStoneEnter,
  onIgnite,
  onBurnComplete,
}: CircleOfFireProps) {
  const config = { ...DEFAULT_FIRE_CIRCLE_CONFIG, ...configOverride };
  const firePos = position
    ? new THREE.Vector3(...position)
    : config.position;

  const sensorRef = useRef<RapierRigidBody>(null);
  const particlesRef = useRef<FireParticle[]>([]);
  const pointsRef = useRef<THREE.Points>(null);

  const [fireState, setFireState] = useState<FireState>({
    isIgnited: false,
    intensity: 0,
    hasStoneEntered: false,
    burnProgress: 0,
  });

  // Initialize fire particles
  const initializeParticles = () => {
    particlesRef.current = [];
    for (let i = 0; i < config.particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * config.radius * 0.8;

      particlesRef.current.push({
        position: new THREE.Vector3(
          firePos.x + Math.cos(angle) * radius,
          firePos.y,
          firePos.z + Math.sin(angle) * radius
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          Math.random() * 2 + 1,
          (Math.random() - 0.5) * 0.5
        ),
        life: Math.random(),
        maxLife: 1.0 + Math.random() * 0.5,
        size: 0.1 + Math.random() * 0.2,
        color: Math.random() > 0.3 ? config.fireColor.clone() : config.emberColor.clone(),
      });
    }
  };

  // Handle stone entry
  const handleCollisionEnter = () => {
    if (!fireState.hasStoneEntered) {
      console.log('[CircleOfFire] Stone entered fire circle');
      setFireState(prev => ({ ...prev, hasStoneEntered: true }));

      if (onStoneEnter) {
        onStoneEnter();
      }

      // Ignite fire
      setTimeout(() => {
        console.log('[CircleOfFire] Fire ignited');
        setFireState(prev => ({ ...prev, isIgnited: true }));
        initializeParticles();

        if (onIgnite) {
          onIgnite();
        }
      }, 500);
    }
  };

  // Update fire particles
  useFrame((state, delta) => {
    if (!fireState.isIgnited) return;

    // Update intensity (fade in over 1s)
    if (fireState.intensity < 1.0) {
      const newIntensity = Math.min(1.0, fireState.intensity + delta);
      setFireState(prev => ({ ...prev, intensity: newIntensity }));
    }

    // Update burn progress (5s burn time)
    if (fireState.burnProgress < 1.0) {
      const newProgress = Math.min(1.0, fireState.burnProgress + delta / 5.0);
      setFireState(prev => ({ ...prev, burnProgress: newProgress }));

      // Fire complete callback
      if (newProgress >= 1.0 && onBurnComplete) {
        onBurnComplete();
      }
    }

    // Update particles
    const particles = particlesRef.current;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Update life
      p.life += delta;
      if (p.life >= p.maxLife) {
        // Respawn particle
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * config.radius * 0.8;
        p.position.set(
          firePos.x + Math.cos(angle) * radius,
          firePos.y,
          firePos.z + Math.sin(angle) * radius
        );
        p.velocity.set(
          (Math.random() - 0.5) * 0.5,
          Math.random() * 2 + 1,
          (Math.random() - 0.5) * 0.5
        );
        p.life = 0;
        p.color = Math.random() > 0.3 ? config.fireColor.clone() : config.emberColor.clone();
      }

      // Update position
      p.position.add(p.velocity.clone().multiplyScalar(delta));

      // Apply turbulence
      p.position.x += Math.sin(state.clock.elapsedTime * 2 + i) * 0.01;
      p.position.z += Math.cos(state.clock.elapsedTime * 2 + i) * 0.01;

      // Fade velocity
      p.velocity.y -= delta * 0.5;
    }

    // Update points geometry
    if (pointsRef.current) {
      const positions = new Float32Array(particles.length * 3);
      const colors = new Float32Array(particles.length * 3);
      const sizes = new Float32Array(particles.length);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const lifeRatio = p.life / p.maxLife;
        const alpha = 1 - lifeRatio;

        positions[i * 3] = p.position.x;
        positions[i * 3 + 1] = p.position.y;
        positions[i * 3 + 2] = p.position.z;

        colors[i * 3] = p.color.r;
        colors[i * 3 + 1] = p.color.g;
        colors[i * 3 + 2] = p.color.b;

        sizes[i] = p.size * alpha * fireState.intensity;
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
  });

  return (
    <group position={[firePos.x, firePos.y, firePos.z]}>
      {/* Sensor collider for stone detection */}
      <RigidBody
        ref={sensorRef}
        type="fixed"
        sensor
        colliders="ball"
        args={[config.radius]}
        collisionGroups={RITUAL_COLLISION_LAYER}
        onIntersectionEnter={handleCollisionEnter}
      >
        <mesh visible={false}>
          <sphereGeometry args={[config.radius, 16, 16]} />
        </mesh>
      </RigidBody>

      {/* Fire circle ring (visual indicator) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[config.radius * 0.9, config.radius, 32]} />
        <meshStandardMaterial
          color={fireState.isIgnited ? config.fireColor : "#6B6B6B"}
          emissive={fireState.isIgnited ? config.emberColor : "#000000"}
          emissiveIntensity={fireState.intensity * 0.5}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Fire particles */}
      {fireState.isIgnited && (
        <points ref={pointsRef}>
          <bufferGeometry />
          <pointsMaterial
            size={0.3}
            transparent
            opacity={fireState.intensity}
            vertexColors
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            sizeAttenuation
          />
        </points>
      )}

      {/* Ambient fire glow */}
      {fireState.isIgnited && (
        <pointLight
          color={config.emberColor}
          intensity={fireState.intensity * 5}
          distance={10}
          decay={2}
          position={[0, 1, 0]}
        />
      )}
    </group>
  );
}
