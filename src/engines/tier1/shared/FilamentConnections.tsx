/**
 * Inter-Engine Filament Connections (P3-S1-28)
 * Golden threads between consulted engines
 */

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useTier1EngineStore } from './engineStore';
import { getAbsolutePosition } from './types';
import type { EngineId, FilamentConnection } from './types';

// ============================================================================
// Filament Line Component
// ============================================================================

interface FilamentLineProps {
  connection: FilamentConnection;
}

const FilamentLine: React.FC<FilamentLineProps> = ({ connection }) => {
  const lineRef = useRef<THREE.Line>(null);
  const materialRef = useRef<THREE.LineBasicMaterial>(null);
  
  const { fromEngine, toEngine, strength, pulsePhase } = connection;
  
  // Get absolute positions
  const startPos = useMemo(() => getAbsolutePosition(fromEngine), [fromEngine]);
  const endPos = useMemo(() => getAbsolutePosition(toEngine), [toEngine]);
  
  // Create geometry
  const geometry = useMemo(() => {
    const points = [startPos, endPos];
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [startPos, endPos]);

  // Animate pulse
  useFrame(({ clock }) => {
    if (materialRef.current) {
      // Pulse travels along filament (4 second cycle)
      const time = clock.getElapsedTime();
      const pulse = Math.sin(time * Math.PI * 0.5 + pulsePhase) * 0.5 + 0.5;
      
      // Opacity based on strength + pulse
      const baseOpacity = strength * 0.3;
      materialRef.current.opacity = baseOpacity + pulse * 0.2 * strength;
      
      // Color intensity
      const intensity = 0.5 + pulse * 0.5;
      materialRef.current.color.setHex(0xB8860B); // Aged Gold
      materialRef.current.color.multiplyScalar(intensity);
    }
  });

  return (
    <line ref={lineRef} geometry={geometry}>
      <lineBasicMaterial
        ref={materialRef}
        color="#B8860B"
        transparent
        opacity={strength * 0.3}
        linewidth={1} // Note: linewidth > 1 only works in some browsers
      />
    </line>
  );
};

// ============================================================================
// Main Filament Connections Component
// ============================================================================

export const FilamentConnections: React.FC = () => {
  const filaments = useTier1EngineStore((state) => state.filaments);

  if (filaments.length === 0) return null;

  return (
    <group name="filament-connections">
      {filaments.map((connection, index) => (
        <FilamentLine 
          key={`${connection.fromEngine}-${connection.toEngine}-${index}`}
          connection={connection}
        />
      ))}
    </group>
  );
};

// ============================================================================
// Animated Particle Burst (P3-S1-32, P3-S1-33)
// ============================================================================

interface ParticleBurstProps {
  position: THREE.Vector3;
  color?: string;
  count?: number;
  onComplete?: () => void;
}

export const ParticleBurst: React.FC<ParticleBurstProps> = ({
  position,
  color = '#B8860B',
  count = 30,
  onComplete,
}) => {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  
  // Initialize particle positions and velocities
  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel: THREE.Vector3[] = [];
    
    for (let i = 0; i < count; i++) {
      pos[i * 3] = position.x;
      pos[i * 3 + 1] = position.y;
      pos[i * 3 + 2] = position.z;
      
      // Random outward velocity
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 2 + Math.random() * 3;
      
      vel.push(new THREE.Vector3(
        speed * Math.sin(phi) * Math.cos(theta),
        speed * Math.cos(phi),
        speed * Math.sin(phi) * Math.sin(theta)
      ));
    }
    
    return { positions: pos, velocities: vel };
  }, [position, count]);

  // Animation state
  const animationState = useRef({
    elapsed: 0,
    duration: 0.5, // 500ms burst
  });

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    
    animationState.current.elapsed += delta;
    const { elapsed, duration } = animationState.current;
    const progress = elapsed / duration;
    
    if (progress >= 1) {
      onComplete?.();
      return;
    }
    
    const posArray = pointsRef.current.geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < count; i++) {
      const vel = velocities[i];
      posArray[i * 3] += vel.x * delta;
      posArray[i * 3 + 1] += vel.y * delta;
      posArray[i * 3 + 2] += vel.z * delta;
    }
    
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    
    // Fade out
    if (materialRef.current) {
      materialRef.current.opacity = 1 - progress;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        color={color}
        size={0.1}
        transparent
        opacity={1}
        sizeAttenuation
      />
    </points>
  );
};

// ============================================================================
// Loading Glow Effect (P3-S1-33)
// ============================================================================

interface LoadingGlowProps {
  position: THREE.Vector3;
  active: boolean;
}

export const LoadingGlow: React.FC<LoadingGlowProps> = ({ position, active }) => {
  const lightRef = useRef<THREE.PointLight>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!active || !lightRef.current || !meshRef.current) return;
    
    // Pulsing glow during loading
    const pulse = Math.sin(clock.getElapsedTime() * 3) * 0.3 + 0.7;
    lightRef.current.intensity = pulse * 2;
    
    const scale = 1 + pulse * 0.2;
    meshRef.current.scale.set(scale, scale, scale);
  });

  if (!active) return null;

  return (
    <group position={position}>
      <pointLight
        ref={lightRef}
        color="#B8860B"
        intensity={2}
        distance={10}
        decay={2}
      />
      <mesh ref={meshRef}>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshBasicMaterial
          color="#B8860B"
          transparent
          opacity={0.1}
        />
      </mesh>
    </group>
  );
};
