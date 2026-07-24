/**
 * BrowserCompatibility — Detection, feature probing, and polyfill system
 *
 * P4-S3-07: Browser detection (Chrome 100+, Safari 16+, Firefox 110+, mobile)
 * P4-S3-08: Feature detection (WebGL2, WebGPU, WASM, SharedArrayBuffer, etc.)
 * P4-S3-09: Safari WebGL2 quirks and workarounds
 * P4-S3-10: Mobile detection and GPU tier estimation
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BrowserName =
  | 'chrome'
  | 'safari'
  | 'firefox'
  | 'edge'
  | 'opera'
  | 'samsung'
  | 'unknown';

export type WarningSeverity = 'info' | 'warn' | 'error';

export interface CompatibilityWarning {
  readonly code: string;
  readonly severity: WarningSeverity;
  readonly message: string;
  readonly fix: string;
}

export interface FeatureSupport {
  readonly webgl2: boolean;
  readonly webgpu: boolean;
  readonly wasm: boolean;
  readonly sharedArrayBuffer: boolean;
  readonly offscreenCanvas: boolean;
  readonly webAudio: boolean;
  readonly webWorkers: boolean;
  readonly intersectionObserver: boolean;
  readonly resizeObserver: boolean;
  readonly pointerEvents: boolean;
  readonly touchEvents: boolean;
  readonly performanceObserver: boolean;
  readonly requestIdleCallback: boolean;
}

export type GPUTier = 'high' | 'mid' | 'low' | 'unknown';

export interface MobileInfo {
  readonly isMobile: boolean;
  readonly isTablet: boolean;
  readonly hasTouch: boolean;
  readonly screenWidth: number;
  readonly screenHeight: number;
  readonly devicePixelRatio: number;
  readonly gpuTier: GPUTier;
}

export interface SafariQuirk {
  readonly id: string;
  readonly description: string;
  readonly workaround: string;
  readonly apply: (gl: WebGL2RenderingContext | null) => void;
}

export interface BrowserReport {
  readonly browser: BrowserName;
  readonly version: number;
  readonly fullVersion: string;
  readonly features: FeatureSupport;
  readonly mobile: MobileInfo;
  readonly warnings: readonly CompatibilityWarning[];
  readonly safariQuirks: readonly SafariQuirk[];
  readonly isSupported: boolean;
  readonly timestamp: number;
}

export interface Polyfill {
  readonly name: string;
  readonly reason: string;
  readonly apply: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_BROWSER_VERSIONS: Record<string, number> = {
  chrome: 100,
  safari: 16,
  firefox: 110,
  edge: 100,
  opera: 86,
  samsung: 18,
} as const;

// ---------------------------------------------------------------------------
// Safari WebGL2 Quirks (P4-S3-09)
// ---------------------------------------------------------------------------

const SAFARI_QUIRKS: readonly SafariQuirk[] = [
  {
    id: 'safari-float-texture',
    description:
      'Safari has incomplete OES_texture_float support. Float textures may render black or produce artifacts.',
    workaround:
      'Use OES_texture_half_float (HALF_FLOAT) as a fallback for float textures.',
    apply: (_gl: WebGL2RenderingContext | null) => {
      // At runtime the renderer should check for this quirk and switch to
      // half-float textures when creating render targets.
      // This is a marker; the actual application happens in the rendering
      // pipeline when selecting texture internal formats.
    },
  },
  {
    id: 'safari-instanced-rendering-limit',
    description:
      'Safari WebGL2 becomes unstable with instanced draw calls exceeding ~1500 instances on Intel GPUs.',
    workaround:
      'Cap instance count to 1000 per draw call on Safari. Batch overflow into multiple calls.',
    apply: (_gl: WebGL2RenderingContext | null) => {
      // The instanced rendering module should read the browser report and
      // apply the 1000-instance ceiling when this quirk is present.
    },
  },
  {
    id: 'safari-msaa-limitation',
    description:
      'Safari MSAA (multisample anti-aliasing) causes significant performance regression and visual glitches on certain GPUs.',
    workaround:
      'Disable MSAA entirely on Safari. Use FXAA post-processing as an alternative anti-aliasing strategy.',
    apply: (_gl: WebGL2RenderingContext | null) => {
      // The renderer should disable antialias on the WebGL context config
      // and enable FXAA in the post-processing pass when this quirk is
      // present.
    },
  },
  {
    id: 'safari-uniform-buffer-alignment',
    description:
      'Safari requires strict 256-byte alignment for uniform buffer offsets, stricter than spec minimum.',
    workaround:
      'Pad uniform buffer bindings to 256-byte boundaries on Safari.',
    apply: (_gl: WebGL2RenderingContext | null) => {
      if (!_gl) return;
      // Query actual alignment to verify.  Safari often reports 256 here.
      const _alignment = _gl.getParameter(_gl.UNIFORM_BUFFER_OFFSET_ALIGNMENT);
      void _alignment;
    },
  },
] as const;

// ---------------------------------------------------------------------------
// Detection helpers
// ---------------------------------------------------------------------------

function parseUserAgent(): { browser: BrowserName; version: number; fullVersion: string } {
  if (typeof navigator === 'undefined') {
    return { browser: 'unknown', version: 0, fullVersion: '0' };
  }

  const ua = navigator.userAgent;

  // Order matters: Edge and Opera include "Chrome" in UA
  if (/Edg\/(\d+[\d.]*)/.test(ua)) {
    const match = ua.match(/Edg\/(\d+[\d.]*)/);
    const full = match?.[1] ?? '0';
    return { browser: 'edge', version: parseInt(full, 10), fullVersion: full };
  }

  if (/OPR\/(\d+[\d.]*)/.test(ua)) {
    const match = ua.match(/OPR\/(\d+[\d.]*)/);
    const full = match?.[1] ?? '0';
    return { browser: 'opera', version: parseInt(full, 10), fullVersion: full };
  }

  if (/SamsungBrowser\/(\d+[\d.]*)/.test(ua)) {
    const match = ua.match(/SamsungBrowser\/(\d+[\d.]*)/);
    const full = match?.[1] ?? '0';
    return { browser: 'samsung', version: parseInt(full, 10), fullVersion: full };
  }

  if (/Chrome\/(\d+[\d.]*)/.test(ua) && !/Edg/.test(ua)) {
    const match = ua.match(/Chrome\/(\d+[\d.]*)/);
    const full = match?.[1] ?? '0';
    return { browser: 'chrome', version: parseInt(full, 10), fullVersion: full };
  }

  if (/Version\/(\d+[\d.]*).*Safari/.test(ua)) {
    const match = ua.match(/Version\/(\d+[\d.]*)/);
    const full = match?.[1] ?? '0';
    return { browser: 'safari', version: parseInt(full, 10), fullVersion: full };
  }

  if (/Firefox\/(\d+[\d.]*)/.test(ua)) {
    const match = ua.match(/Firefox\/(\d+[\d.]*)/);
    const full = match?.[1] ?? '0';
    return { browser: 'firefox', version: parseInt(full, 10), fullVersion: full };
  }

  return { browser: 'unknown', version: 0, fullVersion: '0' };
}

function detectFeatures(): FeatureSupport {
  if (typeof window === 'undefined') {
    return {
      webgl2: false,
      webgpu: false,
      wasm: false,
      sharedArrayBuffer: false,
      offscreenCanvas: false,
      webAudio: false,
      webWorkers: false,
      intersectionObserver: false,
      resizeObserver: false,
      pointerEvents: false,
      touchEvents: false,
      performanceObserver: false,
      requestIdleCallback: false,
    };
  }

  // WebGL2 probe
  let webgl2 = false;
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('webgl2');
    webgl2 = ctx !== null;
  } catch {
    webgl2 = false;
  }

  // WebGPU probe
  const webgpu = 'gpu' in navigator;

  // WASM probe
  const wasm =
    typeof WebAssembly !== 'undefined' &&
    typeof WebAssembly.instantiate === 'function';

  // SharedArrayBuffer
  const sharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';

  // OffscreenCanvas
  const offscreenCanvas = typeof OffscreenCanvas !== 'undefined';

  // Web Audio
  const webAudio =
    typeof AudioContext !== 'undefined' ||
    typeof (window as unknown as Record<string, unknown>).webkitAudioContext !==
      'undefined';

  return {
    webgl2,
    webgpu,
    wasm,
    sharedArrayBuffer,
    offscreenCanvas,
    webAudio,
    webWorkers: typeof Worker !== 'undefined',
    intersectionObserver: typeof IntersectionObserver !== 'undefined',
    resizeObserver: typeof ResizeObserver !== 'undefined',
    pointerEvents: typeof PointerEvent !== 'undefined',
    touchEvents: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    performanceObserver: typeof PerformanceObserver !== 'undefined',
    requestIdleCallback: 'requestIdleCallback' in window,
  };
}

function estimateGPUTier(): GPUTier {
  if (typeof document === 'undefined') return 'unknown';

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!gl) return 'unknown';

    const debugExt = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugExt) return 'mid'; // Can't determine, assume mid

    const renderer = gl
      .getParameter(debugExt.UNMASKED_RENDERER_WEBGL)
      ?.toString()
      .toLowerCase() ?? '';

    // High-end discrete GPUs
    if (
      /nvidia geforce (rtx|gtx [12]\d{3})/i.test(renderer) ||
      /radeon rx [67]\d{3}/i.test(renderer) ||
      /apple m[2-9]/i.test(renderer) ||
      /apple gpu/i.test(renderer)
    ) {
      return 'high';
    }

    // Mid-range
    if (
      /nvidia geforce/i.test(renderer) ||
      /radeon/i.test(renderer) ||
      /apple m1/i.test(renderer) ||
      /intel iris/i.test(renderer) ||
      /intel.*xe/i.test(renderer)
    ) {
      return 'mid';
    }

    // Integrated / mobile
    if (
      /intel (hd|uhd)/i.test(renderer) ||
      /adreno/i.test(renderer) ||
      /mali/i.test(renderer) ||
      /powervr/i.test(renderer) ||
      /swiftshader/i.test(renderer)
    ) {
      return 'low';
    }

    return 'mid';
  } catch {
    return 'unknown';
  }
}

function detectMobile(): MobileInfo {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      isMobile: false,
      isTablet: false,
      hasTouch: false,
      screenWidth: 0,
      screenHeight: 0,
      devicePixelRatio: 1,
      gpuTier: 'unknown',
    };
  }

  const ua = navigator.userAgent;
  const hasTouch =
    'ontouchstart' in window || navigator.maxTouchPoints > 0;

  const width = window.screen?.width ?? window.innerWidth;
  const height = window.screen?.height ?? window.innerHeight;
  const shortSide = Math.min(width, height);
  const longSide = Math.max(width, height);

  const mobileUA = /Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const tabletUA = /iPad|Android(?!.*Mobile)/i.test(ua);

  // Heuristic: tablets are touch devices with short side >= 600px
  const isTablet =
    tabletUA || (hasTouch && shortSide >= 600 && longSide >= 900);
  const isMobile = mobileUA || (hasTouch && shortSide < 600);

  return {
    isMobile,
    isTablet,
    hasTouch,
    screenWidth: width,
    screenHeight: height,
    devicePixelRatio: window.devicePixelRatio ?? 1,
    gpuTier: estimateGPUTier(),
  };
}

// ---------------------------------------------------------------------------
// Warnings
// ---------------------------------------------------------------------------

function buildWarnings(
  browser: BrowserName,
  version: number,
  features: FeatureSupport,
  mobile: MobileInfo,
): CompatibilityWarning[] {
  const warnings: CompatibilityWarning[] = [];

  // Browser version check
  const minVersion = MIN_BROWSER_VERSIONS[browser];
  if (minVersion !== undefined && version < minVersion && version > 0) {
    warnings.push({
      code: 'BROWSER_VERSION_LOW',
      severity: 'error',
      message: `${browser} ${version} is below the minimum supported version (${minVersion}+).`,
      fix: `Please update ${browser} to version ${minVersion} or newer.`,
    });
  }

  if (browser === 'unknown') {
    warnings.push({
      code: 'BROWSER_UNKNOWN',
      severity: 'warn',
      message: 'Could not identify your browser. Some features may not work correctly.',
      fix: 'For the best experience, use Chrome 100+, Safari 16+, or Firefox 110+.',
    });
  }

  // Required features
  if (!features.webgl2) {
    warnings.push({
      code: 'NO_WEBGL2',
      severity: 'error',
      message: 'WebGL 2 is not available. The 3D experience cannot run without it.',
      fix: 'Enable hardware acceleration in your browser settings, or update your browser and graphics drivers.',
    });
  }

  if (!features.wasm) {
    warnings.push({
      code: 'NO_WASM',
      severity: 'error',
      message: 'WebAssembly is not supported. Physics and segmentation will not function.',
      fix: 'Update your browser to a version that supports WebAssembly.',
    });
  }

  if (!features.webAudio) {
    warnings.push({
      code: 'NO_WEB_AUDIO',
      severity: 'warn',
      message: 'Web Audio API is not available. Audio features will be disabled.',
      fix: 'Update your browser to enable audio support.',
    });
  }

  // Optional but recommended
  if (!features.sharedArrayBuffer) {
    warnings.push({
      code: 'NO_SHARED_ARRAY_BUFFER',
      severity: 'info',
      message:
        'SharedArrayBuffer is not available. Multi-threaded WASM will fall back to single-threaded mode.',
      fix: 'Ensure the page is served with COOP/COEP headers to enable SharedArrayBuffer.',
    });
  }

  if (!features.offscreenCanvas) {
    warnings.push({
      code: 'NO_OFFSCREEN_CANVAS',
      severity: 'info',
      message: 'OffscreenCanvas is not supported. Canvas operations will remain on the main thread.',
      fix: 'Use a Chromium-based browser for OffscreenCanvas support.',
    });
  }

  // Mobile warnings
  if (mobile.isMobile && mobile.gpuTier === 'low') {
    warnings.push({
      code: 'MOBILE_LOW_GPU',
      severity: 'warn',
      message: 'Low-tier mobile GPU detected. Visual quality may be reduced.',
      fix: 'For the full experience, use a desktop or high-end mobile device.',
    });
  }

  if (mobile.isMobile && mobile.screenWidth < 360) {
    warnings.push({
      code: 'SCREEN_TOO_SMALL',
      severity: 'warn',
      message: 'Screen width is below 360px. Layout may not display correctly.',
      fix: 'Use a device with a larger screen for the best experience.',
    });
  }

  return warnings;
}

// ---------------------------------------------------------------------------
// Polyfills
// ---------------------------------------------------------------------------

export function getPolyfills(): readonly Polyfill[] {
  if (typeof window === 'undefined') return [];

  const polyfills: Polyfill[] = [];

  if (!('requestIdleCallback' in window)) {
    polyfills.push({
      name: 'requestIdleCallback',
      reason: 'requestIdleCallback is not natively supported.',
      apply: () => {
        (window as unknown as Record<string, unknown>).requestIdleCallback =
          function requestIdleCallbackPolyfill(
            cb: IdleRequestCallback,
            _options?: IdleRequestOptions,
          ) {
            const start = Date.now();
            return window.setTimeout(() => {
              cb({
                didTimeout: false,
                timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
              });
            }, 1);
          };

        (window as unknown as Record<string, unknown>).cancelIdleCallback =
          function cancelIdleCallbackPolyfill(id: number) {
            clearTimeout(id);
          };
      },
    });
  }

  if (typeof (window as unknown as Record<string, unknown>).webkitAudioContext !== 'undefined' && typeof AudioContext === 'undefined') {
    polyfills.push({
      name: 'AudioContext',
      reason: 'AudioContext requires webkit prefix in this browser.',
      apply: () => {
        (window as unknown as Record<string, unknown>).AudioContext =
          (window as unknown as Record<string, unknown>).webkitAudioContext;
      },
    });
  }

  return polyfills;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Detect the current browser name, version, and full version string.
 */
