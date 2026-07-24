/**
 * East Wing Constellation
 * Top-level R3F group mounting all 3 engine tiers in the East Wing
 *
 * Layout (from cartographerStore):
 *   East Wing Center: [50, 0, 0]
 *   Tier 1 (inner ring, r=5, y=-1): 5 engines at 72° intervals
 *   Tier 2 (middle ring, r=10, y=0): 4 engines at 90° intervals
 *   Tier 3 (outer ring, r=15, y=2): 3 engines at 120° intervals
 *   Cartographer: r=17, orbiting
 */

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Tier1EnginesManager } from './tier1/Tier1EnginesManager';
import { Tier2EnginesManager } from './tier2/Tier2EnginesManager';
import { Tier3EnginesManager } from './tier3/Tier3EnginesManager';
import { useCartographerStore, selectCartographerPosition } from './meta/cartographerStore';
import { useEngineManagerBridge } from './useEngineManagerBridge';

// ============================================================================
// Cartographer Compass Orbit Marker
// ============================================================================

const CartographerOrbitMarker: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const updateOrbit = useCartographerStore((s) => s.updateCartographerOrbit);
  const cartographerPos = useCartographerStore(selectCartographerPosition);

  useFrame((_, delta) => {
    updateOrbit(delta);

    if (meshRef.current) {
      // Position relative to east wing center (subtract 50 from x for local space)
      meshRef.current.position.set(
        cartographerPos.x - 50,
        cartographerPos.y,
        cartographerPos.z
      );
      meshRef.current.rotation.y += delta * 0.5;
      meshRef.current.rotation.z += delta * 0.3;
    }
  });

  return (
    <mesh ref={meshRef}>
      <octahedronGeometry args={[0.4, 0]} />
      <meshStandardMaterial
        color="#B8860B"
        emissive="#D4AF37"
        emissiveIntensity={0.6}
        transparent
        opacity={0.8}
      />
    </mesh>
  );
};

// ============================================================================
// Constellation Ambient Lighting
// ============================================================================

const ConstellationLighting: React.FC = () => (
  <>
    {/* Central warm light for the constellation */}
    <pointLight
      position={[0, 3, 0]}
      color="#B8860B"
      intensity={0.3}
      distance={25}
      decay={2}
    />
    {/* Subtle cool rim light from above */}
    <pointLight
      position={[0, 12, 0]}
      color="#4A6080"
      intensity={0.15}
      distance={30}
      decay={2}
    />
  </>
);

// ============================================================================
// Main Component
// ============================================================================

interface EastWingConstellationProps {
  /** Whether the constellation is visible */
  visible?: boolean;
}

export const EastWingConstellation: React.FC<EastWingConstellationProps> = ({
  visible = true,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const updateRotation = useCartographerStore((s) => s.updateConstellationRotation);

  // Bridge EngineManager events ↔ cartographerStore visual state
  useEngineManagerBridge();

  // Slow overall constellation rotation
  useFrame((_, delta) => {
    updateRotation(delta);
  });

  if (!visible) return null;

  return (
    <group ref={groupRef} position={[50, 0, 0]} name="east-wing-constellation">
      <ConstellationLighting />

      {/* Tier 1: Inner Ring — Ancient Instruments (r=5, y=-1) */}
      <Tier1EnginesManager />

      {/* Tier 2: Middle Ring — Biological Mirrors (r=10, y=0) */}
      <Tier2EnginesManager />

      {/* Tier 3: Outer Ring — Synthesis Instruments (r=15, y=2) */}
      <Tier3EnginesManager />

      {/* Cartographer Compass — orbiting all rings */}
      <CartographerOrbitMarker />
    </group>
  );
};

export default EastWingConstellation;
