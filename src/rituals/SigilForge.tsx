/**
 * Sigil Forge Anvil Component
 * P4-S1-18: Anvil with sweet spot visual indicator
 *
 * Sigil Forge anvil at West zone.
 * Sweet spot is 0.5 unit radius center with Aged Gold glow.
 * Crystal is placed on anvil for striking.
 * Uses MeshStandardMaterial with emissive for sweet spot.
 */

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, type RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { RITUAL_COLLISION_LAYER } from './StoneOfIntention';

/** Sigil Forge configuration */
export interface SigilForgeConfig {
  /** Anvil position (West zone, near fire circle) */
  position: THREE.Vector3;
  /** Anvil base dimensions */
  baseSize: THREE.Vector3;
  /** Sweet spot radius */
  sweetSpotRadius: number;
  /** Sweet spot glow color (Aged Gold) */
  sweetSpotColor: THREE.Color;
  /** Sweet spot glow intensity */
  sweetSpotIntensity: number;
  /** Anvil material color (Stone Grey) */
  anvilColor: THREE.Color;
}

/** Default forge config */
export const DEFAULT_FORGE_CONFIG: SigilForgeConfig = {
  position: new THREE.Vector3(-32, 0.5, 0),
  baseSize: new THREE.Vector3(2, 0.5, 1.5),
  sweetSpotRadius: 0.5,
  sweetSpotColor: new THREE.Color(0xC5A442), // Aged Gold
  sweetSpotIntensity: 1.0,
  anvilColor: new THREE.Color(0x6B6B6B), // Stone Grey
};

/** Forge state */
export interface ForgeState {
  /** Is crystal placed on anvil */
  hasCrystal: boolean;
  /** Is crystal in sweet spot */
  isInSweetSpot: boolean;
  /** Distance from sweet spot center */
  distanceFromCenter: number;
  /** Has been struck */
  hasBeenStruck: boolean;
  /** Strike count */
  strikeCount: number;
}

/** Sigil Forge component props */
export interface SigilForgeProps {
  /** Position override */
  position?: [number, number, number];
  /** Configuration override */
  config?: Partial<SigilForgeConfig>;
  /** Callback when crystal placed */
  onCrystalPlaced?: (isInSweetSpot: boolean) => void;
  /** Callback when struck */
  onStrike?: (isInSweetSpot: boolean, distance: number) => void;
}

/**
 * Sigil Forge R3F Component
 * Anvil with visual sweet spot indicator
 */
