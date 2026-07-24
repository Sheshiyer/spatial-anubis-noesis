/**
 * MobileSplatBudget — Performance budget for mobile devices
 * P4-S2-03: Mobile performance optimization
 *
 * Adaptive quality settings for mobile devices:
 * - 50% of desktop splat count (250k max vs 500k)
 * - Reduced LOD levels
 * - Lower shadow resolution
 * - Simplified post-processing
 *
 * Detection criteria:
 * - Screen size (< 768px width)
 * - Touch support
 * - User agent hints
 * - Performance metrics
 */

// ============================================================================
// Quality Presets
// ============================================================================

export interface QualityConfig {
  // Gaussian Splat rendering
  maxSplatCount: number;
  splatQuality: 'low' | 'medium' | 'high';

  // Level of Detail
  lodLevels: number;
  lodDistanceMultiplier: number;

  // Shadows
  shadowMapSize: number;
  enableShadows: boolean;

  // Post-processing
  bloomEnabled: boolean;
  bloomIntensity: number;
  ssaoEnabled: boolean;
  antialiasing: boolean;

  // Performance
  pixelRatio: number;
  targetFPS: number;

  // Textures
  maxTextureSize: number;
  textureAnisotropy: number;
}

export const DESKTOP_QUALITY: QualityConfig = {
  maxSplatCount: 500_000,
  splatQuality: 'high',

  lodLevels: 4,
  lodDistanceMultiplier: 1.0,

  shadowMapSize: 2048,
  enableShadows: true,

  bloomEnabled: true,
  bloomIntensity: 1.0,
  ssaoEnabled: true,
  antialiasing: true,

  pixelRatio: Math.min(window.devicePixelRatio, 2),
  targetFPS: 60,

  maxTextureSize: 2048,
  textureAnisotropy: 4,
};

export const MOBILE_QUALITY: QualityConfig = {
  maxSplatCount: 250_000,
  splatQuality: 'medium',

  lodLevels: 3,
  lodDistanceMultiplier: 0.7,

  shadowMapSize: 1024,
  enableShadows: false,

  bloomEnabled: true,
  bloomIntensity: 0.5,
  ssaoEnabled: false,
  antialiasing: false,

  pixelRatio: Math.min(window.devicePixelRatio, 1.5),
  targetFPS: 30,

  maxTextureSize: 1024,
  textureAnisotropy: 2,
};

export const LOW_END_MOBILE_QUALITY: QualityConfig = {
  maxSplatCount: 100_000,
  splatQuality: 'low',

  lodLevels: 2,
  lodDistanceMultiplier: 0.5,

  shadowMapSize: 512,
  enableShadows: false,

  bloomEnabled: false,
  bloomIntensity: 0,
  ssaoEnabled: false,
  antialiasing: false,

  pixelRatio: 1,
  targetFPS: 30,

  maxTextureSize: 512,
  textureAnisotropy: 1,
};

// ============================================================================
// Device Detection
// ============================================================================

export type DeviceTier = 'desktop' | 'mobile' | 'low-end-mobile';

export interface DeviceCapabilities {
  tier: DeviceTier;
  isMobile: boolean;
  hasTouch: boolean;
  screenSize: { width: number; height: number };
  pixelRatio: number;
  cores: number;
  memory: number | null;
  gpu: string | null;
}

/**
 * Detect device capabilities and performance tier
 */
export function detectDeviceCapabilities(): DeviceCapabilities {
  const isMobile = detectMobile();
  const hasTouch = detectTouch();
  const screenSize = {
    width: window.innerWidth,
    height: window.innerHeight,
  };
  const pixelRatio = window.devicePixelRatio || 1;

  // Detect CPU cores
  const cores = (navigator as any).hardwareConcurrency || 4;

  // Detect memory (if available)
  const memory = (navigator as any).deviceMemory || null;

  // Detect GPU (if available)
  const gpu = detectGPU();

  // Determine tier
  let tier: DeviceTier = 'desktop';

  if (isMobile) {
    // Low-end mobile criteria
    if (
      memory !== null && memory < 4 || // Less than 4GB RAM
      cores < 4 ||                     // Less than 4 cores
      screenSize.width < 375 ||        // Very small screen
      gpu?.toLowerCase().includes('adreno 5') || // Older Adreno GPU
      gpu?.toLowerCase().includes('mali-t')      // Older Mali GPU
    ) {
      tier = 'low-end-mobile';
    } else {
      tier = 'mobile';
    }
  }

  return {
    tier,
    isMobile,
    hasTouch,
    screenSize,
    pixelRatio,
    cores,
    memory,
    gpu,
  };
}

/**
 * Detect if device is mobile
 */
function detectMobile(): boolean {
  // Check screen size
  if (window.innerWidth < 768) {
    return true;
  }

  // Check user agent
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = [
    'android',
    'webos',
    'iphone',
    'ipad',
    'ipod',
    'blackberry',
    'windows phone',
  ];

  return mobileKeywords.some(keyword => userAgent.includes(keyword));
}

/**
 * Detect touch support
 */
function detectTouch(): boolean {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  );
}

/**
 * Detect GPU vendor/model (if available)
 */
function detectGPU(): string | null {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (!gl) return null;

    const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return null;

    const renderer = (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    return renderer;
  } catch {
    return null;
  }
}

// ============================================================================
// Quality Manager
// ============================================================================

