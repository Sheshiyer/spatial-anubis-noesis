/**
 * Vessel Renderer Component
 * P1-S1-37: Create vessel rendering toggle
 * P1-S1-22: Synchronize vessel visual with physics body
 * 
 * Switches between splat cloud (Path A) and geometric (Path B)
 * <100ms toggle time
 */

import { useEffect, useState, useRef } from 'react';
import { useStore } from '../state/store';
import { SplatVessel } from './SplatVessel';
import { GeometricVessel } from './GeometricVessel';

/** Props for vessel renderer */
export interface VesselRendererProps {
  /** Segmentation mask data for Path A */
  mask?: Uint8Array | Uint8ClampedArray;
  /** Mask dimensions */
  maskWidth?: number;
  /** Mask dimensions */
  maskHeight?: number;
  /** Video frame for color sampling */
  videoFrame?: HTMLVideoElement | HTMLCanvasElement;
  /** Webcam permission status */
  webcamStatus?: 'granted' | 'denied' | 'pending';
}

/**
 * Main vessel renderer component
 * Automatically selects Path A (splat) or Path B (geometric) based on webcam status
 * Allows manual toggle between rendering modes
 */
export function VesselRenderer({
  mask,
  maskWidth = 640,
  maskHeight = 480,
  videoFrame,
  webcamStatus = 'pending',
}: VesselRendererProps) {
  const [isReady, setIsReady] = useState(false);
  const [isSpawning, setIsSpawning] = useState(false);
  const spawnTimeoutRef = useRef<number>();
  
  const renderingMode = useStore((state) => state.renderingMode);
  const setRenderingMode = useStore((state) => state.setRenderingMode);
  const setVesselPath = useStore((state) => state.setVesselPath);
  const setVesselSpawned = useStore((state) => state.setVesselSpawned);
  const isCalibrated = useStore((state) => state.vessel.isCalibrated);

  // Determine effective rendering mode based on webcam status
  const effectiveMode = webcamStatus === 'denied' ? 'geometric' : renderingMode;

  // P1-S1-20: Spawn vessel with delay
  useEffect(() => {
    if (isCalibrated && !isSpawning) {
      setIsSpawning(true);
      
      // P1-S1-20: Spawn within 200ms
      spawnTimeoutRef.current = window.setTimeout(() => {
        setIsReady(true);
        setVesselSpawned(true);
      }, 200);
    }

    return () => {
      if (spawnTimeoutRef.current) {
        clearTimeout(spawnTimeoutRef.current);
      }
    };
  }, [isCalibrated, isSpawning, setVesselSpawned]);

  // Handle webcam permission changes
  useEffect(() => {
    if (webcamStatus === 'denied') {
      setRenderingMode('geometric');
      setVesselPath('B');
    } else if (webcamStatus === 'granted') {
      setRenderingMode('splat');
      setVesselPath('A');
    }
  }, [webcamStatus, setRenderingMode, setVesselPath]);

  // Don't render until calibrated
  if (!isReady) return null;

  return (
    <>
      {effectiveMode === 'splat' ? (
        <SplatVessel
          isSpawned={isReady}
          mask={mask}
          maskWidth={maskWidth}
          maskHeight={maskHeight}
          videoFrame={videoFrame}
        />
      ) : (
        <GeometricVessel isSpawned={isReady} />
      )}
    </>
  );
}

/**
 * Hook to control vessel rendering mode
 */
export function useVesselRendering() {
  const renderingMode = useStore((state) => state.renderingMode);
  const setRenderingMode = useStore((state) => state.setRenderingMode);
  const toggleRenderingMode = useStore((state) => state.toggleRenderingMode);
  const vesselPath = useStore((state) => state.vessel.path);

  return {
    renderingMode,
    vesselPath,
    setRenderingMode,
    toggleRenderingMode,
    isSplatMode: renderingMode === 'splat',
    isGeometricMode: renderingMode === 'geometric',
  };
}
