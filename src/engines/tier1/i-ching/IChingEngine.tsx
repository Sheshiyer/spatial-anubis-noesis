/**
 * I-Ching Oracle Engine (P3-S1-01 to 09)
 * Complete I-Ching divination system
 */

import React, { useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { IChingDish } from './IChingDish';
import { HexagramDisplay, ChangingHexagrams } from './HexagramDisplay';
import { FloatingText } from '../shared/Text3D';
import { ParticleBurst, LoadingGlow } from '../shared/FilamentConnections';
import { useTier1EngineStore, selectLoadingState } from '../shared/engineStore';
import { getIChingReading } from '../../../api/tier1Engines';
import type { IChingReading, HexagramLine } from './types';
import {
  calculateLineValue,
  getLineType,
  isChangingLine,
  DEFAULT_DISH_CONFIG,
} from './types';
import { getAbsolutePosition } from '../shared/types';

// ============================================================================
// Types
// ============================================================================

interface CoinResult {
  coinId: string;
  face: 'yang' | 'yin';
}

interface IChingEngineProps {
  visible?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export const IChingEngine: React.FC<IChingEngineProps> = ({ visible = true }) => {
  const enginePosition = getAbsolutePosition('i-ching');
  
  // Store state
  const loadingState = useTier1EngineStore(selectLoadingState('i-ching'));
  const setLoading = useTier1EngineStore((state) => state.setLoading);
  const addToHistory = useTier1EngineStore((state) => state.addToHistory);
  const setCurrentReading = useTier1EngineStore((state) => state.setCurrentReading);

  // Local state
  const [tossCount, setTossCount] = useState(0);
  const [lines, setLines] = useState<HexagramLine[]>([]);
  const [reading, setReading] = useState<IChingReading | null>(null);
  const [showReading, setShowReading] = useState(false);

  // Coin positions (for visual reference)
  const coinPositions = useMemo(() => [
    new THREE.Vector3(-0.3, 2, 0).add(enginePosition),
    new THREE.Vector3(0, 2, 0).add(enginePosition),
    new THREE.Vector3(0.3, 2, 0).add(enginePosition),
  ], [enginePosition]);

  // Simulate a coin toss (would be physics-based in full implementation)
  const simulateToss = useCallback(() => {
    if (tossCount >= 6) return;

    // Simulate 3 coin results
    const faces: ('yang' | 'yin')[] = [
      Math.random() > 0.5 ? 'yang' : 'yin',
      Math.random() > 0.5 ? 'yang' : 'yin',
      Math.random() > 0.5 ? 'yang' : 'yin',
    ];

    const value = calculateLineValue(faces);
    const lineType = getLineType(value);
    const changing = isChangingLine(value);
    
    const newLine: HexagramLine = {
      position: tossCount + 1,
      lineType,
      changing,
      value,
    };
    
    const newLines = [...lines, newLine];
    setLines(newLines);
    setTossCount((count) => count + 1);
    
    // Check if hexagram is complete
    if (tossCount + 1 === 6) {
      fetchReading(newLines);
    }
  }, [tossCount, lines]);

  // Fetch reading from backend
  const fetchReading = async (completeLines: HexagramLine[]) => {
    setLoading('i-ching', true, 'reading');
    
    try {
      const ichingLines = completeLines.map((l) => ({
        value: l.value,
        changing: l.changing,
        position: l.position,
      }));
      
      const response = await getIChingReading({
        lines: ichingLines,
        method: 'three_coin',
      });
      
      setReading(response);
      setShowReading(true);
      
      // Store in engine state
      setCurrentReading('i-ching', {
        readingId: `iching-${Date.now()}`,
        timestamp: Date.now(),
        engineId: 'i-ching',
        inputData: { lines: ichingLines },
        outputData: response,
      });
      
      addToHistory('i-ching', {
        readingId: `iching-${Date.now()}`,
        summary: `${response.hexagramName.english} (${response.hexagramNumber})`,
      });
    } catch (error) {
      console.error('[IChingEngine] Failed to fetch reading:', error);
    } finally {
      setLoading('i-ching', false);
    }
  };

  // Reset reading
  const resetReading = () => {
    setTossCount(0);
    setLines([]);
    setReading(null);
    setShowReading(false);
    setCurrentReading('i-ching', null);
  };

  // Calculate transformed lines (for changing lines)
  const transformedLines = useMemo(() => {
    return lines.map((line) => ({
      ...line,
      lineType: line.changing ? (line.lineType === 'yang' ? 'yin' : 'yang') : line.lineType,
      changing: false,
    }));
  }, [lines]);

  if (!visible) return null;

  return (
    <group position={enginePosition}>
      {/* Stone Dish */}
      <IChingDish />

      {/* Visual coin representations */}
      {tossCount < 6 && (
        <>
          {coinPositions.map((pos, index) => (
            <mesh key={index} position={pos}>
              <cylinderGeometry args={[0.15, 0.15, 0.02, 32]} />
              <meshStandardMaterial color="#B8860B" metalness={0.9} roughness={0.4} />
            </mesh>
          ))}
        </>
      )}

      {/* Line visualization (building up) */}
      {lines.length > 0 && !showReading && (
        <HexagramDisplay
          lines={lines}
          position={new THREE.Vector3(0, 3, 0)}
        />
      )}

      {/* Complete reading display */}
      {showReading && reading && (
        <>
          {/* Side-by-side hexagrams */}
          <ChangingHexagrams
            primaryLines={lines}
            transformedLines={transformedLines}
            position={new THREE.Vector3(0, 3, 0)}
            primaryLabel={reading.hexagramName.english}
            transformedLabel={reading.transformedHexagram?.name.english}
          />

          {/* 3D Text interpretation */}
          <FloatingText
            text={reading.hexagramName.english}
            position={new THREE.Vector3(0, 5, 0)}
            color="#F5F0E8"
            fontSize={0.3}
          />

          {/* Chinese name */}
          <FloatingText
            text={reading.hexagramName.chinese}
            position={new THREE.Vector3(0, 5.5, 0)}
            color="#B8860B"
            fontSize={0.4}
          />
        </>
      )}

      {/* Particle burst on anticipation */}
      {loadingState.particleBurst && (
        <ParticleBurst
          position={new THREE.Vector3(0, 1, 0)}
          color="#B8860B"
          count={30}
        />
      )}

      {/* Loading glow during API wait */}
      <LoadingGlow
        position={new THREE.Vector3(0, 2, 0)}
        active={loadingState.isLoading}
      />

      {/* Toss counter */}
      {tossCount < 6 && (
        <FloatingText
          text={`Line ${tossCount + 1} of 6`}
          position={new THREE.Vector3(0, 4, 0)}
          color="#6B6B6B"
          fontSize={0.2}
        />
      )}

      {/* Instructions */}
      {tossCount < 6 && (
        <group position={[0, -2, 0]} onClick={simulateToss}>
          <mesh>
            <boxGeometry args={[2, 0.5, 0.1]} />
            <meshStandardMaterial color="#B8860B" />
          </mesh>
          <FloatingText
            text="Click to Toss Coins"
            position={new THREE.Vector3(0, 0, 0.1)}
            color="#1A1A2E"
            fontSize={0.15}
          />
        </group>
      )}
    </group>
  );
};
