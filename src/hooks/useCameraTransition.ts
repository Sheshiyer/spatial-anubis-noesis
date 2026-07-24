/**
 * useCameraTransition
 * Smooth camera position + target lerp between locations
 * Used for navigating between Temple Center and East Wing
 */

import { useRef, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ============================================================================
// Types
// ============================================================================

export interface CameraDestination {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

interface TransitionState {
  active: boolean;
  startPosition: THREE.Vector3;
  startTarget: THREE.Vector3;
  endPosition: THREE.Vector3;
  endTarget: THREE.Vector3;
  progress: number;
  duration: number;
}

// ============================================================================
// Preset Locations
// ============================================================================

export const CAMERA_LOCATIONS = {
  temple: {
    position: new THREE.Vector3(0, 8, 35),
    target: new THREE.Vector3(0, 2, 0),
  },
  eastWing: {
    position: new THREE.Vector3(50, 8, 35),
    target: new THREE.Vector3(50, 0, 0),
  },
} as const;

// ============================================================================
// Easing Function
// ============================================================================

/** Ease in-out cubic */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ============================================================================
// Hook
// ============================================================================

export function useCameraTransition(duration = 2.0) {
  const { camera } = useThree();
  const transitionRef = useRef<TransitionState>({
    active: false,
    startPosition: new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    endPosition: new THREE.Vector3(),
    endTarget: new THREE.Vector3(),
    progress: 0,
    duration,
  });
  const currentTargetRef = useRef(new THREE.Vector3(0, 2, 0));

  const transitionTo = useCallback(
    (destination: CameraDestination, customDuration?: number) => {
      const state = transitionRef.current;
      state.startPosition.copy(camera.position);
      state.startTarget.copy(currentTargetRef.current);
      state.endPosition.copy(destination.position);
      state.endTarget.copy(destination.target);
      state.progress = 0;
      state.duration = customDuration ?? duration;
      state.active = true;
    },
    [camera, duration]
  );

  const goToEastWing = useCallback(() => {
    transitionTo(CAMERA_LOCATIONS.eastWing);
  }, [transitionTo]);

  const goToTemple = useCallback(() => {
    transitionTo(CAMERA_LOCATIONS.temple);
  }, [transitionTo]);

  // Animate camera each frame during transition
  useFrame((_, delta) => {
    const state = transitionRef.current;
    if (!state.active) return;

    state.progress += delta / state.duration;

    if (state.progress >= 1) {
      state.progress = 1;
      state.active = false;
    }

    const t = easeInOutCubic(state.progress);

    // Lerp position
    camera.position.lerpVectors(state.startPosition, state.endPosition, t);

    // Lerp target and look at it
    currentTargetRef.current.lerpVectors(state.startTarget, state.endTarget, t);
    camera.lookAt(currentTargetRef.current);
  });

  return {
    transitionTo,
    goToEastWing,
    goToTemple,
    isTransitioning: transitionRef.current.active,
  };
}
