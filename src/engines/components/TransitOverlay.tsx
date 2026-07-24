/**
 * Engine 11: Transit Overlay Component
 * P3-S2-20: Celestial sphere (natal inner ring, transit outer ring)
 * P3-S2-21: Time scrub interaction
 * P3-S2-22: Aspect highlighting (Gold=harmonious, Terracotta=challenging, Grey=neutral)
 */

import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { CelestialSphereData, TransitAspect, TransitPlanet } from '../tier3/types';
import { ASPECT_COLORS } from '../tier3/types';

interface TransitOverlayProps {
  data: CelestialSphereData | null;
  position?: [number, number, number];
  isScrubbing?: boolean;
  scrubOffset?: number;
  onScrubStart?: () => void;
  onScrubMove?: (offset: number) => void;
  onScrubEnd?: () => void;
  onPlanetSelect?: (planet: string) => void;
}

const PLANET_COLORS: Record<string, string> = {
  Sun: '#D4AF37',
  Moon: '#F5F0E8',
  Mercury: '#708090',
  Venus: '#E6E6FA',
  Mars: '#C65D3B',
  Jupiter: '#B8860B',
  Saturn: '#8B4513',
  Uranus: '#4A90A4',
  Neptune: '#1E90FF',
  Pluto: '#800080',
  'North Node': '#D4AF37',
  Chiron: '#8B0000',
};

