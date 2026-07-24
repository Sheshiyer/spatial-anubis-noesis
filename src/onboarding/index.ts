/**
 * Onboarding module — Descent + Calibration sequence, progressive disclosure
 * P1-S2: Descent & Onboarding Visual Tasks
 */

// Main components
export { Descent } from './Descent';
export { Cartographer } from './Cartographer';
export { SilhouetteOverlay } from './SilhouetteOverlay';
export { LoadingScreen } from './LoadingScreen';
export { CalibrationSuccess } from './CalibrationSuccess';
export { ReturnProtocol } from './ReturnProtocol';
export { WebcamDeniedFlow } from './WebcamDeniedFlow';
export { PathBCalibration } from './PathBCalibration';
export { CameraTransition } from './CameraTransition';
export { VisitTraces, useVisitTrace } from './VisitTraces';

// Timing controller
export {
  createTimingController,
  createDescentPerformanceMonitor,
  getMilestoneTime,
} from './timingController';
export type {
  TimingController,
  TimingControllerOptions,
  PerformanceMetrics,
} from './timingController';

// Types
export type {
  SilhouetteOverlayRef,
} from './SilhouetteOverlay';

// Re-export store for convenience
export { useOnboardingStore } from '../state/onboardingStore';

// Styles
import './styles.css';
