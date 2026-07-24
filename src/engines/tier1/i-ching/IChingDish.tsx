/**
 * I-Ching Stone Dish (P3-S1-01)
 * Stone dish on pedestal with Dark Stone material
 */

import React from 'react';
import * as THREE from 'three';
import { DEFAULT_DISH_CONFIG } from './types';

// ============================================================================
// Props
// ============================================================================

interface IChingDishProps {
  position?: THREE.Vector3;
}

// ============================================================================
// Component
// ============================================================================

export const IChingDish: React.FC<IChingDishProps> = ({
  position = DEFAULT_DISH_CONFIG.position,
}) => {
  const dishRadius = DEFAULT_DISH_CONFIG.radius;
  const dishHeight = 0.15;
  const pedestalHeight = 1.0;
  const pedestalRadius = 0.4;

  // Dark Stone material for pedestal
  const pedestalMaterial = new THREE.MeshStandardMaterial({
    color: 0x1A1A2E, // Deep Ink
    roughness: 0.9,
    metalness: 0.1,
  });

  // Bone stone material for dish
  const dishMaterial = new THREE.MeshStandardMaterial({
    color: 0xF5F0E8, // Bone
    roughness: 0.8,
    metalness: 0.2,
  });

  // Terracotta accent
  const accentMaterial = new THREE.MeshStandardMaterial({
    color: 0xC65D3B, // Terracotta
    roughness: 0.7,
    metalness: 0.3,
    emissive: 0xC65D3B,
    emissiveIntensity: 0.1,
  });

  return (
    <group position={position}>
      {/* Pedestal */}
      <mesh position={[0, pedestalHeight / 2, 0]} material={pedestalMaterial}>
        <cylinderGeometry args={[pedestalRadius, pedestalRadius * 1.2, pedestalHeight, 8]} />
      </mesh>

      {/* Dish base */}
      <mesh 
        position={[0, pedestalHeight + dishHeight / 2, 0]} 
        material={dishMaterial}
      >
        <cylinderGeometry args={[dishRadius, dishRadius * 0.8, dishHeight, 32]} />
      </mesh>

      {/* Dish inner bowl (slightly recessed) */}
      <mesh 
        position={[0, pedestalHeight + dishHeight - 0.02, 0]} 
        material={dishMaterial}
      >
        <cylinderGeometry args={[dishRadius * 0.9, dishRadius * 0.7, 0.04, 32]} />
      </mesh>

      {/* Terracotta veining on pedestal (decorative) */}
      <mesh position={[0, pedestalHeight * 0.7, pedestalRadius]} material={accentMaterial}>
        <boxGeometry args={[0.05, 0.3, 0.02]} />
      </mesh>
      <mesh position={[0, pedestalHeight * 0.4, pedestalRadius]} material={accentMaterial}>
        <boxGeometry args={[0.03, 0.2, 0.02]} />
      </mesh>

      {/* Ambient glow ring around dish */}
      <mesh position={[0, pedestalHeight + 0.05, 0]}>
        <ringGeometry args={[dishRadius + 0.05, dishRadius + 0.08, 32]} />
        <meshBasicMaterial 
          color="#B8860B" 
          transparent 
          opacity={0.2} 
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};
