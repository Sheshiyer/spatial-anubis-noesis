/**
 * Somatic Canticle Artifact
 * P4-S1-10: Glowing geometric object at vessel chest (Heart Center)
 *
 * Dodecahedron geometry with emissive Aged Gold material.
 * Orbits vessel chest position. Scale pulses with coherence.
 */

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/** Somatic Canticle Artifact props */
export interface SomaticCanticleArtifactProps {
  /** Vessel chest position in world space */
  vesselChestPosition: THREE.Vector3;
  /** Bio-coherence value (0-100) */
  coherence: number;
  /** Whether artifact is engaged (activated by head tilt) */
  isEngaged: boolean;
  /** Orbit speed multiplier */
  orbitSpeed?: number;
  /** Base scale */
  baseScale?: number;
  /** Pulse amplitude */
  pulseAmplitude?: number;
}

/** Default constants */
const ARTIFACT_CONSTANTS = {
  BASE_SCALE: 0.2,
  ORBIT_RADIUS: 0.5,
  ORBIT_SPEED: 0.5, // Radians per second
  PULSE_AMPLITUDE: 0.15,
  PULSE_SPEED: 2.0,
  ENGAGED_SCALE_MULTIPLIER: 1.5,
  GLOW_INTENSITY_BASE: 1.0,
  GLOW_INTENSITY_MAX: 3.0,
} as const;

/**
 * Somatic Canticle Artifact Component
 * Dodecahedron that orbits vessel chest and pulses with bio-coherence
 */
export const SomaticCanticleArtifact: React.FC<SomaticCanticleArtifactProps> = ({
  vesselChestPosition,
  coherence,
  isEngaged,
  orbitSpeed = ARTIFACT_CONSTANTS.ORBIT_SPEED,
  baseScale = ARTIFACT_CONSTANTS.BASE_SCALE,
  pulseAmplitude = ARTIFACT_CONSTANTS.PULSE_AMPLITUDE,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);
  const orbitAngleRef = useRef(0);

  // Aged Gold color
  const agedGold = new THREE.Color(0xC5A442);

  // Update artifact position and animation
  useFrame((_, delta) => {
    if (!meshRef.current) return;

    timeRef.current += delta;

    // Update orbit angle
    orbitAngleRef.current += delta * orbitSpeed;

    // Calculate orbit position around vessel chest
    const orbitRadius = ARTIFACT_CONSTANTS.ORBIT_RADIUS;
    const orbitX = Math.cos(orbitAngleRef.current) * orbitRadius;
    const orbitZ = Math.sin(orbitAngleRef.current) * orbitRadius;

    // Position relative to vessel chest
    meshRef.current.position.set(
      vesselChestPosition.x + orbitX,
      vesselChestPosition.y,
      vesselChestPosition.z + orbitZ
    );

    // Calculate scale based on coherence and engagement
    const coherenceNorm = coherence / 100;
    const pulseFactor =
      1.0 +
      Math.sin(timeRef.current * ARTIFACT_CONSTANTS.PULSE_SPEED) *
        pulseAmplitude *
        coherenceNorm;

    let scale = baseScale * pulseFactor;

    // Increase scale when engaged
    if (isEngaged) {
      scale *= ARTIFACT_CONSTANTS.ENGAGED_SCALE_MULTIPLIER;
    }

    meshRef.current.scale.setScalar(scale);

    // Rotate artifact
    meshRef.current.rotation.x += delta * 0.5;
    meshRef.current.rotation.y += delta * 0.7;

    // Update material emission based on coherence
    const material = meshRef.current.material as THREE.MeshStandardMaterial;
    if (material.emissiveIntensity !== undefined) {
      const glowIntensity =
        ARTIFACT_CONSTANTS.GLOW_INTENSITY_BASE +
        (ARTIFACT_CONSTANTS.GLOW_INTENSITY_MAX - ARTIFACT_CONSTANTS.GLOW_INTENSITY_BASE) *
          coherenceNorm;

      material.emissiveIntensity = glowIntensity;
    }
  });

  return (
    <mesh ref={meshRef}>
      {/* Dodecahedron geometry */}
      <dodecahedronGeometry args={[1, 0]} />

      {/* Emissive material */}
      <meshStandardMaterial
        color={agedGold}
        emissive={agedGold}
        emissiveIntensity={ARTIFACT_CONSTANTS.GLOW_INTENSITY_BASE}
        metalness={0.8}
        roughness={0.2}
        transparent={true}
        opacity={0.9}
      />

      {/* Inner glow (point light) */}
      <pointLight
        color={agedGold}
        intensity={coherence / 100}
        distance={2}
        decay={2}
      />
    </mesh>
  );
};

/**
 * Calculate vessel chest position from vessel position
 * Assumes vessel is humanoid with chest at +1.2 units Y from center
 */
export function calculateChestPosition(vesselPosition: THREE.Vector3): THREE.Vector3 {
  return new THREE.Vector3(vesselPosition.x, vesselPosition.y + 1.2, vesselPosition.z);
}

export default SomaticCanticleArtifact;
