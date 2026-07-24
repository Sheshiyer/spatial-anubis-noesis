/**
 * Vimshottari Dasha Clock (P3-S1-10, 11, 12)
 * Concentric golden rings with ORBIT gesture support
 */

import React, { useRef, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FloatingText } from '../shared/Text3D';
import { ParticleBurst, LoadingGlow } from '../shared/FilamentConnections';
import { useTier1EngineStore, selectLoadingState } from '../shared/engineStore';
import { getVimshottariReading } from '../../../api/tier1Engines';
import { getAbsolutePosition } from '../shared/types';
import type { DashaPlanet, VimshottariReading } from '../shared/types';

// ============================================================================
// Constants
// ============================================================================

const PLANET_ORDER: DashaPlanet[] = [
  'ketu', 'venus', 'sun', 'moon', 'mars', 
  'rahu', 'jupiter', 'saturn', 'mercury'
];

const PLANET_PERIODS: Record<DashaPlanet, number> = {
  ketu: 7,
  venus: 20,
  sun: 6,
  moon: 10,
  mars: 7,
  rahu: 18,
  jupiter: 16,
  saturn: 19,
  mercury: 17,
};

const PLANET_COLORS: Record<DashaPlanet, string> = {
  sun: '#FFD700',
  moon: '#F5F0E8',
  mars: '#C65D3B',
  mercury: '#6B6B6B',
  jupiter: '#B8860B',
  venus: '#E8D4F5',
  saturn: '#4A4A4A',
  rahu: '#1A1A2E',
  ketu: '#2A2A3E',
};

const RING_CONFIG = {
  mahadasha: { radius: 2.0, height: 0.15, thickness: 0.1 },
  antardasha: { radius: 1.4, height: 0.12, thickness: 0.08 },
  pratyantardasha: { radius: 0.8, height: 0.1, thickness: 0.06 },
};

// ============================================================================
// Ring Component
// ============================================================================

interface DashaRingProps {
  type: 'mahadasha' | 'antardasha' | 'pratyantardasha';
  planet: DashaPlanet;
  rotation: number;
  isActive: boolean;
  onRotate?: (delta: number) => void;
}

