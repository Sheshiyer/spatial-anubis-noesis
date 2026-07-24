/**
 * Engine Manager
 * Central orchestration for all divination engines
 * Handles unlocking, spatial placement, bio-gating, and convergence
 */

import type {
  EngineId,
  EngineState,
  EngineManagerState,
  EngineManagerActions,
  EngineEvent,
  EngineEventListener,
} from './types';
import type {
  Tier2EngineStates,
  Tier3EngineStates,
  BioGatingRequirements,
  UnlockAnimationState,
} from './tier2/types';
import { DEFAULT_BIO_GATE, TIER2_SPATIAL_PLACEMENT } from './tier2/types';
import { DEFAULT_TIER3_REQUIREMENTS, TIER3_SPATIAL_PLACEMENT } from './tier3/types';
import type { PIPData, PIPHealthStatus } from '../pip/types';

/** Tier 2 engine IDs */
const TIER2_ENGINES: EngineId[] = ['biorhythm', 'gene_keys', 'human_design', 'chronobiology'];

/** Tier 3 engine IDs */
const TIER3_ENGINES: EngineId[] = ['decision_mirror', 'transit_overlay', 'somatic_canticle'];

/**
 * Engine Manager
 * P3-S2-13: Tier 2 spatial placement (radius 10, 90° spacing)
 * P3-S2-14: Bio-data gating (Tier 2 requires active PIP)
 * P3-S2-15: Unlock animation (fog thins, glow intensifies, audio cue)
 * P3-S2-26: Tier 3 spatial placement (radius 15, 120° spacing)
 */
export class EngineManager implements EngineManagerActions {
  private state: EngineManagerState;
  private tier2States: Tier2EngineStates;
  private tier3States: Tier3EngineStates;
  private bioGate: BioGatingRequirements;
  private pipConnected: boolean = false;
  private pipData: PIPData | null = null;
  private pipConnectionTime: number = 0;
  private globalListeners: Set<EngineEventListener> = new Set();
  private unlockAnimations: Map<EngineId, UnlockAnimationState> = new Map();
  private eventListeners: Map<EngineId, Set<EngineEventListener>> = new Map();

  constructor() {
    
    // Initialize all engine states
    const allEngines: EngineId[] = [...TIER2_ENGINES, ...TIER3_ENGINES];
    const engineStates: Record<EngineId, EngineState> = {} as Record<EngineId, EngineState>;
    
    allEngines.forEach((id) => {
      engineStates[id] = {
        engineId: id,
        data: null,
        lastUpdate: 0,
        isLoading: false,
        error: null,
        isUnlocked: false,
        unlockProgress: 0,
      };
    });

    this.state = {
      engines: engineStates,
      activeEngine: null,
      tier2Progress: { unlocked: 0, total: TIER2_ENGINES.length },
      tier3Progress: { unlocked: 0, total: TIER3_ENGINES.length },
      globalConvergence: 0,
    };

    // Initialize Tier 2 states
    this.tier2States = {
      biorhythm: { unlocked: false, unlockProgress: 0 },
      gene_keys: { unlocked: false, unlockProgress: 0 },
      human_design: { unlocked: false, unlockProgress: 0 },
      chronobiology: { unlocked: false, unlockProgress: 0 },
    };

    // Initialize Tier 3 states
    this.tier3States = {
      decisionMirror: { unlocked: false, unlockProgress: 0 },
      transitOverlay: { unlocked: false, unlockProgress: 0 },
      somaticCanticle: { unlocked: false, unlockProgress: 0 },
    };

    this.bioGate = { ...DEFAULT_BIO_GATE };
    
    // Initialize event listeners map
    allEngines.forEach((id) => {
      this.eventListeners.set(id, new Set());
    });
  }

  /**
   * Update PIP connection status
   * P3-S2-14: Bio-data gating (Tier 2 requires active PIP)
   */
  updatePIPStatus(connected: boolean, health?: PIPHealthStatus): void {
    const wasConnected = this.pipConnected;
    this.pipConnected = connected;
    
    if (connected && !wasConnected) {
      this.pipConnectionTime = Date.now();
      this.checkUnlockRequirements();
    }
  }

  /**
   * Update PIP data
   */
  updatePIPData(data: PIPData): void {
    this.pipData = data;
    
    // Check if bio-gate requirements are met
    this.checkUnlockRequirements();
  }

