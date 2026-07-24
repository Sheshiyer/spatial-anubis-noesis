/**
 * Onboarding types — Descent sequence, calibration, and session management
 * P1-S2: Descent & Onboarding Visual Tasks
 */

// ============================================================================
// Core State Types
// ============================================================================

export type CalibrationState = 'idle' | 'pending' | 'success' | 'denied';
export type VesselType = 'splat' | 'geometric' | null;
export type DescentPhase =
  | 'black'
  | 'deep-ink'
  | 'first-particle'
  | 'cartographer-spawn'
  | 'fade-complete'
  | 'complete';

// Aliases for compatibility
export type CalibrationStateValue = CalibrationState;

// ============================================================================
// Session & Persistence Types
// ============================================================================

export interface ThresholdState {
  visitCount: number;
  calibrationComplete: boolean;
  lastVisitTimestamp: number | null;
  calibrationState: CalibrationState;
  vesselType: VesselType;
}

export interface DescentMilestone {
  time: number;
  phase: DescentPhase;
  action: () => void;
}

export interface DescentConfig {
  duration: number;
  compressed: boolean;
  milestones: DescentMilestone[];
}

export interface SessionHistory {
  timestamp: number;
  vesselType: VesselType;
  calibrationSuccess: boolean;
}

export interface VisitTrace {
  id: string;
  timestamp: number;
  x: number;
  z: number;
}

// ============================================================================
// Calibration Types (for compatibility)
// ============================================================================

export interface CalibrationProgress {
  phase: 'entry' | 'positioning' | 'hold' | 'validation' | 'complete';
  progress: number; // 0-100
  holdDuration: number; // ms
  alignmentScore: number; // 0-1
  faceDetected: boolean;
  faceAligned: boolean;
}

export interface CalibrationMetrics {
  totalDuration: number;
  holdTime: number;
  finalAlignmentScore: number;
  attemptCount: number;
  pathRoute: 'path_a' | 'path_b';
}

// ============================================================================
// Store State Types
// ============================================================================

export interface OnboardingState {
  // Descent state
  descentComplete: boolean;
  descentPhase: DescentPhase;
  descentProgress: number;
  descentStartTime: number | null;

  // Calibration state
  calibrationState: CalibrationState;
  silhouetteVisible: boolean;
  calibrationSuccess: boolean;

  // User state
  isReturningUser: boolean;
  vesselType: VesselType;

  // Session
  sessionStartTimestamp: number | null;
  visitCount: number;
  visitTraces: VisitTrace[];

  // Settings
  reducedMotion: boolean;
  skipDescent: boolean;
}

export interface OnboardingActions {
  // Descent actions
  startDescent: (compressed?: boolean) => void;
  updateDescentProgress: (progress: number) => void;
  setDescentPhase: (phase: DescentPhase) => void;
  completeDescent: () => void;
  replayDescent: () => void;

  // Calibration actions
  startCalibration: () => void;
  completeCalibration: (vesselType: VesselType) => void;
  denyCalibration: () => void;
  setSilhouetteVisible: (visible: boolean) => void;

  // User/session actions
  loadThresholdState: () => void;
  saveThresholdState: () => void;
  incrementVisitCount: () => void;
  addVisitTrace: (trace: Omit<VisitTrace, 'id'>) => void;
  startSession: () => void;

  // Settings
  setReducedMotion: (reduced: boolean) => void;
  checkSkipDescent: () => void;
}

export type OnboardingStore = OnboardingState & OnboardingActions;

// ============================================================================
// Face/Body Types (for compatibility)
// ============================================================================

export interface FaceLandmark {
  x: number;
  y: number;
  z: number;
}

export type FaceLandmarkArray = FaceLandmark[];

export interface SilhouetteTarget {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface AlignmentResult {
  aligned: boolean;
  score: number;
  offset: { x: number; y: number };
}

// ============================================================================
// Component Prop Types
// ============================================================================

export interface DescentOverlayProps {
  isOpen: boolean;
  onComplete?: () => void;
  compressed?: boolean;
}

export interface SilhouetteOverlayProps {
  visible: boolean;
  targetBounds?: DOMRect;
  onAligned?: () => void;
  onMisaligned?: () => void;
}
