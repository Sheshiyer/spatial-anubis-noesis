/**
 * Custom React hook for Rapier physics integration
 * Manages physics world lifecycle and frame updates
 */

import { useEffect, useState } from 'react';
import { initializeRapier, PhysicsLoop } from '../physics/rapier';
import type RAPIER from '@dimforge/rapier3d-compat';

interface UsePhysicsReturn {
  isReady: boolean;
  physicsLoop: PhysicsLoop | null;
  rapier: typeof RAPIER | null;
}

/**
 * Initialize Rapier physics and create fixed-timestep loop
 * Usage: const { isReady, physicsLoop } = usePhysics();
 */
export function usePhysics(): UsePhysicsReturn {
  const [isReady, setIsReady] = useState(false);
  const [physicsLoop] = useState(() => new PhysicsLoop());
  const [rapier, setRapier] = useState<typeof RAPIER | null>(null);

  useEffect(() => {
    let mounted = true;

    initializeRapier()
      .then((rapierInstance: typeof RAPIER) => {
        if (mounted) {
          setRapier(rapierInstance);
          setIsReady(true);
          console.log('[usePhysics] Physics engine ready');
        }
      })
      .catch((error: unknown) => {
        console.error('[usePhysics] Failed to initialize Rapier:', error);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { isReady, physicsLoop, rapier };
}
