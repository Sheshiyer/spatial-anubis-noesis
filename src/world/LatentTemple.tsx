/**
 * Latent Temple — Static atmospheric 3D world geometry
 * Wave 1: "First Light" — Obsidian floor, monolith ring, atmospheric lighting
 *
 * Spec reference: Doc 01 (Latent Temple architecture)
 * Brand palette: Deep Ink #1A1A2E, Bone #F5F0E8, Aged Gold #B8860B, Terracotta #C65D3B
 */

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ============================================================================
// Constants
// ============================================================================

const FLOOR_RADIUS = 60;
const MONOLITH_COUNT = 8;
const MONOLITH_RING_RADIUS = 25;
const MONOLITH_HEIGHT = 12;
const MONOLITH_WIDTH = 1.5;
const MONOLITH_DEPTH = 0.8;

// Brand colors
const DEEP_INK = '#1A1A2E';
const OBSIDIAN = '#0D0D1A';
const BONE = '#F5F0E8';
const AGED_GOLD = '#B8860B';
const STONE_GREY = '#3A3A4A';

// ============================================================================
// Sub-components
// ============================================================================

/** Obsidian floor disc */
function TempleFloor() {
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: OBSIDIAN,
        roughness: 0.85,
        metalness: 0.15,
        envMapIntensity: 0.3,
      }),
    []
  );

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
      <circleGeometry args={[FLOOR_RADIUS, 64]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

/** Single monolith pillar */
function Monolith({
  position,
  rotation,
}: {
  position: [number, number, number];
  rotation: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: STONE_GREY,
        roughness: 0.7,
        metalness: 0.3,
        emissive: AGED_GOLD,
        emissiveIntensity: 0.02,
      }),
    []
  );

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={[0, rotation, 0]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[MONOLITH_WIDTH, MONOLITH_HEIGHT, MONOLITH_DEPTH]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

/** Ring of monolith pillars */
function MonolithRing() {
  const monoliths = useMemo(() => {
    const items: { position: [number, number, number]; rotation: number }[] = [];
    for (let i = 0; i < MONOLITH_COUNT; i++) {
      const angle = (i / MONOLITH_COUNT) * Math.PI * 2;
      const x = Math.cos(angle) * MONOLITH_RING_RADIUS;
      const z = Math.sin(angle) * MONOLITH_RING_RADIUS;
      items.push({
        position: [x, MONOLITH_HEIGHT / 2 - 0.5, z],
        rotation: angle + Math.PI / 2,
      });
    }
    return items;
  }, []);

  return (
    <group>
      {monoliths.map((m, i) => (
        <Monolith key={i} position={m.position} rotation={m.rotation} />
      ))}
    </group>
  );
}

/** Atmospheric lighting rig per spec */
function TempleLighting() {
  const pointLightRef = useRef<THREE.PointLight>(null);

  // Subtle gold light flicker
  useFrame(({ clock }) => {
    if (pointLightRef.current) {
      const t = clock.getElapsedTime();
      pointLightRef.current.intensity = 0.4 + Math.sin(t * 0.5) * 0.05;
    }
  });

  return (
    <>
      {/* Ambient: Deep Ink tone */}
      <ambientLight intensity={0.08} color={DEEP_INK} />

      {/* Key light: Bone from above-right */}
      <directionalLight
        position={[10, 20, 10]}
        intensity={0.6}
        color={BONE}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.1}
        shadow-camera-far={100}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />

      {/* Rim light: Gold from behind-left */}
      <directionalLight position={[-8, 5, -10]} intensity={0.3} color={AGED_GOLD} />

      {/* Center point light: subtle Gold glow */}
      <pointLight
        ref={pointLightRef}
        position={[0, 3, 0]}
        intensity={0.4}
        color={AGED_GOLD}
        distance={40}
        decay={2}
      />

      {/* North accent: faint glow toward Breathfield */}
      <pointLight position={[0, 2, -40]} intensity={0.15} color={BONE} distance={30} decay={2} />
    </>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function LatentTemple() {
  return (
    <group>
      <TempleLighting />
      <TempleFloor />
      <MonolithRing />
    </group>
  );
}
