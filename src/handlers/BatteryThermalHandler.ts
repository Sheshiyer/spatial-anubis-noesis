/**
 * Battery & Thermal Handler
 * P4-S2: Battery level monitoring and thermal throttling
 *
 * Below 20% → medium tier
 * Below 10% → minimal tier
 * Thermal: repeated FPS drops → proactive quality reduction
 */

import { lowFpsHandler, type QualityTier } from './LowFpsHandler';

export interface BatteryState {
  level: number; // 0-1
  charging: boolean;
  chargingTime: number | null; // seconds
  dischargingTime: number | null; // seconds
}

export interface ThermalState {
  isThrottling: boolean;
  consecutiveFpsDrops: number;
  lastFpsDropTime: number | null;
  thermalTier: QualityTier | null;
}

export interface BatteryThermalHandlerOptions {
  mediumBatteryThreshold?: number; // 0-1
  minimalBatteryThreshold?: number; // 0-1
  fpsDropThreshold?: number;
  consecutiveDropsForThrottle?: number;
  dropWindowMs?: number;
  checkIntervalMs?: number;
}

const DEFAULT_OPTIONS: Required<BatteryThermalHandlerOptions> = {
  mediumBatteryThreshold: 0.20, // 20%
  minimalBatteryThreshold: 0.10, // 10%
  fpsDropThreshold: 45,
  consecutiveDropsForThrottle: 3,
  dropWindowMs: 5000, // 5 seconds
  checkIntervalMs: 5000, // Check battery every 5 seconds
};

export class BatteryThermalHandler {
  private static instance: BatteryThermalHandler | null = null;
  private options: Required<BatteryThermalHandlerOptions>;
  private batteryState: BatteryState | null = null;
  private thermalState: ThermalState;
  private isActive = false;
  private battery: any = null; // BatteryManager type
  private checkInterval: number | null = null;

  // Callbacks
  private batteryLowCallbacks: Array<(level: number, tier: QualityTier) => void> = [];
  private thermalThrottleCallbacks: Array<(tier: QualityTier) => void> = [];
  private batteryStateChangeCallbacks: Array<(state: BatteryState) => void> = [];

  private constructor(options: BatteryThermalHandlerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };

