/**
 * CameraNavigator
 * R3F component that smoothly transitions camera between locations.
 * Must be inside Canvas — uses useFrame for animation.
 */

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ============================================================================
// Types
// ============================================================================

type DestinationKey = 'temple' | 'east-wing';

interface CameraNavigatorProps {
  /** Target location */
  destination: DestinationKey;
  /** Duration in seconds */
  duration?: number;
  /** Called when transition completes */
  onComplete?: () => void;
}

// ============================================================================
// Destination Presets
// ============================================================================

const DESTINATIONS: Record<DestinationKey, { position: THREE.Vector3; target: THREE.Vector3 }> = {
  temple: {
    position: new THREE.Vector3(0, 8, 35),
    target: new THREE.Vector3(0, 2, 0),
  },
  'east-wing': {
    position: new THREE.Vector3(50, 8, 35),
    target: new THREE.Vector3(50, 0, 0),
  },
};

// ============================================================================
// Easing
// ============================================================================

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ============================================================================
// Component
// ============================================================================

export const CameraNavigator: React.FC<CameraNavigatorProps> = ({
  destination,
  duration = 2.0,
  onComplete,
}) => {
  const { camera } = useThree();
  const stateRef = useRef({
    active: false,
    startPosition: new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    endPosition: new THREE.Vector3(),
    endTarget: new THREE.Vector3(),
    progress: 0,
    currentTarget: new THREE.Vector3(0, 2, 0),
    lastDestination: destination,
  });

  // Trigger transition when destination changes
  useEffect(() => {
    const state = stateRef.current;
    if (state.lastDestination === destination && !state.active) {
      // Initial render — don't animate, just set
      state.lastDestination = destination;
      return;
    }

    if (state.lastDestination === destination) return;

    const dest = DESTINATIONS[destination];
    state.startPosition.copy(camera.position);
    state.startTarget.copy(state.currentTarget);
    state.endPosition.copy(dest.position);
    state.endTarget.copy(dest.target);
    state.progress = 0;
    state.active = true;
    state.lastDestination = destination;
  }, [destination, camera]);

  // Animate each frame
  useFrame((_, delta) => {
    const state = stateRef.current;
    if (!state.active) return;

    state.progress += delta / duration;

    if (state.progress >= 1) {
      state.progress = 1;
      state.active = false;
      camera.position.copy(state.endPosition);
      state.currentTarget.copy(state.endTarget);
      camera.lookAt(state.currentTarget);
      onComplete?.();
      return;
    }

    const t = easeInOutCubic(state.progress);

    // Lerp position
    camera.position.lerpVectors(state.startPosition, state.endPosition, t);

    // Lerp target
    state.currentTarget.lerpVectors(state.startTarget, state.endTarget, t);
    camera.lookAt(state.currentTarget);
  });

  return null;
};
