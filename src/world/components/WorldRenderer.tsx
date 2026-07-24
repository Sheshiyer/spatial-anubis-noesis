/**
 * World Renderer Component
 * P2-S1: Main world rendering orchestrator
 * 
 * Integrates all world components:
 * - Progressive loader with LOD
 * - Ground ripple effect
 * - Reveal sequence
 * - Cardinal glows
 * - Cartographer trail
 * - Collision mesh
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';

import { ProgressiveWorldLoader } from './ProgressiveWorldLoader';
import { GroundRippleMesh } from './GroundRippleMesh';
import { CardinalGlows } from './CardinalGlows';
import { CartographerTrail } from './CartographerTrail';
import { useRevealController, useCollisionLoader } from '../hooks';
import type { WorldAssets, RevealPhase, DashaPlanet } from '../types';

interface WorldRendererProps {
  /** World assets to load and render */
  assets: WorldAssets;
  /** Rapier physics instance */
  rapier: typeof RAPIER | null;
  /** Physics world */
  physicsWorld: RAPIER.World | null;
  /** Whether world is active */
  active?: boolean;
  /** Called when world is fully loaded */
  onLoadComplete?: () => void;
  /** Called when reveal sequence completes */
  onRevealComplete?: () => void;
  /** Called on reveal phase changes */
  onRevealPhase?: (phase: RevealPhase, progress: number) => void;
  /** Breathfield position for trail */
  breathfieldPosition?: THREE.Vector3;
  /** Debug mode */
  debug?: boolean;
}

// Note: PhysicsLoadingIndicator removed - should be rendered outside Canvas

/**
 * Main World Renderer
 */
export const WorldRenderer: React.FC<WorldRendererProps> = ({
  assets,
  rapier,
  physicsWorld,
  active = true,
  onLoadComplete,
  onRevealComplete,
  onRevealPhase,
  breathfieldPosition = new THREE.Vector3(0, 0, 30),
  debug = false,
}) => {
  const { camera } = useThree();
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<RevealPhase>('none');
  
  // Reveal controller for timing
  const {
    state: revealState,
    start: startReveal,
    isComplete: isRevealComplete,
  } = useRevealController({
    onPhaseChange: (phase, progress) => {
      setCurrentPhase(phase);
      onRevealPhase?.(phase, progress);
    },
    onComplete: () => {
      onRevealComplete?.();
    },
    debug,
  });
  
  // Collision loader
  const {
    isLoaded: isCollisionLoaded,
    loadCollisionMesh,
  } = useCollisionLoader({
    rapier,
    physicsWorld,
    debug,
  });
  
  // Load collision mesh when world assets ready
  useEffect(() => {
    if (isLoaded && rapier && physicsWorld && assets.collisionMeshUrl) {
      loadCollisionMesh(assets.collisionMeshUrl);
    }
  }, [isLoaded, rapier, physicsWorld, assets.collisionMeshUrl, loadCollisionMesh]);
  
  // Handle world load complete
  const handleLoadComplete = useCallback(() => {
    setIsLoaded(true);
    onLoadComplete?.();
    startReveal();
  }, [onLoadComplete, startReveal]);
  
  // Calculate phase progress for each effect
  const rippleProgress = revealState.phase === 'ripple' 
    ? revealState.phaseProgress 
    : revealState.phase === 'none' ? 0 : 1;
  
  const materializeProgress = revealState.phase === 'materialize' 
    ? revealState.phaseProgress 
    : revealState.phase === 'ripple' ? 0 : 1;
  
  const glowsProgress = revealState.phase === 'glows'
    ? revealState.phaseProgress
    : revealState.phase === 'trail' || revealState.phase === 'complete' ? 1 : 0;
  
  const trailProgress = revealState.phase === 'trail' 
    ? revealState.phaseProgress 
    : revealState.phase === 'complete' ? 1 : 0;
  
  if (!active) return null;
  
  return (
    <>
      {/* Progressive world loader with splats */}
      <ProgressiveWorldLoader
        assets={assets}
        onLoadComplete={handleLoadComplete}
        autoReveal={false}
        showPreview={true}
        debug={debug}
      />
      
      {/* Ground ripple during ripple phase */}
      {(currentPhase === 'ripple' || currentPhase === 'materialize') && (
        <GroundRippleMesh
          active={currentPhase === 'ripple'}
          origin={assets.metadata.bounds.center}
          speed={15}
          amplitude={0.3}
          duration={2}
        />
      )}

      {/* Cardinal glows from glows phase onward */}
      {(currentPhase === 'glows' || currentPhase === 'trail' || currentPhase === 'complete') && (
        <CardinalGlows
          zones={assets.metadata.zones}
          active={true}
          revealProgress={glowsProgress}
          pulse={currentPhase === 'complete'}
        />
      )}

      {/* Cartographer trail during trail phase */}
      {currentPhase === 'trail' && (
        <CartographerTrail
          targetPosition={breathfieldPosition || new THREE.Vector3(0, 2, 30)}
          active={true}
          duration={2}
          onComplete={() => {}}
        />
      )}
      
      {/* Debug visualization */}
      {debug && (
        <>
          {/* World bounds wireframe */}
          <mesh position={assets.metadata.bounds.center}>
            <boxGeometry 
              args={[
                assets.metadata.bounds.max.x - assets.metadata.bounds.min.x,
                assets.metadata.bounds.max.y - assets.metadata.bounds.min.y,
                assets.metadata.bounds.max.z - assets.metadata.bounds.min.z,
              ]} 
            />
            <meshBasicMaterial
              color="#00ff00"
              wireframe
              transparent
              opacity={0.2}
            />
          </mesh>
          
          {/* Phase indicator removed - should be rendered outside Canvas */}
        </>
      )}
    </>
  );
};

