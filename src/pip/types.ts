/**
 * PIP (Psychophysiological Interface Protocol) Types
 * P2-S3-01: Real PIP Analysis Engine Integration
 */

/** Core PIP data from analysis engine */
export interface PIPData {
  /** Cardiac coherence 0-100 */
  coherence: number;
  /** Local Qualitative Domain (breath quality) 0-100 */
  lqd: number;
  /** Signal entropy/complexity 0-100 */
  entropy: number;
  /** Breath phase: 0=exhale, 0.5=hold, 1=inhale */
  breathPhase: number;
  /** Physical cycle score 0-100 */
  physicalCycle: number;
  /** Timestamp in milliseconds */
  timestamp: number;
}

/** PIP connection states */
export type PIPConnectionState = 
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error'
  | 'fallback';

/** PIP client configuration */
export interface PIPClientConfig {
  /** WebSocket/SSE endpoint URL */
  endpoint: string;
  /** Connection type */
  transport: 'websocket' | 'sse';
  /** Target update rate in Hz (>10Hz required) */
  targetUpdateRateHz: number;
  /** Auto-reconnect enabled */
  autoReconnect: boolean;
  /** Max reconnection attempts before fallback */
  maxReconnectAttempts: number;
  /** Exponential backoff base delay in ms */
  reconnectBaseDelay: number;
  /** Max reconnect delay in ms */
  reconnectMaxDelay: number;
  /** Fallback to mock data after failures */
  fallbackToMock: boolean;
}

/** Default PIP configuration */
export const DEFAULT_PIP_CONFIG: PIPClientConfig = {
  endpoint: import.meta.env.VITE_PIP_ENDPOINT ?? 'ws://localhost:8765/pip',
  transport: 'websocket',
  targetUpdateRateHz: 15,
  autoReconnect: true,
  maxReconnectAttempts: 3,
  reconnectBaseDelay: 1000,
  reconnectMaxDelay: 5000,
  fallbackToMock: true,
};

/** Smoothed PIP data with EMA */
export interface SmoothedPIPData extends PIPData {
  /** Raw unsmoothed coherence */
  rawCoherence: number;
  /** Raw unsmoothed LQD */
  rawLqd: number;
  /** Raw unsmoothed entropy */
  rawEntropy: number;
  /** Frame number in smoothing window */
  frameNumber: number;
}

/** PIP health status */
export interface PIPHealthStatus {
  state: PIPConnectionState;
  lastUpdateAt: number | null;
  updateRate: number;
  reconnectAttempts: number;
  latencyMs: number;
  isHealthy: boolean;
}

/** PIP event types */
export type PIPEventType = 
  | 'data'
  | 'connect'
  | 'disconnect'
  | 'error'
  | 'reconnect'
  | 'fallback'
  | 'restore';

/** PIP event payload */
export interface PIPEvent {
  type: PIPEventType;
  data?: PIPData;
  error?: Error;
  timestamp: number;
}

/** PIP event listener */
export type PIPEventListener = (event: PIPEvent) => void;

/** Coherence threshold levels for Aletheos */
export interface CoherenceThresholds {
  /** High coherence threshold (70+) */
  high: number;
  /** Medium coherence threshold (50-70) */
  medium: number;
  /** Low coherence threshold (30-50) */
  low: number;
}

export const DEFAULT_COHERENCE_THRESHOLDS: CoherenceThresholds = {
  high: 70,
  medium: 50,
  low: 30,
};