export function SigilForge({
  position,
  config: configOverride,
  onCrystalPlaced,
  onStrike,
}: SigilForgeProps) {
  const config = { ...DEFAULT_FORGE_CONFIG, ...configOverride };
  const forgePos = position
    ? new THREE.Vector3(...position)
    : config.position;

  const anvilRef = useRef<RapierRigidBody>(null);
  const sweetSpotRef = useRef<THREE.Mesh>(null);

  const [forgeState, setForgeState] = useState<ForgeState>({
    hasCrystal: false,
    isInSweetSpot: false,
    distanceFromCenter: 0,
    hasBeenStruck: false,
    strikeCount: 0,
  });

  // Pulse sweet spot glow
  useFrame((state) => {
    if (!sweetSpotRef.current) return;

    const material = sweetSpotRef.current.material as THREE.MeshStandardMaterial;

    // Pulse effect when no crystal
    if (!forgeState.hasCrystal) {
      const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.3 + 0.7;
      material.emissiveIntensity = config.sweetSpotIntensity * pulse;
    } else if (forgeState.isInSweetSpot) {
      // Strong glow when crystal in sweet spot
      material.emissiveIntensity = config.sweetSpotIntensity * 1.5;
    } else {
      // Dim when crystal placed but not in sweet spot
      material.emissiveIntensity = config.sweetSpotIntensity * 0.3;
    }
  });

  // Handle crystal placement
  const handleCrystalPlace = (crystalPosition: THREE.Vector3) => {
    const sweetSpotCenter = new THREE.Vector3(
      forgePos.x,
      forgePos.y + config.baseSize.y / 2,
      forgePos.z
    );

    const distance = new THREE.Vector2(
      crystalPosition.x - sweetSpotCenter.x,
      crystalPosition.z - sweetSpotCenter.z
    ).length();

    const isInSweetSpot = distance <= config.sweetSpotRadius;

    console.log('[SigilForge] Crystal placed', {
      distance,
      isInSweetSpot,
    });

    setForgeState(prev => ({
      ...prev,
      hasCrystal: true,
      isInSweetSpot,
      distanceFromCenter: distance,
    }));

    if (onCrystalPlaced) {
      onCrystalPlaced(isInSweetSpot);
    }
  };

  // Handle strike
  const handleStrike = () => {
    console.log('[SigilForge] Anvil struck', {
      isInSweetSpot: forgeState.isInSweetSpot,
      distance: forgeState.distanceFromCenter,
    });

    setForgeState(prev => ({
      ...prev,
      hasBeenStruck: true,
      strikeCount: prev.strikeCount + 1,
    }));

    if (onStrike) {
      onStrike(forgeState.isInSweetSpot, forgeState.distanceFromCenter);
    }
  };

  return (
    <group position={[forgePos.x, forgePos.y, forgePos.z]}>
      {/* Anvil base (fixed rigid body) */}
      <RigidBody
        ref={anvilRef}
        type="fixed"
        colliders="cuboid"
        collisionGroups={RITUAL_COLLISION_LAYER}
      >
        <mesh castShadow receiveShadow>
          <boxGeometry args={[
            config.baseSize.x,
            config.baseSize.y,
            config.baseSize.z,
          ]} />
          <meshStandardMaterial
            color={config.anvilColor}
            roughness={0.9}
            metalness={0.3}
          />
        </mesh>
      </RigidBody>

      {/* Sweet spot indicator (visual only) */}
      <mesh
        ref={sweetSpotRef}
        position={[0, config.baseSize.y / 2 + 0.01, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[config.sweetSpotRadius, 32]} />
        <meshStandardMaterial
          color={config.sweetSpotColor}
          emissive={config.sweetSpotColor}
          emissiveIntensity={config.sweetSpotIntensity}
          transparent
          opacity={0.8}
          roughness={0.2}
          metalness={0.5}
        />
      </mesh>

      {/* Sweet spot rim (outline) */}
      <mesh
        position={[0, config.baseSize.y / 2 + 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[
          config.sweetSpotRadius * 0.95,
          config.sweetSpotRadius,
          32,
        ]} />
        <meshStandardMaterial
          color={config.sweetSpotColor}
          emissive={config.sweetSpotColor}
          emissiveIntensity={config.sweetSpotIntensity * 2}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Ambient forge glow */}
      <pointLight
        color={config.sweetSpotColor}
        intensity={2}
        distance={5}
        decay={2}
        position={[0, config.baseSize.y / 2 + 1, 0]}
      />
    </group>
  );
}

/**
 * Check if position is within sweet spot
 */
export function isInSweetSpot(
  position: THREE.Vector3,
  forgeConfig: SigilForgeConfig = DEFAULT_FORGE_CONFIG
): boolean {
  const sweetSpotCenter = new THREE.Vector3(
    forgeConfig.position.x,
    forgeConfig.position.y + forgeConfig.baseSize.y / 2,
    forgeConfig.position.z
  );

  const distance = new THREE.Vector2(
    position.x - sweetSpotCenter.x,
    position.z - sweetSpotCenter.z
  ).length();

  return distance <= forgeConfig.sweetSpotRadius;
}

/**
 * Calculate distance from sweet spot center
 */
export function getDistanceFromSweetSpot(
  position: THREE.Vector3,
  forgeConfig: SigilForgeConfig = DEFAULT_FORGE_CONFIG
): number {
  const sweetSpotCenter = new THREE.Vector3(
    forgeConfig.position.x,
    forgeConfig.position.y + forgeConfig.baseSize.y / 2,
    forgeConfig.position.z
  );

  return new THREE.Vector2(
    position.x - sweetSpotCenter.x,
    position.z - sweetSpotCenter.z
  ).length();
}

/**
 * Get sweet spot quality rating (0-1)
 * 1.0 = perfect center, 0.0 = outside sweet spot
 */
export function getSweetSpotQuality(
  position: THREE.Vector3,
  forgeConfig: SigilForgeConfig = DEFAULT_FORGE_CONFIG
): number {
  const distance = getDistanceFromSweetSpot(position, forgeConfig);
  if (distance >= forgeConfig.sweetSpotRadius) return 0;

  return 1 - (distance / forgeConfig.sweetSpotRadius);
}
