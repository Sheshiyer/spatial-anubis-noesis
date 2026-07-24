/**
 * Tarot Arcana (P3-S1-13 to 18)
 * 78 card spiral orbital ring with SparkJS veil
 */

import React, { useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useTier1EngineStore, selectLoadingState } from '../shared/engineStore';
import { FloatingText } from '../shared/Text3D';
import { ParticleBurst, LoadingGlow } from '../shared/FilamentConnections';
import { getTarotReading } from '../../../api/tier1Engines';
import { getAbsolutePosition } from '../shared/types';
import type { TarotCard, TarotSpread, TarotReading } from '../shared/types';
import { SPARKJS_VEIL_CONFIG } from './Veil';

// ============================================================================
// Constants
// ============================================================================

const TOTAL_CARDS = 78;
const MAJOR_ARCANA = 22;

const SPREAD_CONFIGS: Record<TarotSpread, number> = {
  single: 1,
  three_card: 3,
  celtic_cross: 10,
};

// Card geometry
const CARD_WIDTH = 0.4;
const CARD_HEIGHT = 0.7;

// Spiral parameters
const SPIRAL_RADIUS = 3;
const SPIRAL_HEIGHT = 2;
const SPIRAL_TURNS = 2;

// ============================================================================
// Card Component
// ============================================================================

interface TarotCardMeshProps {
  card: TarotCard;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  isRevealed: boolean;
  isSelected: boolean;
  onClick?: () => void;
}

const TarotCardMesh: React.FC<TarotCardMeshProps> = ({
  card,
  position,
  rotation,
  isRevealed,
  isSelected,
  onClick,
}) => {
  const meshRef = React.useRef<THREE.Mesh>(null);
  const [isHovered, setIsHovered] = React.useState(false);

  // Hover animation
  useFrame(() => {
    if (meshRef.current) {
      const targetScale = isSelected ? 3 : isHovered ? 1.1 : 1;
      meshRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        0.1
      );
    }
  });

  // Card back material (gold with sacred geometry)
  const cardBackMaterial = React.useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 448;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Gold background
    ctx.fillStyle = '#B8860B';
    ctx.fillRect(0, 0, 256, 448);

    // Sacred geometry pattern (simplified mandala)
    ctx.strokeStyle = '#1A1A2E';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(128, 224, 80, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(128, 224, 60, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(128, 224, 40, 0, Math.PI * 2);
    ctx.stroke();

    // Center dot
    ctx.fillStyle = '#1A1A2E';
    ctx.beginPath();
    ctx.arc(128, 224, 10, 0, Math.PI * 2);
    ctx.fill();

    return new THREE.CanvasTexture(canvas);
  }, []);

  // Card face material
  const cardFaceMaterial = React.useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 448;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Background based on arcana
    if (card.arcana === 'major') {
      ctx.fillStyle = '#1A1A2E';
    } else {
      const suitColors: Record<string, string> = {
        cups: '#3B5998',
        wands: '#C65D3B',
        swords: '#6B6B6B',
        pentacles: '#B8860B',
      };
      ctx.fillStyle = suitColors[card.suit || 'cups'];
    }
    ctx.fillRect(0, 0, 256, 448);

    // Card name
    ctx.fillStyle = '#F5F0E8';
    ctx.font = 'bold 20px serif';
    ctx.textAlign = 'center';
    ctx.fillText(card.name, 128, 50);

    // Card number
    ctx.font = '16px serif';
    ctx.fillText(
      card.arcana === 'major' 
        ? `${card.id}: ${card.name}`
        : `${card.number} of ${card.suit}`,
      128,
      400
    );

    // Reversed indicator
    if (card.reversed) {
      ctx.fillStyle = '#C65D3B';
      ctx.fillText('REVERSED', 128, 430);
    }

    return new THREE.CanvasTexture(canvas);
  }, [card]);

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={rotation}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <boxGeometry args={[CARD_WIDTH, CARD_HEIGHT, 0.01]} />
      <meshStandardMaterial
        map={isRevealed ? cardFaceMaterial : cardBackMaterial}
        color="#FFFFFF"
      />
    </mesh>
  );
};

// ============================================================================
// SparkJS Veil Component (P3-S1-14)
// ============================================================================

