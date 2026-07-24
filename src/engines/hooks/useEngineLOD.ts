/**
 * useEngineLOD
 * Distance-based Level of Detail switching for engine artifacts
 *
 * LOD Levels:
 *   full:      0-5 units  — full geometry, all animations, audio
 *   medium:    5-15 units — simplified geometry, reduced particles
 *   billboard: 15-30 units — flat textured quad facing camera
 *   icon:      30+ units  — glowing point light only
 */

import { useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import type { LODLevel } from '../meta/types';

// ============================================================================
// Constants
// ============================================================================

const LOD_THRESHOLDS = {
  full: 5,
  medium: 15,
  billboard: 30,
} as const;

const PROXIMITY_WAKE_DISTANCE = 15;

// ============================================================================
// Types
// ============================================================================

export interface EngineLODState {
  /** Current LOD level */
  level: LODLevel;
  /** Distance from camera */
  distance: number;
  /** Whether engine is within proximity wake range */
  isProximate: boolean;
  /** Opacity factor for smooth transitions (0-1) */
  opacityFactor: number;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Calculate LOD level based on distance from camera to engine position
 */
export function useEngineLOD(
  engineWorldPosition: [number, number, number]
): EngineLODState {
  const camera = useThree((state) => state.camera);

  // Calculate distance and LOD in render — uses camera position from last frame
  const lodState = useMemo(() => {
    const dx = camera.position.x - engineWorldPosition[0];
    const dy = camera.position.y - engineWorldPosition[1];
    const dz = camera.position.z - engineWorldPosition[2];
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    let level: LODLevel;
    if (distance <= LOD_THRESHOLDS.full) {
      level = 'full';
    } else if (distance <= LOD_THRESHOLDS.medium) {
      level = 'medium';
    } else if (distance <= LOD_THRESHOLDS.billboard) {
      level = 'billboard';
    } else {
      level = 'icon';
    }

    // Smooth opacity transition at boundary zones (2-unit fade)
    let opacityFactor = 1.0;
    if (distance > LOD_THRESHOLDS.billboard - 2 && distance <= LOD_THRESHOLDS.billboard) {
      opacityFactor = (LOD_THRESHOLDS.billboard - distance) / 2;
    }

    return {
      level,
      distance,
      isProximate: distance <= PROXIMITY_WAKE_DISTANCE,
      opacityFactor: Math.max(0, Math.min(1, opacityFactor)),
    };
  }, [camera.position.x, camera.position.y, camera.position.z, engineWorldPosition]);

  return lodState;
}

/**
 * Calculate LOD for a batch of engines (more efficient than individual hooks)
 */
export function calculateLODLevel(
  cameraPosition: [number, number, number],
  enginePosition: [number, number, number]
): LODLevel {
  const dx = cameraPosition[0] - enginePosition[0];
  const dy = cameraPosition[1] - enginePosition[1];
  const dz = cameraPosition[2] - enginePosition[2];
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

  if (distance <= LOD_THRESHOLDS.full) return 'full';
  if (distance <= LOD_THRESHOLDS.medium) return 'medium';
  if (distance <= LOD_THRESHOLDS.billboard) return 'billboard';
  return 'icon';
}

/**
 * Check if an engine position is within proximity wake range
 */
export function isWithinProximity(
  cameraPosition: [number, number, number],
  enginePosition: [number, number, number]
): boolean {
  const dx = cameraPosition[0] - enginePosition[0];
  const dy = cameraPosition[1] - enginePosition[1];
  const dz = cameraPosition[2] - enginePosition[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz) <= PROXIMITY_WAKE_DISTANCE;
}
