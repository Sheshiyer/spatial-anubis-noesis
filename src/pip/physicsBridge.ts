/**
 * PIP to Physics Bridge
 * P2-S3-03: Wire coherence to LinearDamping (0-100 -> 0.1-2.0)
 * Real-time viscosity tuning
 */

import type { PIPData } from './types';

/** Coherence to damping mapping config */
export interface DampingConfig {
  /** Minimum coherence value (maps to maxDamping) */
  minCoherence: number;
  /** Maximum coherence value (maps to minDamping) */
  maxCoherence: number;
  /** Damping at max coherence (fluid movement) */
  minDamping: number;
  /** Damping at min coherence (viscous movement) */
  maxDamping: number;
}

/** Default damping configuration */
export const DEFAULT_DAMPING_CONFIG: DampingConfig = {
  minCoherence: 0,
  maxCoherence: 100,
  minDamping: 0.1,
  maxDamping: 2.0,
};

/** Rigid body interface for damping control */
export interface DampingBody {
  setLinearDamping(d: number): void;
  linearDamping(): number;
}

/** PIP to Physics bridge for coherence-based damping */
export class PIPPhysicsBridge {
  private config: DampingConfig;
  private currentDamping = 0.1;
  private targetBodies: Array<{ body: DampingBody; originalDamping: number }> = [];

  constructor(config: Partial<DampingConfig> = {}) {
    this.config = { ...DEFAULT_DAMPING_CONFIG, ...config };
  }

  /**
   * Map coherence to linear damping
   * Coherence 0-100 -> Damping 0.1-2.0 (inverted: high coherence = low damping)
   */
  mapCoherenceToDamping(coherence: number): number {
    const { minCoherence, maxCoherence, minDamping, maxDamping } = this.config;
    
    // Clamp coherence to valid range
    const clampedCoherence = Math.max(minCoherence, Math.min(maxCoherence, coherence));
    
    // Normalize to 0-1
    const normalized = (clampedCoherence - minCoherence) / (maxCoherence - minCoherence);
    
    // Invert: high coherence = low damping (fluid), low coherence = high damping (viscous)
    const inverted = 1 - normalized;
    
    // Map to damping range
    return minDamping + inverted * (maxDamping - minDamping);
  }

  /** Update damping from PIP data */
  updateFromPIP(data: PIPData): number {
    this.currentDamping = this.mapCoherenceToDamping(data.coherence);
    return this.currentDamping;
  }

  /** Get current damping value */
  getCurrentDamping(): number {
    return this.currentDamping;
  }

  /** Register a rigid body for coherence-based damping */
  registerBody(body: DampingBody): void {
    this.targetBodies.push({
      body,
      originalDamping: body.linearDamping(),
    });
  }

  /** Unregister a rigid body */
  unregisterBody(body: DampingBody): void {
    const index = this.targetBodies.findIndex((b) => b.body === body);
    if (index !== -1) {
      // Restore original damping
      const { body: targetBody, originalDamping } = this.targetBodies[index]!;
      targetBody.setLinearDamping(originalDamping);
      this.targetBodies.splice(index, 1);
    }
  }

  /** Apply current damping to all registered bodies */
  applyDamping(): void {
    this.targetBodies.forEach(({ body }) => {
      body.setLinearDamping(this.currentDamping);
    });
  }

  /** Update config */
  setConfig(config: Partial<DampingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /** Get config */
  getConfig(): DampingConfig {
    return { ...this.config };
  }

  /** Clear all registered bodies */
  clear(): void {
    // Restore original damping
    this.targetBodies.forEach(({ body, originalDamping }) => {
      body.setLinearDamping(originalDamping);
    });
    this.targetBodies = [];
  }
}

/** Global coherence damping controller */
export class GlobalCoherenceDamping {
  private bridge: PIPPhysicsBridge;
  private isActive = false;
  private lastDamping = 0.1;

  constructor(config?: Partial<DampingConfig>) {
    this.bridge = new PIPPhysicsBridge(config);
  }

  /** Start applying coherence-based damping */
  start(): void {
    this.isActive = true;
  }

  /** Stop applying coherence-based damping */
  stop(): void {
    this.isActive = false;
  }

  /** Update from PIP data */
  update(data: PIPData): number {
    const damping = this.bridge.updateFromPIP(data);
    
    if (this.isActive && Math.abs(damping - this.lastDamping) > 0.01) {
      this.bridge.applyDamping();
      this.lastDamping = damping;
    }
    
    return damping;
  }

  /** Get current damping value */
  getDamping(): number {
    return this.bridge.getCurrentDamping();
  }

  /** Register a body for coherence damping */
  registerBody(body: DampingBody): void {
    this.bridge.registerBody(body);
  }

  /** Unregister a body */
  unregisterBody(body: DampingBody): void {
    this.bridge.unregisterBody(body);
  }
}

/** Factory functions */
export function createPIPPhysicsBridge(config?: Partial<DampingConfig>): PIPPhysicsBridge {
  return new PIPPhysicsBridge(config);
}

export function createGlobalCoherenceDamping(config?: Partial<DampingConfig>): GlobalCoherenceDamping {
  return new GlobalCoherenceDamping(config);
}
