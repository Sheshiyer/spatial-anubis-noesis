/**
 * Engine 12: Somatic Canticle Index Component
 * P3-S2-24: Bio-gated content release artifact (scroll-like, unfurls by bio-state)
 */

import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SomaticCanticleData, CanticleSection } from '../tier3/types';

interface SomaticCanticleProps {
  data: SomaticCanticleData | null;
  position?: [number, number, number];
  unfurlProgress?: number;
  onSectionUnlock?: (section: CanticleSection) => void;
}

export function SomaticCanticle({
  data,
  position = [0, 0, 0],
  unfurlProgress = 0,
  onSectionUnlock,
}: SomaticCanticleProps) {
  const groupRef = useRef<THREE.Group>(null);
  const scrollRef = useRef<THREE.Mesh>(null);
  const [hoveredSection, setHoveredSection] = useState<number | null>(null);

  // Animate unfurling
  useFrame(() => {
    if (scrollRef.current) {
      const progress = data?.scrollState.unfurlProgress ?? unfurlProgress;
      const scale = 1 + progress * 2;
      scrollRef.current.scale.y = scale;
    }
  });

  // Generate scroll sections
  const sections = useMemo(() => {
    if (!data) return [];
    return data.sections.map((section, i) => ({
      ...section,
      yPosition: i * 0.8 - (data.sections.length * 0.4),
    }));
  }, [data]);

  // Scroll geometry
  const scrollGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    // Create a scroll shape
    shape.moveTo(-1, -2);
    shape.lineTo(1, -2);
    shape.lineTo(1, 2);
    shape.lineTo(-1, 2);
    shape.lineTo(-1, -2);
    
    return new THREE.ShapeGeometry(shape);
  }, []);

  return (
    <group ref={groupRef} position={position}>
      {/* Scroll base */}
      <mesh ref={scrollRef} geometry={scrollGeometry}>
        <meshStandardMaterial
          color="#F5E6C8"
          roughness={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Scroll edges (rolled paper effect) */}
      <mesh position={[-1.05, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 4, 16]} rotation={[0, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#D4C4A0" roughness={0.9} />
      </mesh>
      <mesh position={[1.05, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 4, 16]} rotation={[0, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#D4C4A0" roughness={0.9} />
      </mesh>

      {/* Content sections */}
      {sections.map((section, i) => {
        const isUnlocked = section.unlocked;
        const isHovered = hoveredSection === i;
        
        return (
          <group key={section.id} position={[0, section.yPosition, 0.02]}>
            {/* Section background */}
            <mesh
              onPointerEnter={() => isUnlocked && setHoveredSection(i)}
              onPointerLeave={() => setHoveredSection(null)}
            >
              <planeGeometry args={[1.8, 0.6]} />
              <meshStandardMaterial
                color={isUnlocked ? '#1A1A2E' : '#2A2A3E'}
                transparent
                opacity={isUnlocked ? 0.9 : 0.5}
              />
            </mesh>

            {/* Lock indicator for locked sections */}
            {!isUnlocked && (
              <mesh position={[0, 0, 0.03]}>
                <circleGeometry args={[0.1, 16]} />
                <meshStandardMaterial
                  color="#6B6B6B"
                  emissive="#6B6B6B"
                  emissiveIntensity={0.3}
                />
              </mesh>
            )}

            {/* Unlock glow for newly unlocked */}
            {isUnlocked && isHovered && (
              <mesh position={[0, 0, 0.01]}>
                <planeGeometry args={[1.9, 0.7]} />
                <meshBasicMaterial
                  color="#D4AF37"
                  transparent
                  opacity={0.2}
                />
              </mesh>
            )}

            {/* Gate indicator */}
            {section.gateType !== 'none' && (
              <mesh position={[-0.7, 0, 0.03]}>
                <circleGeometry args={[0.06, 8]} />
                <meshBasicMaterial
                  color={isUnlocked ? '#D4AF37' : '#6B6B6B'}
                  transparent
                  opacity={isUnlocked ? 0.8 : 0.3}
                />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Unfurl progress indicator */}
      <mesh position={[0, -2.5, 0]}>
        <boxGeometry args={[2, 0.05, 0.02]} />
        <meshBasicMaterial color="#6B6B6B" />
      </mesh>
      <mesh
        position={[-1 + (data?.scrollState.unfurlProgress ?? unfurlProgress), -2.5, 0.01]}
      >
        <boxGeometry
          args={[(data?.scrollState.unfurlProgress ?? unfurlProgress) * 2, 0.05, 0.03]}
        />
        <meshBasicMaterial color="#D4AF37" />
      </mesh>

      {/* Bio-state indicator */}
      {data?.scrollState.bioGated && (
        <mesh position={[0, 2.3, 0]}>
          <ringGeometry args={[0.3, 0.35, 16]} />
          <meshBasicMaterial
            color="#D4AF37"
            transparent
            opacity={0.5 + (Math.sin(Date.now() / 1000) * 0.2)}
          />
        </mesh>
      )}

      {/* Source engines indicator */}
      <group position={[0, -3, 0]}>
        {data?.sourceEngines.slice(0, 4).map((engine, i) => (
          <mesh key={engine} position={[(i - 1.5) * 0.4, 0, 0]}>
            <circleGeometry args={[0.08, 8]} />
            <meshBasicMaterial color="#B8860B" transparent opacity={0.6} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
