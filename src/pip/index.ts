/**
 * PIP (Psychophysiological Interface Protocol) Module
 * P2-S3: Bio-Integration & Real-time Analysis Engine
 */

// Core client
export {
  PIPClient,
  createPIPClient,
} from './PIPClient';

// Smoothing
export {
  PIPDataSmoother,
  PIPBufferSmoother,
  createPIPSmoother,
  createPIPBufferSmoother,
  DEFAULT_EMA_CONFIG,
} from './smoothing';

// Physics bridge
export {
  PIPPhysicsBridge,
  GlobalCoherenceDamping,
  createPIPPhysicsBridge,
  createGlobalCoherenceDamping,
  DEFAULT_DAMPING_CONFIG,
} from './physicsBridge';

// React hooks
export {
  usePIPClient,
  usePIPData,
  useCoherenceDamping,
  usePIPSmoothing,
} from './usePIP';

// Types
export type {
  PIPData,
  PIPClientConfig,
  PIPConnectionState,
  PIPHealthStatus,
  PIPEvent,
  PIPEventListener,
  PIPEventType,
  SmoothedPIPData,
  EMAConfig,
  DampingConfig,
  CoherenceThresholds,
} from './types';

export { DEFAULT_PIP_CONFIG, DEFAULT_COHERENCE_THRESHOLDS } from './types';