const Veil: React.FC<{ coherence: number }> = ({ coherence }) => {
  const pointsRef = React.useRef<THREE.Points>(null);

  // Generate veil particles based on coherence
  const { positions, opacity } = React.useMemo(() => {
    const particleCount = Math.floor(
      SPARKJS_VEIL_CONFIG.maxDensity - 
      (coherence / 100) * (SPARKJS_VEIL_CONFIG.maxDensity - SPARKJS_VEIL_CONFIG.minDensity)
    );

    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = SPIRAL_RADIUS + (Math.random() - 0.5);

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = (Math.random() - 0.5) * SPIRAL_HEIGHT;
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }

    return {
      positions: pos,
      opacity: SPARKJS_VEIL_CONFIG.baseOpacity * (1 - coherence / 100),
    };
  }, [coherence]);

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={SPARKJS_VEIL_CONFIG.color}
        size={0.05}
        transparent
        opacity={opacity}
        sizeAttenuation
      />
    </points>
  );
};

// ============================================================================
// Main Tarot Engine
// ============================================================================

interface TarotEngineProps {
  visible?: boolean;
  coherence?: number; // Required coherence to draw
}

export const TarotEngine: React.FC<TarotEngineProps> = ({
  visible = true,
  coherence = 0,
}) => {
  const enginePosition = getAbsolutePosition('tarot');
  const loadingState = useTier1EngineStore(selectLoadingState('tarot'));
  const setLoading = useTier1EngineStore((state) => state.setLoading);
  const addToHistory = useTier1EngineStore((state) => state.addToHistory);
  const setCurrentReading = useTier1EngineStore((state) => state.setCurrentReading);

  const [cards, setCards] = useState<TarotCard[]>([]);
  const [selectedCards, setSelectedCards] = useState<TarotCard[]>([]);
  const [currentSpread, setCurrentSpread] = useState<TarotSpread>('three_card');
  const [reading, setReading] = useState<TarotReading | null>(null);

  // Check if can draw based on coherence (P3-S1-15)
  const canDraw = coherence >= 60;

  // Generate card deck
  const generateDeck = (): TarotCard[] => {
    const deck: TarotCard[] = [];

    // Major Arcana (0-21)
    const majorArcanaNames = [
      'The Fool', 'The Magician', 'The High Priestess', 'The Empress', 'The Emperor',
      'The Hierophant', 'The Lovers', 'The Chariot', 'Strength', 'The Hermit',
      'Wheel of Fortune', 'Justice', 'The Hanged Man', 'Death', 'Temperance',
      'The Devil', 'The Tower', 'The Star', 'The Moon', 'The Sun',
      'Judgement', 'The World'
    ];

    for (let i = 0; i < MAJOR_ARCANA; i++) {
      deck.push({
        id: i,
        name: majorArcanaNames[i],
        arcana: 'major',
        reversed: Math.random() > 0.5,
      });
    }

    // Minor Arcana
    const suits: ('cups' | 'wands' | 'swords' | 'pentacles')[] = ['cups', 'wands', 'swords', 'pentacles'];
    let id = MAJOR_ARCANA;

    for (const suit of suits) {
      for (let num = 1; num <= 14; num++) {
        const name = num === 1 ? 'Ace' : 
                     num <= 10 ? num.toString() :
                     num === 11 ? 'Page' :
                     num === 12 ? 'Knight' :
                     num === 13 ? 'Queen' : 'King';
        deck.push({
          id: id++,
          name: `${name} of ${suit.charAt(0).toUpperCase() + suit.slice(1)}`,
          arcana: 'minor',
          suit,
          number: num,
          reversed: Math.random() > 0.5,
        });
      }
    }

    return deck;
  };

  // Initialize deck
  React.useEffect(() => {
    setCards(generateDeck());
  }, []);

  // Card positions in spiral
  const cardPositions = useMemo(() => {
    return cards.map((_, index) => {
      const t = index / TOTAL_CARDS;
      const angle = t * Math.PI * 2 * SPIRAL_TURNS;
      const y = (t - 0.5) * SPIRAL_HEIGHT;
      const radius = SPIRAL_RADIUS + Math.sin(t * Math.PI * 4) * 0.3;

      return new THREE.Vector3(
        radius * Math.cos(angle),
        y,
        radius * Math.sin(angle)
      );
    });
  }, [cards]);

  // Card rotations (facing outward from spiral center)
  const cardRotations = useMemo(() => {
    return cards.map((_, index) => {
      const t = index / TOTAL_CARDS;
      const angle = t * Math.PI * 2 * SPIRAL_TURNS;
      return new THREE.Euler(0, -angle, 0);
    });
  }, [cards]);

  // Handle card selection
  const handleCardClick = async (card: TarotCard) => {
    if (!canDraw || selectedCards.length >= SPREAD_CONFIGS[currentSpread]) return;

    // Check coherence requirement
    if (coherence < 60) {
      console.log('[TarotEngine] Coherence too low to draw');
      return;
    }

    const newSelected = [...selectedCards, card];
    setSelectedCards(newSelected);

    // Check if spread is complete
    if (newSelected.length === SPREAD_CONFIGS[currentSpread]) {
      await fetchReading(newSelected);
    }
  };

  // Fetch reading from backend
  const fetchReading = async (drawnCards: TarotCard[]) => {
    setLoading('tarot', true, 'reading');

    try {
      const response = await getTarotReading({
        cardIds: drawnCards.map((c) => c.id),
        spreadType: currentSpread,
        reversed: drawnCards.map((c) => c.reversed),
      });

      setReading(response);

      setCurrentReading('tarot', {
        readingId: `tarot-${Date.now()}`,
        timestamp: Date.now(),
        engineId: 'tarot',
        inputData: { cards: drawnCards, spread: currentSpread },
        outputData: response,
      });

      addToHistory('tarot', {
        readingId: `tarot-${Date.now()}`,
        summary: `${currentSpread}: ${drawnCards.map((c) => c.name).join(', ')}`,
      });
    } catch (error) {
      console.error('[TarotEngine] Failed to fetch reading:', error);
    } finally {
      setLoading('tarot', false);
    }
  };

  // Reset spread
  const resetSpread = () => {
    setSelectedCards([]);
    setReading(null);
    setCards(generateDeck());
    setCurrentReading('tarot', null);
  };

  if (!visible) return null;

  return (
    <group position={enginePosition}>
      {/* SparkJS Veil */}
      <Veil coherence={coherence} />

      {/* Card Spiral */}
      {cards.map((card, index) => (
        <TarotCardMesh
          key={card.id}
          card={card}
          position={cardPositions[index]}
          rotation={cardRotations[index]}
          isRevealed={selectedCards.includes(card)}
          isSelected={selectedCards.includes(card)}
          onClick={() => handleCardClick(card)}
        />
      ))}

      {/* Selected cards display */}
      {selectedCards.length > 0 && !reading && (
        <group position={[0, -3, 0]}>
          {selectedCards.map((card, index) => {
            const offset = (index - (selectedCards.length - 1) / 2) * 1;
            return (
              <TarotCardMesh
                key={`selected-${card.id}`}
                card={card}
                position={new THREE.Vector3(offset, 0, 0)}
                rotation={new THREE.Euler(0, 0, card.reversed ? Math.PI : 0)}
                isRevealed={true}
                isSelected={true}
              />
            );
          })}
        </group>
      )}

      {/* Reading display */}
      {reading && (
        <group position={[0, 4, 0]}>
          <FloatingText
            text={reading.interpretation.substring(0, 100) + '...'}
            position={new THREE.Vector3(0, 0, 0)}
            color="#F5F0E8"
            fontSize={0.15}
          />
        </group>
      )}

      {/* Loading effects */}
      {loadingState.particleBurst && (
        <ParticleBurst
          position={new THREE.Vector3(0, 0, 0)}
          color="#B8860B"
          count={50}
        />
      )}
      <LoadingGlow
        position={new THREE.Vector3(0, 0, 0)}
        active={loadingState.isLoading}
      />

      {/* Coherence warning */}
      {!canDraw && (
        <FloatingText
          text="Breathe to lower the veil (Coherence > 60)"
          position={new THREE.Vector3(0, -4, 0)}
          color="#C65D3B"
          fontSize={0.15}
        />
      )}

      {/* Draw progress */}
      {canDraw && selectedCards.length < SPREAD_CONFIGS[currentSpread] && (
        <FloatingText
          text={`Draw ${SPREAD_CONFIGS[currentSpread] - selectedCards.length} more card(s)`}
          position={new THREE.Vector3(0, -4, 0)}
          color="#F5F0E8"
          fontSize={0.15}
        />
      )}
    </group>
  );
};
