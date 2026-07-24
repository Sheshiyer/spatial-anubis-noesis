/**
 * Low FPS Handler
 * P4-S2: Auto degradation when FPS < 45fps for 3+ seconds
 *
 * Quality tiers: full → medium → low → minimal
 * Each tier reduces particles, shadows, post-processing, LOD
 */

import { FPSMonitor, createFPSMonitor } from '../bio/fpsMonitor';

export type QualityTier = 'full' | 'medium' | 'low' | 'minimal';

export interface QualitySettings {
  tier: QualityTier;
  particleCount: number;
  particleQuality: number;
  shadowsEnabled: boolean;
  shadowMapSize: number;
  postProcessing: boolean;
  antialias: boolean;
  pixelRatio: number;
  lodDistance: number;
  maxLights: number;
}

export interface LowFpsHandlerOptions {
  targetFps?: number;
  degradeThreshold?: number;
  degradeWindowMs?: number;
  upgradeThreshold?: number;
  upgradeWindowMs?: number;
}

const DEFAULT_OPTIONS: Required<LowFpsHandlerOptions> = {
  targetFps: 60,
  degradeThreshold: 45,
  degradeWindowMs: 3000,
  upgradeThreshold: 55,
  upgradeWindowMs: 5000,
};

const QUALITY_PRESETS: Record<QualityTier, QualitySettings> = {
  full: {
    tier: 'full',
    particleCount: 10000,
    particleQuality: 1.0,
    shadowsEnabled: true,
    shadowMapSize: 2048,
    postProcessing: true,
    antialias: true,
    pixelRatio: Math.min(window.devicePixelRatio, 2),
    lodDistance: 100,
    maxLights: 8,
  },
  medium: {
    tier: 'medium',
    particleCount: 5000,
    particleQuality: 0.75,
    shadowsEnabled: true,
    shadowMapSize: 1024,
    postProcessing: true,
    antialias: true,
    pixelRatio: 1.5,
    lodDistance: 75,
    maxLights: 4,
  },
  low: {
    tier: 'low',
    particleCount: 2000,
    particleQuality: 0.5,
    shadowsEnabled: false,
    shadowMapSize: 512,
    postProcessing: false,
    antialias: false,
    pixelRatio: 1,
    lodDistance: 50,
    maxLights: 2,
  },
  minimal: {
    tier: 'minimal',
    particleCount: 500,
    particleQuality: 0.25,
    shadowsEnabled: false,
    shadowMapSize: 256,
    postProcessing: false,
    antialias: false,
    pixelRatio: 1,
    lodDistance: 25,
    maxLights: 1,
  },
};

export class LowFpsHandler {
  private static instance: LowFpsHandler | null = null;
  private fpsMonitor: FPSMonitor;
  private currentTier: QualityTier = 'full';
  private options: Required<LowFpsHandlerOptions>;
  private lowFpsStartTime: number | null = null;
  private highFpsStartTime: number | null = null;
  private qualityChangeCallbacks: Array<(settings: QualitySettings) => void> = [];
  private isActive = false;

  private constructor(options: LowFpsHandlerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };

