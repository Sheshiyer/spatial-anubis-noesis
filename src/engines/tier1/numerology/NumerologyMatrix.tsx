/**
 * Numerology Matrix (P3-S1-23 to 26)
 * Input form → crystalline number grid → cascading animation → radial mandala
 */

import React, { useState, useRef, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useTier1EngineStore, selectLoadingState } from '../shared/engineStore';
import { FloatingText } from '../shared/Text3D';
import { ParticleBurst, LoadingGlow } from '../shared/FilamentConnections';
import { getNumerologyReading } from '../../../api/tier1Engines';
import { getAbsolutePosition } from '../shared/types';
import type { NumerologyChart, NumerologyReading } from '../shared/types';

// ============================================================================
// Constants
// ============================================================================

const GRID_SIZE = 9;
const CELL_SIZE = 0.4;
const WATERFALL_STAGGER = 50; // ms per row

// ============================================================================
// Cell Component
// ============================================================================

interface GridCellProps {
  value: number;
  row: number;
  col: number;
  isActive: boolean;
  animationDelay: number;
}

const GridCell: React.FC<GridCellProps> = ({
  value,
  row,
  col,
  isActive,
  animationDelay,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [animationComplete, setAnimationComplete] = React.useState(false);
  const [showValue, setShowValue] = React.useState(false);

  // Waterfall animation
  React.useState(() => {
    setTimeout(() => {
      setShowValue(true);
      setAnimationComplete(true);
    }, animationDelay);
  });

  // Pulse animation for active cells
  useFrame(({ clock }) => {
    if (meshRef.current && isActive && animationComplete) {
      const pulse = Math.sin(clock.getElapsedTime() * 2 + row + col) * 0.3 + 0.7;
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = pulse;
    }
  });

  const x = (col - GRID_SIZE / 2) * CELL_SIZE;
  const z = (row - GRID_SIZE / 2) * CELL_SIZE;

  const color = isActive ? 0xB8860B : 0x6B6B6B;
  const emissive = isActive ? 0xB8860B : 0x000000;
  const emissiveIntensity = isActive ? 0.5 : 0;

  return (
    <group position={[x, 0, z]}>
      {/* Cell background */}
      <mesh ref={meshRef}>
        <boxGeometry args={[CELL_SIZE * 0.9, 0.05, CELL_SIZE * 0.9]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Cell value */}
      {showValue && value > 0 && (
        <FloatingText
          text={value.toString()}
          position={new THREE.Vector3(0, 0.1, 0)}
          color={isActive ? '#F5F0E8' : '#4A4A4A'}
          fontSize={0.15}
        />
      )}
    </group>
  );
};

// ============================================================================
// Mandala Component (P3-S1-25)
// ============================================================================

interface MandalaProps {
  chart: NumerologyChart;
  position?: THREE.Vector3;
}

const Mandala: React.FC<MandalaProps> = ({ chart, position = new THREE.Vector3(0, 0, 0) }) => {
  const groupRef = useRef<THREE.Group>(null);

  // Numbers to display in mandala
  const numbers = [
    { value: chart.lifePath, label: 'Life Path', radius: 0 },
    { value: chart.expression, label: 'Expression', radius: 1.5, angle: 0 },
    { value: chart.soulUrge, label: 'Soul Urge', radius: 1.5, angle: Math.PI / 2 },
    { value: chart.personality, label: 'Personality', radius: 1.5, angle: Math.PI },
    { value: chart.maturity, label: 'Maturity', radius: 1.5, angle: -Math.PI / 2 },
    { value: chart.personalYear, label: 'Personal Year', radius: 2.5, angle: Math.PI / 4 },
  ];

  // Rotation animation
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.1;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Center - Life Path */}
      <mesh>
        <cylinderGeometry args={[0.5, 0.5, 0.1, 32]} />
        <meshStandardMaterial
          color="#B8860B"
          emissive="#B8860B"
          emissiveIntensity={0.8}
        />
      </mesh>
      <FloatingText
        text={chart.lifePath.toString()}
        position={new THREE.Vector3(0, 0.2, 0)}
        color="#F5F0E8"
        fontSize={0.3}
      />
      <FloatingText
        text="Life Path"
        position={new THREE.Vector3(0, -0.3, 0)}
        color="#6B6B6B"
        fontSize={0.1}
      />

      {/* Orbiting numbers */}
      {numbers.slice(1).map((num, index) => {
        const x = Math.cos(num.angle) * num.radius;
        const z = Math.sin(num.angle) * num.radius;

        return (
          <group key={index} position={[x, 0, z]}>
            <mesh>
              <cylinderGeometry args={[0.3, 0.3, 0.05, 16]} />
              <meshStandardMaterial
                color="#F5F0E8"
                emissive="#B8860B"
                emissiveIntensity={0.3}
              />
            </mesh>
            <FloatingText
              text={num.value.toString()}
              position={new THREE.Vector3(0, 0.15, 0)}
              color="#1A1A2E"
              fontSize={0.15}
            />
            <FloatingText
              text={num.label}
              position={new THREE.Vector3(0, -0.2, 0)}
              color="#6B6B6B"
              fontSize={0.08}
            />
          </group>
        );
      })}

      {/* Connection lines */}
      {numbers.slice(1).map((num, index) => {
        const x = Math.cos(num.angle) * num.radius;
        const z = Math.sin(num.angle) * num.radius;

        return (
          <mesh key={`line-${index}`} position={[x / 2, 0, z / 2]} rotation={[0, 0, Math.PI / 2 - num.angle]}>
            <cylinderGeometry args={[0.01, 0.01, num.radius, 8]} />
            <meshBasicMaterial color="#B8860B" transparent opacity={0.3} />
          </mesh>
        );
      })}
    </group>
  );
};

