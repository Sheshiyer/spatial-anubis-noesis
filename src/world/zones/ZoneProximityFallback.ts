/**
 * ZoneProximityFallback — Geometric proximity-timer fallback for non-webcam zone unlocks
 * P4-S1-05: Unlock zones after vessel spends N seconds near boundary
 *
 * Fallback unlock mechanism when webcam is denied:
 * - East: 30 seconds near boundary
 * - West: 60 seconds near boundary
 * - South: 90 seconds near boundary
 */

import * as THREE from 'three';
import type { ZoneId } from './FogBank';
import type { ZoneUnlockStore } from './ZoneUnlockMachine';

/** Proximity timer configuration per zone */
export interface ProximityTimerConfig {
  /** Zone identifier */
  zone: ZoneId;
  /** Required seconds in proximity to unlock */
  requiredSeconds: number;
  /** Proximity radius (distance from zone center) */
  proximityRadius: number;
  /** Zone center position */
  zoneCenter: THREE.Vector3;
}

/** Default proximity timer configurations */
export const DEFAULT_PROXIMITY_TIMERS: Record<ZoneId, ProximityTimerConfig> = {
  north: {
    zone: 'north',
    requiredSeconds: 0, // Always unlocked
    proximityRadius: 30,
    zoneCenter: new THREE.Vector3(0, 0, 50),
  },
  east: {
    zone: 'east',
    requiredSeconds: 30,
    proximityRadius: 30,
    zoneCenter: new THREE.Vector3(50, 0, 0),
  },
  west: {
    zone: 'west',
    requiredSeconds: 60,
    proximityRadius: 30,
    zoneCenter: new THREE.Vector3(-50, 0, 0),
  },
  south: {
    zone: 'south',
    requiredSeconds: 90,
    proximityRadius: 30,
    zoneCenter: new THREE.Vector3(0, 0, -50),
  },
};

/** Proximity timer state */
interface ProximityTimerState {
  /** Time spent in proximity (seconds) */
  timeInProximity: number;
  /** Whether vessel is currently in proximity */
  isInProximity: boolean;
  /** Timestamp of last update */
  lastUpdateTime: number;
  /** Whether timer is active */
  isActive: boolean;
}

/**
 * Proximity-based zone unlock controller
 * Tracks time spent near locked zone boundaries and unlocks after threshold
 */
export class ZoneProximityController {
  private timers: Record<ZoneId, ProximityTimerState>;
  private configs: Record<ZoneId, ProximityTimerConfig>;
  private enabled = false; // Only enabled when webcam is denied

  constructor(customConfigs?: Partial<Record<ZoneId, ProximityTimerConfig>>) {
    this.configs = {
      ...DEFAULT_PROXIMITY_TIMERS,
      ...customConfigs,
    };

    // Initialize timer states
    this.timers = {
      north: this.createInitialState(),
      east: this.createInitialState(),
      west: this.createInitialState(),
      south: this.createInitialState(),
    };
  }

  private createInitialState(): ProximityTimerState {
    return {
      timeInProximity: 0,
      isInProximity: false,
      lastUpdateTime: performance.now(),
      isActive: false,
    };
  }

  /**
   * Update proximity timers based on vessel position
   * Call this in your render loop
   *
   * @returns Zones that should be unlocked
   */
  update(
    vesselPosition: THREE.Vector3,
    zoneUnlockState: Pick<ZoneUnlockStore, 'zones'>
  ): ZoneId[] {
    if (!this.enabled) return [];

    const now = performance.now();
    const zonesToUnlock: ZoneId[] = [];
    const zones: ZoneId[] = ['east', 'west', 'south']; // North is always unlocked

    zones.forEach((zone) => {
      const zoneConfig = zoneUnlockState.zones[zone];
      const timerState = this.timers[zone];
      const config = this.configs[zone];

      // Only track locked zones
      if (zoneConfig.state === 'locked') {
        // Check if vessel is in proximity
        const distance = vesselPosition.distanceTo(config.zoneCenter);
        const wasInProximity = timerState.isInProximity;
        const isInProximity = distance <= config.proximityRadius;

        // Calculate elapsed time
        const deltaMs = now - timerState.lastUpdateTime;
        const deltaSeconds = deltaMs / 1000;

        if (isInProximity) {
          // Accumulate time in proximity
          timerState.timeInProximity += deltaSeconds;
          timerState.isActive = true;

          // Check if threshold reached
          if (timerState.timeInProximity >= config.requiredSeconds) {
            zonesToUnlock.push(zone);
          }
        } else {
          // Vessel left proximity - decay timer slowly
          timerState.timeInProximity = Math.max(
            0,
            timerState.timeInProximity - deltaSeconds * 0.2 // 20% decay rate
          );
        }

        // Update state
        timerState.isInProximity = isInProximity;
        timerState.lastUpdateTime = now;

        // Log when entering/leaving proximity (for debugging)
        if (isInProximity && !wasInProximity) {
          console.log(`[ZoneProximity] Entered ${zone} proximity zone`);
        } else if (!isInProximity && wasInProximity) {
          console.log(
            `[ZoneProximity] Left ${zone} proximity zone (${timerState.timeInProximity.toFixed(1)}s accumulated)`
          );
        }
      }
    });

    return zonesToUnlock;
  }