export function detectBrowser(): {
  browser: BrowserName;
  version: number;
  fullVersion: string;
} {
  return parseUserAgent();
}

/**
 * Run the full compatibility check and return a BrowserReport.
 * This performs feature detection, Safari quirk identification, mobile
 * detection, GPU tier estimation, and produces actionable warnings.
 */
export function checkCompatibility(): BrowserReport {
  const { browser, version, fullVersion } = parseUserAgent();
  const features = detectFeatures();
  const mobile = detectMobile();
  const warnings = buildWarnings(browser, version, features, mobile);

  // Attach Safari quirks when relevant
  const safariQuirks: SafariQuirk[] =
    browser === 'safari' ? [...SAFARI_QUIRKS] : [];

  // The experience is supported if WebGL2 is available and the browser
  // version meets the minimum (or is unknown, giving benefit of the doubt).
  const meetsVersion =
    browser === 'unknown' ||
    version >= (MIN_BROWSER_VERSIONS[browser] ?? 0);

  const isSupported = features.webgl2 && meetsVersion;

  return {
    browser,
    version,
    fullVersion,
    features,
    mobile,
    warnings,
    safariQuirks,
    isSupported,
    timestamp: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

/** Lazily computed singleton compatibility report */
class BrowserCompatSingleton {
  private _report: BrowserReport | null = null;
  private _polyfillsApplied = false;

  /** Get the cached compatibility report, or compute it on first access. */
  get report(): BrowserReport {
    if (this._report === null) {
      this._report = checkCompatibility();
    }
    return this._report;
  }

  /** Force a fresh detection (e.g. after polyfills are applied). */
  refresh(): BrowserReport {
    this._report = checkCompatibility();
    return this._report;
  }

  /** Apply all available polyfills once. Returns the names applied. */
  applyPolyfills(): readonly string[] {
    if (this._polyfillsApplied) return [];
    this._polyfillsApplied = true;

    const polyfills = getPolyfills();
    const applied: string[] = [];

    for (const p of polyfills) {
      try {
        p.apply();
        applied.push(p.name);
      } catch (err) {
        console.warn(`[compat] Failed to apply polyfill "${p.name}":`, err);
      }
    }

    // Refresh the report so feature flags reflect polyfills
    if (applied.length > 0) {
      this.refresh();
    }

    return applied;
  }

  /** True when the minimum set of features required to run is present. */
  get isSupported(): boolean {
    return this.report.isSupported;
  }

  /** True when Safari-specific quirks need to be accounted for. */
  get hasSafariQuirks(): boolean {
    return this.report.safariQuirks.length > 0;
  }

  /** Max instance count safe for instanced rendering on this browser. */
  get maxInstanceCount(): number {
    return this.report.browser === 'safari' ? 1000 : 10000;
  }

  /** Whether MSAA should be disabled in favor of FXAA. */
  get shouldDisableMSAA(): boolean {
    return this.report.browser === 'safari';
  }

  /** Whether float textures should fall back to half-float. */
  get useHalfFloatTextures(): boolean {
    return this.report.browser === 'safari';
  }
}

/**
 * Singleton browser compatibility instance.
 * Access `browserCompat.report` for the full detection result, or use
 * convenience getters like `browserCompat.isSupported`.
 */
export const browserCompat = new BrowserCompatSingleton();
