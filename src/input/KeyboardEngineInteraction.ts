/**
 * KeyboardEngineInteraction — Keyboard engine engagement system
 * P4-S2-06: Keyboard engine interaction
 *
 * Keyboard controls for engine interaction:
 * - E key: Engage nearest unlocked engine
 * - Shift+E: Disengage current engine
 *
 * Features:
 * - Distance-based priority (closest engine wins)
 * - Only unlocked engines are engageable
 * - Visual feedback on engagement state
 * - Integration with engine state system
 */

import * as THREE from 'three';

// ============================================================================
// Engine Interaction Types
// ============================================================================

export interface EngineInstance {
  id: string;
  name: string;
  position: THREE.Vector3;
  isLocked: boolean;
  isEngaged: boolean;
  state: 'idle' | 'active' | 'transitioning';
}

export interface EngineInteractionConfig {
  maxEngageDistance: number; // Max distance to engage (units)
  engageKey: string;         // Default: 'e'
  disengageKey: string;      // Default: 'shift+e'
  enableHints: boolean;      // Show engagement hints
}

export const DEFAULT_ENGINE_INTERACTION_CONFIG: EngineInteractionConfig = {
  maxEngageDistance: 5,
  engageKey: 'e',
  disengageKey: 'shift+e',
  enableHints: true,
};

export interface EngagementEvent {
  engineId: string;
  type: 'engage' | 'disengage';
  timestamp: number;
}

// ============================================================================
// KeyboardEngineInteraction
// ============================================================================

export class KeyboardEngineInteraction {
  private config: EngineInteractionConfig;
  private engines = new Map<string, EngineInstance>();
  private currentEngagedId: string | null = null;
  private playerPosition: THREE.Vector3 = new THREE.Vector3();

  // Keyboard state
  private isShiftPressed: boolean = false;

  // Callbacks
  private onEngage: ((engineId: string) => void) | null = null;
  private onDisengage: ((engineId: string) => void) | null = null;
  private onNearestChange: ((engineId: string | null, distance: number) => void) | null = null;

  constructor(config: Partial<EngineInteractionConfig> = {}) {
    this.config = { ...DEFAULT_ENGINE_INTERACTION_CONFIG, ...config };
  }

  /**
   * Setup keyboard event listeners
   */
  setupEventListeners(): () => void {
    const handleKeyDown = this.onKeyDown.bind(this);
    const handleKeyUp = this.onKeyUp.bind(this);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Return cleanup function
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }

  /**
   * Handle keydown events
   */
  private onKeyDown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();

    // Track shift state
    if (key === 'shift') {
      this.isShiftPressed = true;
      return;
    }

