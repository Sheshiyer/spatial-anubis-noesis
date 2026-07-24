/**
 * ZoneTeleportTransition — Fade transition for zone teleportation
 * P4-S2-05: Zone teleport transition effect
 *
 * Smooth fade transition when teleporting between zones:
 * - Triggered by keyboard teleport commands (0-9 keys)
 * - 0.3s fade out to black
 * - Instant position change
 * - 0.3s fade in from black
 *
 * Implementation:
 * - React component with CSS-driven fade overlay
 * - Zustand state integration for teleport events
 * - Smooth opacity transitions
 */

import React, { useEffect, useState } from 'react';

// ============================================================================
// Transition Types
// ============================================================================

export interface TeleportTransitionState {
  isTransitioning: boolean;
  phase: 'idle' | 'fade-out' | 'teleporting' | 'fade-in';
  progress: number; // 0-1
}

export interface TeleportTransitionProps {
  duration?: number; // ms, default 300
  color?: string;    // default 'black'
  onTransitionStart?: () => void;
  onTransitionMidpoint?: () => void; // When fully faded, before position change
  onTransitionComplete?: () => void;
}

// ============================================================================
// ZoneTeleportTransition Component
// ============================================================================

export const ZoneTeleportTransition: React.FC<TeleportTransitionProps> = ({
  duration = 300,
  color = 'black',
  onTransitionStart,
  onTransitionMidpoint,
  onTransitionComplete,
}) => {
  const [opacity, setOpacity] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  /**
   * Trigger teleport transition
   */
  const triggerTransition = async (
    onTeleport: () => void | Promise<void>
  ): Promise<void> => {
    if (isVisible) {
      console.warn('[ZoneTeleportTransition] Transition already in progress');
      return;
    }

    // Start transition
    setIsVisible(true);
    onTransitionStart?.();

    // Phase 1: Fade out (0.3s)
    await new Promise<void>((resolve) => {
      setOpacity(1);

      setTimeout(() => {
        resolve();
      }, duration);
    });

    // Midpoint: Fully faded out, execute teleport
    onTransitionMidpoint?.();
    await onTeleport();

    // Phase 2: Fade in (0.3s)
    await new Promise<void>((resolve) => {
      setOpacity(0);

      setTimeout(() => {
        resolve();
      }, duration);
    });

    // Complete
    setIsVisible(false);
    onTransitionComplete?.();
  };

  // Expose trigger function via ref or global
  useEffect(() => {
    // Store in window for easy access from keyboard handlers
    (window as any).__zoneTeleportTransition = {
      trigger: triggerTransition,
      isTransitioning: isVisible,
    };

    return () => {
      delete (window as any).__zoneTeleportTransition;
    };
  }, [isVisible, triggerTransition]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: color,
        opacity,
        transition: `opacity ${duration}ms ease-in-out`,
        pointerEvents: 'none',
        zIndex: 9999,
        display: isVisible || opacity > 0 ? 'block' : 'none',
      }}
    />
  );
};

// ============================================================================
// Hook: useTeleportTransition
// ============================================================================

export interface TeleportOptions {
  targetPosition?: [number, number, number];
  targetZone?: string;
  onComplete?: () => void;
}

/**
 * Hook to trigger zone teleport with transition
 */
export function useTeleportTransition() {
  const [isTransitioning, setIsTransitioning] = useState(false);

  /**
   * Execute teleport with fade transition
   */
  const teleport = async (options: TeleportOptions): Promise<void> => {
    const transition = (window as any).__zoneTeleportTransition;

    if (!transition) {
      console.error('[useTeleportTransition] ZoneTeleportTransition not mounted');
      return;
    }

    if (transition.isTransitioning) {
      console.warn('[useTeleportTransition] Already transitioning');
      return;
    }

    setIsTransitioning(true);

    await transition.trigger(async () => {
      // Execute position change during full fade
      if (options.targetPosition) {
        // Update camera position (implementation depends on camera system)
        console.log('[useTeleportTransition] Teleporting to:', options.targetPosition);

        // Example: Update camera via R3F camera controls
        const event = new CustomEvent('zone-teleport', {
          detail: {
            position: options.targetPosition,
            zone: options.targetZone,
          },
        });
        window.dispatchEvent(event);
      }

      options.onComplete?.();
    });

    setIsTransitioning(false);
  };

  return {
    teleport,
    isTransitioning,
  };
}

// ============================================================================
// Keyboard Teleport Integration
// ============================================================================

/**
 * Zone positions (example — should match actual zone layout)
 */
const ZONE_POSITIONS: Record<string, [number, number, number]> = {
  '0': [0, 0, 0],      // Origin
  '1': [10, 0, 0],     // Zone 1
  '2': [20, 0, 0],     // Zone 2
  '3': [30, 0, 0],     // Zone 3
  '4': [0, 0, 10],     // Zone 4
  '5': [10, 0, 10],    // Zone 5
  '6': [20, 0, 10],    // Zone 6
  '7': [30, 0, 10],    // Zone 7
  '8': [0, 0, 20],     // Zone 8
  '9': [10, 0, 20],    // Zone 9
};

/**
 * Setup keyboard teleport listeners
 */
export function setupKeyboardTeleport() {
  const handleKeyDown = (event: KeyboardEvent) => {
    // Check for number keys (0-9)
    if (event.key >= '0' && event.key <= '9') {
      const zoneId = event.key;
      const position = ZONE_POSITIONS[zoneId];

      if (!position) {
        console.warn('[KeyboardTeleport] Invalid zone:', zoneId);
        return;
      }

      const transition = (window as any).__zoneTeleportTransition;
      if (!transition) {
        console.error('[KeyboardTeleport] Transition system not available');
        return;
      }

      // Trigger teleport
      transition.trigger(async () => {
        console.log('[KeyboardTeleport] Teleporting to zone:', zoneId, position);

        // Dispatch custom event for camera system
        const event = new CustomEvent('zone-teleport', {
          detail: {
            zoneId,
            position,
          },
        });
        window.dispatchEvent(event);
      });
    }
  };

  window.addEventListener('keydown', handleKeyDown);

  // Return cleanup function
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
}

// ============================================================================
// Camera Teleport Handler (R3F integration)
// ============================================================================

/**
 * Hook to handle zone teleport events and update camera
 * Use in R3F Canvas component
 */
export function useZoneTeleportHandler(camera: THREE.Camera | null) {
  useEffect(() => {
    if (!camera) return;

    const handleTeleport = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { position } = customEvent.detail;

      if (position && Array.isArray(position)) {
        // Update camera position
        camera.position.set(position[0], position[1], position[2]);
        camera.updateMatrixWorld(true);

        console.log('[ZoneTeleport] Camera moved to:', position);
      }
    };

    window.addEventListener('zone-teleport', handleTeleport);

    return () => {
      window.removeEventListener('zone-teleport', handleTeleport);
    };
  }, [camera]);
}
