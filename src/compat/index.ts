/**
 * Compat module -- Browser compatibility, performance monitoring, and resilience
 *
 * P4-S3: Browser compatibility detection, Lighthouse config, WASM UX,
 *         sustained load monitoring, CDN validation
 */

// Browser compatibility detection and polyfill system (P4-S3-07, 08, 09, 10)
export {
  browserCompat,
  checkCompatibility,
  detectBrowser,
  getPolyfills,
} from './BrowserCompatibility';

export type {
  BrowserName,
  BrowserReport,
  CompatibilityWarning,
  FeatureSupport,
  GPUTier,
  MobileInfo,
  Polyfill,
  SafariQuirk,
  WarningSeverity,
} from './BrowserCompatibility';

// Lighthouse audit configuration (P4-S3-14)
export {
  checkScores,
  getLighthouseConfig,
  PERFORMANCE_BUDGETS,
  SCORE_TARGETS,
} from './LighthouseConfig';

export type {
  LighthouseBudget,
  LighthouseCheckReport,
  LighthouseConfig,
  LighthouseResults,
  LighthouseScoreTargets,
  MetricCheckResult,
  ResourceBudget,
  ScoreCategory,
  ScoreCheckResult,
  TimingBudget,
} from './LighthouseConfig';

// WASM loading failure UX (P4-S3-27)
export { WasmLoadingFallback } from './WasmLoadingUX';

export type {
  WasmLoadingFallbackProps,
  WasmLoadingState,
} from './WasmLoadingUX';

// Sustained load monitoring (P4-S3-11)
export { SustainedLoadMonitor } from './SustainedLoadMonitor';

export type {
  DegradationCallback,
  DegradationEvent,
  DegradationType,
  LoadTestReport,
  MetricSample,
  SustainedLoadMonitorConfig,
} from './SustainedLoadMonitor';

// CDN edge caching validation (P4-S3-12)
export { validateCDNCaching } from './CDNValidator';

export type {
  AssetCacheReport,
  CacheHeaders,
  CacheStatus,
  CDNReport,
} from './CDNValidator';
