/**
 * ZoneBoundary — Exponential friction for locked zone boundaries
 * P4-S1-04: Soft-wall resistance that increases exponentially near locked boundaries
 *
 * Provides exponential resistance as vessel approaches locked boundaries,
 * but never fully blocks (soft wall). Uses easeInExpo curve for natural feel.
 */

import * as THREE from 'three';
import type { ZoneId } from './FogBank';
import type { ZoneUnlockStore } from './ZoneUnlockMachine';

/** Zone boundary configuration */
export interface ZoneBoundaryConfig {
  /** Zone center position */
  center: THREE.Vector3;
  /** Boundary radius where friction starts */
  radius: number;
  /** Inner radius where friction is minimal */
  innerRadius: number;
  /** Maximum friction force magnitude */
  maxFriction: number;
  /** Friction curve exponent (higher = steeper) */
  frictionExponent: number;
}

/** Default boundary configurations for all zones */
export const DEFAULT_ZONE_BOUNDARIES: Record<ZoneId, ZoneBoundaryConfig> = {
  north: {
    center: new THREE.Vector3(0, 0, 50),
    radius: 25,
    innerRadius: 20,
    maxFriction: 8.0,
    frictionExponent: 3.0,
  },
  east: {
    center: new THREE.Vector3(50, 0, 0),
    radius: 25,
    innerRadius: 20,
    maxFriction: 10.0,
    frictionExponent: 3.5,
  },
  west: {
    center: new THREE.Vector3(-50, 0, 0),
    radius: 25,
    innerRadius: 20,
    maxFriction: 10.0,
    frictionExponent: 3.5,
  },
  south: {
    center: new THREE.Vector3(0, 0, -50),
    radius: 25,
    innerRadius: 20,
    maxFriction: 12.0, // Strongest resistance for South gate
    frictionExponent: 4.0,
  },
};

/**
 * Ease-in exponential curve (starts slow, accelerates rapidly)
 * Maps 0-1 input to 0-1 output with exponential growth
 */
export function easeInExpo(t: number): number {
  return t === 0 ? 0 : Math.pow(2, 10 * (t - 1));
}

/**
 * Calculate friction force for a single zone boundary
 *
 * @param vesselPosition - Current vessel position
 * @param config - Zone boundary configuration
 * @returns Friction force vector pointing away from boundary
 */
export function calculateZoneFriction(
  vesselPosition: THREE.Vector3,
  config: ZoneBoundaryConfig
): THREE.Vector3 {
  // Distance from zone center
  const distanceFromCenter = vesselPosition.distanceTo(config.center);

  // If inside inner radius, no friction
  if (distanceFromCenter < config.innerRadius) {
    return new THREE.Vector3(0, 0, 0);
  }

  // If beyond outer radius, no friction
  if (distanceFromCenter > config.radius) {
    return new THREE.Vector3(0, 0, 0);
  }

  // Calculate normalized distance in friction zone (0 = inner, 1 = outer)
  const frictionZoneWidth = config.radius - config.innerRadius;
  const normalizedDistance = (distanceFromCenter - config.innerRadius) / frictionZoneWidth;

  // Apply exponential easing
  const easedDistance = easeInExpo(normalizedDistance);

  // Calculate friction magnitude
  const frictionMagnitude = easedDistance * config.maxFriction;

  // Direction away from zone center
  const directionFromCenter = new THREE.Vector3()
    .subVectors(vesselPosition, config.center)
    .normalize();

  // Friction force points away from center (repulsive)
  return directionFromCenter.multiplyScalar(frictionMagnitude);
}

/**
 * Calculate combined friction from all locked zone boundaries
 *
 * @param vesselPosition - Current vessel position
 * @param zoneUnlockState - Zone unlock store state
 * @param customBoundaries - Optional custom boundary configs
 * @returns Total friction force vector
 */
export function calculateAllZoneFriction(
  vesselPosition: THREE.Vector3,
  zoneUnlockState: Pick<ZoneUnlockStore, 'zones'>,
  customBoundaries?: Partial<Record<ZoneId, ZoneBoundaryConfig>>
): THREE.Vector3 {
  const totalFriction = new THREE.Vector3(0, 0, 0);
  const zones: ZoneId[] = ['north', 'east', 'west', 'south'];

  zones.forEach((zone) => {
    const zoneConfig = zoneUnlockState.zones[zone];

    // Only apply friction for locked zones
    if (zoneConfig.state === 'locked') {
      const boundaryConfig = customBoundaries?.[zone] || DEFAULT_ZONE_BOUNDARIES[zone];
      const friction = calculateZoneFriction(vesselPosition, boundaryConfig);
      totalFriction.add(friction);
    }
  });

  return totalFriction;
}

