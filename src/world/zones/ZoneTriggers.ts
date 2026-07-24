/**
 * ZoneTriggers — Zone unlock trigger conditions
 * P4-S1-03, P4-S1-14, P4-S1-23
 *
 * - East Wing: PIP breath detection (3 synced breaths)
 * - West Wing: Any Engine ritual completed
 * - South Gate: Successful sigil forge
 */

import type { ZoneId } from './FogBank';
import type { ZoneUnlockStore } from './ZoneUnlockMachine';
import { BreatheSyncController } from '../../rituals/breatheSync';

/** Zone trigger event types */
export type ZoneTriggerEvent =
  | { type: 'breath-sync-complete'; cycles: number; metrics: any }
  | { type: 'engine-ritual-complete'; engineId: string; duration: number }
  | { type: 'sigil-forge-success'; sigilId: string; complexity: number }
  | { type: 'proximity-timer-complete'; zone: ZoneId; timeSpent: number };

/** Zone trigger callback */
export type ZoneTriggerCallback = (event: ZoneTriggerEvent) => void;

/**
 * East Wing Trigger — Breath-Sync (3 synced breaths)
 * P4-S1-03: PIP breath detection opens East zone
 */
export class EastWingBreathTrigger {
  private breathController: BreatheSyncController;
  private onUnlock: ZoneTriggerCallback;
  private hasTriggered = false;

  constructor(onUnlock: ZoneTriggerCallback, breathController?: BreatheSyncController) {
    this.onUnlock = onUnlock;
    this.breathController = breathController || new BreatheSyncController();
  }

  /**
   * Update with PIP data
   * @param breathPhase - Breath phase (0-1)
   * @param coherence - Coherence score (0-100)
   * @param lqd - LQD score (0-100)
   */
  update(breathPhase: number, coherence: number, lqd: number): void {
    if (this.hasTriggered) return;

    const state = this.breathController.update(breathPhase, coherence, lqd);

    // Check if breath-sync locked (3 cycles complete)
    if (state === 'locked') {
      const metrics = this.breathController.getMetrics();
      const cycles = this.breathController.getCompletedCycles();

      this.onUnlock({
        type: 'breath-sync-complete',
        cycles,
        metrics,
      });

      this.hasTriggered = true;
      console.log(`[EastWingTrigger] Breath-sync complete: ${cycles} cycles`);
    }
  }

  /**
   * Get current progress (0-1)
   */
  getProgress(): number {
    return this.breathController.getProgress();
  }

  /**
   * Get completed cycles
   */
  getCompletedCycles(): number {
    return this.breathController.getCompletedCycles();
  }

  /**
   * Get visual data for UI
   */
  getVisualData() {
    return this.breathController.getVisualData();
  }

  /**
   * Reset trigger
   */
  reset(): void {
    this.breathController.reset();
    this.hasTriggered = false;
  }

  /**
   * Check if triggered
   */
  isTriggered(): boolean {
    return this.hasTriggered;
  }
}

/**
 * West Wing Trigger — Engine Ritual Completion
 * P4-S1-14: Any Engine ritual completed causes West fog to dissipate
 */
export class WestWingEngineTrigger {
  private onUnlock: ZoneTriggerCallback;
  private hasTriggered = false;
  private completedEngines = new Set<string>();

  constructor(onUnlock: ZoneTriggerCallback) {
    this.onUnlock = onUnlock;
  }

  /**
   * Report engine ritual completion
   * @param engineId - Engine identifier (e.g., 'P4-S1-Engine-01')
   * @param duration - Ritual duration in seconds
   */
  completeEngineRitual(engineId: string, duration: number): void {
    if (this.hasTriggered) return;

    // Track completed engine
    this.completedEngines.add(engineId);

    // Trigger unlock on first engine ritual completion
    this.onUnlock({
      type: 'engine-ritual-complete',
      engineId,
      duration,
    });

    this.hasTriggered = true;
    console.log(`[WestWingTrigger] Engine ritual complete: ${engineId}`);
  }

  /**
   * Get completed engine IDs
   */
  getCompletedEngines(): string[] {
    return Array.from(this.completedEngines);
  }

  /**
   * Check if specific engine was completed
   */
  hasCompletedEngine(engineId: string): boolean {
    return this.completedEngines.has(engineId);
  }

  /**
   * Reset trigger
   */
  reset(): void {
    this.hasTriggered = false;
    this.completedEngines.clear();
  }

  /**
   * Check if triggered
   */
  isTriggered(): boolean {
    return this.hasTriggered;
  }
}

/**
 * South Gate Trigger — Sigil Forge Success
 * P4-S1-23: Successful sigil forge activates South zone
 */
export class SouthGateSigilTrigger {
  private onUnlock: ZoneTriggerCallback;
  private hasTriggered = false;
  private forgedSigils = new Set<string>();

  constructor(onUnlock: ZoneTriggerCallback) {
    this.onUnlock = onUnlock;
  }

