/**
 * Engine 7: Gene Keys Helix Component
 * P3-S2-04: Rotating DNA double helix, 64 nodes, luminous light strands
 * P3-S2-05: Shadow-Gift-Siddhi layer interaction
 */

import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { GeneKeysProfile, GeneKey } from '../tier2/types';

interface GeneKeysHelixProps {
  profile: GeneKeysProfile | null;
  position?: [number, number, number];
  currentLayer?: 'shadow' | 'gift' | 'siddhi';
  onStrandClick?: (geneKey: GeneKey) => void;
}

const LAYER_COLORS = {
  shadow: '#6B6B6B',    // Stone Grey
  gift: '#B8860B',      // Aged Gold
  siddhi: '#D4AF37',    // Bright Gold
};

/**
 * Generate helix positions
 */
function generateHelixPositions(
  count: number,
  radius: number,
  height: number,
  turns: number
): Array<{ inner: THREE.Vector3; outer: THREE.Vector3 }> {
  const positions = [];
  for (let i = 0; i < count; i++) {
    const t = (i / count) * turns * Math.PI * 2;
    const y = (i / count) * height - height / 2;
    
    const inner = new THREE.Vector3(
      Math.cos(t) * radius,
      y,
      Math.sin(t) * radius
    );
    
    const outer = new THREE.Vector3(
      Math.cos(t + Math.PI) * radius,
      y,
      Math.sin(t + Math.PI) * radius
    );
    
    positions.push({ inner, outer });
  }
  return positions;
}

export function GeneKeysHelix({
  profile,
  position = [0, 0, 0],
  currentLayer = 'gift',
  onStrandClick,
}: GeneKeysHelixProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [selectedStrand, setSelectedStrand] = useState<number | null>(null);
  const [hoveredStrand, setHoveredStrand] = useState<number | null>(null);

  // Rotation animation
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  // Generate positions
  const positions = useMemo(() => 
    generateHelixPositions(64, 2, 8, 6),
    []
  );

  // Get color based on activation and layer
  const getNodeColor = (geneKey: GeneKey | undefined, isActive: boolean): string => {
    if (!geneKey) return LAYER_COLORS.shadow;
    if (isActive) return '#F5F0E8'; // Bone white for active
    return LAYER_COLORS[currentLayer];
  };

  return (
    <group ref={groupRef} position={position}>
      {/* DNA strands (luminous light) */}
      {positions.map((pos, i) => {
        if (i === 0) return null;
        const prevPos = positions[i - 1];
        
        return (
          <group key={`strand-${i}`}>
            {/* Inner strand connection */}
            <mesh>
              <cylinderGeometry
                args={[0.02, 0.02, prevPos.inner.distanceTo(pos.inner), 4]}
              />
              <meshStandardMaterial
                color={LAYER_COLORS[currentLayer]}
                emissive={LAYER_COLORS[currentLayer]}
                emissiveIntensity={0.3}
                transparent
                opacity={0.6}
              />
            </mesh>
            
            {/* Outer strand connection */}
            <mesh>
              <cylinderGeometry
                args={[0.02, 0.02, prevPos.outer.distanceTo(pos.outer), 4]}
              />
              <meshStandardMaterial
                color={LAYER_COLORS[currentLayer]}
                emissive={LAYER_COLORS[currentLayer]}
                emissiveIntensity={0.3}
                transparent
                opacity={0.6}
              />
            </mesh>
          </group>
        );
      })}

      {/* 64 Nodes */}
      {positions.map((pos, i) => {
        const geneKey = profile?.allKeys[i];
        const isSelected = selectedStrand === i;
        const isHovered = hoveredStrand === i;
        const isActive = isSelected || isHovered;
        
        return (
          <group key={`node-${i}`}>
            {/* Inner node */}
            <mesh
              position={pos.inner}
              onClick={() => {
                setSelectedStrand(isSelected ? null : i);
                if (geneKey) onStrandClick?.(geneKey);
              }}
              onPointerEnter={() => setHoveredStrand(i)}
              onPointerLeave={() => setHoveredStrand(null)}
            >
              <sphereGeometry args={[isActive ? 0.12 : 0.08, 16, 16]} />
              <meshStandardMaterial
                color={getNodeColor(geneKey, isActive)}
                emissive={getNodeColor(geneKey, isActive)}
                emissiveIntensity={isActive ? 0.8 : 0.4}
              />
            </mesh>
            
            {/* Outer node */}
            <mesh position={pos.outer}>
              <sphereGeometry args={[isActive ? 0.12 : 0.08, 16, 16]} />
              <meshStandardMaterial
                color={getNodeColor(geneKey, isActive)}
                emissive={getNodeColor(geneKey, isActive)}
                emissiveIntensity={isActive ? 0.8 : 0.4}
              />
            </mesh>
            
            {/* Connection rung */}
            <mesh position={[
              (pos.inner.x + pos.outer.x) / 2,
              (pos.inner.y + pos.outer.y) / 2,
              (pos.inner.z + pos.outer.z) / 2
            ]}>
              <cylinderGeometry
                args={[0.01, 0.01, pos.inner.distanceTo(pos.outer), 4]}
                rotation={[0, 0, Math.PI / 2]}
              />
              <meshStandardMaterial
                color={LAYER_COLORS[currentLayer]}
                transparent
                opacity={0.3}
              />
            </mesh>
          </group>
        );
      })}

      {/* Activation markers for key spheres */}
      {profile && [profile.lifesWork, profile.purpose, profile.pearl].map((key, i) => {
        if (!key) return null;
        const pos = positions[key.number - 1];
        if (!pos) return null;
        
        return (
          <mesh key={`activation-${i}`} position={[pos.inner.x, pos.inner.y, pos.inner.z + 0.2]}>
            <ringGeometry args={[0.15, 0.18, 16]} />
            <meshBasicMaterial color="#D4AF37" transparent opacity={0.8} />
          </mesh>
        );
      })}
    </group>
  );
}
