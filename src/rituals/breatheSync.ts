/**
 * BREATHE-SYNC Attunement Timer
 * P2-S2-21: 3 breath cycles visual attunement
 */

/** BREATHE-SYNC states */
export type BreatheSyncState = 'idle' | 'attuning' | 'locked' | 'lost';

/** BREATHE-SYNC configuration */
export interface BreatheSyncConfig {
  /** Required breath cycles for lock */
  requiredCycles: number;
  /** Coherence threshold for attunement */
  coherenceThreshold: number;
  /** LQD threshold for attunement */
  lqdThreshold: number;
  /** Glow intensity per cycle (0-1) */
  glowPerCycle: number;
}

/** Default BREATHE-SYNC config */
export const DEFAULT_BREATHE_SYNC_CONFIG: BreatheSyncConfig = {
  requiredCycles: 3,
  coherenceThreshold: 70,
  lqdThreshold: 60,
  glowPerCycle: 0.33,
};

/** BREATHE-SYNC controller */
export class BreatheSyncController {
  private config: BreatheSyncConfig;
  private state: BreatheSyncState = 'idle';
  private completedCycles = 0;
  private currentGlow = 0;
  private attunementStartTime: number | null = null;
  private lastBreathPhase = 0;
  private isInhaling = false;
  private cycleStarted = false;

  // Tracking coherence during attunement
  private coherenceSum = 0;
  private coherenceSamples = 0;
  private lqdSum = 0;
  private lqdSamples = 0;

  constructor(config: Partial<BreatheSyncConfig> = {}) {
    this.config = { ...DEFAULT_BREATHE_SYNC_CONFIG, ...config };
  }

  /** Update with PIP data */
  update(breathPhase: number, coherence: number, lqd: number): BreatheSyncState {
    // Detect inhale/exhale
    const wasInhaling = this.isInhaling;
    this.isInhaling = breathPhase > 0.5;

    // Detect breath cycle completion (inhale -> exhale transition at peak)
    if (wasInhaling && !this.isInhaling && this.cycleStarted) {
      // Complete cycle
      this.completedCycles++;
      this.updateGlow();
      
      // Check if locked
      if (this.completedCycles >= this.config.requiredCycles) {
        this.state = 'locked';
        return this.state;
      }
    }

    // Start tracking when breath begins
    if (!this.cycleStarted && this.isInhaling && breathPhase > 0.2) {
      this.cycleStarted = true;
      if (this.state === 'idle') {
        this.state = 'attuning';
        this.attunementStartTime = Date.now();
      }
    }

    // Reset cycle tracking on exhale
    if (!this.isInhaling && breathPhase < 0.1) {
      this.cycleStarted = false;
    }

    // Track coherence and LQD
    if (this.state === 'attuning' || this.state === 'locked') {
      this.coherenceSum += coherence;
      this.coherenceSamples++;
      this.lqdSum += lqd;
      this.lqdSamples++;

      // Check if lost attunement
      const avgCoherence = this.coherenceSum / this.coherenceSamples;
      const avgLqd = this.lqdSum / this.lqdSamples;

      if (avgCoherence < this.config.coherenceThreshold ||
          avgLqd < this.config.lqdThreshold) {
        this.state = 'lost';
      }
    }

    this.lastBreathPhase = breathPhase;
    return this.state;
  }

  /** Get current state */
  getState(): BreatheSyncState {
    return this.state;
  }

  /** Get completed cycles */
  getCompletedCycles(): number {
    return this.completedCycles;
  }

  /** Get current glow intensity (0-1) */
  getGlow(): number {
    return this.currentGlow;
  }

  /** Get progress toward lock (0-1) */
  getProgress(): number {
    return this.completedCycles / this.config.requiredCycles;
  }

  /** Check if attunement is locked */
  isLocked(): boolean {
    return this.state === 'locked';
  }

  /** Get attunement quality metrics */
  getMetrics(): {
    avgCoherence: number;
    avgLqd: number;
    duration: number;
  } {
    const avgCoherence = this.coherenceSamples > 0 
      ? this.coherenceSum / this.coherenceSamples 
      : 0;
    const avgLqd = this.lqdSamples > 0 
      ? this.lqdSum / this.lqdSamples 
      : 0;
    const duration = this.attunementStartTime 
      ? (Date.now() - this.attunementStartTime) / 1000 
      : 0;

    return { avgCoherence, avgLqd, duration };
  }

  /** Reset controller */
  reset(): void {
    this.state = 'idle';
    this.completedCycles = 0;
    this.currentGlow = 0;
    this.attunementStartTime = null;
    this.lastBreathPhase = 0;
    this.isInhaling = false;
    this.cycleStarted = false;
    this.coherenceSum = 0;
    this.coherenceSamples = 0;
    this.lqdSum = 0;
    this.lqdSamples = 0;
  }

  /** Restart attunement */
  restart(): void {
    this.reset();
  }

  /** Update glow based on completed cycles */
  private updateGlow(): void {
    this.currentGlow = Math.min(1, this.completedCycles * this.config.glowPerCycle);
  }

  /** Get visual attunement data for rendering */
  getVisualData(): {
    glowIntensity: number;
    cycleProgress: number;
    isBreathing: boolean;
    state: BreatheSyncState;
    cyclesCompleted: number;
    cyclesRequired: number;
  } {
    return {
      glowIntensity: this.currentGlow,
      cycleProgress: this.getProgress(),
      isBreathing: this.cycleStarted,
      state: this.state,
      cyclesCompleted: this.completedCycles,
      cyclesRequired: this.config.requiredCycles,
    };
  }
}

/** BREATHE-SYNC visual timer component data */
export interface BreatheSyncVisualData {
  /** Progress ring fill (0-1) */
  ringProgress: number;
  /** Glow intensity for each cycle */
  cycleGlows: [number, number, number];
  /** Overall lock status */
  isLocked: boolean;
  /** Current breath phase for animation */
  breathPhase: number;
  /** Pulse intensity */
  pulseIntensity: number;
}

/** Calculate visual data for BREATHE-SYNC timer */
export function calculateBreatheSyncVisual(
  controller: BreatheSyncController,
  breathPhase: number
): BreatheSyncVisualData {
  const state = controller.getState();
  const progress = controller.getProgress();
  const glow = controller.getGlow();

  // Calculate individual cycle glows
  const cyclesCompleted = controller.getCompletedCycles();
  const cycleGlows: [number, number, number] = [
    cyclesCompleted > 0 ? 1 : glow * 3,
    cyclesCompleted > 1 ? 1 : cyclesCompleted === 1 ? (glow - 0.33) * 3 : 0,
    cyclesCompleted > 2 ? 1 : cyclesCompleted === 2 ? (glow - 0.66) * 3 : 0,
  ];

  // Pulse intensity based on breath phase
  const pulseIntensity = state === 'attuning' 
    ? 0.5 + Math.sin(breathPhase * Math.PI) * 0.5 
    : state === 'locked' ? 1 : 0.3;

  return {
    ringProgress: progress,
    cycleGlows,
    isLocked: state === 'locked',
    breathPhase,
    pulseIntensity,
  };
}

/** Factory function */
export function createBreatheSyncController(
  config?: Partial<BreatheSyncConfig>
): BreatheSyncController {
  return new BreatheSyncController(config);
}
