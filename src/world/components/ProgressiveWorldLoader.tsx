/**
 * Progressive World Loader Component
 * P2-S1-10: React component for streaming splat data with LOD tiers
 * 
 * Manages the visual loading sequence:
 * - Shows loading state
 * - Transitions through LOD tiers
 * - Coordinates with reveal controller
 */

import React, { useEffect, useRef } from 'react';
import { Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorldLoader, useWorldLOD, useRevealController } from '../hooks';
import type { WorldAssets, LODTier, RevealPhase } from '../types';

interface ProgressiveWorldLoaderProps {
  /** World assets to load */
  assets: WorldAssets;
  /** Called when loading is complete */
  onLoadComplete?: () => void;
  /** Called when reveal is complete */
  onRevealComplete?: () => void;
  /** Reveal phase callback */
  onRevealPhase?: (phase: RevealPhase, progress: number) => void;
  /** Whether to auto-start reveal after load */
  autoReveal?: boolean;
  /** Render even before fully loaded (show blurry) */
  showPreview?: boolean;
  /** Debug mode */
  debug?: boolean;
}

/**
 * Splat LOD Renderer Component
 * Parses .splat binary data (32 bytes per splat) and renders as gaussian points
 */
const SplatLODRenderer: React.FC<{
  data: ArrayBuffer | null;
  tier: LODTier;
  opacity: number;
}> = ({ data, tier, opacity }) => {
  const pointsRef = React.useRef<THREE.Points>(null);
  const geometryRef = React.useRef<THREE.BufferGeometry | null>(null);

  useEffect(() => {
    if (!data || !pointsRef.current) return;

    const SPLAT_SIZE = 32; // bytes per splat
    const splatCount = Math.floor(data.byteLength / SPLAT_SIZE);
    if (splatCount === 0) return;

    const view = new DataView(data);
    const positions = new Float32Array(splatCount * 3);
    const colors = new Float32Array(splatCount * 3);
    const sizes = new Float32Array(splatCount);

    for (let i = 0; i < splatCount; i++) {
      const offset = i * SPLAT_SIZE;

      // Positions: 3x float32 at offset 0
      positions[i * 3]     = view.getFloat32(offset,     true);
      positions[i * 3 + 1] = view.getFloat32(offset + 4, true);
      positions[i * 3 + 2] = view.getFloat32(offset + 8, true);

      // Colors: 4x uint8 at offset 24 (after 3 position floats + 3 scale floats)
      colors[i * 3]     = view.getUint8(offset + 24) / 255;
      colors[i * 3 + 1] = view.getUint8(offset + 25) / 255;
      colors[i * 3 + 2] = view.getUint8(offset + 26) / 255;

      // Size from scale: average of 3x float32 at offset 12
      const sx = view.getFloat32(offset + 12, true);
      const sy = view.getFloat32(offset + 16, true);
      const sz = view.getFloat32(offset + 20, true);
      sizes[i] = (Math.abs(sx) + Math.abs(sy) + Math.abs(sz)) / 3;
    }

    // Dispose previous geometry
    if (geometryRef.current) geometryRef.current.dispose();

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometryRef.current = geometry;
    pointsRef.current.geometry = geometry;

    return () => {
      geometry.dispose();
    };
  }, [data, tier]);

  if (!data) return null;

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <pointsMaterial
        size={2}
        vertexColors
        transparent
        opacity={opacity}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </points>
  );
};

/**
 * Loading Progress UI - Removed (HTML elements can't be inside Canvas)
 * TODO: Move to App.tsx as an overlay if needed
 */

/**
 * Main Progressive World Loader Component
 */
export const ProgressiveWorldLoader: React.FC<ProgressiveWorldLoaderProps> = ({
  assets,
  onLoadComplete,
  onRevealComplete,
  onRevealPhase,
  autoReveal = true,
  showPreview = true,
  debug = false,
}) => {
  const { camera } = useThree();
  
  // World loading hook
  const {
    progress: loadingProgress,
    isComplete: isLoadComplete,
    error,
    loadWorld,
    splatData,
    activeTier: loadingTier,
  } = useWorldLoader();
  
  // Reveal controller
  const {
    isComplete: isRevealComplete,
    start: startReveal,
  } = useRevealController({
    onPhaseChange: onRevealPhase,
    onComplete: onRevealComplete,
    debug,
  });
  
  // LOD manager for runtime quality
  const { currentTier: runtimeTier, updateDistance } = useWorldLOD();
  
  // Start loading on mount — reload only when splatUrl actually changes
  const previousUrlRef = useRef<string>('');

  useEffect(() => {
    if (assets.splatUrl !== previousUrlRef.current) {
      previousUrlRef.current = assets.splatUrl;
      loadWorld(assets);
    }
  }, [assets, loadWorld]);
  
  // Handle load completion
  useEffect(() => {
    if (isLoadComplete) {
      onLoadComplete?.();
      if (autoReveal) {
        startReveal();
      }
    }
  }, [isLoadComplete, autoReveal, startReveal, onLoadComplete]);
  
  // Update LOD based on camera distance
  useEffect(() => {
    const checkDistance = () => {
      const worldCenter = assets.metadata.bounds.center;
      const cameraPos = camera.position;
      const distance = cameraPos.distanceTo(worldCenter);
      updateDistance(distance);
    };
    
    const interval = setInterval(checkDistance, 100);
    return () => clearInterval(interval);
  }, [camera, assets, updateDistance]);
  
  // Determine which tier to render
  const renderTier = isLoadComplete ? runtimeTier : loadingTier;
  const showLoading = !isLoadComplete || (!isRevealComplete && !showPreview);
  
  if (error) {
    return (
      <Html center>
        <div className="bg-red-900/90 p-8 rounded-lg text-center w-96">
          <h2 className="text-xl font-bold text-white mb-2">Failed to Load World</h2>
          <p className="text-red-200">{error.message}</p>
        </div>
      </Html>
    );
  }
  
  return (
    <>
      {/* Splat rendering for each tier */}
      {showPreview && (
        <>
          {splatData.low && (
            <SplatLODRenderer data={splatData.low} tier="low" opacity={0.8} />
          )}
          {splatData.medium && renderTier !== 'low' && (
            <SplatLODRenderer data={splatData.medium} tier="medium" opacity={0.9} />
          )}
          {splatData.high && renderTier === 'high' && (
            <SplatLODRenderer data={splatData.high} tier="high" opacity={1.0} />
          )}
        </>
      )}
    </>
  );
};

export default ProgressiveWorldLoader;