/**
 * Zone boundary controller for managing multiple boundaries
 */
export class ZoneBoundaryController {
  private boundaries: Record<ZoneId, ZoneBoundaryConfig>;
  private enabled = true;

  constructor(customBoundaries?: Partial<Record<ZoneId, ZoneBoundaryConfig>>) {
    this.boundaries = {
      ...DEFAULT_ZONE_BOUNDARIES,
      ...customBoundaries,
    };
  }

  /**
   * Calculate friction force for vessel at given position
   */
  calculateFriction(
    vesselPosition: THREE.Vector3,
    zoneUnlockState: Pick<ZoneUnlockStore, 'zones'>
  ): THREE.Vector3 {
    if (!this.enabled) {
      return new THREE.Vector3(0, 0, 0);
    }

    return calculateAllZoneFriction(vesselPosition, zoneUnlockState, this.boundaries);
  }

  /**
   * Update boundary configuration for a zone
   */
  updateBoundary(zone: ZoneId, config: Partial<ZoneBoundaryConfig>): void {
    this.boundaries[zone] = {
      ...this.boundaries[zone],
      ...config,
    };
  }

  /**
   * Get boundary configuration for a zone
   */
  getBoundary(zone: ZoneId): ZoneBoundaryConfig {
    return { ...this.boundaries[zone] };
  }

  /**
   * Enable/disable boundary friction
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if vessel is in friction zone of any locked zone
   */
  isInFrictionZone(
    vesselPosition: THREE.Vector3,
    zoneUnlockState: Pick<ZoneUnlockStore, 'zones'>
  ): { inZone: boolean; zone: ZoneId | null; distance: number } {
    const zones: ZoneId[] = ['north', 'east', 'west', 'south'];

    for (const zone of zones) {
      const zoneConfig = zoneUnlockState.zones[zone];

      // Only check locked zones
      if (zoneConfig.state === 'locked') {
        const boundaryConfig = this.boundaries[zone];
        const distanceFromCenter = vesselPosition.distanceTo(boundaryConfig.center);

        if (
          distanceFromCenter >= boundaryConfig.innerRadius &&
          distanceFromCenter <= boundaryConfig.radius
        ) {
          return {
            inZone: true,
            zone,
            distance: distanceFromCenter,
          };
        }
      }
    }

    return { inZone: false, zone: null, distance: 0 };
  }

  /**
   * Get closest locked zone to vessel
   */
  getClosestLockedZone(
    vesselPosition: THREE.Vector3,
    zoneUnlockState: Pick<ZoneUnlockStore, 'zones'>
  ): { zone: ZoneId | null; distance: number } {
    const zones: ZoneId[] = ['north', 'east', 'west', 'south'];
    let closestZone: ZoneId | null = null;
    let closestDistance = Infinity;

    zones.forEach((zone) => {
      const zoneConfig = zoneUnlockState.zones[zone];

      // Only check locked zones
      if (zoneConfig.state === 'locked') {
        const boundaryConfig = this.boundaries[zone];
        const distance = vesselPosition.distanceTo(boundaryConfig.center);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestZone = zone;
        }
      }
    });

    return { zone: closestZone, distance: closestDistance };
  }
}

/**
 * Factory function to create boundary controller
 */
export function createZoneBoundaryController(
  customBoundaries?: Partial<Record<ZoneId, ZoneBoundaryConfig>>
): ZoneBoundaryController {
  return new ZoneBoundaryController(customBoundaries);
}

/**
 * Hook-friendly wrapper for boundary friction calculation
 */
export function useZoneBoundaryFriction(
  vesselPosition: THREE.Vector3,
  zoneUnlockState: Pick<ZoneUnlockStore, 'zones'>,
  controller?: ZoneBoundaryController
): THREE.Vector3 {
  const boundaryController = controller || new ZoneBoundaryController();
  return boundaryController.calculateFriction(vesselPosition, zoneUnlockState);
}
