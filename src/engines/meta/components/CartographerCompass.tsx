/**
 * Cartographer's Compass 3D Component
 * 
 * P3-S3-01 to P3-S3-08
 * - Orrery/gyroscope artifact at East Wing apex
 * - Orbital path activation
 * - Meta-reading synthesis
 * - 2D map projection
 * - 13-engine constellation assembly
 * - Gravity well system
 * - Unlock progression
 * - Unlock animation sequences
 */

import React, { useRef, useMemo, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { 
  Sphere, 
  Ring, 
  Line,
  Html,
  Billboard,
  Text,
} from '@react-three/drei';
import * as THREE from 'three';
import { useCartographerStore } from '../cartographerStore';
import { usePolishStore } from '../polishStore';
import { engineAudio } from '../EngineAudio';
import type { EngineId, EnginePosition } from '../types';

// ============================================================================
// Constants
// ============================================================================

const BRAND_COLORS = {
  deepInk: '#1A1A2E',
  bone: '#F5F0E8',
  agedGold: '#B8860B',
  stoneGrey: '#6B6B6B',
  terracotta: '#C65D3B',
};

const DIAL_ENGINE_ORDER: EngineId[] = [
  'vimshottari', 'iching', 'tarot', 'runes', 'numerology',
  'biorhythm', 'genekeys', 'humandesign', 'chronobiology',
  'decision-mirror', 'transits', 'somatic-canticle',
];

// ============================================================================
// Compass Core Component
// ============================================================================

interface CompassCoreProps {
  isUnlocked: boolean;
  dialStates: Record<EngineId, boolean>;
  status: 'orbiting' | 'paused' | 'engaged' | 'unfolding';
  onInteract: () => void;
}

const CompassCore: React.FC<CompassCoreProps> = ({ 
  isUnlocked, 
  dialStates, 
  status,
  onInteract 
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  // Rotate slowly when orbiting
  useFrame((state) => {
    if (groupRef.current && status === 'orbiting') {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.1;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
    }
  });

  const dialPositions = useMemo(() => {
    return DIAL_ENGINE_ORDER.map((_, i) => {
      const angle = (i / DIAL_ENGINE_ORDER.length) * Math.PI * 2;
      const radius = 0.4;
      return {
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        angle,
      };
    });
  }, []);

  const consultedCount = Object.values(dialStates).filter(Boolean).length;
  const glowIntensity = isUnlocked ? (consultedCount / 12) : 0.1;

  return (
    <group 
      ref={groupRef}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onClick={onInteract}
      scale={hovered ? 1.2 : 1}
    >
      {/* Main Sphere */}
      <Sphere args={[0.3, 32, 32]}>
        <meshStandardMaterial
          color={BRAND_COLORS.agedGold}
          emissive={BRAND_COLORS.agedGold}
          emissiveIntensity={glowIntensity * 0.5}
          metalness={0.9}
          roughness={0.1}
        />
      </Sphere>

      {/* Outer Rings - Orrery/Gyroscope */}
      <Ring args={[0.4, 0.42, 64]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial
          color={BRAND_COLORS.bone}
          emissive={BRAND_COLORS.agedGold}
          emissiveIntensity={glowIntensity * 0.3}
          side={THREE.DoubleSide}
        />
      </Ring>
      <Ring args={[0.5, 0.52, 64]} rotation={[0, Math.PI / 4, 0]}>
        <meshStandardMaterial
          color={BRAND_COLORS.bone}
          emissive={BRAND_COLORS.agedGold}
          emissiveIntensity={glowIntensity * 0.2}
          side={THREE.DoubleSide}
        />
      </Ring>
      <Ring args={[0.6, 0.62, 64]} rotation={[Math.PI / 6, Math.PI / 3, 0]}>
        <meshStandardMaterial
          color={BRAND_COLORS.bone}
          emissive={BRAND_COLORS.agedGold}
          emissiveIntensity={glowIntensity * 0.15}
          side={THREE.DoubleSide}
        />
      </Ring>

      {/* Engine Dials */}
      {DIAL_ENGINE_ORDER.map((engineId, i) => {
        const isLit = dialStates[engineId];
        const pos = dialPositions[i];
        
        return (
          <group key={engineId} position={[pos.x, 0, pos.z]}>
            <Sphere args={[0.06, 16, 16]}>
              <meshStandardMaterial
                color={isLit ? BRAND_COLORS.agedGold : BRAND_COLORS.stoneGrey}
                emissive={isLit ? BRAND_COLORS.agedGold : BRAND_COLORS.deepInk}
                emissiveIntensity={isLit ? 0.8 : 0.1}
              />
            </Sphere>
          </group>
        );
      })}

      {/* Central Crystal */}
      <mesh position={[0, 0.1, 0]}>
        <octahedronGeometry args={[0.15, 0]} />
        <meshStandardMaterial
          color={BRAND_COLORS.bone}
          emissive={BRAND_COLORS.agedGold}
          emissiveIntensity={glowIntensity}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Status Indicator */}
      {isUnlocked && (
        <Billboard position={[0, 0.8, 0]}>
          <Text
            fontSize={0.15}
            color={BRAND_COLORS.agedGold}
            anchorX="center"
            anchorY="middle"
          >
            {status === 'orbiting' ? '◉' : status === 'paused' ? '◐' : '◈'}
          </Text>
        </Billboard>
      )}
    </group>
  );
};

// ============================================================================
// Orbital Path Component
// ============================================================================

interface OrbitalPathProps {
  radius: number;
}

const OrbitalPath: React.FC<OrbitalPathProps> = ({ radius }) => {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
    }
    return pts;
  }, [radius]);

  return (
    <Line
      points={points}
      color={BRAND_COLORS.agedGold}
      lineWidth={1}
      transparent
      opacity={0.3}
    />
  );
};

