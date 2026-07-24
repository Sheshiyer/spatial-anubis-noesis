/**
 * RitualRecovery — Ritual failure recovery and resume system
 * P4-S1-27: Interrupted rituals resume on return to zone
 *
 * Tracks ritual progress in session state. If user leaves zone mid-ritual,
 * saves checkpoint. On return, offers resume.
 */

import type { ZoneId } from './FogBank';

/** Ritual type identifier */
export type RitualType = 'breath-sync' | 'engine-ritual' | 'sigil-forge';

/** Ritual progress checkpoint */
export interface RitualCheckpoint {
  /** Ritual type */
  type: RitualType;
  /** Zone where ritual is performed */
  zone: ZoneId;
  /** Progress percentage (0-1) */
  progress: number;
  /** Ritual-specific state data */
  state: Record<string, any>;
  /** Timestamp when checkpoint was created */
  timestamp: number;
  /** Whether ritual was completed */
  completed: boolean;
  /** Whether ritual was interrupted */
  interrupted: boolean;
}

/** Ritual recovery configuration */
export interface RitualRecoveryConfig {
  /** Enable auto-save checkpoints */
  autoSave: boolean;
  /** Checkpoint save interval (ms) */
  saveInterval: number;
  /** Maximum checkpoint age before expiry (ms) */
  maxCheckpointAge: number;
  /** Offer resume prompt */
  offerResume: boolean;
}

/** Default recovery configuration */
export const DEFAULT_RECOVERY_CONFIG: RitualRecoveryConfig = {
  autoSave: true,
  saveInterval: 2000, // Save every 2 seconds
  maxCheckpointAge: 30 * 60 * 1000, // 30 minutes
  offerResume: true,
};

/**
 * Ritual Recovery Manager
 * Handles ritual checkpointing, interruption, and resume
 */
export class RitualRecoveryManager {
  private config: RitualRecoveryConfig;
  private checkpoints: Map<string, RitualCheckpoint>;
  private currentRitual: RitualCheckpoint | null = null;
  private lastSaveTime = 0;
  private isInZone = false;
  private currentZone: ZoneId | null = null;

  constructor(config: Partial<RitualRecoveryConfig> = {}) {
    this.config = { ...DEFAULT_RECOVERY_CONFIG, ...config };
    this.checkpoints = new Map();
    this.loadCheckpointsFromStorage();
  }

  /**
   * Start tracking a ritual
   */
  startRitual(type: RitualType, zone: ZoneId, initialState: Record<string, any> = {}): void {
    this.currentRitual = {
      type,
      zone,
      progress: 0,
      state: initialState,
      timestamp: Date.now(),
      completed: false,
      interrupted: false,
    };

    this.isInZone = true;
    this.currentZone = zone;

    console.log(`[RitualRecovery] Started ${type} ritual in ${zone}`);
  }

  /**
   * Update ritual progress
   */
  updateRitualProgress(progress: number, state: Record<string, any>): void {
    if (!this.currentRitual) return;

    this.currentRitual.progress = Math.max(0, Math.min(1, progress));
    this.currentRitual.state = { ...this.currentRitual.state, ...state };
    this.currentRitual.timestamp = Date.now();

    // Auto-save checkpoint
    const now = Date.now();
    if (this.config.autoSave && now - this.lastSaveTime >= this.config.saveInterval) {
      this.saveCheckpoint();
      this.lastSaveTime = now;
    }
  }

  /**
   * Complete ritual successfully
   */
  completeRitual(): void {
    if (!this.currentRitual) return;

    this.currentRitual.completed = true;
    this.currentRitual.progress = 1;

    console.log(`[RitualRecovery] Completed ${this.currentRitual.type} ritual`);

    // Remove checkpoint on completion
    const key = this.getCheckpointKey(this.currentRitual.type, this.currentRitual.zone);
    this.checkpoints.delete(key);
    this.saveCheckpointsToStorage();

    this.currentRitual = null;
  }

  /**
   * Mark ritual as interrupted (user left zone)
   */
  interruptRitual(): void {
    if (!this.currentRitual) return;

    this.currentRitual.interrupted = true;
    this.isInZone = false;

    console.log(
      `[RitualRecovery] Interrupted ${this.currentRitual.type} ritual at ${(this.currentRitual.progress * 100).toFixed(1)}%`
    );

    // Save checkpoint
    this.saveCheckpoint();
  }

  /**
   * Cancel ritual (abandon progress)
   */
  cancelRitual(): void {
    if (!this.currentRitual) return;

    const key = this.getCheckpointKey(this.currentRitual.type, this.currentRitual.zone);
    this.checkpoints.delete(key);
    this.saveCheckpointsToStorage();

    console.log(`[RitualRecovery] Cancelled ${this.currentRitual.type} ritual`);

    this.currentRitual = null;
  }

  /**
   * Enter zone (check for resumable ritual)
   */
  enterZone(zone: ZoneId): RitualCheckpoint | null {
    this.isInZone = true;
    this.currentZone = zone;

    // Check for resumable rituals in this zone
    const resumableRituals = this.getResumableRitualsInZone(zone);

    if (resumableRituals.length > 0 && this.config.offerResume) {
      // Return most recent ritual for resume prompt
      return resumableRituals[0];
    }

    return null;
  }

