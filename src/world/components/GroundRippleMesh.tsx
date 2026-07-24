/**
 * Ground Ripple Mesh Component
 * P2-S1-11: Ground displacement with radial wave effect
 * 
 * Renders the ground plane with ripple vertex displacement
 * that expands outward from the world center during reveal.
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { groundRippleVertexShader, groundRippleFragmentShader } from '../shaders';

interface GroundRippleMeshProps {
  /** Whether ripple is active */
  active?: boolean;
  /** Ripple origin position (default: 0,0,0) */
  origin?: THREE.Vector3;
  /** Ripple expansion speed (units/sec) */
  speed?: number;
  /** Ripple amplitude (displacement amount) */
  amplitude?: number;
  /** Ripple frequency */
  frequency?: number;
  /** Ripple decay rate */
  decay?: number;
  /** Size of the ground plane */
  size?: number;
  /** Segments for displacement resolution */
  segments?: number;
  /** Duration of ripple effect (seconds) */
  duration?: number;
  /** Called when ripple completes */
  onComplete?: () => void;
  /** Debug mode */
  debug?: boolean;
}

/**
 * Ground Ripple Mesh
 * 
 * Creates an expanding radial wave on a ground mesh using
 * vertex displacement in the shader.
 */
export const GroundRippleMesh: React.FC<GroundRippleMeshProps> = ({
  active = true,
  origin = new THREE.Vector3(0, 0, 0),
  speed = 15,
  amplitude = 0.5,
  frequency = 2,
  decay = 0.8,
  size = 200,
  segments = 128,
  duration = 5,
  onComplete,
  debug = false,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const [startTime] = useState(() => performance.now());
  const [isActive, setIsActive] = useState(active);

  // Stable uniforms object — mutated in useFrame, never recreated
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uOrigin: { value: origin.clone() },
    uSpeed: { value: speed },
    uAmplitude: { value: amplitude },
    uFrequency: { value: frequency },
    uDecay: { value: decay },
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update active state
  useEffect(() => {
    setIsActive(active);
  }, [active]);

  // Animation loop
  useFrame(() => {
    if (!isActive) return;

    const elapsed = (performance.now() - startTime) / 1000;

    // Update shader uniforms directly
    uniforms.uTime.value = elapsed;
    uniforms.uOrigin.value.copy(origin);

    // Check for completion
    if (elapsed > duration) {
      setIsActive(false);
      onComplete?.();
    }
  });

  if (!isActive) return null;

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -2, 0]}
      receiveShadow
    >
      <planeGeometry args={[size, size, segments, segments]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={groundRippleVertexShader}
        fragmentShader={groundRippleFragmentShader}
        uniforms={uniforms}
        transparent={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

/**
 * Ground Ripple Effect
 * 
 * Renders only the ripple effect without a visible ground plane.
 * Used as a transient effect during world reveal.
 */
export const GroundRippleEffect: React.FC<{
  progress: number;
  origin?: THREE.Vector3;
  radius?: number;
}> = ({ progress, origin = new THREE.Vector3(0, 0, 0), radius = 50 }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  // Create ripple rings
  const rings = React.useMemo(() => {
    const count = 5;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      offset: i * 0.2,
      speed: 1 + i * 0.3,
    }));
  }, []);
  
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    
    const time = clock.getElapsedTime();
    const currentRadius = progress * radius;
    
    groupRef.current.children.forEach((child, i) => {
      const ring = rings[i];
      if (!ring) return;
      
      const mesh = child as THREE.Mesh;
      const ringProgress = Math.max(0, Math.min(1, 
        (progress - ring.offset) / (1 - ring.offset)
      ));
      
      const ringRadius = currentRadius * ring.speed * 0.8;
      const ringOpacity = (1 - ringProgress) * (1 - progress * 0.5);
      
      mesh.scale.setScalar(ringRadius);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.copy(origin);
      mesh.position.y = -1;
      
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.opacity = ringOpacity * 0.3;
    });
  });
  
  if (progress <= 0) return null;
  
  return (
    <group ref={groupRef}>
      {rings.map(ring => (
        <mesh key={ring.id}>
          <ringGeometry args={[0.9, 1, 64]} />
          <meshBasicMaterial
            color="#B8860B"
            transparent
            opacity={0}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
};

export default GroundRippleMesh;