// ============================================================================
// 2D Map Projection Component
// ============================================================================

interface MapProjectionProps {
  isVisible: boolean;
  engines: { id: EngineId; position: EnginePosition; consulted: boolean }[];
  connections: { from: EngineId; to: EngineId; weight: number }[];
}

const MapProjection: React.FC<MapProjectionProps> = ({ 
  isVisible, 
  engines, 
  connections 
}) => {
  if (!isVisible) return null;

  return (
    <group position={[0, 3, 0]}>
      {/* Map Background */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial
          color={BRAND_COLORS.deepInk}
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Engine Nodes */}
      {engines.map((engine) => (
        <group
          key={engine.id}
          position={[
            (engine.position.x - 50) * 0.3,
            0.05,
            (engine.position.z) * 0.3,
          ]}
        >
          <Sphere args={[engine.consulted ? 0.15 : 0.08, 16, 16]}>
            <meshStandardMaterial
              color={engine.consulted ? BRAND_COLORS.agedGold : BRAND_COLORS.stoneGrey}
              emissive={engine.consulted ? BRAND_COLORS.agedGold : BRAND_COLORS.deepInk}
              emissiveIntensity={engine.consulted ? 0.5 : 0.1}
            />
          </Sphere>
        </group>
      ))}

      {/* Connections */}
      {connections.map((conn, i) => {
        const fromEngine = engines.find((e) => e.id === conn.from);
        const toEngine = engines.find((e) => e.id === conn.to);
        if (!fromEngine || !toEngine) return null;

        const fromPos = new THREE.Vector3(
          (fromEngine.position.x - 50) * 0.3,
          0.05,
          (fromEngine.position.z) * 0.3
        );
        const toPos = new THREE.Vector3(
          (toEngine.position.x - 50) * 0.3,
          0.05,
          (toEngine.position.z) * 0.3
        );

        return (
          <Line
            key={`${conn.from}-${conn.to}-${i}`}
            points={[fromPos, toPos]}
            color={BRAND_COLORS.agedGold}
            lineWidth={conn.weight * 3}
            transparent
            opacity={0.4}
          />
        );
      })}

      {/* Title */}
      <Billboard position={[0, 0, 4.5]}>
        <Text
          fontSize={0.3}
          color={BRAND_COLORS.agedGold}
          anchorX="center"
          anchorY="middle"
        >
          The Cartographer's Map
        </Text>
      </Billboard>
    </group>
  );
};

// ============================================================================
// Main Cartographer Component
// ============================================================================

export const CartographerCompass: React.FC = () => {
  const {
    cartographer,
    engines,
    updateCartographerOrbit,
    pauseCartographer,
    synthesizeMetaReading,
    unfoldMap,
  } = useCartographerStore();

  const { spawnCelebration } = usePolishStore();
  const { camera } = useThree();
  
  const [showMap, setShowMap] = useState(false);

  // Update orbit animation
  useFrame((state, delta) => {
    if (cartographer.status === 'orbiting') {
      updateCartographerOrbit(delta);
    }
  });

  const compassPosition = useMemo(() => {
    const phaseRad = (cartographer.orbitalPath.currentPhase * Math.PI) / 180;
    return {
      x: 50 + Math.cos(phaseRad) * cartographer.orbitalPath.radius,
      y: cartographer.orbitalPath.yOffset,
      z: Math.sin(phaseRad) * cartographer.orbitalPath.radius,
    };
  }, [cartographer.orbitalPath]);

  const handleInteract = () => {
    if (!cartographer.unlocked) return;

    if (cartographer.status === 'orbiting') {
      pauseCartographer();
      
      // Play activation sound
      const vesselPos = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
      engineAudio.playActivationTone('cartographer-compass', vesselPos);
      
      // Synthesize meta-reading
      synthesizeMetaReading();
      
      // Unfold map after brief delay
      setTimeout(() => {
        unfoldMap();
        setShowMap(true);
        spawnCelebration('cartographer-compass', compassPosition);
      }, 500);
    } else if (cartographer.status === 'paused') {
      setShowMap(!showMap);
    }
  };

  const engineData = useMemo(() => 
    engines.map((e) => ({
      id: e.engineId,
      position: e.position,
      consulted: cartographer.dialStates[e.engineId],
    })),
    [engines, cartographer.dialStates]
  );

  const mapConnections = useMemo(() => {
    if (!cartographer.currentMap) return [];
    return cartographer.currentMap.connections.map((c) => ({
      from: c.from,
      to: c.to,
      weight: c.weight,
    }));
  }, [cartographer.currentMap]);

  return (
    <group position={[compassPosition.x, compassPosition.y, compassPosition.z]}>
      {/* Orbital Path Visualization */}
      <OrbitalPath radius={cartographer.orbitalPath.radius} />
      
      {/* Compass Core */}
      <CompassCore
        isUnlocked={cartographer.unlocked}
        dialStates={cartographer.dialStates}
        status={cartographer.status}
        onInteract={handleInteract}
      />
      
      {/* Map Projection */}
      <MapProjection
        isVisible={showMap}
        engines={engineData}
        connections={mapConnections}
      />

      {/* Unlock Progress Indicator (when locked) */}
      {!cartographer.unlocked && (
        <Billboard position={[0, -0.8, 0]}>
          <Html center>
            <div className="bg-[#1A1A2E]/90 px-3 py-2 rounded border border-[#B8860B]/30 text-center">
              <div className="text-[#B8860B] text-lg font-bold">
                {cartographer.unlockProgress}/7
              </div>
              <div className="text-[#6B6B6B] text-xs">
                engines to unlock
              </div>
            </div>
          </Html>
        </Billboard>
      )}
    </group>
  );
};

export default CartographerCompass;
