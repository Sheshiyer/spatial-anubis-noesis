/**
 * Mock PIP (Psychophysiological Interface Protocol) data generator
 * P1-S1-16: Create mock PIP data generator
 * - Adjustable coherence, LQD, entropy, breath phase
 * - Output at 10Hz
 * - Debug controls for adjustment
 */

import { type PIPData, type PIPGeneratorConfig } from './types';

export interface MockPIPOptions {
  updateRateHz?: number;
  initialConfig?: Partial<PIPGeneratorConfig>;
}

export class MockPIPGenerator {
  private config: PIPGeneratorConfig;
  private updateRateHz: number;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private startTime: number = 0;
  private breathPhase = 0;
  private dataCallbacks: Array<(data: PIPData) => void> = [];
  private lastData: PIPData | null = null;

  constructor(options: MockPIPOptions = {}) {
    this.updateRateHz = options.updateRateHz ?? 10;
    this.config = {
      baseCoherence: 0.5,
      baseLqd: 0.5,
      baseEntropy: 0.3,
      breathRateHz: 0.167, // ~10 breaths per minute
      noiseLevel: 0.05,
      ...options.initialConfig,
    };
  }

  start(): void {
    if (this.intervalId !== null) {
      return;
    }

    this.startTime = performance.now();
    const intervalMs = 1000 / this.updateRateHz;

    this.intervalId = setInterval(() => {
      const data = this.generateData();
      this.lastData = data;
      this.dataCallbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error('Mock PIP callback error:', err);
        }
      });
    }, intervalMs);
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  isRunning(): boolean {
    return this.intervalId !== null;
  }

  onData(callback: (data: PIPData) => void): () => void {
    this.dataCallbacks.push(callback);
    return () => {
      const index = this.dataCallbacks.indexOf(callback);
      if (index !== -1) {
        this.dataCallbacks.splice(index, 1);
      }
    };
  }

  // Generate single data point (can be called manually)
  generateData(): PIPData {
    const now = performance.now();
    const elapsed = (now - this.startTime) / 1000;

    // Update breath phase (0-1 cycle)
    this.breathPhase = (Math.sin(elapsed * this.config.breathRateHz * 2 * Math.PI) + 1) / 2;

    // Coherence varies with breath phase and base level
    // Higher coherence during controlled breathing
    const breathCoherence = Math.sin(this.breathPhase * Math.PI); // Peak at middle of inhale
    const coherence = this.clampAndNoise(
      this.config.baseCoherence * 0.7 + breathCoherence * 0.3,
      0,
      1
    );

    // LQD (Local Qualitative Domain) - breath quality
    // Higher when breathing is smooth and rhythmic
    const lqd = this.clampAndNoise(
      this.config.baseLqd * 0.6 + breathCoherence * 0.4,
      0,
      1
    );

    // Entropy - signal complexity/noise
    // Inverse relationship with coherence
    const entropy = this.clampAndNoise(
      this.config.baseEntropy + (1 - coherence) * 0.3,
      0,
      1
    );

    return {
      coherence,
      lqd,
      entropy,
      breathPhase: this.breathPhase,
      timestamp: now,
    };
  }

  // Debug control methods
  setCoherence(value: number): void {
    this.config.baseCoherence = this.clamp(value, 0, 1);
  }

  setLQD(value: number): void {
    this.config.baseLqd = this.clamp(value, 0, 1);
  }

  setEntropy(value: number): void {
    this.config.baseEntropy = this.clamp(value, 0, 1);
  }

  setBreathRate(breathsPerMinute: number): void {
    this.config.breathRateHz = breathsPerMinute / 60;
  }

  setNoiseLevel(level: number): void {
    this.config.noiseLevel = this.clamp(level, 0, 1);
  }

  getConfig(): PIPGeneratorConfig {
    return { ...this.config };
  }

  getLastData(): PIPData | null {
    return this.lastData;
  }

  // Simulate a stress event (sudden entropy spike, coherence drop)
  simulateStressEvent(durationMs = 5000): void {
    const originalCoherence = this.config.baseCoherence;
    const originalEntropy = this.config.baseEntropy;

    // Drop coherence, spike entropy
    this.config.baseCoherence = 0.2;
    this.config.baseEntropy = 0.8;

    setTimeout(() => {
      this.config.baseCoherence = originalCoherence;
      this.config.baseEntropy = originalEntropy;
    }, durationMs);
  }

  // Simulate a calm state (high coherence, low entropy)
  simulateCalmState(durationMs = 5000): void {
    const originalCoherence = this.config.baseCoherence;
    const originalEntropy = this.config.baseEntropy;

    this.config.baseCoherence = 0.9;
    this.config.baseEntropy = 0.1;

    setTimeout(() => {
      this.config.baseCoherence = originalCoherence;
      this.config.baseEntropy = originalEntropy;
    }, durationMs);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private clampAndNoise(value: number, min: number, max: number): number {
    const noise = (Math.random() - 0.5) * 2 * this.config.noiseLevel;
    return this.clamp(value + noise, min, max);
  }
}

// Factory function
export function createMockPIPGenerator(options?: MockPIPOptions): MockPIPGenerator {
  return new MockPIPGenerator(options);
}

// Preset configurations for different states
export const PIP_PRESETS = {
  calm: {
    baseCoherence: 0.85,
    baseLqd: 0.8,
    baseEntropy: 0.15,
    breathRateHz: 0.1, // 6 breaths per minute
    noiseLevel: 0.02,
  },
  focused: {
    baseCoherence: 0.7,
    baseLqd: 0.6,
    baseEntropy: 0.3,
    breathRateHz: 0.167, // 10 breaths per minute
    noiseLevel: 0.05,
  },
  stressed: {
    baseCoherence: 0.3,
    baseLqd: 0.3,
    baseEntropy: 0.75,
    breathRateHz: 0.25, // 15 breaths per minute
    noiseLevel: 0.1,
  },
  chaotic: {
    baseCoherence: 0.15,
    baseLqd: 0.2,
    baseEntropy: 0.9,
    breathRateHz: 0.3, // 18 breaths per minute
    noiseLevel: 0.15,
  },
} as const satisfies Record<string, PIPGeneratorConfig>;