  /**
   * Leave zone (auto-save if ritual in progress)
   */
  leaveZone(): void {
    if (this.currentRitual && !this.currentRitual.completed) {
      this.interruptRitual();
    }

    this.isInZone = false;
    this.currentZone = null;
  }

  /**
   * Resume ritual from checkpoint
   */
  resumeRitual(checkpoint: RitualCheckpoint): boolean {
    // Validate checkpoint age
    const age = Date.now() - checkpoint.timestamp;
    if (age > this.config.maxCheckpointAge) {
      console.warn(`[RitualRecovery] Checkpoint expired (age: ${age}ms)`);
      return false;
    }

    // Restore ritual state
    this.currentRitual = {
      ...checkpoint,
      interrupted: false,
      timestamp: Date.now(),
    };

    this.isInZone = true;
    this.currentZone = checkpoint.zone;

    console.log(
      `[RitualRecovery] Resumed ${checkpoint.type} ritual from ${(checkpoint.progress * 100).toFixed(1)}%`
    );

    return true;
  }

  /**
   * Get resumable rituals in a specific zone
   */
  getResumableRitualsInZone(zone: ZoneId): RitualCheckpoint[] {
    const rituals: RitualCheckpoint[] = [];
    const now = Date.now();

    this.checkpoints.forEach((checkpoint) => {
      if (
        checkpoint.zone === zone &&
        !checkpoint.completed &&
        checkpoint.interrupted &&
        now - checkpoint.timestamp <= this.config.maxCheckpointAge
      ) {
        rituals.push(checkpoint);
      }
    });

    // Sort by timestamp (most recent first)
    return rituals.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get all active checkpoints
   */
  getAllCheckpoints(): RitualCheckpoint[] {
    return Array.from(this.checkpoints.values());
  }

  /**
   * Clear expired checkpoints
   */
  clearExpiredCheckpoints(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.checkpoints.forEach((checkpoint, key) => {
      if (now - checkpoint.timestamp > this.config.maxCheckpointAge) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach((key) => {
      this.checkpoints.delete(key);
      console.log(`[RitualRecovery] Cleared expired checkpoint: ${key}`);
    });

    if (expiredKeys.length > 0) {
      this.saveCheckpointsToStorage();
    }
  }

  /**
   * Get current ritual state
   */
  getCurrentRitual(): RitualCheckpoint | null {
    return this.currentRitual;
  }

  /**
   * Check if in zone
   */
  getIsInZone(): boolean {
    return this.isInZone;
  }

  /**
   * Private: Save checkpoint to memory and storage
   */
  private saveCheckpoint(): void {
    if (!this.currentRitual) return;

    const key = this.getCheckpointKey(this.currentRitual.type, this.currentRitual.zone);
    this.checkpoints.set(key, { ...this.currentRitual });
    this.saveCheckpointsToStorage();

    console.log(`[RitualRecovery] Saved checkpoint: ${key} (${(this.currentRitual.progress * 100).toFixed(1)}%)`);
  }

  /**
   * Private: Generate checkpoint key
   */
  private getCheckpointKey(type: RitualType, zone: ZoneId): string {
    return `${zone}-${type}`;
  }

  /**
   * Private: Save checkpoints to localStorage
   */
  private saveCheckpointsToStorage(): void {
    try {
      const data = Array.from(this.checkpoints.entries());
      localStorage.setItem('spatial-anubis:ritual-checkpoints', JSON.stringify(data));
    } catch (error) {
      console.warn('[RitualRecovery] Failed to save checkpoints to storage:', error);
    }
  }

  /**
   * Private: Load checkpoints from localStorage
   */
  private loadCheckpointsFromStorage(): void {
    try {
      const stored = localStorage.getItem('spatial-anubis:ritual-checkpoints');
      if (stored) {
        const data = JSON.parse(stored) as [string, RitualCheckpoint][];
        this.checkpoints = new Map(data);

        // Clear expired on load
        this.clearExpiredCheckpoints();

        console.log(`[RitualRecovery] Loaded ${this.checkpoints.size} checkpoints from storage`);
      }
    } catch (error) {
      console.warn('[RitualRecovery] Failed to load checkpoints from storage:', error);
    }
  }

  /**
   * Clear all checkpoints
   */
  clearAll(): void {
    this.checkpoints.clear();
    this.currentRitual = null;
    this.saveCheckpointsToStorage();
    console.log('[RitualRecovery] Cleared all checkpoints');
  }
}

/**
 * Factory function
 */
export function createRitualRecoveryManager(
  config?: Partial<RitualRecoveryConfig>
): RitualRecoveryManager {
  return new RitualRecoveryManager(config);
}

/**
 * Hook-friendly wrapper for ritual recovery
 */
export function useRitualRecovery(config?: Partial<RitualRecoveryConfig>): RitualRecoveryManager {
  // In actual React usage, this would use useMemo/useRef
  // For now, return new instance (integrate with React later)
  return new RitualRecoveryManager(config);
}