  /**
   * Get progress toward unlock for a zone (0-1)
   */
  getProgress(zone: ZoneId): number {
    const config = this.configs[zone];
    const timer = this.timers[zone];

    if (config.requiredSeconds === 0) return 1;

    return Math.min(1, timer.timeInProximity / config.requiredSeconds);
  }

  /**
   * Get time remaining for unlock (seconds)
   */
  getTimeRemaining(zone: ZoneId): number {
    const config = this.configs[zone];
    const timer = this.timers[zone];

    return Math.max(0, config.requiredSeconds - timer.timeInProximity);
  }

  /**
   * Check if vessel is currently in proximity of a zone
   */
  isInProximity(zone: ZoneId): boolean {
    return this.timers[zone].isInProximity;
  }

  /**
   * Get current time spent in proximity
   */
  getTimeInProximity(zone: ZoneId): number {
    return this.timers[zone].timeInProximity;
  }

  /**
   * Enable proximity fallback (call when webcam is denied)
   */
  enable(): void {
    this.enabled = true;
    console.log('[ZoneProximity] Proximity fallback enabled');
  }

  /**
   * Disable proximity fallback (call when webcam is available)
   */
  disable(): void {
    this.enabled = false;
    console.log('[ZoneProximity] Proximity fallback disabled');
  }

  /**
   * Check if proximity fallback is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Reset timer for a specific zone
   */
  resetTimer(zone: ZoneId): void {
    this.timers[zone] = this.createInitialState();
  }

  /**
   * Reset all timers
   */
  resetAll(): void {
    Object.keys(this.timers).forEach((zone) => {
      this.resetTimer(zone as ZoneId);
    });
  }

  /**
   * Get all timer states (for debugging/UI)
   */
  getAllTimerStates(): Record<ZoneId, ProximityTimerState & { progress: number; remaining: number }> {
    const zones: ZoneId[] = ['north', 'east', 'west', 'south'];
    const states: any = {};

    zones.forEach((zone) => {
      states[zone] = {
        ...this.timers[zone],
        progress: this.getProgress(zone),
        remaining: this.getTimeRemaining(zone),
      };
    });

    return states;
  }

  /**
   * Update configuration for a zone
   */
  updateConfig(zone: ZoneId, config: Partial<ProximityTimerConfig>): void {
    this.configs[zone] = {
      ...this.configs[zone],
      ...config,
    };
  }
}

/**
 * Factory function
 */
export function createZoneProximityController(
  customConfigs?: Partial<Record<ZoneId, ProximityTimerConfig>>
): ZoneProximityController {
  return new ZoneProximityController(customConfigs);
}

/**
 * React hook for proximity-based unlocks
 * Integrates with zone unlock store
 *
 * @example
 * ```tsx
 * const proximityController = useMemo(() => createZoneProximityController(), []);
 *
 * useFrame(() => {
 *   const zonesToUnlock = proximityController.update(vesselPosition, zoneUnlockState);
 *   zonesToUnlock.forEach(zone => completeUnlock(zone));
 * });
 * ```
 */
export function useZoneProximityUnlock(
  vesselPosition: THREE.Vector3,
  zoneUnlockState: Pick<ZoneUnlockStore, 'zones'>,
  controller: ZoneProximityController,
  onUnlock: (zone: ZoneId) => void
): void {
  const zonesToUnlock = controller.update(vesselPosition, zoneUnlockState);

  zonesToUnlock.forEach((zone) => {
    console.log(`[ZoneProximity] Unlocking ${zone} via proximity timer`);
    onUnlock(zone);
  });
}
