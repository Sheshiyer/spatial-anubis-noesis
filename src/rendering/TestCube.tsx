import { useRef } from 'react';
import { Mesh } from 'three';
import { useFrame } from '@react-three/fiber';

/**
 * Test cube component for validating Three.js/R3F rendering
 * P0-S1-10: Rotating cube at 60fps
 */
export function TestCube() {
  const meshRef = useRef<Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.5;
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#B8860B" roughness={0.3} metalness={0.7} />
    </mesh>
  );
}
