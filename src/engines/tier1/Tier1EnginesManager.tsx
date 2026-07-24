/**
 * Tier 1 Engines Manager (P3-S1-27)
 * Manages all 5 Tier 1 Ancient Instruments
 * Handles spatial placement, hover expansion, and inter-engine connections
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { IChingEngine } from './i-ching';
import { VimshottariEngine } from './vimshottari';
import { TarotEngine } from './tarot';
import { RuneEngine } from './runes';
import { NumerologyEngine } from './numerology';
import { FilamentConnections } from './shared';
import { useTier1EngineStore, selectIsHovered } from './shared/engineStore';
import type { EngineId } from './shared/types';

// ============================================================================
// Props
// ============================================================================

interface Tier1EnginesManagerProps {
  /** Which engines to show */
  activeEngines?: EngineId[];
  /** User birth data for Vimshottari */
  birthDatetime?: string;
  birthLocation?: { latitude: number; longitude: number };
  /** Current coherence for Tarot veil */
  coherence?: number;
}

// ============================================================================
// Individual Engine Wrapper with Hover Effects (P3-S1-31)
// ============================================================================

interface EngineWrapperProps {
  engineId: EngineId;
  children: React.ReactNode;
}

const EngineWrapper: React.FC<EngineWrapperProps> = ({ engineId, children }) => {
  const groupRef = React.useRef<THREE.Group>(null);
  const isHovered = useTier1EngineStore(selectIsHovered(engineId));
  const setHoveredEngine = useTier1EngineStore((state) => state.setHoveredEngine);
  const setEngineInteraction = useTier1EngineStore((state) => state.setEngineInteraction);

  // Hover expansion animation (300ms tween)
  React.useEffect(() => {
    if (!groupRef.current) return;

    const targetScale = isHovered ? 1.1 : 1.0;
    const startScale = groupRef.current.scale.x;
    const startTime = Date.now();
    const duration = 300;

    const animate = () => {
      if (!groupRef.current) return;
      
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const currentScale = startScale + (targetScale - startScale) * ease;
      
      groupRef.current.scale.set(currentScale, currentScale, currentScale);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [isHovered]);

  const handlePointerEnter = () => {
    setHoveredEngine(engineId);
    setEngineInteraction(engineId, 'hovered');
  };

  const handlePointerLeave = () => {
    setHoveredEngine(null);
    setEngineInteraction(engineId, 'idle');
  };

  return (
    <group
      ref={groupRef}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      {children}
    </group>
  );
};

// ============================================================================
// Main Manager Component
// ============================================================================

export const Tier1EnginesManager: React.FC<Tier1EnginesManagerProps> = ({
  activeEngines = ['i-ching', 'vimshottari', 'tarot', 'runes', 'numerology'],
  birthDatetime,
  birthLocation,
  coherence = 0,
}) => {
  // Memoize engines config
  const enginesConfig = useMemo(() => ({
    'i-ching': { component: IChingEngine, visible: activeEngines.includes('i-ching') },
    'vimshottari': { 
      component: VimshottariEngine, 
      visible: activeEngines.includes('vimshottari'),
      props: { birthDatetime, birthLocation }
    },
    'tarot': { 
      component: TarotEngine, 
      visible: activeEngines.includes('tarot'),
      props: { coherence }
    },
    'runes': { component: RuneEngine, visible: activeEngines.includes('runes') },
    'numerology': { component: NumerologyEngine, visible: activeEngines.includes('numerology') },
  }), [activeEngines, birthDatetime, birthLocation, coherence]);

  return (
    <group name="tier1-engines">
      {/* Inter-engine filament connections (P3-S1-28) */}
      <FilamentConnections />

      {/* Engine instances */}
      {(Object.entries(enginesConfig) as [EngineId, typeof enginesConfig['i-ching']][]).map(
        ([engineId, config]) => {
          if (!config.visible) return null;
          
          const EngineComponent = config.component;
          
          return (
            <EngineWrapper key={engineId} engineId={engineId}>
              <EngineComponent {...(config.props || {})} />
            </EngineWrapper>
          );
        }
      )}
    </group>
  );
};

// ============================================================================
// Export individual engine configurations for manual placement
// ============================================================================

export const TIER_1_ENGINE_CONFIG = {
  'i-ching': {
    name: 'I-Ching Oracle',
    description: 'Physics-based coin toss divination',
    element: 'water',
  },
  'vimshottari': {
    name: 'Vimshottari Dasha',
    description: 'Vedic astrology planetary periods',
    element: 'air',
  },
  'tarot': {
    name: 'Tarot Arcana',
    description: '78-card archetypal journey',
    element: 'fire',
  },
  'runes': {
    name: 'Rune Stones',
    description: 'Elder Futhark spatial casting',
    element: 'earth',
  },
  'numerology': {
    name: 'Numerology Matrix',
    description: 'Pythagorean number analysis',
    element: 'void',
  },
} as const;

export default Tier1EnginesManager;
