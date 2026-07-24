/**
 * Rune Stones (P3-S1-19 to 22)
 * 24 Elder Futhark stone RigidBodies with spatial casting
 */

import React, { useState, useCallback } from 'react';
import * as THREE from 'three';
import { useTier1EngineStore, selectLoadingState } from '../shared/engineStore';
import { FloatingText } from '../shared/Text3D';
import { ParticleBurst, LoadingGlow } from '../shared/FilamentConnections';
import { getRuneReading } from '../../../api/tier1Engines';
import { getAbsolutePosition } from '../shared/types';
import type { RuneStone, RuneCastType, RuneReading } from '../shared/types';

// ============================================================================
// Elder Futhark Runes
// ============================================================================

export const ELDER_FUTHARK = [
  { id: 0, glyph: 'ᚠ', name: 'Fehu', meaning: 'Wealth, cattle' },
  { id: 1, glyph: 'ᚢ', name: 'Uruz', meaning: 'Strength, wild ox' },
  { id: 2, glyph: 'ᚦ', name: 'Thurisaz', meaning: 'Thorn, giant' },
  { id: 3, glyph: 'ᚨ', name: 'Ansuz', meaning: 'God, mouth' },
  { id: 4, glyph: 'ᚱ', name: 'Raido', meaning: 'Ride, journey' },
  { id: 5, glyph: 'ᚲ', name: 'Kenaz', meaning: 'Torch, ulcer' },
  { id: 6, glyph: 'ᚷ', name: 'Gebo', meaning: 'Gift' },
  { id: 7, glyph: 'ᚹ', name: 'Wunjo', meaning: 'Joy' },
  { id: 8, glyph: 'ᚺ', name: 'Hagalaz', meaning: 'Hail' },
  { id: 9, glyph: 'ᚾ', name: 'Nauthiz', meaning: 'Need' },
  { id: 10, glyph: 'ᛁ', name: 'Isa', meaning: 'Ice' },
  { id: 11, glyph: 'ᛃ', name: 'Jera', meaning: 'Year, harvest' },
  { id: 12, glyph: 'ᛇ', name: 'Eihwaz', meaning: 'Yew tree' },
  { id: 13, glyph: 'ᛈ', name: 'Perthro', meaning: 'Dice cup, fate' },
  { id: 14, glyph: 'ᛉ', name: 'Algiz', meaning: 'Elk, protection' },
  { id: 15, glyph: 'ᛊ', name: 'Sowilo', meaning: 'Sun' },
  { id: 16, glyph: 'ᛏ', name: 'Tiwaz', meaning: 'Tyr, victory' },
  { id: 17, glyph: 'ᛒ', name: 'Berkano', meaning: 'Birch, growth' },
  { id: 18, glyph: 'ᛖ', name: 'Ehwaz', meaning: 'Horse, partnership' },
  { id: 19, glyph: 'ᛗ', name: 'Mannaz', meaning: 'Man, humanity' },
  { id: 20, glyph: 'ᛚ', name: 'Laguz', meaning: 'Water, lake' },
  { id: 21, glyph: 'ᛜ', name: 'Ingwaz', meaning: 'Ing, fertility' },
  { id: 22, glyph: 'ᛟ', name: 'Othala', meaning: 'Inheritance, home' },
  { id: 23, glyph: '', name: 'Wyrd', meaning: 'Fate, destiny' }, // Blank rune
];

// ============================================================================
// Rune Stone Mesh Component
// ============================================================================

interface RuneStoneMeshProps {
  rune: typeof ELDER_FUTHARK[0];
  position: THREE.Vector3;
  isCast: boolean;
  onCast?: (upright: boolean) => void;
}

const RuneStoneMesh: React.FC<RuneStoneMeshProps> = ({
  rune,
  position,
  isCast,
}) => {
  // Irregular pebble geometry (simplified as distorted sphere)
  const stoneGeometry = React.useMemo(() => {
    const geometry = new THREE.DodecahedronGeometry(0.15, 0);
    const positions = geometry.attributes.position.array as Float32Array;
    
    // Add irregularity
    for (let i = 0; i < positions.length; i += 3) {
      const noise = (Math.random() - 0.5) * 0.05;
      positions[i] += noise;
      positions[i + 1] += noise;
      positions[i + 2] += noise;
    }
    
    geometry.computeVertexNormals();
    return geometry;
  }, []);

  // Stone material (Bone with rough surface)
  const stoneMaterial = new THREE.MeshStandardMaterial({
    color: 0xF5F0E8,
    roughness: 0.8,
    metalness: 0.1,
  });

  // Glyph material (Aged Gold emissive)
  const glyphMaterial = new THREE.MeshStandardMaterial({
    color: 0xB8860B,
    emissive: 0xB8860B,
    emissiveIntensity: 0.5,
  });

  return (
    <group position={position}>
      {/* Irregular stone */}
      <mesh geometry={stoneGeometry} material={stoneMaterial}>
      </mesh>
      
      {/* Carved glyph */}
      {rune.glyph && (
        <mesh position={[0, 0.08, 0]} material={glyphMaterial}>
          <planeGeometry args={[0.15, 0.15]} />
        </mesh>
      )}
    </group>
  );
};

// ============================================================================
// Main Rune Stones Engine
// ============================================================================

interface RuneEngineProps {
  visible?: boolean;
}