const DashaRing: React.FC<DashaRingProps> = ({
  type,
  planet,
  rotation,
  isActive,
  onRotate,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const lastAngleRef = useRef(0);

  const config = RING_CONFIG[type];
  const color = PLANET_COLORS[planet];

  // Rotation animation
  useFrame(({ clock }) => {
    if (groupRef.current && !isDragging) {
      // Slow continuous rotation
      const speed = type === 'mahadasha' ? 0.05 : type === 'antardasha' ? 0.1 : 0.15;
      groupRef.current.rotation.y = rotation + clock.getElapsedTime() * speed;
    }
  });

  // Material
  const material = new THREE.MeshStandardMaterial({
    color: isActive ? color : '#6B6B6B',
    metalness: 0.8,
    roughness: 0.3,
    emissive: isActive ? color : '#000000',
    emissiveIntensity: isActive ? 0.3 : 0,
  });

  const hoverScale = isHovered ? 1.1 : 1.0;

  return (
    <group
      ref={groupRef}
      scale={[hoverScale, 1, hoverScale]}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
    >
      {/* Ring geometry */}
      <mesh rotation={[Math.PI / 2, 0, 0]} material={material}>
        <torusGeometry args={[config.radius, config.thickness, 16, 64]} />
      </mesh>

      {/* Period indicator */}
      <mesh position={[config.radius, 0, 0]}>
        <sphereGeometry args={[config.thickness * 1.5, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isActive ? 1 : 0.3}
        />
      </mesh>

      {/* Hover label */}
      {isHovered && (
        <FloatingText
          text={`${planet.charAt(0).toUpperCase() + planet.slice(1)}: ${PLANET_PERIODS[planet]} years`}
          position={new THREE.Vector3(0, config.radius + 0.5, 0)}
          color="#F5F0E8"
          fontSize={0.15}
        />
      )}
    </group>
  );
};

// ============================================================================
// Central Axis
// ============================================================================

const CentralAxis: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Breathing animation
  useFrame(({ clock }) => {
    if (meshRef.current && isActive) {
      const scale = 1 + Math.sin(clock.getElapsedTime() * 2) * 0.1;
      meshRef.current.scale.set(scale, 1, scale);
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <cylinderGeometry args={[0.2, 0.2, 0.5, 16]} />
      <meshStandardMaterial
        color="#C65D3B"
        emissive="#C65D3B"
        emissiveIntensity={isActive ? 0.5 : 0.1}
      />
    </mesh>
  );
};

// ============================================================================
// Main Vimshottari Engine
// ============================================================================

interface VimshottariEngineProps {
  visible?: boolean;
  birthDatetime?: string;
  birthLocation?: { latitude: number; longitude: number };
}

export const VimshottariEngine: React.FC<VimshottariEngineProps> = ({
  visible = true,
  birthDatetime,
  birthLocation,
}) => {
  const enginePosition = getAbsolutePosition('vimshottari');
  const loadingState = useTier1EngineStore(selectLoadingState('vimshottari'));
  const setLoading = useTier1EngineStore((state) => state.setLoading);
  const addToHistory = useTier1EngineStore((state) => state.addToHistory);

  const [reading, setReading] = useState<VimshottariReading | null>(null);
  const [ringRotations, setRingRotations] = useState({
    mahadasha: 0,
    antardasha: 0,
    pratyantardasha: 0,
  });
  const [activePlanets, setActivePlanets] = useState({
    mahadasha: 'moon' as DashaPlanet,
    antardasha: 'mars' as DashaPlanet,
    pratyantardasha: 'sun' as DashaPlanet,
  });

  // Fetch reading
  const fetchReading = useCallback(async () => {
    if (!birthDatetime || !birthLocation) return;

    setLoading('vimshottari', true, 'calculation');

    try {
      const response = await getVimshottariReading({
        birthDatetime,
        birthLocation,
        queryDepth: 'pratyantardasha',
      });

      setReading(response);
      setActivePlanets({
        mahadasha: response.currentMahaDasha.planet,
        antardasha: response.currentAntarDasha.planet,
        pratyantardasha: response.currentPratyantarDasha.planet,
      });

      addToHistory('vimshottari', {
        readingId: `vimshottari-${Date.now()}`,
        summary: `${response.currentMahaDasha.planet} MahaDasha`,
      });
    } catch (error) {
      console.error('[VimshottariEngine] Failed to fetch reading:', error);
    } finally {
      setLoading('vimshottari', false);
    }
  }, [birthDatetime, birthLocation, setLoading, addToHistory]);

  // Handle ring rotation
  const handleRingRotate = (type: 'mahadasha' | 'antardasha' | 'pratyantardasha', delta: number) => {
    setRingRotations((prev) => ({
      ...prev,
      [type]: prev[type] + delta,
    }));
  };

  if (!visible) return null;

  return (
    <group position={enginePosition}>
      {/* Dark Pedestal */}
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[1, 1.2, 1, 8]} />
        <meshStandardMaterial color="#1A1A2E" roughness={0.9} />
      </mesh>

      {/* Central Axis */}
      <CentralAxis isActive={!!reading} />

      {/* Concentric Rings */}
      <DashaRing
        type="mahadasha"
        planet={activePlanets.mahadasha}
        rotation={ringRotations.mahadasha}
        isActive={true}
      />
      <DashaRing
        type="antardasha"
        planet={activePlanets.antardasha}
        rotation={ringRotations.antardasha}
        isActive={true}
      />
      <DashaRing
        type="pratyantardasha"
        planet={activePlanets.pratyantardasha}
        rotation={ringRotations.pratyantardasha}
        isActive={true}
      />

      {/* Current period info */}
      {reading && (
        <group position={[0, 3, 0]}>
          <FloatingText
            text={`${activePlanets.mahadasha.charAt(0).toUpperCase() + activePlanets.mahadasha.slice(1)} MahaDasha`}
            position={new THREE.Vector3(0, 0.5, 0)}
            color="#B8860B"
            fontSize={0.25}
          />
          <FloatingText
            text={`${reading.currentMahaDasha.startDate} - ${reading.currentMahaDasha.endDate}`}
            position={new THREE.Vector3(0, 0, 0)}
            color="#F5F0E8"
            fontSize={0.15}
          />
        </group>
      )}

      {/* Loading effects */}
      {loadingState.particleBurst && (
        <ParticleBurst
          position={new THREE.Vector3(0, 1, 0)}
          color="#B8860B"
          count={40}
        />
      )}
      <LoadingGlow
        position={new THREE.Vector3(0, 1, 0)}
        active={loadingState.isLoading}
      />

      {/* Instructions */}
      {!reading && (
        <FloatingText
          text="Drag rings to explore Dasha periods"
          position={new THREE.Vector3(0, -2, 0)}
          color="#6B6B6B"
          fontSize={0.15}
        />
      )}
    </group>
  );
};
