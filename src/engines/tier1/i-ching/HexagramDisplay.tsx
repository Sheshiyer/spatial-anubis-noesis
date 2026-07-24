/**
 * Hexagram Display (P3-S1-08, P3-S1-09)
 * Line visualization - Gold bars for Yang, gaps for Yin
 * Changing line display with primary + transformed hexagram
 */

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { HexagramLine } from './types';
import {
  LINE_WIDTH,
  LINE_HEIGHT,
  LINE_DEPTH,
  LINE_GAP,
  LINE_SPACING,
} from './types';

// ============================================================================
// Hexagram Line Component
// ============================================================================

interface HexagramLineProps {
  line: HexagramLine;
  position: number; // Y position
}

const HexagramLineVisual: React.FC<HexagramLineProps> = ({
  line,
  position,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const pulseRef = useRef(0);

  // Animation for changing lines
  useFrame(({ clock }) => {
    if (line.changing && groupRef.current) {
      pulseRef.current = Math.sin(clock.getElapsedTime() * 3) * 0.5 + 0.5;
      const intensity = 0.5 + pulseRef.current * 0.5;
      
      groupRef.current.children.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          const material = child.material as THREE.MeshStandardMaterial;
          if (material.emissive) {
            material.emissiveIntensity = intensity;
          }
        }
      });
    }
  });

  // Yang = solid gold bar
  // Yin = two gold bars with gap
  const bars = line.lineType === 'yang' 
    ? [{ x: 0, width: LINE_WIDTH }]
    : [
        { x: -LINE_WIDTH / 4 - LINE_GAP / 4, width: LINE_WIDTH / 2 - LINE_GAP / 2 },
        { x: LINE_WIDTH / 4 + LINE_GAP / 4, width: LINE_WIDTH / 2 - LINE_GAP / 2 },
      ];

  const lineColor = line.lineType === 'yang' ? 0xB8860B : 0xF5F0E8;
  const emissiveColor = line.changing ? 0xC65D3B : 0x000000;
  const emissiveIntensity = line.changing ? 0.5 : 0;

  return (
    <group ref={groupRef} position={[0, position, 0]}>
      {bars.map((bar, index) => (
        <mesh key={index} position={[bar.x, 0, 0]}>
          <boxGeometry args={[bar.width, LINE_HEIGHT, LINE_DEPTH]} />
          <meshStandardMaterial
            color={lineColor}
            metalness={0.8}
            roughness={0.2}
            emissive={emissiveColor}
            emissiveIntensity={emissiveIntensity}
          />
        </mesh>
      ))}
      
      {/* Changing line indicator */}
      {line.changing && (
        <mesh position={[LINE_WIDTH / 2 + 0.15, 0, 0]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial
            color={0xC65D3B}
            emissive={0xC65D3B}
            emissiveIntensity={1}
          />
        </mesh>
      )}
    </group>
  );
};

// ============================================================================
// Full Hexagram Display
// ============================================================================

interface HexagramDisplayProps {
  lines: HexagramLine[];
  position?: THREE.Vector3;
  animated?: boolean;
  label?: string;
}

export const HexagramDisplay: React.FC<HexagramDisplayProps> = ({
  lines,
  position = new THREE.Vector3(0, 0, 0),
  animated = true,
  label,
}) => {
  const groupRef = useRef<THREE.Group>(null);

  // Sort lines by position (bottom to top)
  const sortedLines = useMemo(() => {
    return [...lines].sort((a, b) => a.position - b.position);
  }, [lines]);

  // Calculate vertical positions
  const linePositions = useMemo(() => {
    const totalHeight = (sortedLines.length - 1) * LINE_SPACING;
    return sortedLines.map((_, index) => (index * LINE_SPACING) - totalHeight / 2);
  }, [sortedLines]);

  return (
    <group ref={groupRef} position={position}>
      {/* Label */}
      {label && (
        <mesh position={[0, (sortedLines.length * LINE_SPACING) / 2 + 0.3, 0]}>
          {/* Placeholder for text - would use Text3D in production */}
        </mesh>
      )}

      {/* Lines */}
      {sortedLines.map((line, index) => (
        <HexagramLineVisual
          key={line.position}
          line={line}
          position={linePositions[index]}
          animated={animated}
        />
      ))}

      {/* Connecting frame */}
      <mesh position={[0, 0, -LINE_DEPTH]}>
        <boxGeometry 
          args={[LINE_WIDTH + 0.2, sortedLines.length * LINE_SPACING + 0.2, 0.02]} 
        />
        <meshBasicMaterial color="#1A1A2E" transparent opacity={0.5} />
      </mesh>
    </group>
  );
};

// ============================================================================
// Side-by-Side Hexagrams (P3-S1-09)
// Shows primary and transformed hexagrams
// ============================================================================

interface ChangingHexagramsProps {
  primaryLines: HexagramLine[];
  transformedLines: HexagramLine[];
  position?: THREE.Vector3;
  primaryLabel?: string;
  transformedLabel?: string;
}

export const ChangingHexagrams: React.FC<ChangingHexagramsProps> = ({
  primaryLines,
  transformedLines,
  position = new THREE.Vector3(0, 2, 0),
  primaryLabel = 'Primary',
  transformedLabel = 'Transformed',
}) => {
  return (
    <group position={position}>
      {/* Primary Hexagram */}
      <HexagramDisplay
        lines={primaryLines}
        position={new THREE.Vector3(-1.5, 0, 0)}
        label={primaryLabel}
      />

      {/* Arrow indicator */}
      <group position={[0, 0, 0]}>
        <mesh>
          <boxGeometry args={[0.5, 0.05, 0.05]} />
          <meshStandardMaterial color="#B8860B" />
        </mesh>
        <mesh position={[0.3, 0, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.15, 0.05, 0.05]} />
          <meshStandardMaterial color="#B8860B" />
        </mesh>
        <mesh position={[0.3, 0, 0]} rotation={[0, 0, -Math.PI / 4]}>
          <boxGeometry args={[0.15, 0.05, 0.05]} />
          <meshStandardMaterial color="#B8860B" />
        </mesh>
      </group>

      {/* Transformed Hexagram */}
      <HexagramDisplay
        lines={transformedLines}
        position={new THREE.Vector3(1.5, 0, 0)}
        label={transformedLabel}
      />
    </group>
  );
};
