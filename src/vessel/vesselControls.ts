/**
 * Vessel Input Controls
 * P1-S1-21: Build Path B mouse/keyboard navigation controls
 * - WASD movement
 * - Click-drag rotate
 * - Scroll zoom (0.5x to 3.0x)
 */

import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { useStore } from '../state/store';

/** Input state */
interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  mouseDown: boolean;
  mouseX: number;
  mouseY: number;
  lastMouseX: number;
  lastMouseY: number;
}

/** Camera zoom state */
interface ZoomState {
  current: number;
  min: number;
  max: number;
}

/**
 * Hook for Path B keyboard controls (WASD)
 */
export function useVesselKeyboardControls(
  enabled: boolean,
  onMove: (direction: THREE.Vector3) => void
): void {
  const keysRef = useRef<InputState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    mouseDown: false,
    mouseX: 0,
    mouseY: 0,
    lastMouseX: 0,
    lastMouseY: 0,
  });

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          keysRef.current.forward = true;
          break;
        case 's':
        case 'arrowdown':
          keysRef.current.backward = true;
          break;
        case 'a':
        case 'arrowleft':
          keysRef.current.left = true;
          break;
        case 'd':
        case 'arrowright':
          keysRef.current.right = true;
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          keysRef.current.forward = false;
          break;
        case 's':
        case 'arrowdown':
          keysRef.current.backward = false;
          break;
        case 'a':
        case 'arrowleft':
          keysRef.current.left = false;
          break;
        case 'd':
        case 'arrowright':
          keysRef.current.right = false;
          break;
      }
    };

    // Animation frame loop for continuous movement
    let rafId: number;
    const updateMovement = () => {
      const direction = new THREE.Vector3();
      
      if (keysRef.current.forward) direction.z -= 1;
      if (keysRef.current.backward) direction.z += 1;
      if (keysRef.current.left) direction.x -= 1;
      if (keysRef.current.right) direction.x += 1;

      if (direction.length() > 0) {
        direction.normalize();
        onMove(direction);
      }

      rafId = requestAnimationFrame(updateMovement);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    rafId = requestAnimationFrame(updateMovement);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(rafId);
    };
  }, [enabled, onMove]);
}

/**
 * Hook for Path B mouse controls (click-drag rotate)
 */
export function useVesselMouseControls(
  enabled: boolean,
  onRotate: (deltaX: number, deltaY: number) => void
): void {
  const mouseStateRef = useRef({
    isDragging: false,
    lastX: 0,
    lastY: 0,
  });

  useEffect(() => {
    if (!enabled) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) { // Left click
        mouseStateRef.current.isDragging = true;
        mouseStateRef.current.lastX = e.clientX;
        mouseStateRef.current.lastY = e.clientY;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!mouseStateRef.current.isDragging) return;

      const deltaX = e.clientX - mouseStateRef.current.lastX;
      const deltaY = e.clientY - mouseStateRef.current.lastY;

      // P1-S1-21: No jitter - smooth rotation
      // Apply damping to reduce jitter
      const damping = 0.003;
      onRotate(deltaX * damping, deltaY * damping);

      mouseStateRef.current.lastX = e.clientX;
      mouseStateRef.current.lastY = e.clientY;
    };

    const handleMouseUp = () => {
      mouseStateRef.current.isDragging = false;
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [enabled, onRotate]);
}

/**
 * Hook for Path B scroll controls (zoom)
 * P1-S1-21: Scroll zoom 0.5x to 3.0x
 */
export function useVesselZoomControls(
  enabled: boolean,
  onZoom: (zoomLevel: number) => void
): { zoom: number } {
  const zoomRef = useRef<ZoomState>({
    current: 1.0,
    min: 0.5,
    max: 3.0,
  });

  useEffect(() => {
    if (!enabled) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      // Zoom delta (slower zoom for precision)
      const delta = e.deltaY * -0.001;
      
      // Clamp zoom level
      zoomRef.current.current = Math.max(
        zoomRef.current.min,
        Math.min(zoomRef.current.max, zoomRef.current.current + delta)
      );

      onZoom(zoomRef.current.current);
    };

    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, [enabled, onZoom]);

  return { zoom: zoomRef.current.current };
}

/**
 * Combined Path B controls hook
 */
export function usePathBControls(enabled: boolean) {
  const vesselRotation = useStore((state) => state.vessel.transform.rotation);
  const vesselPosition = useStore((state) => state.vessel.transform.position);
  const setVesselRotation = useStore((state) => state.setVesselRotation);
  const setVesselPosition = useStore((state) => state.setVesselPosition);

  // Movement handler
  const handleMove = useCallback((direction: THREE.Vector3) => {
    // Apply vessel rotation to movement direction
    const rotatedDirection = direction.clone();
    rotatedDirection.applyQuaternion(vesselRotation);
    
    // Move vessel
    const speed = 0.1; // Units per frame
    const newPosition = vesselPosition.clone().add(rotatedDirection.multiplyScalar(speed));
    setVesselPosition(newPosition);
  }, [vesselRotation, vesselPosition, setVesselPosition]);

  // Rotation handler
  const handleRotate = useCallback((deltaX: number) => {
    // Create rotation quaternion from mouse delta
    const yawRotation = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      -deltaX
    );
    
    const newRotation = vesselRotation.clone().multiply(yawRotation);
    setVesselRotation(newRotation);
  }, [vesselRotation, setVesselRotation]);

  // Zoom handler (for camera)
  const handleZoom = useCallback((zoomLevel: number) => {
    // Dispatch custom event for camera
    window.dispatchEvent(new CustomEvent('vessel-zoom', { detail: { zoom: zoomLevel } }));
  }, []);

  // Apply controls
  useVesselKeyboardControls(enabled, handleMove);
  useVesselMouseControls(enabled, handleRotate);
  useVesselZoomControls(enabled, handleZoom);

  return { zoom: 1.0 };
}
