/**
 * Custom React hook for vessel navigation with head-tilt control
 * P1-S1-13: Head-tilt to physics force mapping
 * P1-S1-15: LinearDamping viscosity system
 * P1-S1-39: Head-tilt deadzone
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type RAPIER from '@dimforge/rapier3d-compat';
import {
  NavigationController,
  createVesselPhysicsBody,
  applyDeadzone,
  calculateLinearDamping,
} from '@/physics';
import type {
  HeadTilt,
  BioState,
  VesselPhysicsBody,
  NavigationControllerOptions,
  VesselPhysicsConfig,
  NavigationForces,
} from '@/types';

interface UseNavigationReturn {
  /** Whether navigation system is initialized */
  isInitialized: boolean;
  /** Vessel physics body reference */
  vessel: VesselPhysicsBody | null;
  /** Navigation controller instance */
  controller: NavigationController | null;
  /** Update head-tilt input from Face Mesh */
  updateHeadTilt: (tilt: HeadTilt | null) => void;
  /** Update bio-state from PIP data */
  updateBioState: (state: BioState) => void;
  /** Current navigation forces (for debugging) */
  currentForces: NavigationForces | null;
  /** Current linear damping value */
  currentDamping: number;
  /** Whether head is in neutral position */
  isNeutral: boolean;
  /** Reset navigation state */
  reset: () => void;
}

interface UseNavigationOptions {
  /** Physics world instance */
  world: RAPIER.World | null;
  /** Rapier instance */
  rapier: typeof RAPIER | null;
  /** Vessel physics configuration */
  vesselConfig?: Partial<VesselPhysicsConfig>;
  /** Navigation controller options */
  controllerOptions?: Partial<NavigationControllerOptions>;
  /** Whether to auto-create vessel on initialization */
  autoCreateVessel?: boolean;
}

/**
 * Hook for vessel navigation with head-tilt physics control
 *
 * @example
 * ```tsx
 * const { isInitialized, vessel, updateHeadTilt, updateBioState } = useNavigation({
 *   world,
 *   rapier,
 * });
 *
 * // In bio-signal callback:
 * updateHeadTilt({ roll: 0.1, pitch: -0.2, yaw: 0, confidence: 0.95 });
 * updateBioState({ coherence: 0.8, lqd: 0.7, entropy: 0.2, breathPhase: 0.3 });
 * ```
 */
export function useNavigation(options: UseNavigationOptions): UseNavigationReturn {
  const { world, rapier, vesselConfig, controllerOptions, autoCreateVessel = true } = options;

  const controllerRef = useRef<NavigationController | null>(null);
  const vesselRef = useRef<VesselPhysicsBody | null>(null);
  const bioStateRef = useRef<BioState>({ coherence: 0, lqd: 0, entropy: 0, breathPhase: 0 });

  const [isInitialized, setIsInitialized] = useState(false);
  const [currentForces, setCurrentForces] = useState<NavigationForces | null>(null);
  const [currentDamping, setCurrentDamping] = useState(5.0);
  const [isNeutral, setIsNeutral] = useState(true);

  // Store options in refs to avoid dependency issues
  const controllerOptionsRef = useRef(controllerOptions);
  const vesselConfigRef = useRef(vesselConfig);
  controllerOptionsRef.current = controllerOptions;
  vesselConfigRef.current = vesselConfig;

  // Initialize navigation controller and vessel
  useEffect(() => {
    if (!world || !rapier) {
      return;
    }

    // Create navigation controller with current options
    controllerRef.current = new NavigationController(controllerOptionsRef.current);

    // Create vessel physics body if auto-create enabled
    if (autoCreateVessel) {
      try {
        vesselRef.current = createVesselPhysicsBody(world, rapier, vesselConfigRef.current);
        console.log('[useNavigation] Vessel physics body created');
      } catch (error) {
        console.error('[useNavigation] Failed to create vessel:', error);
      }
    }

    setIsInitialized(true);

    return () => {
      // Cleanup: remove rigid body from world
      if (vesselRef.current && world) {
        world.removeRigidBody(vesselRef.current.rigidBody);
        vesselRef.current = null;
      }
      controllerRef.current = null;
      setIsInitialized(false);
    };
  }, [world, rapier, autoCreateVessel]); // Re-initialize if world/rapier changes

  // Update head-tilt input
  const updateHeadTilt = useCallback((tilt: HeadTilt | null): void => {
    if (!controllerRef.current) return;

    controllerRef.current.updateInput(tilt, bioStateRef.current);
    setIsNeutral(controllerRef.current.isNeutral());

    // Update debug info
    if (tilt) {
      setCurrentForces(controllerRef.current.getCurrentForces());
    } else {
      setCurrentForces(null);
    }
  }, []);

  // Update bio-state
  const updateBioState = useCallback((state: BioState): void => {
    bioStateRef.current = state;

    if (!controllerRef.current) return;

    controllerRef.current.updateInput(controllerRef.current['currentInput'].headTilt, state);
    setCurrentDamping(controllerRef.current.getCurrentDamping());
  }, []);

  // Reset navigation
  const reset = useCallback((): void => {
    controllerRef.current?.reset();
    bioStateRef.current = { coherence: 0, lqd: 0, entropy: 0, breathPhase: 0 };
    setCurrentForces(null);
    setIsNeutral(true);
  }, []);

  return {
    isInitialized,
    vessel: vesselRef.current,
    controller: controllerRef.current,
    updateHeadTilt,
    updateBioState,
    currentForces,
    currentDamping,
    isNeutral,
    reset,
  };
}

