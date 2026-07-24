/**
 * HeadTiltCamera — R3F component that applies head tilt to camera
 *
 * Subtle camera movement from face mesh head tracking:
 * - Yaw → camera Y rotation (look left/right)
 * - Pitch → camera Z movement (lean forward/backward)
 * - Smooth interpolation prevents jarring motion
 *
 * Renders null — purely a side-effect component.
 */

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { headTiltToNavigation } from '../bio/headTilt';
import type { HeadTiltResult } from '../bio/types';

interface HeadTiltCameraProps {
  headTilt: HeadTiltResult;
  /** Movement sensitivity multiplier (default 1.0) */
  sensitivity?: number;
  /** Whether to enable camera movement (default true) */
  enabled?: boolean;
}

/** Base camera position (from App.tsx Canvas setup) */
const BASE_POSITION = new THREE.Vector3(0, 8, 35);
const BASE_LOOK_AT = new THREE.Vector3(0, 2, 0);

/** Maximum camera offset from head tilt */
const MAX_OFFSET_X = 8;
const MAX_OFFSET_Z = 10;
const MAX_LOOK_OFFSET_X = 5;

export function HeadTiltCamera({
  headTilt,
  sensitivity = 1.0,
  enabled = true,
}: HeadTiltCameraProps) {
  const { camera } = useThree();
  const targetOffsetRef = useRef(new THREE.Vector3(0, 0, 0));
  const currentOffsetRef = useRef(new THREE.Vector3(0, 0, 0));
  const targetLookOffsetRef = useRef(new THREE.Vector3(0, 0, 0));
  const currentLookOffsetRef = useRef(new THREE.Vector3(0, 0, 0));

  useFrame(() => {
    if (!enabled || !headTilt || headTilt.confidence < 0.4) {
      // Smoothly return to base position when disabled or no face
      targetOffsetRef.current.set(0, 0, 0);
      targetLookOffsetRef.current.set(0, 0, 0);
    } else {
      const forces = headTiltToNavigation(headTilt);

      // Map head tilt to camera offset targets
      // Yaw → lateral camera movement
      targetOffsetRef.current.x =
        -forces.steering * MAX_OFFSET_X * sensitivity;

      // Pitch → forward/backward
      targetOffsetRef.current.z =
        -(forces.forward - forces.braking) * MAX_OFFSET_Z * sensitivity;

      // Look-at offset follows steering
      targetLookOffsetRef.current.x =
        -forces.steering * MAX_LOOK_OFFSET_X * sensitivity;
    }

    // Smooth interpolation (lerp factor 0.03 = very smooth, ~1s settle)
    const lerpFactor = 0.03;

    currentOffsetRef.current.lerp(targetOffsetRef.current, lerpFactor);
    currentLookOffsetRef.current.lerp(targetLookOffsetRef.current, lerpFactor);

    // Apply to camera
    camera.position.set(
      BASE_POSITION.x + currentOffsetRef.current.x,
      BASE_POSITION.y,
      BASE_POSITION.z + currentOffsetRef.current.z
    );

    camera.lookAt(
      BASE_LOOK_AT.x + currentLookOffsetRef.current.x,
      BASE_LOOK_AT.y,
      BASE_LOOK_AT.z
    );
  });

  return null;
}