    // Check for engage/disengage
    if (key === 'e') {
      if (this.isShiftPressed) {
        // Shift+E: Disengage
        this.disengageCurrentEngine();
      } else {
        // E: Engage nearest
        this.engageNearestEngine();
      }

      event.preventDefault();
    }
  }

  /**
   * Handle keyup events
   */
  private onKeyUp(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();

    if (key === 'shift') {
      this.isShiftPressed = false;
    }
  }

  /**
   * Engage the nearest unlocked engine
   */
  private engageNearestEngine(): void {
    if (this.currentEngagedId) {
      console.log('[KeyboardEngineInteraction] Already engaged with:', this.currentEngagedId);
      return;
    }

    const nearest = this.findNearestUnlockedEngine();

    if (!nearest) {
      console.log('[KeyboardEngineInteraction] No engageable engine in range');
      return;
    }

    if (nearest.distance > this.config.maxEngageDistance) {
      console.log('[KeyboardEngineInteraction] Nearest engine too far:', nearest.distance);
      return;
    }

    // Engage the engine
    this.engageEngine(nearest.engine.id);
  }

  /**
   * Engage a specific engine by ID
   */
  engageEngine(engineId: string): boolean {
    const engine = this.engines.get(engineId);

    if (!engine) {
      console.warn('[KeyboardEngineInteraction] Engine not found:', engineId);
      return false;
    }

    if (engine.isLocked) {
      console.warn('[KeyboardEngineInteraction] Engine is locked:', engineId);
      return false;
    }

    if (this.currentEngagedId) {
      console.warn('[KeyboardEngineInteraction] Already engaged with another engine');
      return false;
    }

    // Update state
    engine.isEngaged = true;
    this.currentEngagedId = engineId;

    console.log('[KeyboardEngineInteraction] Engaged engine:', engineId);

    // Notify callback
    if (this.onEngage) {
      this.onEngage(engineId);
    }

    return true;
  }

  /**
   * Disengage the currently engaged engine
   */
  disengageCurrentEngine(): boolean {
    if (!this.currentEngagedId) {
      console.log('[KeyboardEngineInteraction] No engine currently engaged');
      return false;
    }

    const engineId = this.currentEngagedId;
    const engine = this.engines.get(engineId);

    if (engine) {
      engine.isEngaged = false;
    }

    this.currentEngagedId = null;

    console.log('[KeyboardEngineInteraction] Disengaged engine:', engineId);

    // Notify callback
    if (this.onDisengage) {
      this.onDisengage(engineId);
    }

    return true;
  }

  /**
   * Find the nearest unlocked engine
   */
  findNearestUnlockedEngine(): { engine: EngineInstance; distance: number } | null {
    let nearest: { engine: EngineInstance; distance: number } | null = null;
    let minDistance = Infinity;

    for (const engine of this.engines.values()) {
      if (engine.isLocked) continue;

      const distance = this.playerPosition.distanceTo(engine.position);

      if (distance < minDistance) {
        minDistance = distance;
        nearest = { engine, distance };
      }
    }

    return nearest;
  }

  /**
   * Register an engine for interaction
   */
  registerEngine(engine: EngineInstance): void {
    this.engines.set(engine.id, engine);
    console.log('[KeyboardEngineInteraction] Registered engine:', engine.id);
  }

  /**
   * Unregister an engine
   */
  unregisterEngine(engineId: string): void {
    // If this engine is currently engaged, disengage it
    if (this.currentEngagedId === engineId) {
      this.disengageCurrentEngine();
    }

    this.engines.delete(engineId);
    console.log('[KeyboardEngineInteraction] Unregistered engine:', engineId);
  }

  /**
   * Update engine state
   */
  updateEngine(engineId: string, updates: Partial<EngineInstance>): void {
    const engine = this.engines.get(engineId);
    if (!engine) return;

    Object.assign(engine, updates);

    // If engine became locked while engaged, disengage it
    if (updates.isLocked && this.currentEngagedId === engineId) {
      this.disengageCurrentEngine();
    }
  }

  /**
   * Update player position (call from useFrame)
   */
  updatePlayerPosition(position: THREE.Vector3): void {
    this.playerPosition.copy(position);

    // Update nearest engine tracking
    if (this.onNearestChange) {
      const nearest = this.findNearestUnlockedEngine();

      if (nearest && nearest.distance <= this.config.maxEngageDistance) {
        this.onNearestChange(nearest.engine.id, nearest.distance);
      } else {
        this.onNearestChange(null, Infinity);
      }
    }
  }

  /**
   * Set engagement callback
   */
  setOnEngage(callback: (engineId: string) => void): void {
    this.onEngage = callback;
  }

  /**
   * Set disengagement callback
   */
  setOnDisengage(callback: (engineId: string) => void): void {
    this.onDisengage = callback;
  }

  /**
   * Set nearest engine change callback
   */
  setOnNearestChange(callback: (engineId: string | null, distance: number) => void): void {
    this.onNearestChange = callback;
  }

  /**
   * Get currently engaged engine ID
   */
  getCurrentEngagedId(): string | null {
    return this.currentEngagedId;
  }

  /**
   * Get engine by ID
   */
  getEngine(engineId: string): EngineInstance | undefined {
    return this.engines.get(engineId);
  }

  /**
   * Get all engines
   */
  getAllEngines(): EngineInstance[] {
    return Array.from(this.engines.values());
  }

  /**
   * Get unlocked engines
   */
  getUnlockedEngines(): EngineInstance[] {
    return Array.from(this.engines.values()).filter(e => !e.isLocked);
  }

  /**
   * Check if an engine is engaged
   */
  isEngineEngaged(engineId: string): boolean {
    return this.currentEngagedId === engineId;
  }

  /**
   * Check if any engine is engaged
   */
  isAnyEngineEngaged(): boolean {
    return this.currentEngagedId !== null;
  }

  /**
   * Get nearest engine distance
   */
  getNearestEngineDistance(): number | null {
    const nearest = this.findNearestUnlockedEngine();
    return nearest ? nearest.distance : null;
  }

  /**
   * Get engagement hint text (for UI)
   */
  getEngagementHint(): string | null {
    if (!this.config.enableHints) return null;

    if (this.currentEngagedId) {
      const engine = this.engines.get(this.currentEngagedId);
      return engine ? `Engaged: ${engine.name} (Shift+E to disengage)` : null;
    }

    const nearest = this.findNearestUnlockedEngine();

    if (nearest && nearest.distance <= this.config.maxEngageDistance) {
      return `Press E to engage ${nearest.engine.name}`;
    }

    return null;
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.disengageCurrentEngine();
    this.engines.clear();
    this.playerPosition.set(0, 0, 0);
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    this.reset();
    this.onEngage = null;
    this.onDisengage = null;
    this.onNearestChange = null;
  }
}

// Export singleton instance
export const keyboardEngineInteraction = new KeyboardEngineInteraction();
