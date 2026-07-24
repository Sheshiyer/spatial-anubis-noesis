/**
 * Engine 9: Chronobiology Clock Component
 * P3-S2-10: Circular clock face with circadian zones
 * P3-S2-11: Circadian detection visualization
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ChronobiologyData, CircadianPhase } from '../tier2/types';

interface ChronobiologyClockProps {
  data: ChronobiologyData | null;
  position?: [number, number, number];
  onZoneClick?: (phase: CircadianPhase) => void;
}

const PHASE_COLORS: Record<CircadianPhase, string> = {
  sleep: '#1A1A2E',       // Deep Ink
  wake: '#4A5568',        // Slate
  peak: '#D4AF37',        // Gold
  dip: '#708090',         // Slate Grey
  wind_down: '#8B4513',   // Saddle Brown
  deep_sleep: '#0F0F23',  // Deep night
};

export function ChronobiologyClock({
  data,
  position = [0, 0, 0],
  onZoneClick,
}: ChronobiologyClockProps) {
  const groupRef = useRef<THREE.Group>(null);
  const handRef = useRef<THREE.Mesh>(null);

  // Get current hour angle
  const currentHour = useMemo(() => {
    if (!data) return 0;
    const date = new Date(data.deviceTime);
    return date.getHours() + date.getMinutes() / 60;
  }, [data]);

  // Rotate hand to current time
  useFrame(() => {
    if (handRef.current && data) {
      const angle = (currentHour / 24) * Math.PI * 2 - Math.PI / 2;
      handRef.current.rotation.z = -angle;
    }
  });

  // Generate 24-hour zones
  const zones = useMemo(() => {
    const result = [];
    for (let hour = 0; hour < 24; hour++) {
      const startAngle = ((hour - 6) / 24) * Math.PI * 2; // Start from top
      const endAngle = ((hour - 5) / 24) * Math.PI * 2;
      
      // Determine phase for this hour
      let phase: CircadianPhase = 'peak';
      if (hour >= 22 || hour < 6) phase = 'sleep';
      else if (hour >= 6 && hour < 8) phase = 'wake';
      else if (hour >= 8 && hour < 12) phase = 'peak';
      else if (hour >= 12 && hour < 14) phase = 'dip';
      else if (hour >= 14 && hour < 18) phase = 'peak';
      else phase = 'wind_down';
      
      result.push({ hour, startAngle, endAngle, phase });
    }
    return result;
  }, []);

  return (
    <group ref={groupRef} position={position} rotation={[Math.PI / 2, 0, 0]}>
      {/* Clock face base */}
      <mesh>
        <circleGeometry args={[3, 64]} />
        <meshStandardMaterial
          color="#0F0F23"
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Circadian zones */}
      {zones.map(({ hour, startAngle, endAngle, phase }) => {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.absarc(0, 0, 2.8, startAngle, endAngle, false);
        shape.lineTo(0, 0);

        const geometry = new THREE.ShapeGeometry(shape);

        return (
          <mesh
            key={hour}
            geometry={geometry}
            onClick={() => onZoneClick?.(phase)}
          >
            <meshStandardMaterial
              color={PHASE_COLORS[phase]}
              transparent
              opacity={0.7}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}

      {/* Hour markers */}
      {Array.from({ length: 24 }, (_, i) => {
        const angle = ((i - 6) / 24) * Math.PI * 2;
        const x = Math.cos(angle) * 2.4;
        const y = Math.sin(angle) * 2.4;
        
        return (
          <mesh key={`marker-${i}`} position={[x, y, 0.05]}>
            <circleGeometry args={[0.05, 8]} />
            <meshBasicMaterial color="#6B6B6B" />
          </mesh>
        );
      })}

      {/* Current time hand */}
      <mesh ref={handRef} position={[0, 0, 0.1]}>
        <boxGeometry args={[2.5, 0.05, 0.02]} />
        <meshStandardMaterial color="#D4AF37" emissive="#D4AF37" emissiveIntensity={0.5} />
      </mesh>

      {/* Center dot */}
      <mesh position={[0, 0, 0.15]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial
          color="#D4AF37"
          emissive="#D4AF37"
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* Current phase indicator */}
      {data && (
        <mesh position={[0, 0, 0.2]}>
          <ringGeometry args={[2.9, 3, 64]} />
          <meshBasicMaterial
            color={PHASE_COLORS[data.currentPhase]}
            transparent
            opacity={0.3}
          />
        </mesh>
      )}
    </group>
  );
}
