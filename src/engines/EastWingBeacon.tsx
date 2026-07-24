/**
 * East Wing Beacon
 * Pulsing gold navigation beacon visible from temple center
 * Click to transition camera to East Wing / back to Temple
 */

import React, { useRef, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ============================================================================
// Types
// ============================================================================

interface EastWingBeaconProps {
  /** Whether this is the "go to East Wing" or "return to Temple" beacon */
  variant: 'east-wing' | 'temple-return';
  /** Called when beacon is clicked */
  onClick: () => void;
  /** Whether navigation is currently in progress */
  disabled?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const BEACON_POSITIONS = {
  'east-wing': [50, 5, 0] as [number, number, number],
  'temple-return': [0, 5, 0] as [number, number, number],
} as const;

const BEACON_COLORS = {
  'east-wing': '#D4AF37',
  'temple-return': '#F5F0E8',
} as const;

// ============================================================================
// Component
// ============================================================================

export const EastWingBeacon: React.FC<EastWingBeaconProps> = ({
  variant,
  onClick,
  disabled = false,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const position = BEACON_POSITIONS[variant];
  const color = BEACON_COLORS[variant];

  // Pulsing animation
  useFrame((state) => {
    const t = state.clock.elapsedTime;

    if (coreRef.current) {
      const pulse = 1.0 + Math.sin(t * 2) * 0.15;
      coreRef.current.scale.set(pulse, pulse, pulse);
    }

    if (glowRef.current) {
      const glowPulse = 1.0 + Math.sin(t * 1.5) * 0.3;
      glowRef.current.scale.set(glowPulse, glowPulse, glowPulse);
      (glowRef.current.material as THREE.MeshStandardMaterial).opacity =
        0.15 + Math.sin(t * 2) * 0.1;
    }

    if (groupRef.current) {
      groupRef.current.rotation.y += 0.005;
    }
  });

  const handleClick = useCallback(() => {
    if (!disabled) onClick();
  }, [disabled, onClick]);

  return (
    <group ref={groupRef} position={position}>
      {/* Core geometry */}
      <mesh
        ref={coreRef}
        onClick={handleClick}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <octahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 1.2 : 0.8}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Outer glow sphere */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[1.5, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          transparent
          opacity={0.15}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Point light for bloom effect */}
      <pointLight
        color={color}
        intensity={hovered ? 2 : 1}
        distance={15}
        decay={2}
      />
    </group>
  );
};

export default EastWingBeacon;