  /**
   * Check unlock requirements for all engines
   * P3-S2-14: Bio-data gating
   */
  checkUnlockRequirements(): void {
    // Check Tier 2 unlocks
    TIER2_ENGINES.forEach((engineId) => {
      this.checkTier2Unlock(engineId);
    });

    // Check Tier 3 unlocks (depends on Tier 2)
    TIER3_ENGINES.forEach((engineId) => {
      this.checkTier3Unlock(engineId);
    });

    // Update progress
    this.updateProgress();
  }

  /**
   * Check Tier 2 unlock requirements
   */
  private checkTier2Unlock(engineId: EngineId): void {
    const engine = this.state.engines[engineId];
    if (engine.isUnlocked) return;

    // Check PIP connection
    if (!this.pipConnected && this.bioGate.requiresPIP) {
      return;
    }

    // Check minimum coherence
    if (this.pipData && this.pipData.coherence < this.bioGate.minCoherence) {
      return;
    }

    // Check minimum connection time
    const connectionDuration = this.pipConnectionTime 
      ? (Date.now() - this.pipConnectionTime) / 1000 
      : 0;
    if (connectionDuration < this.bioGate.minConnectionTime) {
      return;
    }

    // Start unlock animation
    this.startUnlockAnimation(engineId);
  }

  /**
   * Check Tier 3 unlock requirements
   */
  private checkTier3Unlock(engineId: EngineId): void {
    const engine = this.state.engines[engineId];
    if (engine.isUnlocked) return;

    // Check minimum Tier 2 engines unlocked
    const tier2Unlocked = TIER2_ENGINES.filter(
      (id) => this.state.engines[id].isUnlocked
    ).length;

    if (tier2Unlocked < DEFAULT_TIER3_REQUIREMENTS.minTier2Engines) {
      return;
    }

    // Check session coherence average
    if (this.pipData && this.pipData.coherence < DEFAULT_TIER3_REQUIREMENTS.minSessionCoherence) {
      return;
    }

    // Start unlock animation
    this.startUnlockAnimation(engineId);
  }

  /**
   * Start unlock animation
   * P3-S2-15: Unlock animation (fog thins, glow intensifies, audio cue)
   */
  private startUnlockAnimation(engineId: EngineId): void {
    const animation: UnlockAnimationState = {
      engine: engineId,
      progress: 0,
      fogDensity: 0.05, // Starting fog density
      glowIntensity: 0.5, // Starting glow
      audioCuePlayed: false,
    };

    this.unlockAnimations.set(engineId, animation);
    
    // Emit unlocking event
    this.emitEvent({
      type: 'unlocking',
      engineId,
      timestamp: Date.now(),
    });

    // Start animation loop
    this.animateUnlock(engineId);
  }

  /**
   * Animate unlock process
   */
  private animateUnlock(engineId: EngineId): void {
    const animation = this.unlockAnimations.get(engineId);
    if (!animation) return;

    const duration = 2000; // 2 second unlock animation
    const startTime = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);

      animation.progress = progress;
      animation.fogDensity = 0.05 * (1 - progress); // Fog thins
      animation.glowIntensity = 0.5 + (progress * 0.5); // Glow intensifies

