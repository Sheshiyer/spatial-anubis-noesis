/**
 * Breathfield Cloud — Procedural particle cloud at North position
 * Wave 1: "First Light" — Breathing animation, Gold-to-Bone palette
 *
 * Spec reference: Doc 01 (Breathfield at North cardinal zone)
 * No webcam needed — purely decorative particle system
 */

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ============================================================================
// Constants
// ============================================================================

const PARTICLE_COUNT = 800;
const CLOUD_RADIUS = 8;
const CLOUD_HEIGHT = 6;
const BREATH_FREQUENCY = 0.15; // Hz — slow, meditative breathing
const BREATH_AMPLITUDE = 0.12; // 12% scale variation

// Brand colors
const AGED_GOLD = new THREE.Color('#B8860B');
const BONE = new THREE.Color('#F5F0E8');

// ============================================================================
// Component
// ============================================================================

interface BreathfieldCloudProps {
  position?: [number, number, number];
}

export function BreathfieldCloud({ position = [0, 5, -50] }: BreathfieldCloudProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const basePositions = useRef<Float32Array | null>(null);

  // Generate initial particle positions in an ellipsoidal cloud
  const { positions, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Gaussian-distributed ellipsoid
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.pow(Math.random(), 0.5) * CLOUD_RADIUS;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * (CLOUD_HEIGHT / CLOUD_RADIUS);
      positions[i * 3 + 2] = r * Math.cos(phi) * 0.6;

      // Color: mix between Aged Gold and Bone based on distance from center
      const distNorm = r / CLOUD_RADIUS;
      const mixColor = new THREE.Color().lerpColors(AGED_GOLD, BONE, distNorm * 0.7);
      colors[i * 3] = mixColor.r;
      colors[i * 3 + 1] = mixColor.g;
      colors[i * 3 + 2] = mixColor.b;

      // Size: larger in center, smaller at edges
      sizes[i] = 0.08 + (1 - distNorm) * 0.15;
    }

    basePositions.current = new Float32Array(positions);
    return { positions, colors, sizes };
  }, []);

  // Breathing animation: expand/contract the cloud
  useFrame(({ clock }) => {
    if (!pointsRef.current || !basePositions.current) return;

    const t = clock.getElapsedTime();
    const breathPhase = Math.sin(t * BREATH_FREQUENCY * Math.PI * 2);
    const scale = 1.0 + breathPhase * BREATH_AMPLITUDE;

    const posAttr = pointsRef.current.geometry.getAttribute('position');
    if (!posAttr) return;

    const posArray = posAttr.array as Float32Array;
    const base = basePositions.current;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      // Scale from center + slight turbulence
      const turbulence = Math.sin(t * 0.3 + i * 0.1) * 0.05;
      posArray[i3] = base[i3]! * (scale + turbulence);
      posArray[i3 + 1] = base[i3 + 1]! * (scale + turbulence * 0.5);
      posArray[i3 + 2] = base[i3 + 2]! * scale;
    }

    posAttr.needsUpdate = true;

    // Gentle rotation
    pointsRef.current.rotation.y = t * 0.02;
  });

  return (
    <points ref={pointsRef} position={position}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={PARTICLE_COUNT} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={PARTICLE_COUNT} array={colors} itemSize={3} />
        <bufferAttribute attach="attributes-size" count={PARTICLE_COUNT} array={sizes} itemSize={1} />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        vertexColors
        transparent
        opacity={0.7}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
