/**
 * Camera Transition — Smooth movement from Cartographer to vessel
 * P1-S2-46: 2 seconds ease-in-out
 */
import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CameraTransitionProps {
  from?: [number, number, number];
  to?: [number, number, number];
  target?: [number, number, number];
  duration?: number;
  onComplete?: () => void;
  active?: boolean;
}

/**
 * P1-S2-46: Smooth transition from Descent to exploration
 * Camera easing from Cartographer to vessel
 * 2 seconds ease-in-out
 */
export function CameraTransition({
  from = [0, 1, 3],
  to = [0, 1.6, 5],
  target = [0, 0, 0],
  duration = 2000,
  onComplete,
  active = true,
}: CameraTransitionProps) {
  const { camera } = useThree();
  const startTimeRef = useRef<number | null>(null);
  const startPosRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const endPosRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const targetRef = useRef<THREE.Vector3>(new THREE.Vector3(...target));
  const isCompleteRef = useRef(false);

  useEffect(() => {
    if (!active) return;

    // Initialize positions
    startPosRef.current.set(...from);
    endPosRef.current.set(...to);
    startTimeRef.current = performance.now();
    isCompleteRef.current = false;

    // Set initial camera position
    camera.position.copy(startPosRef.current);
    camera.lookAt(targetRef.current);
  }, [active, from, to, target, camera]);

  useFrame(() => {
    if (!active || isCompleteRef.current || !startTimeRef.current) return;

    const elapsed = performance.now() - startTimeRef.current;
    const t = Math.min(1, elapsed / duration);

    // P1-S2-46: Ease-in-out function
    const easeInOut = t < 0.5 
      ? 2 * t * t 
      : 1 - Math.pow(-2 * t + 2, 2) / 2;

    // Interpolate position
    camera.position.lerpVectors(startPosRef.current, endPosRef.current, easeInOut);

    // Always look at target
    camera.lookAt(targetRef.current);

    // Check completion
    if (t >= 1) {
      isCompleteRef.current = true;
      onComplete?.();
    }
  });

  return null;
}

/**
 * Alternative: OrbitControls-based transition
 * Use this if you want user control during/after transition
 */
export function useCameraTransition() {
  const { camera } = useThree();

  const transitionTo = (
    to: [number, number, number],
    target: [number, number, number] = [0, 0, 0],
    duration = 2000
  ): Promise<void> => {
    return new Promise((resolve) => {
      const startPos = camera.position.clone();
      const endPos = new THREE.Vector3(...to);
      const targetPos = new THREE.Vector3(...target);
      const startTime = performance.now();

      const animate = () => {
        const elapsed = performance.now() - startTime;
        const t = Math.min(1, elapsed / duration);

        // Ease-in-out
        const easeInOut = t < 0.5 
          ? 2 * t * t 
          : 1 - Math.pow(-2 * t + 2, 2) / 2;

        camera.position.lerpVectors(startPos, endPos, easeInOut);
        camera.lookAt(targetPos);

        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  };

  return { transitionTo };
}