/**
 * World renderer with preset world configurations
 * Pre-configured worlds for each Dasha planet
 */
export const PresetWorldRenderer: React.FC<
  Omit<WorldRendererProps, 'assets'> & { 
    dashaPlanet: DashaPlanet;
    seed?: number;
  }
> = ({ dashaPlanet, seed = 0, ...props }) => {
  // Generate preset assets based on Dasha planet
  const assets = useMemo(() => createPresetWorldAssets(dashaPlanet, seed), [dashaPlanet, seed]);
  
  return <WorldRenderer {...props} assets={assets} />;
};

/**
 * Create preset world assets for a Dasha planet
 */
function createPresetWorldAssets(planet: DashaPlanet, seed: number): WorldAssets {
  // Biome configurations for each planet
  const biomeConfigs: Record<DashaPlanet, {
    materialKeywords: string[];
    lightingPreset: string;
    fogDensity: number;
    fogColor: string;
    ambientColor: string;
    zones: {
      north: { glowColor: string; intensity: number };
      east: { glowColor: string; intensity: number };
      south: { glowColor: string; intensity: number };
      west: { glowColor: string; intensity: number };
    };
  }> = {
    Sun: {
      materialKeywords: ['radiant', 'golden', 'warm'],
      lightingPreset: 'sun-bright',
      fogDensity: 0.02,
      fogColor: '#FFD700',
      ambientColor: '#FFF8DC',
      zones: {
        north: { glowColor: '#FFD700', intensity: 1.2 },
        east: { glowColor: '#FFA500', intensity: 1.0 },
        south: { glowColor: '#FF6347', intensity: 0.9 },
        west: { glowColor: '#FFD700', intensity: 1.1 },
      },
    },
    Moon: {
      materialKeywords: ['silver', 'reflective', 'cool'],
      lightingPreset: 'moon-cool',
      fogDensity: 0.03,
      fogColor: '#C0C0C0',
      ambientColor: '#E6E6FA',
      zones: {
        north: { glowColor: '#C0C0C0', intensity: 1.0 },
        east: { glowColor: '#A9A9A9', intensity: 0.8 },
        south: { glowColor: '#D3D3D3', intensity: 0.9 },
        west: { glowColor: '#B0B0B0', intensity: 0.85 },
      },
    },
    Mars: {
      materialKeywords: ['red', 'iron', 'volcanic'],
      lightingPreset: 'mars-warm',
      fogDensity: 0.04,
      fogColor: '#CD5C5C',
      ambientColor: '#8B4513',
      zones: {
        north: { glowColor: '#CD5C5C', intensity: 1.1 },
        east: { glowColor: '#B22222', intensity: 1.0 },
        south: { glowColor: '#8B0000', intensity: 0.9 },
        west: { glowColor: '#A52A2A', intensity: 1.0 },
      },
    },
    Mercury: {
      materialKeywords: ['quick', 'fluid', 'metallic'],
      lightingPreset: 'mercury-neutral',
      fogDensity: 0.02,
      fogColor: '#708090',
      ambientColor: '#A9A9A9',
      zones: {
        north: { glowColor: '#C0C0C0', intensity: 0.9 },
        east: { glowColor: '#A9A9A9', intensity: 0.85 },
        south: { glowColor: '#D3D3D3', intensity: 0.8 },
        west: { glowColor: '#B0C4DE', intensity: 0.9 },
      },
    },
    Jupiter: {
      materialKeywords: ['expansive', 'stormy', 'noble'],
      lightingPreset: 'jupiter-grand',
      fogDensity: 0.025,
      fogColor: '#DAA520',
      ambientColor: '#F4A460',
      zones: {
        north: { glowColor: '#DAA520', intensity: 1.2 },
        east: { glowColor: '#CD853F', intensity: 1.0 },
        south: { glowColor: '#DEB887', intensity: 0.9 },
        west: { glowColor: '#D2691E', intensity: 1.0 },
      },
    },
    Venus: {
      materialKeywords: ['beautiful', 'gentle', 'floral'],
      lightingPreset: 'venus-soft',
      fogDensity: 0.02,
      fogColor: '#FFB6C1',
      ambientColor: '#FFF0F5',
      zones: {
        north: { glowColor: '#FFB6C1', intensity: 1.0 },
        east: { glowColor: '#FFC0CB', intensity: 0.9 },
        south: { glowColor: '#FF69B4', intensity: 0.85 },
        west: { glowColor: '#FFA07A', intensity: 0.9 },
      },
    },
    Saturn: {
      materialKeywords: ['obsidian', 'void', 'discipline'],
      lightingPreset: 'saturn-dark',
      fogDensity: 0.05,
      fogColor: '#1A1A2E',
      ambientColor: '#2F2F4F',
      zones: {
        north: { glowColor: '#708090', intensity: 0.8 },
        east: { glowColor: '#2F4F4F', intensity: 0.7 },
        south: { glowColor: '#696969', intensity: 0.6 },
        west: { glowColor: '#A9A9A9', intensity: 0.75 },
      },
    },
    Rahu: {
      materialKeywords: ['shadow', 'illusion', 'mystery'],
      lightingPreset: 'rahu-shadow',
      fogDensity: 0.06,
      fogColor: '#2F2F4F',
      ambientColor: '#191970',
      zones: {
        north: { glowColor: '#483D8B', intensity: 0.9 },
        east: { glowColor: '#4B0082', intensity: 0.85 },
        south: { glowColor: '#8A2BE2', intensity: 0.8 },
        west: { glowColor: '#9932CC', intensity: 0.85 },
      },
    },
    Ketu: {
      materialKeywords: ['spiritual', 'detached', 'liberation'],
      lightingPreset: 'ketu-ethereal',
      fogDensity: 0.03,
      fogColor: '#E6E6FA',
      ambientColor: '#F5F5F5',
      zones: {
        north: { glowColor: '#E6E6FA', intensity: 0.9 },
        east: { glowColor: '#D8BFD8', intensity: 0.8 },
        south: { glowColor: '#DDA0DD', intensity: 0.75 },
        west: { glowColor: '#EE82EE', intensity: 0.85 },
      },
    },
  };
  
  const config = biomeConfigs[planet];
  const boundsRadius = 50;
  
  return {
    splatUrl: `/worlds/${planet.toLowerCase()}_${seed}.splat`,
    collisionMeshUrl: `/worlds/${planet.toLowerCase()}_${seed}_collision.glb`,
    metadata: {
      id: `${planet.toLowerCase()}_${seed}`,
      dashaPlanet: planet,
      biome: {
        materialKeywords: config.materialKeywords,
        lightingPreset: config.lightingPreset,
        fogDensity: config.fogDensity,
        fogColor: config.fogColor,
        ambientColor: config.ambientColor,
      },
      bounds: {
        min: new THREE.Vector3(-boundsRadius, -10, -boundsRadius),
        max: new THREE.Vector3(boundsRadius, 20, boundsRadius),
        center: new THREE.Vector3(0, 5, 0),
        radius: boundsRadius,
      },
      zones: {
        north: {
          position: new THREE.Vector3(0, 5, -boundsRadius * 0.8),
          glowColor: config.zones.north.glowColor,
          intensity: config.zones.north.intensity,
          radius: 20,
        },
        east: {
          position: new THREE.Vector3(boundsRadius * 0.8, 5, 0),
          glowColor: config.zones.east.glowColor,
          intensity: config.zones.east.intensity,
          radius: 20,
        },
        south: {
          position: new THREE.Vector3(0, 5, boundsRadius * 0.8),
          glowColor: config.zones.south.glowColor,
          intensity: config.zones.south.intensity,
          radius: 20,
        },
        west: {
          position: new THREE.Vector3(-boundsRadius * 0.8, 5, 0),
          glowColor: config.zones.west.glowColor,
          intensity: config.zones.west.intensity,
          radius: 20,
        },
      },
    },
  };
}

export default WorldRenderer;
