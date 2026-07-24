/**
 * Stone of Intention Ritual Component
 * P4-S1-15: Stone of Intention with distance-based damping
 *
 * The stone is a physical object the vessel carries toward the fire circle.
 * As distance decreases, resistance (damping) increases using easeInQuad curve.
 * Damping: 1.0 to 8.0 over 35 units (distance from West zone position).
 */

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, type RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';

/** Collision layer for ritual objects */
export const RITUAL_COLLISION_LAYER = 0x0004;

/** Stone of Intention configuration */
export interface StoneConfig {
  /** Stone radius */
  radius: number;
  /** Initial mass */
  mass: number;
  /** Base damping at max distance */
  baseDamping: number;
  /** Max damping at fire circle */
  maxDamping: number;
  /** Distance range for damping curve */
  dampingDistance: number;
  /** Fire circle position (West zone) */
  fireCirclePosition: THREE.Vector3;
}

/** Default stone configuration */
export const DEFAULT_STONE_CONFIG: StoneConfig = {
  radius: 0.25,
  mass: 2.5,
  baseDamping: 1.0,
  maxDamping: 8.0,
  dampingDistance: 35.0,
  fireCirclePosition: new THREE.Vector3(-35, 0, 0),
};

/** Stone state */
export interface StoneState {
  /** Current position */
  position: THREE.Vector3;
  /** Distance to fire circle */
  distanceToFire: number;
  /** Current damping value */
  currentDamping: number;
  /** Is stone in fire circle */
  isInFire: boolean;
  /** Is stone burning */
  isBurning: boolean;
}

/** Stone of Intention component props */
export interface StoneOfIntentionProps {
  /** Initial position */
  position?: [number, number, number];
  /** Configuration override */
  config?: Partial<StoneConfig>;
  /** Callback when stone enters fire */
  onEnterFire?: () => void;
  /** Callback when stone state changes */
  onStateChange?: (state: StoneState) => void;
}

/**
 * Calculate damping using easeInQuad curve
 * t: 0-1 (distance normalized)
 * Returns: baseDamping to maxDamping
 */
function easeInQuad(t: number): number {
  return t * t;
}

/**
 * Calculate damping from distance using easeInQuad
 */
function calculateDamping(
  distance: number,
  config: StoneConfig
): number {
  // Normalize distance (0 = at fire, 1 = max distance away)
  const normalizedDist = Math.min(
    1,
    Math.max(0, distance / config.dampingDistance)
  );

  // Invert so close = high damping
  const invertedDist = 1 - normalizedDist;

  // Apply easeInQuad curve
  const curve = easeInQuad(invertedDist);

  // Map to damping range
  const damping = config.baseDamping +
    (config.maxDamping - config.baseDamping) * curve;

  return damping;
}

/**
 * Stone of Intention R3F Component
 * Physical stone object with distance-based resistance
 */
export function StoneOfIntention({
  position = [0, 2, 5],
  config: configOverride,
  onEnterFire,
  onStateChange,
}: StoneOfIntentionProps) {
  const config = { ...DEFAULT_STONE_CONFIG, ...configOverride };
  const stoneRef = useRef<RapierRigidBody>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const stateRef = useRef<StoneState>({
    position: new THREE.Vector3(...position),
    distanceToFire: 0,
    currentDamping: config.baseDamping,
    isInFire: false,
    isBurning: false,
  });

  // Update damping based on distance to fire circle
  useFrame(() => {
    if (!stoneRef.current) return;

    const translation = stoneRef.current.translation();
    const stonePos = new THREE.Vector3(translation.x, translation.y, translation.z);

    // Calculate distance to fire circle (ignore Y for horizontal distance)
    const firePos2D = new THREE.Vector2(
      config.fireCirclePosition.x,
      config.fireCirclePosition.z
    );
    const stonePos2D = new THREE.Vector2(stonePos.x, stonePos.z);
    const distance = firePos2D.distanceTo(stonePos2D);

    // Calculate and apply damping
    const damping = calculateDamping(distance, config);
    stoneRef.current.setLinearDamping(damping);

    // Update state
    const prevState = stateRef.current;
    stateRef.current = {
      position: stonePos,
      distanceToFire: distance,
      currentDamping: damping,
      isInFire: prevState.isInFire,
      isBurning: prevState.isBurning,
    };

    // Fire state change callback
    if (onStateChange) {
      onStateChange(stateRef.current);
    }

    // Update visual (glow based on proximity)
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      const proximity = 1 - Math.min(1, distance / config.dampingDistance);
      material.emissiveIntensity = proximity * 0.5;
    }
  });

  // Collision detection for fire circle entry
  const handleCollisionEnter = () => {
    if (!stateRef.current.isInFire) {
      stateRef.current.isInFire = true;
      console.log('[StoneOfIntention] Entered fire circle');
      if (onEnterFire) {
        onEnterFire();
      }
    }
  };

  return (
    <RigidBody
      ref={stoneRef}
      position={position}
      colliders="ball"
      mass={config.mass}
      linearDamping={config.baseDamping}
      angularDamping={0.5}
      restitution={0.3}
      friction={0.7}
      collisionGroups={RITUAL_COLLISION_LAYER}
      onCollisionEnter={handleCollisionEnter}
    >
      <mesh ref={meshRef} castShadow receiveShadow>
        <sphereGeometry args={[config.radius, 32, 32]} />
        <meshStandardMaterial
          color="#6B6B6B"
          roughness={0.8}
          metalness={0.2}
          emissive="#C5A442"
          emissiveIntensity={0}
        />
      </mesh>
    </RigidBody>
  );
}

/**
 * Get current stone state (for external use)
 */
export function getStoneState(stoneRef: React.RefObject<RapierRigidBody>): StoneState | null {
  if (!stoneRef.current) return null;

  const translation = stoneRef.current.translation();
  const position = new THREE.Vector3(translation.x, translation.y, translation.z);
  const firePos = DEFAULT_STONE_CONFIG.fireCirclePosition;
  const distance = new THREE.Vector2(position.x, position.z)
    .distanceTo(new THREE.Vector2(firePos.x, firePos.z));

  return {
    position,
    distanceToFire: distance,
    currentDamping: calculateDamping(distance, DEFAULT_STONE_CONFIG),
    isInFire: distance < 2.0,
    isBurning: false,
  };
}