    this.thermalState = {
      isThrottling: false,
      consecutiveFpsDrops: 0,
      lastFpsDropTime: null,
      thermalTier: null,
    };
  }

  static getInstance(options?: BatteryThermalHandlerOptions): BatteryThermalHandler {
    if (!BatteryThermalHandler.instance) {
      BatteryThermalHandler.instance = new BatteryThermalHandler(options);
    }
    return BatteryThermalHandler.instance;
  }

  /**
   * Initialize and start monitoring
   */
  async init(): Promise<void> {
    if (this.isActive) {
      console.log('[BatteryThermalHandler] Already initialized');
      return;
    }

    this.isActive = true;

    // Try to get Battery API (only available in some browsers)
    if ('getBattery' in navigator) {
      try {
        this.battery = await (navigator as any).getBattery();
        this.updateBatteryState();

        // Set up battery event listeners
        this.battery.addEventListener('levelchange', () => this.updateBatteryState());
        this.battery.addEventListener('chargingchange', () => this.updateBatteryState());

        console.log('[BatteryThermalHandler] Battery API initialized');
      } catch (error) {
        console.warn('[BatteryThermalHandler] Battery API not available:', error);
      }
    } else {
      console.warn('[BatteryThermalHandler] Battery API not supported in this browser');
    }

    // Start periodic checks
    this.checkInterval = window.setInterval(() => {
      this.checkBatteryLevel();
    }, this.options.checkIntervalMs);

    console.log('[BatteryThermalHandler] Initialized');
  }

  /**
   * Update battery state from Battery API
   */
  private updateBatteryState(): void {
    if (!this.battery) return;

    this.batteryState = {
      level: this.battery.level,
      charging: this.battery.charging,
      chargingTime: this.battery.chargingTime,
      dischargingTime: this.battery.dischargingTime,
    };

    console.log('[BatteryThermalHandler] Battery state updated:', {
      level: `${(this.batteryState.level * 100).toFixed(0)}%`,
      charging: this.batteryState.charging,
    });

    // Notify listeners
    this.batteryStateChangeCallbacks.forEach(callback => {
      try {
        callback(this.batteryState!);
      } catch (error) {
        console.error('[BatteryThermalHandler] Battery state change callback error:', error);
      }
    });
  }

  /**
   * Check battery level and adjust quality
   */
  private checkBatteryLevel(): void {
    if (!this.batteryState || this.batteryState.charging) {
      return; // Don't throttle when charging
    }

    const level = this.batteryState.level;
    let targetTier: QualityTier | null = null;

    if (level <= this.options.minimalBatteryThreshold) {
      targetTier = 'minimal';
    } else if (level <= this.options.mediumBatteryThreshold) {
      targetTier = 'medium';
    }

    if (targetTier) {
      console.warn(`[BatteryThermalHandler] Low battery (${(level * 100).toFixed(0)}%), setting quality to ${targetTier}`);

      // Set quality tier
      lowFpsHandler.setQualityTier(targetTier);

      // Notify listeners
      this.batteryLowCallbacks.forEach(callback => {
        try {
          callback(level, targetTier!);
        } catch (error) {
          console.error('[BatteryThermalHandler] Battery low callback error:', error);
        }
      });
    }
  }

  /**
   * Report FPS drop for thermal monitoring
   */
  reportFpsDrop(fps: number): void {
    if (!this.isActive) return;

    if (fps < this.options.fpsDropThreshold) {
      const now = performance.now();

      // Check if this drop is within the window
      if (
        this.thermalState.lastFpsDropTime !== null &&
        now - this.thermalState.lastFpsDropTime > this.options.dropWindowMs
      ) {
        // Reset counter if too much time has passed
        this.thermalState.consecutiveFpsDrops = 0;
      }

      this.thermalState.consecutiveFpsDrops++;
      this.thermalState.lastFpsDropTime = now;

      console.warn(`[BatteryThermalHandler] FPS drop detected (${fps.toFixed(1)}fps), consecutive: ${this.thermalState.consecutiveFpsDrops}`);

      // Check if we should throttle
      if (
        !this.thermalState.isThrottling &&
        this.thermalState.consecutiveFpsDrops >= this.options.consecutiveDropsForThrottle
      ) {
        this.enterThermalThrottle();
      }
    } else {
      // FPS is good, reset thermal state
      if (this.thermalState.isThrottling && this.thermalState.consecutiveFpsDrops > 0) {
        this.thermalState.consecutiveFpsDrops--;

        if (this.thermalState.consecutiveFpsDrops === 0) {
          this.exitThermalThrottle();
        }
      }
    }
  }

  /**
   * Enter thermal throttling mode
   */
  private enterThermalThrottle(): void {
    console.warn('[BatteryThermalHandler] Entering thermal throttle mode');

    this.thermalState.isThrottling = true;

    // Proactively reduce quality by one tier
    const currentTier = lowFpsHandler.getCurrentTier();
    const tiers: QualityTier[] = ['full', 'medium', 'low', 'minimal'];
    const currentIndex = tiers.indexOf(currentTier);

    if (currentIndex < tiers.length - 1) {
      const newTier = tiers[currentIndex + 1] as QualityTier;
      this.thermalState.thermalTier = newTier;

      lowFpsHandler.setQualityTier(newTier);

      console.warn(`[BatteryThermalHandler] Thermal throttle: ${currentTier} → ${newTier}`);

      // Notify listeners
      this.thermalThrottleCallbacks.forEach(callback => {
        try {
          callback(newTier);
        } catch (error) {
          console.error('[BatteryThermalHandler] Thermal throttle callback error:', error);
        }
      });
    }
  }

  /**
   * Exit thermal throttling mode
   */
  private exitThermalThrottle(): void {
    console.log('[BatteryThermalHandler] Exiting thermal throttle mode');

    this.thermalState.isThrottling = false;
    this.thermalState.thermalTier = null;

    // Let LowFpsHandler handle quality upgrades naturally
  }

  /**
   * Get current battery state
   */
  getBatteryState(): BatteryState | null {
    return this.batteryState ? { ...this.batteryState } : null;
  }

  /**
   * Get thermal state
   */
  getThermalState(): ThermalState {
    return { ...this.thermalState };
  }

  /**
   * Check if battery API is available
   */
  isBatteryApiAvailable(): boolean {
    return this.battery !== null;
  }

  /**
   * Check if in thermal throttle mode
   */
  isInThermalThrottle(): boolean {
    return this.thermalState.isThrottling;
  }

  /**
   * Subscribe to battery low events
   */
  onBatteryLow(callback: (level: number, tier: QualityTier) => void): () => void {
    this.batteryLowCallbacks.push(callback);
    return () => {
      const index = this.batteryLowCallbacks.indexOf(callback);
      if (index !== -1) {
        this.batteryLowCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to thermal throttle events
   */
  onThermalThrottle(callback: (tier: QualityTier) => void): () => void {
    this.thermalThrottleCallbacks.push(callback);
    return () => {
      const index = this.thermalThrottleCallbacks.indexOf(callback);
      if (index !== -1) {
        this.thermalThrottleCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to battery state changes
   */
  onBatteryStateChange(callback: (state: BatteryState) => void): () => void {
    this.batteryStateChangeCallbacks.push(callback);
    return () => {
      const index = this.batteryStateChangeCallbacks.indexOf(callback);
      if (index !== -1) {
        this.batteryStateChangeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Reset thermal state
   */
  reset(): void {
    this.thermalState = {
      isThrottling: false,
      consecutiveFpsDrops: 0,
      lastFpsDropTime: null,
      thermalTier: null,
    };

    console.log('[BatteryThermalHandler] Reset');
  }

  /**
   * Clean up
   */
  destroy(): void {
    this.isActive = false;

    // Clear interval
    if (this.checkInterval !== null) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    // Remove battery event listeners
    if (this.battery) {
      // Note: BatteryManager doesn't have removeEventListener in TypeScript types
      // but it works in practice
      this.battery = null;
    }

    // Clear callbacks
    this.batteryLowCallbacks = [];
    this.thermalThrottleCallbacks = [];
    this.batteryStateChangeCallbacks = [];

    console.log('[BatteryThermalHandler] Destroyed');
  }
}

// Singleton export
export const batteryThermalHandler = BatteryThermalHandler.getInstance();
