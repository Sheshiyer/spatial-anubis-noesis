/**
 * Engine 6: Biorhythm Compass Component
 * P3-S2-01: Translucent pulsing sphere with 3 sine wave ribbons
 * P3-S2-02: PIP sync visualization
 * P3-S2-03: Scrub interaction
 */

import { useRef, useMemo, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { BiorhythmData, BiorhythmCycle } from '../tier2/types';

interface BiorhythmCompassProps {
  data: BiorhythmData | null;
  position?: [number, number, number];
  isScrubbing?: boolean;
  scrubOffset?: number;
  onScrubStart?: () => void;
  onScrubMove?: (offset: number) => void;
  onScrubEnd?: () => void;
}

const CYCLE_COLORS: Record<BiorhythmCycle, string> = {
  physical: '#C65D3B',   // Terracotta
  emotional: '#4A90A4',  // Deep Blue
  intellectual: '#5A8F5A', // Deep Green
};

/**
 * Generate ribbon points for a sine wave
 */
function generateRibbonPoints(
  cycle: number,
  amplitude: number,
  segments: number = 64
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 4; // 2 full cycles
    const x = Math.cos(t) * 2;
    const y = Math.sin(t * cycle) * amplitude;
    const z = Math.sin(t) * 2;
    points.push(new THREE.Vector3(x, y, z));
  }
  return points;
}

export function BiorhythmCompass({
  data,
  position = [0, 0, 0],
  isScrubbing = false,
  scrubOffset = 0,
  onScrubStart,
  onScrubMove,
  onScrubEnd,
}: BiorhythmCompassProps) {
  const groupRef = useRef<THREE.Group>(null);
  const sphereRef = useRef<THREE.Mesh>(null);
  const [hoveredRibbon, setHoveredRibbon] = useState<BiorhythmCycle | null>(null);

  // Pulse animation
  useFrame((state) => {
    if (sphereRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
      sphereRef.current.scale.setScalar(pulse);
    }
  });

  // Get ribbon amplitude from cycle value
  const getAmplitude = useCallback((cycle: BiorhythmCycle): number => {
    if (!data) return 0.3;
    const value = data[cycle].value / 100; // -1 to 1
    return 0.3 + Math.abs(value) * 0.4;
  }, [data]);

  // Ribbon geometries
  const ribbons = useMemo(() => {
    const cycles: BiorhythmCycle[] = ['physical', 'emotional', 'intellectual'];
    return cycles.map((cycle, i) => {
      const points = generateRibbonPoints(23 + i * 5, getAmplitude(cycle));
      const curve = new THREE.CatmullRomCurve3(points);
      return {
        cycle,
        curve,
        color: CYCLE_COLORS[cycle],
        offset: (i - 1) * 0.3,
      };
    });
  }, [data, getAmplitude]);

  return (
    <group ref={groupRef} position={position}>
      {/* Central translucent sphere */}
      <mesh ref={sphereRef}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshPhysicalMaterial
          color="#1A1A2E"
          transparent
          opacity={0.6}
          roughness={0.2}
          metalness={0.8}
          transmission={0.3}
        />
      </mesh>

      {/* Sine wave ribbons */}
      {ribbons.map(({ cycle, curve, color, offset }) => (
        <group key={cycle} position={[0, offset, 0]}>
          <mesh
            onPointerEnter={() => setHoveredRibbon(cycle)}
            onPointerLeave={() => setHoveredRibbon(null)}
          >
            <tubeGeometry args={[curve, 64, 0.05, 8, false]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={hoveredRibbon === cycle ? 0.8 : 0.4}
              transparent
              opacity={0.9}
            />
          </mesh>
        </group>
      ))}

      {/* Scrub ring (interactive) */}
      <mesh
        rotation={[Math.PI / 2, 0, 0]}
        onPointerDown={onScrubStart}
        onPointerMove={(e) => {
          if (isScrubbing) {
            const x = e.point.x;
            const offset = Math.round(x * 5);
            onScrubMove?.(offset);
          }
        }}
        onPointerUp={onScrubEnd}
        onPointerLeave={onScrubEnd}
      >
        <torusGeometry args={[3, 0.1, 8, 64]} />
        <meshStandardMaterial
          color={isScrubbing ? '#D4AF37' : '#6B6B6B'}
          transparent
          opacity={0.5}
        />
      </mesh>

      {/* 30-day projection indicators */}
      {data?.projection.slice(0, 7).map((day, i) => (
        <mesh key={i} position={[
          Math.cos((i / 7) * Math.PI * 2) * 3.5,
          0,
          Math.sin((i / 7) * Math.PI * 2) * 3.5
        ]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshBasicMaterial
            color={day.physical > 0 ? '#C65D3B' : '#6B6B6B'}
            transparent
            opacity={0.6 + (i * 0.05)}
          />
        </mesh>
      ))}
    </group>
  );
}
