/**
 * Main Vessel Hook
 * Integrates all vessel systems: rendering, physics, controls, LOD
 */

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../state/store';
import { getVesselPhysicsController } from './vesselPhysics';
import { VesselLODController } from './vesselLOD';
import { SegmentationTextureManager } from './segmentationTexture';
import { usePathBControls } from './vesselControls';

/** Mask data for segmentation */
export interface SegmentationMask {
  width: number;
  height: number;
  data: Uint8Array | Uint8ClampedArray;
  timestamp: number;
}

/** Webcam frame data */
export interface WebcamFrame {
  video: HTMLVideoElement;
  width: number;
  height: number;
  timestamp: number;
}

/** Vessel hook options */
export interface UseVesselOptions {
  /** Webcam permission status */
  webcamStatus: 'granted' | 'denied' | 'pending';
  /** Segmentation mask data */
  mask?: SegmentationMask;
  /** Webcam frame */
  frame?: WebcamFrame;
  /** Enable Path B controls */
  enablePathBControls?: boolean;
}

/**
 * Main vessel hook
 * Integrates physics, rendering, LOD, and controls
 */
export function useVessel(options: UseVesselOptions) {
  const { webcamStatus, mask, enablePathBControls = true } = options;
  
  const { camera } = useThree();
  const vesselRef = useRef<THREE.Group>(null);
  const physicsControllerRef = useRef(getVesselPhysicsController());
  const lodControllerRef = useRef(new VesselLODController());
  const textureManagerRef = useRef(new SegmentationTextureManager());
  const isPhysicsInitialized = useRef(false);

  // Store selectors
  const vesselState = useStore((state) => state.vessel);
  const setVesselPosition = useStore((state) => state.setVesselPosition);
  const setVesselRotation = useStore((state) => state.setVesselRotation);
  const setVesselBioState = useStore((state) => state.setVesselBioState);
  const renderingMode = useStore((state) => state.renderingMode);

  // Enable Path B controls when webcam is denied
  const isPathB = webcamStatus === 'denied' || renderingMode === 'geometric';
  usePathBControls(enablePathBControls && isPathB);

  // Initialize physics body on spawn
  useEffect(() => {
    if (vesselState.isSpawned && !isPhysicsInitialized.current) {
      const physics = physicsControllerRef.current;
      
      // P1-S1-30: Create physics body with correct config
      physics.createBody({
        mass: vesselState.physicsConfig.mass,
        position: vesselState.transform.position,
        rotation: vesselState.transform.rotation,
        linearDamping: vesselState.physicsConfig.linearDampingBase,
        angularDamping: vesselState.physicsConfig.rotationDamping,
        lockRotationsX: vesselState.physicsConfig.lockedAxes.x,
        lockRotationsZ: vesselState.physicsConfig.lockedAxes.z,
      });

      isPhysicsInitialized.current = true;
      console.log('[useVessel] Physics body initialized');
    }

    return () => {
      if (!vesselState.isSpawned && isPhysicsInitialized.current) {
        physicsControllerRef.current.destroy();
        isPhysicsInitialized.current = false;
      }
    };
  }, [vesselState.isSpawned, vesselState.physicsConfig, vesselState.transform]);

  // Update texture from mask
  useEffect(() => {
    if (mask?.data && renderingMode === 'splat') {
      textureManagerRef.current.uploadMask(mask.data);
    }
  }, [mask, renderingMode]);

  // Main update loop
  useFrame((_, delta) => {
    if (!vesselState.isSpawned) return;

    const physics = physicsControllerRef.current;
    const body = physics.getBody();

    // P1-S1-22: Sync physics to store
    if (body) {
      const position = body.translation();
      const rotation = body.rotation();

      setVesselPosition(new THREE.Vector3(position.x, position.y, position.z));
      setVesselRotation(new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w));

      // P1-S1-27: Apply movement damping
      physics.applyRotationDamping(delta);

      // P1-S1-15: Update linear damping based on coherence
      physics.updateLinearDamping(vesselState.bioState.coherence);

      // P1-S1-46: Raycast for approaching objects
      physics.raycastForward();
    }

    // Update LOD
    if (vesselRef.current) {
      const splatMesh = vesselRef.current.getObjectByName('splat-mesh');
      if (splatMesh && splatMesh instanceof THREE.Points) {
        lodControllerRef.current.update(
          vesselState.transform.position,
          camera.position,
          splatMesh
        );
      }
    }
  });

  // Apply movement force
  const applyMovement = (direction: THREE.Vector3) => {
    const physics = physicsControllerRef.current;
    physics.applyMovement(direction, 1 / 60);
  };

  // Apply brake
  const applyBrake = () => {
    const physics = physicsControllerRef.current;
    physics.applyBrake(1 / 60);
  };

  // Apply steering
  const applySteering = (torque: number) => {
    const physics = physicsControllerRef.current;
    physics.applySteering(torque);
  };

  return {
    vesselRef,
    vesselState,
    physicsController: physicsControllerRef.current,
    lodController: lodControllerRef.current,
    textureManager: textureManagerRef.current,
    applyMovement,
    applyBrake,
    applySteering,
    setVesselBioState,
    isPathB,
  };
}

/**
 * Hook to get vessel physics state
 */
export function useVesselPhysics() {
  const controller = getVesselPhysicsController();
  const vesselTransform = useStore((state) => state.vessel.transform);

  return {
    velocity: controller.getVelocity(),
    angularVelocity: controller.getAngularVelocity(),
    isColliding: controller.isColliding(),
    position: vesselTransform.position,
    rotation: vesselTransform.rotation,
  };
}

/**
 * Hook to get vessel rendering state
 */
export function useVesselRenderingState() {
  const renderingMode = useStore((state) => state.renderingMode);
  const vesselPath = useStore((state) => state.vessel.path);
  const isSpawned = useStore((state) => state.vessel.isSpawned);
  const isCalibrated = useStore((state) => state.vessel.isCalibrated);

  return {
    renderingMode,
    vesselPath,
    isSpawned,
    isCalibrated,
    isSplatMode: renderingMode === 'splat',
    isGeometricMode: renderingMode === 'geometric',
  };
}