export function TransitOverlay({
  data,
  position = [0, 0, 0],
  isScrubbing = false,
  scrubOffset = 0,
  onScrubStart,
  onScrubMove,
  onScrubEnd,
  onPlanetSelect,
}: TransitOverlayProps) {
  const groupRef = useRef<THREE.Group>(null);
  const outerRingRef = useRef<THREE.Mesh>(null);
  const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null);

  // Rotate outer ring based on scrub
  useFrame(() => {
    if (outerRingRef.current && isScrubbing) {
      const rotation = (scrubOffset / 365) * Math.PI * 2;
      outerRingRef.current.rotation.y = rotation;
    }
  });

  // Get planet position on ring
  const getPlanetPosition = (degree: number, radius: number): [number, number, number] => {
    const angle = (degree / 360) * Math.PI * 2 - Math.PI / 2;
    return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius];
  };

  // Filter highlighted aspects
  const highlightedAspects = useMemo(() => 
    data?.highlightedAspects ?? [],
    [data?.highlightedAspects]
  );

  return (
    <group ref={groupRef} position={position}>
      {/* Natal inner ring */}
      <mesh>
        <torusGeometry args={[2, 0.05, 8, 64]} />
        <meshStandardMaterial color="#D4AF37" transparent opacity={0.5} />
      </mesh>

      {/* Transit outer ring (scrubbable) */}
      <mesh
        ref={outerRingRef}
        onPointerDown={onScrubStart}
        onPointerMove={(e) => {
          if (isScrubbing) {
            const angle = Math.atan2(e.point.z, e.point.x);
            const days = Math.round((angle / (Math.PI * 2)) * 365);
            onScrubMove?.(days);
          }
        }}
        onPointerUp={onScrubEnd}
        onPointerLeave={onScrubEnd}
      >
        <torusGeometry args={[3.5, 0.08, 8, 64]} />
        <meshStandardMaterial
          color={isScrubbing ? '#D4AF37' : '#6B6B6B'}
          emissive={isScrubbing ? '#D4AF37' : '#000000'}
          emissiveIntensity={0.3}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Natal planets (inner ring) */}
      {data?.natal.planets.map((planet) => {
        const pos = getPlanetPosition(planet.natalPosition, 2);
        
        return (
          <group key={`natal-${planet.name}`}>
            <mesh position={pos}>
              <sphereGeometry args={[0.12, 16, 16]} />
              <meshStandardMaterial
                color={PLANET_COLORS[planet.name] ?? '#FFFFFF'}
                emissive={PLANET_COLORS[planet.name] ?? '#FFFFFF'}
                emissiveIntensity={0.3}
              />
            </mesh>
            
            {/* Retrograde indicator */}
            {planet.retrograde && (
              <mesh position={[pos[0], pos[1] + 0.2, pos[2]]}>
                <ringGeometry args={[0.08, 0.1, 8]} />
                <meshBasicMaterial color="#C65D3B" />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Transit planets (outer ring) */}
      {data?.transit.planets.map((planet) => {
        const pos = getPlanetPosition(planet.transitPosition, 3.5);
        const isSelected = selectedPlanet === planet.name;
        
        return (
          <group key={`transit-${planet.name}`}>
            <mesh
              position={pos}
              onClick={() => {
                setSelectedPlanet(isSelected ? null : planet.name);
                onPlanetSelect?.(planet.name);
              }}
            >
              <sphereGeometry args={[isSelected ? 0.18 : 0.15, 16, 16]} />
              <meshStandardMaterial
                color={PLANET_COLORS[planet.name] ?? '#FFFFFF'}
                emissive={PLANET_COLORS[planet.name] ?? '#FFFFFF'}
                emissiveIntensity={isSelected ? 0.6 : 0.4}
              />
            </mesh>
            
            {/* Selection ring */}
            {isSelected && (
              <mesh position={pos}>
                <ringGeometry args={[0.25, 0.3, 16]} />
                <meshBasicMaterial color="#D4AF37" transparent opacity={0.5} />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Aspect lines */}
      {highlightedAspects.map((aspect, i) => {
        const planet1 = data?.natal.planets.find((p) => p.name === aspect.planet1) ??
                       data?.transit.planets.find((p) => p.name === aspect.planet1);
        const planet2 = data?.natal.planets.find((p) => `${p.name} (natal)` === aspect.planet2) ??
                       data?.transit.planets.find((p) => p.name === aspect.planet2);
        
        if (!planet1 || !planet2) return null;
        
        const pos1 = new THREE.Vector3(...getPlanetPosition(
          planet1.transitPosition || planet1.natalPosition,
          planet1.transitPosition ? 3.5 : 2
        ));
        const pos2 = new THREE.Vector3(...getPlanetPosition(
          planet2.transitPosition || planet2.natalPosition,
          planet2.transitPosition ? 3.5 : 2
        ));
        
        const mid = pos1.clone().add(pos2).multiplyScalar(0.5);
        const distance = pos1.distanceTo(pos2);
        
        return (
          <mesh key={`aspect-${i}`} position={mid}>
            <cylinderGeometry
              args={[0.01 * aspect.exactness, 0.01 * aspect.exactness, distance, 4]}
            />
            <meshBasicMaterial
              color={ASPECT_COLORS[aspect.quality]}
              transparent
              opacity={0.5 * aspect.exactness}
            />
          </mesh>
        );
      })}

      {/* Zodiac sign markers */}
      {Array.from({ length: 12 }, (_, i) => {
        const angle = ((i * 30 - 90) / 360) * Math.PI * 2;
        const innerX = Math.cos(angle) * 1.8;
        const innerZ = Math.sin(angle) * 1.8;
        const outerX = Math.cos(angle) * 3.7;
        const outerZ = Math.sin(angle) * 3.7;
        
        return (
          <group key={`zodiac-${i}`}>
            {/* Inner marker */}
            <mesh position={[innerX, 0, innerZ]}>
              <boxGeometry args={[0.05, 0.02, 0.15]} rotation={[0, angle, 0]} />
              <meshBasicMaterial color="#6B6B6B" />
            </mesh>
            
            {/* Outer marker */}
            <mesh position={[outerX, 0, outerZ]}>
              <boxGeometry args={[0.08, 0.02, 0.2]} rotation={[0, angle, 0]} />
              <meshBasicMaterial color="#6B6B6B" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