export const RuneEngine: React.FC<RuneEngineProps> = ({ visible = true }) => {
  const enginePosition = getAbsolutePosition('runes');
  const loadingState = useTier1EngineStore(selectLoadingState('runes'));
  const setLoading = useTier1EngineStore((state) => state.setLoading);
  const addToHistory = useTier1EngineStore((state) => state.addToHistory);
  const setCurrentReading = useTier1EngineStore((state) => state.setCurrentReading);

  const [pouchOpen, setPouchOpen] = useState(false);
  const [selectedStones, setSelectedStones] = useState<typeof ELDER_FUTHARK[0][]>([]);
  const [castStones, setCastStones] = useState<RuneStone[]>([]);
  const [reading, setReading] = useState<RuneReading | null>(null);
  const [castType, setCastType] = useState<RuneCastType>('three_norn');

  const stoneCount = castType === 'single' ? 1 : 
                     castType === 'three_norn' ? 3 : 
                     castType === 'five_element' ? 5 : 9;

  // Draw stones from pouch
  const drawStones = () => {
    const drawn: typeof ELDER_FUTHARK[0][] = [];
    const available = [...ELDER_FUTHARK];
    
    for (let i = 0; i < stoneCount; i++) {
      const index = Math.floor(Math.random() * available.length);
      drawn.push(available.splice(index, 1)[0]);
    }
    
    setSelectedStones(drawn);
    setPouchOpen(true);
    
    // Simulate casting
    setTimeout(() => {
      castStonesSimulated(drawn);
    }, 500);
  };

  // Simulate stone casting
  const castStonesSimulated = (stones: typeof ELDER_FUTHARK[0][]) => {
    const cast: RuneStone[] = stones.map((rune, index) => {
      const angle = (index / stones.length) * Math.PI * 2;
      const radius = 0.5 + Math.random() * 0.5;
      const upright = Math.random() > 0.5;
      
      return {
        glyph: rune.glyph,
        glyphId: rune.id,
        position: { 
          x: enginePosition.x + Math.cos(angle) * radius, 
          y: enginePosition.y + 0.15, 
          z: enginePosition.z + Math.sin(angle) * radius 
        },
        rotation: { x: 0, y: Math.random() * Math.PI, z: 0, w: 1 },
        upright,
      };
    });
    
    setCastStones(cast);
    fetchReading(cast);
  };

  // Fetch reading from backend
  const fetchReading = async (stones: RuneStone[]) => {
    setLoading('runes', true, 'reading');

    try {
      const response = await getRuneReading({
        runes: stones,
        castType,
      });

      setReading(response);

      setCurrentReading('runes', {
        readingId: `runes-${Date.now()}`,
        timestamp: Date.now(),
        engineId: 'runes',
        inputData: { stones, castType },
        outputData: response,
      });

      addToHistory('runes', {
        readingId: `runes-${Date.now()}`,
        summary: `${castType}: ${stones.map((s) => ELDER_FUTHARK[s.glyphId].name).join(', ')}`,
      });
    } catch (error) {
      console.error('[RuneEngine] Failed to fetch reading:', error);
    } finally {
      setLoading('runes', false);
    }
  };

  // Reset casting
  const resetCast = () => {
    setSelectedStones([]);
    setCastStones([]);
    setReading(null);
    setPouchOpen(false);
    setCurrentReading('runes', null);
  };

  if (!visible) return null;

  return (
    <group position={enginePosition}>
      {/* Granite Slab */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4, 4]} />
        <meshStandardMaterial
          color="#4A4A4A"
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>

      {/* Leather Pouch */}
      <group position={[0, 0.3, 0]} onClick={drawStones}>
        <mesh>
          <sphereGeometry args={[0.4, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial
            color="#3D2914"
            roughness={0.9}
            metalness={0.1}
          />
        </mesh>
        
        {/* Pouch opening */}
        {pouchOpen && (
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.1, 16]} />
            <meshStandardMaterial color="#1A1A2E" />
          </mesh>
        )}
      </group>

      {/* Cast Stones */}
      {castStones.map((stone, index) => {
        const rune = ELDER_FUTHARK[stone.glyphId];
        return (
          <RuneStoneMesh
            key={index}
            rune={rune}
            position={new THREE.Vector3(stone.position.x, stone.position.y, stone.position.z)}
            isCast={true}
          />
        );
      })}

      {/* Reading display */}
      {reading && (
        <group>
          {castStones.map((stone, index) => {
            const rune = ELDER_FUTHARK[stone.glyphId];
            return (
              <FloatingText
                key={index}
                text={`${rune.glyph} ${rune.name}`}
                position={new THREE.Vector3(
                  stone.position.x,
                  stone.position.y + 0.5,
                  stone.position.z
                )}
                color={stone.upright ? '#B8860B' : '#6B6B6B'}
                fontSize={0.15}
              />
            );
          })}
        </group>
      )}

      {/* Loading effects */}
      {loadingState.particleBurst && (
        <ParticleBurst
          position={new THREE.Vector3(0, 1, 0)}
          color="#B8860B"
          count={30}
        />
      )}
      <LoadingGlow
        position={new THREE.Vector3(0, 1, 0)}
        active={loadingState.isLoading}
      />

      {/* Instructions */}
      {!selectedStones.length && (
        <FloatingText
          text="Click pouch to draw runes"
          position={new THREE.Vector3(0, -2, 0)}
          color="#6B6B6B"
          fontSize={0.15}
        />
      )}

      {selectedStones.length > 0 && castStones.length < selectedStones.length && (
        <FloatingText
          text="Casting the stones..."
          position={new THREE.Vector3(0, -2, 0)}
          color="#F5F0E8"
          fontSize={0.15}
        />
      )}
    </group>
  );
};