      // Play audio cue at 50%
      if (progress >= 0.5 && !animation.audioCuePlayed) {
        animation.audioCuePlayed = true;
        // Audio cue would be triggered here
      }

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        // Complete unlock
        this.completeUnlock(engineId);
      }
    };

    requestAnimationFrame(tick);
  }

  /**
   * Complete unlock process
   */
  private completeUnlock(engineId: EngineId): void {
    this.unlockAnimations.delete(engineId);
    
    this.state.engines[engineId].isUnlocked = true;
    this.state.engines[engineId].unlockProgress = 1;

    // Emit unlocked event
    this.emitEvent({
      type: 'unlocked',
      engineId,
      timestamp: Date.now(),
    });

    this.updateProgress();
  }

  /**
   * Update unlock progress
   */
  private updateProgress(): void {
    const tier2Unlocked = TIER2_ENGINES.filter(
      (id) => this.state.engines[id].isUnlocked
    ).length;
    
    const tier3Unlocked = TIER3_ENGINES.filter(
      (id) => this.state.engines[id].isUnlocked
    ).length;

    this.state.tier2Progress.unlocked = tier2Unlocked;
    this.state.tier3Progress.unlocked = tier3Unlocked;

    // Update individual tier states
    TIER2_ENGINES.forEach((id) => {
      const key = id.replace(/_./g, (m) => m[1].toUpperCase()) as keyof Tier2EngineStates;
      if (key in this.tier2States) {
        (this.tier2States as Record<string, { unlocked: boolean; unlockProgress: number }>)[key].unlocked = 
          this.state.engines[id].isUnlocked;
      }
    });
  }

  /**
   * Get spatial placement for an engine
   * P3-S2-13: Tier 2 spatial placement (radius 10, 90° spacing)
   * P3-S2-26: Tier 3 spatial placement (radius 15, 120° spacing)
   */
  getSpatialPlacement(engineId: EngineId): [number, number, number] | null {
    if (TIER2_ENGINES.includes(engineId)) {
      const index = TIER2_ENGINES.indexOf(engineId);
      return TIER2_SPATIAL_PLACEMENT[index]?.position ?? null;
    }
    
    if (TIER3_ENGINES.includes(engineId)) {
      const index = TIER3_ENGINES.indexOf(engineId);
      return TIER3_SPATIAL_PLACEMENT[index]?.position ?? null;
    }
    
    return null;
  }

  /**
   * Get unlock animation state
   */
  getUnlockAnimation(engineId: EngineId): UnlockAnimationState | null {
    return this.unlockAnimations.get(engineId) ?? null;
  }

  /**
   * Get all active unlock animations
   */
  getActiveUnlockAnimations(): UnlockAnimationState[] {
    return Array.from(this.unlockAnimations.values());
  }

  /**
   * Unlock an engine manually (for testing/debug)
   */
  async unlockEngine(engineId: EngineId): Promise<void> {
    if (!this.state.engines[engineId]) {
      throw new Error(`Unknown engine: ${engineId}`);
    }
    
    if (this.state.engines[engineId].isUnlocked) {
      return;
    }

    this.startUnlockAnimation(engineId);
  }

  /**
   * Refresh engine data
   */
  async refreshEngine(engineId: EngineId): Promise<void> {
    const engine = this.state.engines[engineId];
    if (!engine) return;

    engine.isLoading = true;
    
    // Data refresh logic would go here
    // This would call the appropriate API endpoints
    
    engine.isLoading = false;
    engine.lastUpdate = Date.now();
  }

  /**
   * Set active engine
   */
  setActiveEngine(engineId: EngineId | null): void {
    this.state.activeEngine = engineId;
  }

  /**
   * Get convergence analysis
   */
  async getConvergenceAnalysis(): Promise<{ score: number; themes: string[] }> {
    // Collect themes from all unlocked engines
    const themes: string[] = [];
    let totalScore = 0;
    let engineCount = 0;

    Object.values(this.state.engines).forEach((engine) => {
      if (engine.isUnlocked && engine.data) {
        // Extract themes from engine data
        // This would be more sophisticated in production
        engineCount++;
        totalScore += 50; // Base score per unlocked engine
      }
    });

    const score = engineCount > 0 ? Math.round(totalScore / engineCount) : 0;
    this.state.globalConvergence = score;

    return { score, themes };
  }

  /**
   * Get current state
   */
  getState(): EngineManagerState {
    return { ...this.state };
  }

  /**
   * Get Tier 2 states
   */
  getTier2States(): Tier2EngineStates {
    return { ...this.tier2States };
  }

  /**
   * Get Tier 3 states
   */
  getTier3States(): Tier3EngineStates {
    return { ...this.tier3States };
  }

  /**
   * Check if PIP is connected
   */
  isPIPConnected(): boolean {
    return this.pipConnected;
  }

  /**
   * Check if bio-gate is satisfied
   */
  isBioGateSatisfied(): boolean {
    if (!this.pipConnected && this.bioGate.requiresPIP) return false;
    if (this.pipData && this.pipData.coherence < this.bioGate.minCoherence) return false;
    return true;
  }

  /**
   * Subscribe to engine events
   */
  onEvent(engineId: EngineId, listener: EngineEventListener): () => void {
    const listeners = this.eventListeners.get(engineId);
    if (listeners) {
      listeners.add(listener);
    }
    
    return () => {
      listeners?.delete(listener);
    };
  }

  /**
   * Emit engine event
   */
  private emitEvent(event: EngineEvent): void {
    const listeners = this.eventListeners.get(event.engineId);
    listeners?.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error(`[EngineManager] Event listener error:`, err);
      }
    });

    // Also emit to global listeners
    this.globalListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error(`[EngineManager] Global listener error:`, err);
      }
    });
  }

  /**
   * Dispose
   */
  dispose(): void {
    this.unlockAnimations.clear();
    this.eventListeners.clear();
    this.globalListeners.clear();
  }
}

/** Factory function */
export function createEngineManager(): EngineManager {
  return new EngineManager();
}