/**
 * Hook for manual vessel physics body creation
 * Use when autoCreateVessel is false in useNavigation
 */
export function useVesselBody(
  world: RAPIER.World | null,
  rapier: typeof RAPIER | null,
  config?: Partial<VesselPhysicsConfig>
): VesselPhysicsBody | null {
  const vesselRef = useRef<VesselPhysicsBody | null>(null);

  useEffect(() => {
    if (!world || !rapier) {
      return;
    }

    try {
      vesselRef.current = createVesselPhysicsBody(world, rapier, config);
    } catch (error) {
      console.error('[useVesselBody] Failed to create vessel:', error);
    }

    return () => {
      if (vesselRef.current && world) {
        world.removeRigidBody(vesselRef.current.rigidBody);
        vesselRef.current = null;
      }
    };
  }, [world, rapier, config]);

  return vesselRef.current;
}

/**
 * Hook for testing head-tilt navigation with mock data
 * Useful for development without MediaPipe
 */
export function useMockHeadTilt(): {
  mockTilt: HeadTilt;
  setTilt: (roll: number, pitch: number, yaw: number) => void;
  setNeutral: () => void;
} {
  const [mockTilt, setMockTilt] = useState<HeadTilt>({
    roll: 0,
    pitch: 0,
    yaw: 0,
    confidence: 1.0,
  });

  const setTilt = useCallback((roll: number, pitch: number, yaw: number): void => {
    setMockTilt({
      roll: (roll * Math.PI) / 180,
      pitch: (pitch * Math.PI) / 180,
      yaw: (yaw * Math.PI) / 180,
      confidence: 1.0,
    });
  }, []);

  const setNeutral = useCallback((): void => {
    setMockTilt({
      roll: 0,
      pitch: 0,
      yaw: 0,
      confidence: 1.0,
    });
  }, []);

  return { mockTilt, setTilt, setNeutral };
}

/**
 * Utility to test deadzone calculations
 */
export function useDeadzoneTest(): {
  testDeadzone: (roll: number, pitch: number) => { raw: HeadTilt; deadzoned: HeadTilt };
} {
  const testDeadzone = useCallback((roll: number, pitch: number) => {
    const raw: HeadTilt = {
      roll: (roll * Math.PI) / 180,
      pitch: (pitch * Math.PI) / 180,
      yaw: 0,
      confidence: 1.0,
    };

    const deadzoned = applyDeadzone(raw);

    return {
      raw,
      deadzoned,
    };
  }, []);

  return { testDeadzone };
}

/**
 * Utility to test damping calculations
 */
export function useDampingTest(): {
  testDamping: (coherence: number) => number;
} {
  const testDamping = useCallback((coherence: number): number => {
    return calculateLinearDamping(coherence);
  }, []);

  return { testDamping };
}
