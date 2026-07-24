/**
 * Bio module — MediaPipe integration, body tracking, bio-feedback
 * P1-S1: MediaPipe Integration & Bio-Integration
 */

// Types
export type {
  // Core types
  WebcamConfig,
  WebcamPermissionState,
  WebcamError,
  WebcamErrorCode,
  FrameData,
  SegmentationResult,
  FaceLandmark,
  FaceMeshResult,
  HandLandmark,
  HandResult,
  HandTrackingResult,
  MediaPipeResults,
  HeadTiltVector,
  HeadTiltResult,
  PostureResult,
  SegmentationQuality,
  SegmentationQualityConfig,
  ProcessedMask,
  PIPData,
  PIPGeneratorConfig,
  FPSMonitorState,
  PerformanceMetrics,
  MediaPipePerformanceMetrics,
  ModelLoadingProgress,
  HandSkeletonConfig,
} from './types';

export {
  // Constants
  BRAND_PALETTE,
  DEFAULT_WEBCAM_CONFIG,
  SEGMENTATION_QUALITY_PRESETS,
  MEDIAPIPE_CONSTANTS,
  HAND_LANDMARK_NAMES,
} from './types';

// Webcam
export {
  createWebcamCapture,
  queryCameraPermission,
  getVideoDevices,
  type WebcamCapture,
} from './webcam';

// Segmentation
export {
  createSegmentation,
  createBinaryMask,
  flipMaskHorizontal,
  type MediaPipeSegmentation,
  type SegmentationOptions,
} from './segmentation';

// Face Mesh
export {
  createFaceMesh,
  FACE_LANDMARK_INDICES,
  type MediaPipeFaceMesh,
  type FaceMeshOptions,
} from './faceMesh';

// Hand Tracking
export {
  createHandTracking,
  HAND_LANDMARK_INDICES,
  FINGER_TIPS,
  calculateHandOpenness,
  type MediaPipeHandTracking,
  type HandTrackingOptions,
} from './handTracking';

// Mask Processing
export {
  createMaskProcessingPipeline,
  createDistanceTransform,
  morphologicalOperation,
  type MaskProcessingPipeline,
  type MaskProcessingOptions,
} from './maskProcessing';

// Head Tilt
export {
  calculateHeadTilt,
  headTiltToNavigation,
  HeadTiltSmoother,
  type NavigationForces,
  type HeadTiltOptions,
} from './headTilt';

// Posture
export {
  createPostureDetector,
  quickPostureCheck,
  type PostureDetector,
  type PostureOptions,
} from './posture';

// Mock PIP
export {
  createMockPIPGenerator,
  PIP_PRESETS,
  type MockPIPGenerator,
  type MockPIPOptions,
} from './mockPip';

// Privacy
export {
  createPrivacyMonitor,
  verifyLocalProcessing,
  getPrivacyPolicy,
  runPrivacyAudit,
  DEFAULT_PRIVACY_POLICY,
  type PrivacyMonitor,
  type PrivacyAuditResult,
  type PrivacyPolicy,
} from './privacy';

// Permission
export {
  createPermissionFlow,
  determineInitialRoute,
  createRouteGuard,
  type PermissionFlow,
  type PermissionFlowOptions,
  type PermissionResult,
  type PathRoute,
} from './permission';

// Warmup
export {
  createWarmupController,
  createMultiModelWarmup,
  type WarmupController,
  type MultiModelWarmup,
  type WarmupOptions,
  type ModelWarmupState,
} from './warmup';

// FPS Monitor
export {
  createFPSMonitor,
  createAdaptiveQualityMonitor,
  type FPSMonitor,
  type AdaptiveQualityMonitor,
  type FPSMonitorOptions,
  type FPSStats,
  type AdaptiveQualityOptions,
} from './fpsMonitor';

// Mirror
export {
  createMirrorController,
  getMirrorCSS,
  getMirrorTextureMatrix,
  type MirrorController,
  type MirrorOptions,
} from './mirror';

// Error Handler
export {
  createErrorHandler,
  createFallbackStrategies,
  type WebcamErrorHandler,
  type ErrorHandlerOptions,
  type ErrorHandlingResult,
  type RecoveryStrategy,
} from './errorHandler';

// Model Loading
export {
  createModelLoadingController,
  createProgressReporter,
  createSimulatedProgress,
  getLoadingUIState,
  type ModelLoadingController,
  type ProgressReporter,
  type ModelLoadingOptions,
  type ModelType,
  type LoadingUIState,
} from './modelLoading';

// Performance Counter
export {
  createPerformanceCounter,
  WorkerPerformanceTracker,
  formatPerformanceMetrics,
  checkPerformanceBudget,
  type PerformanceCounter,
  type PerformanceCounterOptions,
  type PerformanceBudget,
} from './performanceCounter';

// Debug Components
export {
  HandSkeletonDebug,
  BioDebugOverlay,
  type HandSkeletonDebugProps,
  type BioDebugOverlayProps,
} from './handSkeletonDebug';
