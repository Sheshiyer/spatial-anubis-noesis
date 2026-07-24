/**
 * PIP Data Smoothing Layer
 * P2-S3-18: Exponential moving average (EMA) smoothing over 10-frame window
 */

import { type PIPData, type SmoothedPIPData } from './types';

/** EMA smoothing configuration */
export interface EMAConfig {
  /** Window size in frames (default: 10) */
  windowSize: number;
  /** Smoothing factor (0-1, higher = more responsive) */
  alpha: number;
}

/** Default EMA configuration */
export const DEFAULT_EMA_CONFIG: EMAConfig = {
  windowSize: 10,
  alpha: 0.3,
};

/** PIP Data Smoother using exponential moving average */
export class PIPDataSmoother {
  private config: EMAConfig;
  private coherenceEMA = 0;
  private lqdEMA = 0;
  private entropyEMA = 0;
  private frameNumber = 0;
  private initialized = false;

  constructor(config: Partial<EMAConfig> = {}) {
    this.config = { ...DEFAULT_EMA_CONFIG, ...config };
  }

  /**
   * Apply EMA smoothing to PIP data
   * @param data Raw PIP data
   * @returns Smoothed PIP data
   */
  smooth(data: PIPData): SmoothedPIPData {
    const rawCoherence = data.coherence;
    const rawLqd = data.lqd;
    const rawEntropy = data.entropy;

    if (!this.initialized) {
      // Initialize EMA with first values
      this.coherenceEMA = rawCoherence;
      this.lqdEMA = rawLqd;
      this.entropyEMA = rawEntropy;
      this.initialized = true;
    } else {
      // Apply exponential moving average
      const alpha = this.config.alpha;
      this.coherenceEMA = alpha * rawCoherence + (1 - alpha) * this.coherenceEMA;
      this.lqdEMA = alpha * rawLqd + (1 - alpha) * this.lqdEMA;
      this.entropyEMA = alpha * rawEntropy + (1 - alpha) * this.entropyEMA;
    }

    this.frameNumber++;

    return {
      ...data,
      coherence: this.coherenceEMA,
      lqd: this.lqdEMA,
      entropy: this.entropyEMA,
      breathPhase: data.breathPhase,
      physicalCycle: data.physicalCycle,
      timestamp: data.timestamp,
      rawCoherence,
      rawLqd,
      rawEntropy,
      frameNumber: this.frameNumber,
    };
  }

  /** Reset the smoother */
  reset(): void {
    this.coherenceEMA = 0;
    this.lqdEMA = 0;
    this.entropyEMA = 0;
    this.frameNumber = 0;
    this.initialized = false;
  }

  /** Get current smoothing config */
  getConfig(): EMAConfig {
    return { ...this.config };
  }

  /** Update smoothing config */
  setConfig(config: Partial<EMAConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/** Multi-frame buffer smoother */
export class PIPBufferSmoother {
  private buffer: PIPData[] = [];
  private windowSize: number;

  constructor(windowSize = 10) {
    this.windowSize = windowSize;
  }

  /** Add data point and get smoothed value */
  smooth(data: PIPData): PIPData {
    this.buffer.push(data);
    
    if (this.buffer.length > this.windowSize) {
      this.buffer.shift();
    }

    // Calculate moving average
    const sum = this.buffer.reduce(
      (acc, d) => ({
        coherence: acc.coherence + d.coherence,
        lqd: acc.lqd + d.lqd,
        entropy: acc.entropy + d.entropy,
        breathPhase: acc.breathPhase + d.breathPhase,
        physicalCycle: acc.physicalCycle + d.physicalCycle,
        timestamp: acc.timestamp,
      }),
      { coherence: 0, lqd: 0, entropy: 0, breathPhase: 0, physicalCycle: 0, timestamp: data.timestamp }
    );

    const count = this.buffer.length;

    return {
      coherence: sum.coherence / count,
      lqd: sum.lqd / count,
      entropy: sum.entropy / count,
      breathPhase: sum.breathPhase / count,
      physicalCycle: sum.physicalCycle / count,
      timestamp: data.timestamp,
    };
  }

  /** Reset the buffer */
  reset(): void {
    this.buffer = [];
  }

  /** Check if buffer is full */
  isReady(): boolean {
    return this.buffer.length >= this.windowSize;
  }
}

/** Factory functions */
export function createPIPSmoother(config?: Partial<EMAConfig>): PIPDataSmoother {
  return new PIPDataSmoother(config);
}

export function createPIPBufferSmoother(windowSize = 10): PIPBufferSmoother {
  return new PIPBufferSmoother(windowSize);
}
