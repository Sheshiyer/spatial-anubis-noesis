/**
 * Tier 2 Engines Manager
 * Manages all 4 Tier 2 Biological Mirrors in the East Wing middle ring
 * Pattern follows Tier1EnginesManager with EngineWrapper hover effects
 *
 * Engines: Biorhythm Compass, Gene Keys Helix, Human Design Bodygraph, Chronobiology Clock
 * Placement: radius 10, 90° spacing, y=0
 */

import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCartographerStore } from '../meta/cartographerStore';
import type { EngineId } from '../meta/types';

// ============================================================================
// Constants
// ============================================================================

/** Tier 2 engine definitions with relative positions (from East Wing center) */
const TIER2_ENGINES: Array<{
  id: EngineId;
  name: string;
  relativePosition: [number, number, number];
  geometry: 'sphere' | 'torusKnot' | 'octahedron' | 'torus';
  color: string;
  emissive: string;
}> = [
  {
    id: 'biorhythm',
    name: 'Biorhythm Compass',
    relativePosition: [10, 0, 0],
    geometry: 'sphere',
    color: '#4A90A4',
    emissive: '#4A90A4',
  },
  {
    id: 'genekeys',
    name: 'Gene Keys Helix',
    relativePosition: [0, 0, 10],
    geometry: 'torusKnot',
    color: '#D4AF37',
    emissive: '#B8860B',
  },
  {
    id: 'humandesign',
    name: 'Human Design Bodygraph',
    relativePosition: [-10, 0, 0],
    geometry: 'octahedron',
    color: '#F5F0E8',
    emissive: '#D4AF37',
  },
  {
    id: 'chronobiology',
    name: 'Chronobiology Clock',
    relativePosition: [0, 0, -10],
    geometry: 'torus',
    color: '#708090',
    emissive: '#708090',
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
  geometry: 'sphere' | 'torusKnot' | 'octahedron' | 'torus';
}

const EngineArtifact: React.FC<EngineArtifactProps> = ({
  locked,
  color,
  emissive,
  geometry,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Idle rotation
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3;
      meshRef.current.rotation.x += delta * 0.1;
    }
  });

  const materialProps = {
    color: locked ? '#3A3A4A' : color,
    emissive: locked ? '#1A1A2E' : emissive,
    emissiveIntensity: locked ? 0.05 : 0.3,
    transparent: true,
    opacity: locked ? 0.4 : 0.9,
    wireframe: locked,
  };

  return (
    <mesh ref={meshRef}>
      {geometry === 'sphere' && <sphereGeometry args={[0.8, 32, 32]} />}
      {geometry === 'torusKnot' && <torusKnotGeometry args={[0.5, 0.15, 64, 16]} />}
      {geometry === 'octahedron' && <octahedronGeometry args={[0.8, 0]} />}
      {geometry === 'torus' && <torusGeometry args={[0.6, 0.2, 16, 32]} />}
      <meshStandardMaterial {...materialProps} />
    </mesh>
  );
};

// ============================================================================
// Main Manager Component
// ============================================================================

interface Tier2EnginesManagerProps {
  /** Enable/disable visibility */
  visible?: boolean;
}

export const Tier2EnginesManager: React.FC<Tier2EnginesManagerProps> = ({
  visible = true,
}) => {
  const engines = useCartographerStore((s) => s.engines);

  if (!visible) return null;

  return (
    <group name="tier2-engines">
      {TIER2_ENGINES.map((config) => {
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
            {/* Ambient glow point light */}
            <pointLight
              color={locked ? '#2A2A3A' : '#B8860B'}
              intensity={locked ? 0.1 : 0.5}
              distance={8}
              decay={2}
            />
          </group>
        );
      })}
    </group>
  );
};

export default Tier2EnginesManager;