    this.fpsMonitor = createFPSMonitor({
      targetFPS: this.options.targetFps,
      warningThreshold: this.options.degradeThreshold,
      onWarning: (fps) => {
        console.warn('[LowFpsHandler] FPS warning:', fps);
      },
      onRecovery: (fps) => {
        console.log('[LowFpsHandler] FPS recovered:', fps);
      },
    });
  }

  static getInstance(options?: LowFpsHandlerOptions): LowFpsHandler {
    if (!LowFpsHandler.instance) {
      LowFpsHandler.instance = new LowFpsHandler(options);
    }
    return LowFpsHandler.instance;
  }

  /**
   * Initialize and start monitoring
   */
  init(): void {
    if (this.isActive) {
      console.log('[LowFpsHandler] Already initialized');
      return;
    }

    this.isActive = true;
    this.currentTier = 'full';
    console.log('[LowFpsHandler] Initialized with tier:', this.currentTier);
  }

  /**
   * Update FPS monitoring (call every frame)
   */
  tick(): void {
    if (!this.isActive) return;

    const stats = this.fpsMonitor.tick();
    const now = performance.now();

    // Check for degradation
    if (stats.currentFPS < this.options.degradeThreshold) {
      if (this.lowFpsStartTime === null) {
        this.lowFpsStartTime = now;
      } else {
        const lowFpsDuration = now - this.lowFpsStartTime;

        if (lowFpsDuration >= this.options.degradeWindowMs) {
          this.degradeQuality();
          this.lowFpsStartTime = null;
        }
      }

      // Reset high FPS timer
      this.highFpsStartTime = null;

    } else if (stats.currentFPS >= this.options.upgradeThreshold) {
      // Check for upgrade
      if (this.highFpsStartTime === null) {
        this.highFpsStartTime = now;
      } else {
        const highFpsDuration = now - this.highFpsStartTime;

        if (highFpsDuration >= this.options.upgradeWindowMs) {
          this.upgradeQuality();
          this.highFpsStartTime = null;
        }
      }

      // Reset low FPS timer
      this.lowFpsStartTime = null;

    } else {
      // FPS is in acceptable range
      this.lowFpsStartTime = null;
      this.highFpsStartTime = null;
    }
  }

  /**
   * Degrade quality tier
   */
  private degradeQuality(): void {
    const tiers: QualityTier[] = ['full', 'medium', 'low', 'minimal'];
    const currentIndex = tiers.indexOf(this.currentTier);

    if (currentIndex < tiers.length - 1) {
      this.setQualityTier(tiers[currentIndex + 1] as QualityTier);
      console.warn('[LowFpsHandler] Degraded quality to:', this.currentTier);
    } else {
      console.warn('[LowFpsHandler] Already at minimal quality');
    }
  }

  /**
   * Upgrade quality tier
   */
  private upgradeQuality(): void {
    const tiers: QualityTier[] = ['full', 'medium', 'low', 'minimal'];
    const currentIndex = tiers.indexOf(this.currentTier);

    if (currentIndex > 0) {
      this.setQualityTier(tiers[currentIndex - 1] as QualityTier);
      console.log('[LowFpsHandler] Upgraded quality to:', this.currentTier);
    } else {
      console.log('[LowFpsHandler] Already at full quality');
    }
  }

  /**
   * Manually set quality tier
   */
  setQualityTier(tier: QualityTier): void {
    if (this.currentTier === tier) return;

    this.currentTier = tier;
    const settings = this.getQualitySettings();

    // Notify listeners
    this.qualityChangeCallbacks.forEach(callback => {
      try {
        callback(settings);
      } catch (error) {
        console.error('[LowFpsHandler] Quality change callback error:', error);
      }
    });

    console.log('[LowFpsHandler] Quality tier set to:', tier);
  }

  /**
   * Get current quality settings
   */
  getQualitySettings(): QualitySettings {
    return { ...QUALITY_PRESETS[this.currentTier] };
  }

  /**
   * Get current quality tier
   */
  getCurrentTier(): QualityTier {
    return this.currentTier;
  }

  /**
   * Get FPS stats
   */
  getFpsStats() {
    return this.fpsMonitor.getStats();
  }

  /**
   * Subscribe to quality changes
   */
  onQualityChange(callback: (settings: QualitySettings) => void): () => void {
    this.qualityChangeCallbacks.push(callback);

    // Immediately call with current settings
    try {
      callback(this.getQualitySettings());
    } catch (error) {
      console.error('[LowFpsHandler] Initial quality callback error:', error);
    }

    // Return unsubscribe function
    return () => {
      const index = this.qualityChangeCallbacks.indexOf(callback);
      if (index !== -1) {
        this.qualityChangeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Reset to full quality
   */
  reset(): void {
    this.currentTier = 'full';
    this.lowFpsStartTime = null;
    this.highFpsStartTime = null;
    this.fpsMonitor.reset();
    console.log('[LowFpsHandler] Reset to full quality');
  }

  /**
   * Clean up
   */
  destroy(): void {
    this.isActive = false;
    this.qualityChangeCallbacks = [];
    this.fpsMonitor.reset();
    console.log('[LowFpsHandler] Destroyed');
  }
}

// Singleton export
export const lowFpsHandler = LowFpsHandler.getInstance();

// Helper function to apply quality settings to renderer
export function applyQualitySettings(
  renderer: THREE.WebGLRenderer,
  settings: QualitySettings
): void {
  renderer.setPixelRatio(settings.pixelRatio);
  renderer.shadowMap.enabled = settings.shadowsEnabled;

  if (settings.shadowsEnabled && renderer.shadowMap.type) {
    // Adjust shadow map size based on quality
    console.log('[LowFpsHandler] Shadow map size:', settings.shadowMapSize);
  }

  console.log('[LowFpsHandler] Applied quality settings:', settings.tier);
}
