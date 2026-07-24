/**
 * Path A Splat Vessel Component
 * P1-S1-08: SparkJS Dynamic Cloud vessel
 * P1-S1-09: Pixel-to-3D curved plane mapping
 * P1-S1-10: Color grading system
 * P1-S1-11: Breathing expansion effect
 * P1-S1-23: Splat transparency at edges
 * P1-S1-24: Turbulence parameter
 * P1-S1-33: Color transition smoothing
 */

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../state/store';
import { SparkJSRenderer, DEFAULT_VESSEL_SPLAT_CONFIG } from '../rendering/sparkjs';
import { ColorSmoothingController } from '../shaders/vesselColorGrading';

/** Props for splat vessel */
export interface SplatVesselProps {
  /** Whether vessel is spawned */
  isSpawned?: boolean;
  /** Segmentation mask data */
  mask?: Uint8Array | Uint8ClampedArray;
  /** Mask dimensions */
  maskWidth?: number;
  /** Mask dimensions */
  maskHeight?: number;
  /** Video frame for color sampling */
  videoFrame?: HTMLVideoElement | HTMLCanvasElement;
}

/**
 * Path A Splat Vessel
 * Gaussian splat cloud representation from webcam segmentation
 */
export function SplatVessel({
  isSpawned = true,
  mask,
  maskWidth = 640,
  maskHeight = 480,
  videoFrame,
}: SplatVesselProps) {
  const sparkRef = useRef<SparkJSRenderer | null>(null);
  const colorControllerRef = useRef<ColorSmoothingController>(new ColorSmoothingController());
  const groupRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  
  const vesselTransform = useStore((state) => state.vessel.transform);
  const bioState = useStore((state) => state.vessel.bioState);

  // Create SparkJS renderer
  const sparkRenderer = useMemo(() => {
    return new SparkJSRenderer({
      ...DEFAULT_VESSEL_SPLAT_CONFIG,
      activeSplats: 7500, // 5,000-10,000 range
    });
  }, []);

  // Get the mesh from the renderer
  const splatMesh = useMemo(() => {
    return sparkRenderer.getMesh();
  }, [sparkRenderer]);

  // Store references
  useEffect(() => {
    sparkRef.current = sparkRenderer;
    return () => {
      sparkRenderer.dispose();
    };
  }, [sparkRenderer]);

  // Update splat data when mask changes
  useEffect(() => {
    if (!mask || !videoFrame || !sparkRef.current || !isSpawned) return;

    sparkRef.current.updateFromMask(mask, maskWidth, maskHeight, videoFrame);
  }, [mask, videoFrame, maskWidth, maskHeight, isSpawned]);

  // Update color controller target
  useEffect(() => {
    colorControllerRef.current.setTarget(bioState.coherence);
  }, [bioState.coherence]);

  // Frame update loop
  useFrame(({ clock }) => {
    if (!groupRef.current || !sparkRef.current || !isSpawned) return;

    // Update color smoothing (500ms lerp)
    const smoothedCoherence = colorControllerRef.current.update();

    // Update shader uniforms
    sparkRef.current.updateUniforms({
      uTime: clock.getElapsedTime(),
      uCoherence: smoothedCoherence,
      uLqd: bioState.lqd,
      uEntropy: bioState.entropy,
    });

    // P1-S1-22: Sync with physics body position
    groupRef.current.position.copy(vesselTransform.position);
    groupRef.current.quaternion.copy(vesselTransform.rotation);

    // P1-S1-47: Vessel light emission
    // Intensity from LQD (0.1 to 2.0)
    if (lightRef.current) {
      lightRef.current.intensity = 0.1 + bioState.lqd * 1.9;
    }
  });

  if (!isSpawned) return null;

  return (
    <group ref={groupRef}>
      {/* Splat cloud mesh */}
      <primitive object={splatMesh} />
      
      {/* P1-S1-47: Point light attached to vessel */}
      <pointLight
        ref={lightRef}
        color="#B8860B"
        intensity={0.1 + bioState.lqd * 1.9}
        distance={10}
        decay={2}
        position={[0, 0, 0]}
      />
    </group>
  );
}