  /**
   * Report successful sigil forge
   * @param sigilId - Sigil identifier
   * @param complexity - Sigil complexity score (0-10)
   */
  forgeSigil(sigilId: string, complexity: number): void {
    if (this.hasTriggered) return;

    // Track forged sigil
    this.forgedSigils.add(sigilId);

    // Trigger unlock on first successful forge
    this.onUnlock({
      type: 'sigil-forge-success',
      sigilId,
      complexity,
    });

    this.hasTriggered = true;
    console.log(`[SouthGateTrigger] Sigil forged: ${sigilId} (complexity: ${complexity})`);
  }

  /**
   * Get forged sigil IDs
   */
  getForgedSigils(): string[] {
    return Array.from(this.forgedSigils);
  }

  /**
   * Check if specific sigil was forged
   */
  hasForgedSigil(sigilId: string): boolean {
    return this.forgedSigils.has(sigilId);
  }

  /**
   * Reset trigger
   */
  reset(): void {
    this.hasTriggered = false;
    this.forgedSigils.clear();
  }

  /**
   * Check if triggered
   */
  isTriggered(): boolean {
    return this.hasTriggered;
  }
}

/**
 * Zone Trigger Manager
 * Coordinates all zone unlock triggers
 */
export class ZoneTriggerManager {
  private eastTrigger: EastWingBreathTrigger;
  private westTrigger: WestWingEngineTrigger;
  private southTrigger: SouthGateSigilTrigger;
  private zoneUnlockStore: ZoneUnlockStore;

  constructor(zoneUnlockStore: ZoneUnlockStore) {
    this.zoneUnlockStore = zoneUnlockStore;

    // Initialize triggers with callbacks
    this.eastTrigger = new EastWingBreathTrigger((event) => {
      this.handleTriggerEvent('east', event);
    });

    this.westTrigger = new WestWingEngineTrigger((event) => {
      this.handleTriggerEvent('west', event);
    });

    this.southTrigger = new SouthGateSigilTrigger((event) => {
      this.handleTriggerEvent('south', event);
    });
  }

  /**
   * Handle trigger event and update zone unlock state
   */
  private handleTriggerEvent(zone: ZoneId, event: ZoneTriggerEvent): void {
    console.log(`[ZoneTriggerManager] Zone ${zone} trigger:`, event);

    // Mark condition as met
    this.zoneUnlockStore.setConditionMet(zone, true);

    // Complete unlock
    this.zoneUnlockStore.completeUnlock(zone);
  }

  /**
   * Update East trigger with PIP data
   */
  updateEastTrigger(breathPhase: number, coherence: number, lqd: number): void {
    this.eastTrigger.update(breathPhase, coherence, lqd);

    // Update progress in store
    const progress = this.eastTrigger.getProgress();
    this.zoneUnlockStore.setZoneProgress('east', progress);
  }

  /**
   * Report engine ritual completion (West trigger)
   */
  completeEngineRitual(engineId: string, duration: number): void {
    this.westTrigger.completeEngineRitual(engineId, duration);
  }

  /**
   * Report sigil forge success (South trigger)
   */
  forgeSigil(sigilId: string, complexity: number): void {
    this.southTrigger.forgeSigil(sigilId, complexity);
  }

  /**
   * Get trigger status for all zones
   */
  getTriggerStatus(): Record<ZoneId, { triggered: boolean; progress: number }> {
    return {
      north: { triggered: true, progress: 1 }, // Always unlocked
      east: {
        triggered: this.eastTrigger.isTriggered(),
        progress: this.eastTrigger.getProgress(),
      },
      west: {
        triggered: this.westTrigger.isTriggered(),
        progress: this.westTrigger.isTriggered() ? 1 : 0,
      },
      south: {
        triggered: this.southTrigger.isTriggered(),
        progress: this.southTrigger.isTriggered() ? 1 : 0,
      },
    };
  }

  /**
   * Get East trigger (for visual data, etc.)
   */
  getEastTrigger(): EastWingBreathTrigger {
    return this.eastTrigger;
  }

  /**
   * Get West trigger
   */
  getWestTrigger(): WestWingEngineTrigger {
    return this.westTrigger;
  }

  /**
   * Get South trigger
   */
  getSouthTrigger(): SouthGateSigilTrigger {
    return this.southTrigger;
  }

  /**
   * Reset all triggers
   */
  resetAll(): void {
    this.eastTrigger.reset();
    this.westTrigger.reset();
    this.southTrigger.reset();
  }

  /**
   * Reset specific zone trigger
   */
  resetZoneTrigger(zone: ZoneId): void {
    switch (zone) {
      case 'east':
        this.eastTrigger.reset();
        break;
      case 'west':
        this.westTrigger.reset();
        break;
      case 'south':
        this.southTrigger.reset();
        break;
      default:
        break;
    }
  }
}

/**
 * Factory function
 */
export function createZoneTriggerManager(zoneUnlockStore: ZoneUnlockStore): ZoneTriggerManager {
  return new ZoneTriggerManager(zoneUnlockStore);
}
