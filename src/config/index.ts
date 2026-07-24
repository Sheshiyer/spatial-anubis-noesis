/**
 * Config module — Build, security, and analysis utilities
 */

// Content Security Policy
export {
  getCSPHeaders,
  getCSPMetaTag,
  getCSPDirectives,
  generateCSPNonce,
  getDevCSPHeaders,
  getProductionCSPHeaders,
} from './csp';

// Production build configuration
export {
  getProductionViteConfig,
  getChunkGroups,
  getChunkForModule,
} from './buildConfig';

// Bundle analysis
export {
  analyzeBuild,
  analyzeStats,
  formatReport,
} from './bundleAnalysis';

export type {
  BundleReport,
  ChunkInfo,
  DependencyInfo,
  AnalysisWarning,
  Severity,
} from './bundleAnalysis';
