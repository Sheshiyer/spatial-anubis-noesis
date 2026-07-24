/**
 * Engine 8: Human Design Bodygraph Component
 * P3-S2-07: 9-center wireframe constellation
 * P3-S2-08: Center highlighting (defined=Gold, undefined=Stone Grey)
 * P3-S2-09: Strategy/Authority ambient visualization
 */

import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { HDProfile, HDCenter, HDCenterData } from '../tier2/types';

interface HumanDesignBodygraphProps {
  profile: HDProfile | null;
  position?: [number, number, number];
  audioPlaying?: boolean;
  onCenterClick?: (center: HDCenterData) => void;
}

const CENTER_SHAPES: Record<HDCenter, { geometry: string; args: number[] }> = {
  head: { geometry: 'triangle', args: [0.4, 0.4] },
  ajna: { geometry: 'triangle', args: [0.35, 0.35] },
  throat: { geometry: 'square', args: [0.5, 0.3] },
  g: { geometry: 'diamond', args: [0.4, 0.4] },
  heart: { geometry: 'triangle', args: [0.3, 0.3] },
  sacral: { geometry: 'square', args: [0.4, 0.4] },
  spleen: { geometry: 'diamond', args: [0.35, 0.35] },
  solarPlexus: { geometry: 'triangle', args: [0.35, 0.35] },
  root: { geometry: 'square', args: [0.45, 0.25] },
};

/**
 * Create center geometry based on shape type
 */
function createCenterGeometry(shape: string, args: number[]): THREE.BufferGeometry {
  switch (shape) {
    case 'triangle':
      return new THREE.ConeGeometry(args[0], args[1], 3);
    case 'diamond':
      return new THREE.ConeGeometry(args[0], args[1], 4);
    case 'square':
    default:
      return new THREE.BoxGeometry(args[0], args[1], 0.1);
  }
}

export function HumanDesignBodygraph({
  profile,
  position = [0, 0, 0],
  audioPlaying = false,
  onCenterClick,
}: HumanDesignBodygraphProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hoveredCenter, setHoveredCenter] = useState<HDCenter | null>(null);

  // Audio visualization pulse
  useFrame((state) => {
    if (audioPlaying && groupRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.03;
      groupRef.current.scale.setScalar(pulse);
    }
  });

  // Memoize centers with colors
  const centers = useMemo(() => {
    if (!profile) return [];
    return profile.centers;
  }, [profile]);

  // Get channel connections
  const channels = useMemo(() => {
    if (!profile) return [];
    return profile.channels;
  }, [profile]);

  return (
    <group ref={groupRef} position={position}>
      {/* Channel connections */}
      {channels.map((channel, i) => {
        const gate1 = channel[0];
        const gate2 = channel[1];
        
        // Find centers for these gates
        const center1 = centers.find((c) => c.gates.includes(gate1));
        const center2 = centers.find((c) => c.gates.includes(gate2));
        
        if (!center1 || !center2) return null;
        
        const start = new THREE.Vector3(...center1.position);
        const end = new THREE.Vector3(...center2.position);
        const mid = start.clone().add(end).multiplyScalar(0.5);
        const distance = start.distanceTo(end);
        
        return (
          <mesh key={`channel-${i}`} position={mid}>
            <cylinderGeometry
              args={[0.02, 0.02, distance, 4]}
              rotation={[0, 0, Math.atan2(end.y - start.y, end.x - start.x) - Math.PI / 2]}
            />
            <meshStandardMaterial
              color={center1.definition === 'defined' ? '#D4AF37' : '#6B6B6B'}
              emissive={center1.definition === 'defined' ? '#D4AF37' : '#000000'}
              emissiveIntensity={0.3}
            />
          </mesh>
        );
      })}

      {/* Centers */}
      {centers.map((center) => {
        const shape = CENTER_SHAPES[center.id];
        const geometry = createCenterGeometry(shape.geometry, shape.args);
        const isHovered = hoveredCenter === center.id;
        const isDefined = center.definition === 'defined';
        
        return (
          <mesh
            key={center.id}
            position={center.position}
            geometry={geometry}
            onClick={() => onCenterClick?.(center)}
            onPointerEnter={() => setHoveredCenter(center.id)}
            onPointerLeave={() => setHoveredCenter(null)}
          >
            <meshStandardMaterial
              color={isDefined ? '#D4AF37' : '#6B6B6B'}
              emissive={isDefined ? '#D4AF37' : '#000000'}
              emissiveIntensity={isHovered ? 0.6 : isDefined ? 0.3 : 0}
              wireframe={!isDefined}
              transparent
              opacity={isDefined ? 0.9 : 0.5}
            />
            
            {/* Glow ring for defined centers */}
            {isDefined && (
              <mesh scale={[1.3, 1.3, 1.3]}>
                <ringGeometry args={[0.25, 0.3, 16]} rotation={[0, 0, 0]} />
                <meshBasicMaterial
                  color="#D4AF37"
                  transparent
                  opacity={isHovered ? 0.5 : 0.2}
                  side={THREE.DoubleSide}
                />
              </mesh>
            )}
          </mesh>
        );
      })}

      {/* Type indicator */}
      {profile && (
        <mesh position={[0, -4.5, 0]}>
          <ringGeometry args={[0.5, 0.6, 32]} />
          <meshBasicMaterial
            color="#D4AF37"
            transparent
            opacity={0.3}
          />
        </mesh>
      )}

      {/* Audio visualization rings */}
      {audioPlaying && (
        <>
          <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[3, 3.1, 64]} />
            <meshBasicMaterial color="#D4AF37" transparent opacity={0.1} />
          </mesh>
          <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[3.5, 3.6, 64]} />
            <meshBasicMaterial color="#D4AF37" transparent opacity={0.05} />
          </mesh>
        </>
      )}
    </group>
  );
}
