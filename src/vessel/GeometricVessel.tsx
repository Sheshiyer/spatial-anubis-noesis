/**
 * Path B Geometric Vessel Component
 * P1-S1-20: Implement Path B geometric fallback
 * - Icosahedron vessel when webcam denied
 * - Deep Ink coloring
 * - Visible wireframe edges
 */

import { useRef, useMemo } from 'react';
import { Mesh, IcosahedronGeometry, MeshStandardMaterial, LineSegments, EdgesGeometry, LineBasicMaterial } from 'three';
import { useFrame } from '@react-three/fiber';
import { useStore } from '../state/store';

/** Props for geometric vessel */
export interface GeometricVesselProps {
  /** Whether vessel is spawned */
  isSpawned?: boolean;
}

/**
 * Path B Geometric Vessel
 * Icosahedron with wireframe edges as fallback when webcam is denied
 */
export function GeometricVessel({ isSpawned = true }: GeometricVesselProps) {
  const meshRef = useRef<Mesh>(null);
  const wireframeRef = useRef<LineSegments>(null);
  
  const vesselTransform = useStore((state) => state.vessel.transform);
  const bioState = useStore((state) => state.vessel.bioState);

  // Create icosahedron geometry
  const geometry = useMemo(() => {
    return new IcosahedronGeometry(0.5, 1); // Radius 0.5, detail 1
  }, []);

  // Create edges geometry for wireframe
  const edgesGeometry = useMemo(() => {
    return new EdgesGeometry(geometry);
  }, [geometry]);

  // Main material - Deep Ink coloring with Aged Gold highlights based on coherence
  const material = useMemo(() => {
    return new MeshStandardMaterial({
      color: '#1A1A2E', // Deep Ink
      emissive: '#B8860B', // Aged Gold
      emissiveIntensity: bioState.coherence * 0.5,
      roughness: 0.4,
      metalness: 0.6,
      transparent: true,
      opacity: 0.9,
    });
  }, [bioState.coherence]);

  // Wireframe material
  const wireframeMaterial = useMemo(() => {
    return new LineBasicMaterial({
      color: '#B8860B', // Aged Gold wireframe
      transparent: true,
      opacity: 0.3 + bioState.coherence * 0.4,
    });
  }, [bioState.coherence]);

  // Breathing animation
  useFrame(({ clock }) => {
    if (!meshRef.current || !wireframeRef.current || !isSpawned) return;

    // P1-S1-11: Breathing expansion
    // Scale = 1.0 + lqd * breathingIntensity
    const breathingIntensity = 0.1; // 5-15% visible expansion
    const breathScale = 1.0 + bioState.lqd * breathingIntensity;
    
    // Add subtle sine wave for continuous breathing feel
    const time = clock.getElapsedTime();
    const breathCycle = Math.sin(time * 2) * 0.02 * bioState.lqd;
    const finalScale = breathScale + breathCycle;

    meshRef.current.scale.setScalar(finalScale);
    wireframeRef.current.scale.setScalar(finalScale);

    // P1-S1-24: Turbulence at high entropy
    if (bioState.entropy > 0) {
      const turbulence = bioState.entropy * 0.02;
      meshRef.current.position.x = vesselTransform.position.x + (Math.random() - 0.5) * turbulence;
      meshRef.current.position.y = vesselTransform.position.y + (Math.random() - 0.5) * turbulence;
      meshRef.current.position.z = vesselTransform.position.z + (Math.random() - 0.5) * turbulence;
    } else {
      meshRef.current.position.copy(vesselTransform.position);
    }

    // Rotation damping - slowly return to upright
    meshRef.current.quaternion.slerp(vesselTransform.rotation, 0.1);
    wireframeRef.current.position.copy(meshRef.current.position);
    wireframeRef.current.quaternion.copy(meshRef.current.quaternion);
  });

  if (!isSpawned) return null;

  return (
    <group>
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        position={vesselTransform.position}
        quaternion={vesselTransform.rotation}
      />
      <lineSegments
        ref={wireframeRef}
        geometry={edgesGeometry}
        material={wireframeMaterial}
        position={vesselTransform.position}
        quaternion={vesselTransform.rotation}
      />
    </group>
  );
}