// ============================================================================
// Main Numerology Engine
// ============================================================================

interface NumerologyEngineProps {
  visible?: boolean;
}

export const NumerologyEngine: React.FC<NumerologyEngineProps> = ({ visible = true }) => {
  const enginePosition = getAbsolutePosition('numerology');
  const loadingState = useTier1EngineStore(selectLoadingState('numerology'));
  const setLoading = useTier1EngineStore((state) => state.setLoading);
  const setLoadingProgress = useTier1EngineStore((state) => state.setLoadingProgress);
  const addToHistory = useTier1EngineStore((state) => state.addToHistory);
  const setCurrentReading = useTier1EngineStore((state) => state.setCurrentReading);

  const [birthDate, setBirthDate] = useState('');
  const [fullName, setFullName] = useState('');
  const [chart, setChart] = useState<NumerologyChart | null>(null);
  const [reading, setReading] = useState<NumerologyReading | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [showMandala, setShowMandala] = useState(false);
  const [animationRow, setAnimationRow] = useState(0);

  // Calculate numerology chart
  const calculateChart = useCallback(async () => {
    if (!birthDate || !fullName) return;

    setLoading('numerology', true, 'calculation');
    setShowGrid(true);
    setShowMandala(false);
    setAnimationRow(0);

    try {
      const response = await getNumerologyReading({
        birthDate,
        fullName,
        system: 'pythagorean',
      });

      setReading(response);
      setChart(response.chart);

      // Waterfall animation (P3-S1-24)
      for (let row = 0; row < GRID_SIZE; row++) {
        setTimeout(() => {
          setAnimationRow(row);
          setLoadingProgress('numerology', ((row + 1) / GRID_SIZE) * 100);
        }, row * WATERFALL_STAGGER);
      }

      // Transition to mandala after animation
      setTimeout(() => {
        setShowMandala(true);
        setCurrentReading('numerology', {
          readingId: `numerology-${Date.now()}`,
          timestamp: Date.now(),
          engineId: 'numerology',
          inputData: { birthDate, fullName },
          outputData: response,
        });
        addToHistory('numerology', {
          readingId: `numerology-${Date.now()}`,
          summary: `Life Path ${response.chart.lifePath}`,
        });
      }, GRID_SIZE * WATERFALL_STAGGER + 500);

    } catch (error) {
      console.error('[NumerologyEngine] Failed to calculate chart:', error);
    } finally {
      setLoading('numerology', false);
    }
  }, [birthDate, fullName, setLoading, setLoadingProgress, setCurrentReading, addToHistory]);

  // Reset
  const reset = () => {
    setBirthDate('');
    setFullName('');
    setChart(null);
    setReading(null);
    setShowGrid(false);
    setShowMandala(false);
    setAnimationRow(0);
    setCurrentReading('numerology', null);
  };

  if (!visible) return null;

  return (
    <group position={enginePosition}>
      {/* Grid Display */}
      {showGrid && chart && (
        <group position={[0, 2, 0]}>
          {/* Grid background */}
          <mesh position={[0, -0.1, 0]}>
            <boxGeometry args={[GRID_SIZE * CELL_SIZE + 0.2, 0.02, GRID_SIZE * CELL_SIZE + 0.2]} />
            <meshBasicMaterial color="#1A1A2E" transparent opacity={0.8} />
          </mesh>

          {/* Grid cells */}
          {chart.grid.map((row, rowIndex) =>
            row.map((value, colIndex) => (
              <GridCell
                key={`${rowIndex}-${colIndex}`}
                value={value}
                row={rowIndex}
                col={colIndex}
                isActive={value > 0 && rowIndex <= animationRow}
                animationDelay={rowIndex * WATERFALL_STAGGER}
              />
            ))
          )}

          {/* Grid labels */}
          {Array.from({ length: GRID_SIZE }).map((_, i) => (
            <React.Fragment key={i}>
              <FloatingText
                text={(i + 1).toString()}
                position={new THREE.Vector3(
                  (i - GRID_SIZE / 2) * CELL_SIZE,
                  0.3,
                  (-GRID_SIZE / 2 - 0.5) * CELL_SIZE
                )}
                color="#6B6B6B"
                fontSize={0.1}
              />
              <FloatingText
                text={(i + 1).toString()}
                position={new THREE.Vector3(
                  (-GRID_SIZE / 2 - 0.5) * CELL_SIZE,
                  0.3,
                  (i - GRID_SIZE / 2) * CELL_SIZE
                )}
                color="#6B6B6B"
                fontSize={0.1}
              />
            </React.Fragment>
          ))}
        </group>
      )}

      {/* Mandala Display */}
      {showMandala && chart && (
        <Mandala chart={chart} position={new THREE.Vector3(0, 3, 0)} />
      )}

      {/* Reading display */}
      {reading && (
        <group position={[0, 5, 0]}>
          <FloatingText
            text={reading.interpretation.substring(0, 80) + '...'}
            position={new THREE.Vector3(0, 0, 0)}
            color="#F5F0E8"
            fontSize={0.12}
          />
        </group>
      )}

      {/* Loading effects */}
      {loadingState.particleBurst && (
        <ParticleBurst
          position={new THREE.Vector3(0, 2, 0)}
          color="#B8860B"
          count={40}
        />
      )}
      <LoadingGlow
        position={new THREE.Vector3(0, 2, 0)}
        active={loadingState.isLoading}
      />

      {/* Input hint */}
      {!showGrid && (
        <FloatingText
          text="Enter birth date and full name"
          position={new THREE.Vector3(0, -2, 0)}
          color="#6B6B6B"
          fontSize={0.15}
        />
      )}
    </group>
  );
};

// ============================================================================
// Numerology Calculation Utilities
// ============================================================================

/**
 * Calculate Life Path number from birth date
 */
export function calculateLifePath(birthDate: string): number {
  const date = new Date(birthDate);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  return reduceToDigit(day + month + year);
}

/**
 * Calculate Expression number from full name
 */
export function calculateExpression(fullName: string): number {
  const letterValues: Record<string, number> = {
    a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9,
    j: 1, k: 2, l: 3, m: 4, n: 5, o: 6, p: 7, q: 8, r: 9,
    s: 1, t: 2, u: 3, v: 4, w: 5, x: 6, y: 7, z: 8,
  };

  const sum = fullName
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .split('')
    .reduce((acc, letter) => acc + (letterValues[letter] || 0), 0);

  return reduceToDigit(sum);
}

/**
 * Reduce number to single digit (except master numbers 11, 22, 33)
 */
function reduceToDigit(num: number): number {
  if (num === 11 || num === 22 || num === 33) return num;
  
  while (num > 9) {
    num = num
      .toString()
      .split('')
      .reduce((acc, digit) => acc + parseInt(digit), 0);
  }
  
  return num;
}
