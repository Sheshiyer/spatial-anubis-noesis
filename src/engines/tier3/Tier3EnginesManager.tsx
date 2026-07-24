/**
 * Tier 3 Engines Manager
 * Manages all 3 Tier 3 Synthesis Instruments in the East Wing outer ring
 * Pattern follows Tier1EnginesManager with EngineWrapper hover effects
 *
 * Engines: Decision Mirror, Transit Overlay, Somatic Canticle Index
 * Placement: radius 15, 120° spacing, y=2
 */

import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCartographerStore } from '../meta/cartographerStore';
import type { EngineId } from '../meta/types';

// ============================================================================
// Constants
// ============================================================================

/** Tier 3 engine definitions with relative positions (from East Wing center) */
const TIER3_ENGINES: Array<{
  id: EngineId;
  name: string;
  relativePosition: [number, number, number];
  geometry: 'box' | 'icosahedron' | 'dodecahedron';
  color: string;
  emissive: string;
}> = [
  {
    id: 'decision-mirror',
    name: 'Decision Mirror',
    relativePosition: [15, 2, 0],
    geometry: 'box', // Obsidian tablet
    color: '#2A2A3A',
    emissive: '#D4AF37',
  },
  {
    id: 'transits',
    name: 'Transit Overlay',
    relativePosition: [-7.5, 2, 12.99],
    geometry: 'icosahedron', // Celestial sphere
    color: '#C65D3B',
    emissive: '#C65D3B',
  },
  {
    id: 'somatic-canticle',
    name: 'Somatic Canticle Index',
    relativePosition: [-7.5, 2, -12.99],
    geometry: 'dodecahedron', // Scroll artifact
    color: '#B8860B',
    emissive: '#B8860B',
  },
];

// ============================================================================
// Engine Wrapper with Hover Effects
// ============================================================================

interface EngineWrapperProps {
  engineId: EngineId;
  children: React.ReactNode;
}

const EngineWrapper: React.FC<EngineWrapperProps> = ({ engineId, children }) => {
  const groupRef = useRef<THREE.Group>(null);
  const setEngineHovered = useCartographerStore((s) => s.setEngineHovered);
  const engine = useCartographerStore((s) =>
    s.engines.find((e) => e.engineId === engineId)
  );
  const isHovered = engine?.interactionState.hovered ?? false;

  // Hover scale animation (300ms cubic ease-out)
  useEffect(() => {
    if (!groupRef.current) return;

    const targetScale = isHovered ? 1.15 : 1.0;
    const startScale = groupRef.current.scale.x;
    const startTime = Date.now();
    const duration = 300;

    const animate = () => {
      if (!groupRef.current) return;
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const currentScale = startScale + (targetScale - startScale) * ease;
      groupRef.current.scale.set(currentScale, currentScale, currentScale);
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [isHovered]);

  return (
    <group
      ref={groupRef}
      onPointerEnter={() => setEngineHovered(engineId, true)}
      onPointerLeave={() => setEngineHovered(engineId, false)}
    >
      {children}
    </group>
  );
};

// ============================================================================
// Individual Engine Artifacts
// ============================================================================

interface EngineArtifactProps {
  locked: boolean;
  color: string;
  emissive: string;
  geometry: 'box' | 'icosahedron' | 'dodecahedron';
}

const EngineArtifact: React.FC<EngineArtifactProps> = ({
  locked,
  color,
  emissive,
  geometry,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Idle rotation (slower for outer ring — more monumental feel)
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.2;
      meshRef.current.rotation.z += delta * 0.05;
    }
  });

  const materialProps = {
    color: locked ? '#2A2A3A' : color,
    emissive: locked ? '#0A0A1E' : emissive,
    emissiveIntensity: locked ? 0.02 : 0.25,
    transparent: true,
    opacity: locked ? 0.25 : 0.85,
    wireframe: locked,
  };

  return (
    <mesh ref={meshRef}>
      {geometry === 'box' && <boxGeometry args={[1.2, 0.1, 0.8]} />}
      {geometry === 'icosahedron' && <icosahedronGeometry args={[0.9, 1]} />}
      {geometry === 'dodecahedron' && <dodecahedronGeometry args={[0.7, 0]} />}
      <meshStandardMaterial {...materialProps} />
    </mesh>
  );
};

// ============================================================================
// Main Manager Component
// ============================================================================

interface Tier3EnginesManagerProps {
  /** Enable/disable visibility */
  visible?: boolean;
}

export const Tier3EnginesManager: React.FC<Tier3EnginesManagerProps> = ({
  visible = true,
}) => {
  const engines = useCartographerStore((s) => s.engines);

  if (!visible) return null;

  return (
    <group name="tier3-engines">
      {TIER3_ENGINES.map((config) => {
        const engineState = engines.find((e) => e.engineId === config.id);
        const locked = engineState?.status === 'locked';

        return (
          <group key={config.id} position={config.relativePosition}>
            <EngineWrapper engineId={config.id}>
              <EngineArtifact
                locked={locked}
                color={config.color}
                emissive={config.emissive}
                geometry={config.geometry}
              />
            </EngineWrapper>
            {/* Ambient glow — dimmer for locked Tier 3 (silhouette effect) */}
            <pointLight
              color={locked ? '#1A1A2E' : '#B8860B'}
              intensity={locked ? 0.05 : 0.4}
              distance={6}
              decay={2}
            />
          </group>
        );
      })}
    </group>
  );
};

export default Tier3EnginesManager;
