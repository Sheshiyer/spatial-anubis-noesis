/**
 * Types module — TypeScript type definitions and interfaces
 * 
 * P1-S2 Audio & Calibration Types
 */

// Re-export existing types for backward compatibility
export * from './onboarding';
export * from '../bio/types';

// ============================================================================
// P1-S2 Audio Types
// ============================================================================

export interface DroneConfig {
  frequency: number;
  targetGain: number;
  rampDuration: number;
}

export interface ReverbConfig {
  decayTime: number;
  preDelay: number;
  wetLevel: number;
}

export interface FeedbackTone {
  threshold: number;
  frequency: number;
  duration: number;
}

export type AudioDuckState = 'normal' | 'ducked' | 'muted';

export interface DuckingConfig {
  duckLevel: number;
  transitionTime: number;
}

// ============================================================================
// P1-S2 Calibration Types (Extended FSM)
// ============================================================================

export type CalibrationStateValue =
  | 'Waiting'
  | 'Detecting'
  | 'Aligning'
  | 'Holding'
  | 'Complete'
  | 'Failed';

export interface CalibrationMetrics {
  alignmentScore: number;
  peakAlignmentScore: number;
  holdDuration: number;
  holdStartTime: number | null;
  totalHoldTime: number;
}

export interface CalibrationProgress {
  state: CalibrationStateValue;
  metrics: CalibrationMetrics;
  timeoutAt: number | null;
  promptsShown: number[];
}

export interface CalibrationConfig {
  alignmentThreshold: number;
  holdRequiredDuration: number;
  timeoutDuration: number;
  prompt15s: boolean;
  prompt25s: boolean;
  prompt30s: boolean;
}

export interface SilhouetteTarget {
  centerX: number;
  centerY: number;
  scale: number;
  aspectRatio: number;
}

// ============================================================================
// P1-S2 Threshold State (Extended)
// ============================================================================

export interface SessionData {
  id: string;
  startTime: number;
  endTime: number | null;
  duration: number;
  calibrationScore: number | null;
  calibrationDuration: number | null;
}

export interface ExtendedThresholdState {
  // User identification
  userId: string;
  
  // Visit tracking
  visitCount: number;
  firstVisitAt: number;
  lastVisitAt: number;
  
  // Calibration status
  isCalibrated: boolean;
  calibrationCompletedAt: number | null;
  lastCalibrationData: CalibrationMetrics | null;
  
  // Session tracking
  currentSessionStart: number | null;
  sessions: SessionData[];
  
  // Calibration progress (for resume)
  calibrationProgress: CalibrationProgress | null;
  
  // Audio preferences
  audioMuted: boolean;
  audioMasterGain: number;
  
  // Feature flags
  isReturningUser: boolean;
  hasCompletedDescent: boolean;
}

export interface ExtendedThresholdStateV1 {
  version: 1;
  data: ExtendedThresholdState;
}

// ============================================================================
// P1-S2 Onboarding Types (Extended)
// ============================================================================

export type ExtendedDescentPhase =
  | 'Black'
  | 'DeepInk'
  | 'FirstLight'
  | 'Cartographer'
  | 'AudioOnset'
  | 'Complete';

export interface DescentTiming {
  phase: ExtendedDescentPhase;
  elapsedMs: number;
  isComplete: boolean;
}

export interface ExtendedDescentConfig {
  totalDuration: number;
  milestones: Record<ExtendedDescentPhase, number>;
}

export type ExtendedVesselType = 'splat' | 'geometric' | 'none';

export interface ExtendedOnboardingState {
  descentComplete: boolean;
  descentPhase: ExtendedDescentPhase;
  calibrationState: CalibrationStateValue;
  isReturningUser: boolean;
  vesselType: ExtendedVesselType;
  currentPath: 'A' | 'B' | null;
}

// ============================================================================
// P1-S2 Face Mesh Types (Extended)
// ============================================================================

export type FaceLandmarkArray = Array<{ x: number; y: number; z: number }>;

export interface FaceDetectionResult {
  landmarks: FaceLandmarkArray;
  confidence: number;
  timestamp: number;
}

export interface AlignmentResult {
  score: number;
  offsetX: number;
  offsetY: number;
  scale: number;
  isAligned: boolean;
}

// ============================================================================
// Utility Types
// ============================================================================

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type Nullable<T> = T | null;

export interface Vector2 {
  x: number;
  y: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Bounds {
  min: Vector2;
  max: Vector2;
  center: Vector2;
  width: number;
  height: number;
}