export class MobileSplatBudget {
  private capabilities: DeviceCapabilities;
  private currentConfig: QualityConfig;
  private isAdaptive: boolean = true;

  // Performance monitoring
  private frameTimeSamples: number[] = [];
  private maxSamples = 60;

  constructor(forceQuality?: QualityConfig) {
    this.capabilities = detectDeviceCapabilities();

    if (forceQuality) {
      this.currentConfig = forceQuality;
      this.isAdaptive = false;
    } else {
      this.currentConfig = this.selectQualityForDevice();
    }

    console.log('[MobileSplatBudget] Device capabilities:', this.capabilities);
    console.log('[MobileSplatBudget] Selected quality:', this.currentConfig);
  }

  /**
   * Select quality preset based on device capabilities
   */
  private selectQualityForDevice(): QualityConfig {
    switch (this.capabilities.tier) {
      case 'desktop':
        return { ...DESKTOP_QUALITY };
      case 'mobile':
        return { ...MOBILE_QUALITY };
      case 'low-end-mobile':
        return { ...LOW_END_MOBILE_QUALITY };
    }
  }

  /**
   * Get current quality configuration
   */
  getConfig(): QualityConfig {
    return { ...this.currentConfig };
  }

  /**
   * Get device capabilities
   */
  getCapabilities(): DeviceCapabilities {
    return { ...this.capabilities };
  }

  /**
   * Check if device is mobile
   */
  isMobile(): boolean {
    return this.capabilities.isMobile;
  }

  /**
   * Check if device is low-end
   */
  isLowEnd(): boolean {
    return this.capabilities.tier === 'low-end-mobile';
  }

  /**
   * Update frame time for adaptive quality
   */
  recordFrameTime(deltaMs: number): void {
    if (!this.isAdaptive) return;

    this.frameTimeSamples.push(deltaMs);

    if (this.frameTimeSamples.length > this.maxSamples) {
      this.frameTimeSamples.shift();
    }

    // Check if we should adjust quality every 60 frames
    if (this.frameTimeSamples.length === this.maxSamples) {
      this.adaptQuality();
    }
  }

  /**
   * Adapt quality based on performance metrics
   */
  private adaptQuality(): void {
    const avgFrameTime = this.frameTimeSamples.reduce((a, b) => a + b, 0) / this.frameTimeSamples.length;
    const avgFPS = 1000 / avgFrameTime;
    const targetFPS = this.currentConfig.targetFPS;

    // If we're significantly below target FPS, reduce quality
    if (avgFPS < targetFPS * 0.8) {
      console.warn('[MobileSplatBudget] Performance below target, reducing quality');
      this.reduceQuality();
    }

    // If we're well above target FPS, we could increase quality
    // (but be conservative to avoid oscillation)
    if (avgFPS > targetFPS * 1.3 && this.capabilities.tier !== 'desktop') {
      console.log('[MobileSplatBudget] Performance above target, could increase quality');
      // Uncomment to enable auto-upgrade:
      // this.increaseQuality();
    }

    // Clear samples
    this.frameTimeSamples = [];
  }

  /**
   * Reduce quality settings
   */
  private reduceQuality(): void {
    const config = this.currentConfig;

    // Reduce splat count by 25%
    if (config.maxSplatCount > 50_000) {
      config.maxSplatCount = Math.floor(config.maxSplatCount * 0.75);
    }

    // Disable features progressively
    if (config.ssaoEnabled) {
      config.ssaoEnabled = false;
    } else if (config.bloomEnabled) {
      config.bloomIntensity *= 0.5;
      if (config.bloomIntensity < 0.2) {
        config.bloomEnabled = false;
      }
    } else if (config.antialiasing) {
      config.antialiasing = false;
    } else if (config.lodLevels > 1) {
      config.lodLevels--;
    }

    console.log('[MobileSplatBudget] Quality reduced:', config);
  }

  /**
   * Increase quality settings (conservative)
   */
  private increaseQuality(): void {
    const config = this.currentConfig;
    const targetTier = this.capabilities.tier === 'low-end-mobile' ? MOBILE_QUALITY : DESKTOP_QUALITY;

    // Increase splat count by 20% (up to target)
    if (config.maxSplatCount < targetTier.maxSplatCount) {
      config.maxSplatCount = Math.min(
        Math.floor(config.maxSplatCount * 1.2),
        targetTier.maxSplatCount
      );
    }

    // Re-enable features progressively
    if (!config.bloomEnabled && targetTier.bloomEnabled) {
      config.bloomEnabled = true;
      config.bloomIntensity = 0.3;
    } else if (config.lodLevels < targetTier.lodLevels) {
      config.lodLevels++;
    }

    console.log('[MobileSplatBudget] Quality increased:', config);
  }

  /**
   * Manually set quality config
   */
  setConfig(config: Partial<QualityConfig>): void {
    this.currentConfig = { ...this.currentConfig, ...config };
    this.isAdaptive = false;
  }

  /**
   * Enable/disable adaptive quality
   */
  setAdaptive(adaptive: boolean): void {
    this.isAdaptive = adaptive;
  }

  /**
   * Reset to device default quality
   */
  reset(): void {
    this.currentConfig = this.selectQualityForDevice();
    this.isAdaptive = true;
    this.frameTimeSamples = [];
  }
}

// Export singleton instance
export const mobileSplatBudget = new MobileSplatBudget();
