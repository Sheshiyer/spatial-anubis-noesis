/**
 * Bio module type definitions
 * P1-S1 MediaPipe Integration & Bio-Integration
 */

// Legacy MediaPipe types removed — using @mediapipe/tasks-vision now

// ============================================================================
// Brand Palette Constants
// ============================================================================

export const BRAND_PALETTE = {
  deepInk: '#1A1A2E',
  bone: '#F5F0E8',
  agedGold: '#B8860B',
  stoneGrey: '#6B6B6B',
  terracotta: '#C65D3B',
} as const;

// ============================================================================
// Webcam Types
// ============================================================================

export interface WebcamConfig {
  width: number;
  height: number;
  frameRate: number;
  facingMode: 'user' | 'environment';
  mirrored: boolean;
}

export const DEFAULT_WEBCAM_CONFIG: WebcamConfig = {
  width: 640,
  height: 480,
  frameRate: 30,
  facingMode: 'user',
  mirrored: true,
};

export type WebcamPermissionState = 'prompt' | 'granted' | 'denied' | 'unknown';

export interface WebcamError {
  code: WebcamErrorCode;
  message: string;
  originalError?: Error;
}

export type WebcamErrorCode =
  | 'NOT_FOUND'
  | 'NOT_ALLOWED'
  | 'NOT_READABLE'
  | 'OVERCONSTRAINED'
  | 'ABORT'
  | 'SECURITY'
  | 'UNKNOWN';

export interface FrameData {
  timestamp: number;
  width: number;
  height: number;
  data: ImageData | null;
}

// ============================================================================
// MediaPipe Result Types
// ============================================================================

export interface SegmentationResult {
  mask: ImageData | null;
  width: number;
  height: number;
  timestamp: number;
}

export interface FaceLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface FaceMeshResult {
  landmarks: FaceLandmark[]; // 468 landmarks
  confidence: number;
  boundingBox: {
    xMin: number;
    yMin: number;
    xMax: number;
    yMax: number;
    width: number;
    height: number;
  };
  timestamp: number;
}

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface HandResult {
  landmarks: HandLandmark[]; // 21 landmarks
  handedness: 'Left' | 'Right';
  score: number;
  boundingBox: {
    xMin: number;
    yMin: number;
    xMax: number;
    yMax: number;
  };
}

export interface HandTrackingResult {
  hands: HandResult[];
  timestamp: number;
}

export interface MediaPipeResults {
  segmentation: SegmentationResult | null;
  faceMesh: FaceMeshResult | null;
  handTracking: HandTrackingResult | null;
  timestamp: number;
  frameNumber: number;
}

// ============================================================================
// Head Tilt & Posture Types
// ============================================================================

export interface HeadTiltVector {
  pitch: number; // Forward/backward tilt (positive = forward)
  yaw: number;   // Left/right rotation (positive = right)
  roll: number;  // Left/right tilt (positive = right)
}

export interface HeadTiltResult {
  vector: HeadTiltVector;
  magnitude: number;
  direction: 'neutral' | 'left' | 'right' | 'forward' | 'backward';
  confidence: number;
}

export interface PostureResult {
  isUpright: boolean;
  qualityScore: number; // 0-1
  shoulderLevel: number;
  headPosition: { x: number; y: number; z: number };
  timestamp: number;
}

// ============================================================================
// Segmentation Quality & Processing Types
// ============================================================================

export type SegmentationQuality = 'fast' | 'balanced' | 'quality';

export interface SegmentationQualityConfig {
  mode: SegmentationQuality;
  targetLatencyMs: number;
  smoothSegmentation: boolean;
  selfieMode: boolean;
}

export const SEGMENTATION_QUALITY_PRESETS: Record<SegmentationQuality, SegmentationQualityConfig> = {
  fast: {
    mode: 'fast',
    targetLatencyMs: 15,
    smoothSegmentation: false,
    selfieMode: true,
  },
  balanced: {
    mode: 'balanced',
    targetLatencyMs: 25,
    smoothSegmentation: true,
    selfieMode: true,
  },
  quality: {
    mode: 'quality',
    targetLatencyMs: 40,
    smoothSegmentation: true,
    selfieMode: true,
  },
};

export interface ProcessedMask {
  mask: Uint8Array | ImageData;
  width: number;
  height: number;
  edgeSmoothness: number;
  temporalStability: number;
}

// ============================================================================
// PIP (Psychophysiological Interface Protocol) Types
// ============================================================================

export interface PIPData {
  coherence: number;   // 0-1: Cardiac coherence
  lqd: number;         // 0-1: Local Qualitative Domain (breath quality)
  entropy: number;     // 0-1: Signal entropy/complexity
  breathPhase: number; // 0-1: Position in breath cycle (0=exhale, 1=inhale)
  timestamp: number;
}

export interface PIPGeneratorConfig {
  baseCoherence: number;
  baseLqd: number;
  baseEntropy: number;
  breathRateHz: number;
  noiseLevel: number;
}

// ============================================================================
// Performance & Debug Types
// ============================================================================

export interface PerformanceMetrics {
  currentFrameTime: number;
  averageFrameTime: number;
  p99Latency: number;
  fps: number;
  droppedFrames: number;
}

export interface MediaPipePerformanceMetrics extends PerformanceMetrics {
  segmentationTime: number;
  faceMeshTime: number;
  handTrackingTime: number;
  totalProcessingTime: number;
}

export interface ModelLoadingProgress {
  segmentation: number;
  faceMesh: number;
  handTracking: number;
  overall: number;
  isComplete: boolean;
}

export interface FPSMonitorState {
  currentFPS: number;
  averageFPS: number;
  isDropping: boolean;
  warningCount: number;
}

// ============================================================================
// Worker Message Types
// ============================================================================

export type WorkerMessageType =
  | 'INIT'
  | 'INIT_COMPLETE'
  | 'INIT_ERROR'
  | 'PROCESS_FRAME'
  | 'FRAME_PROCESSED'
  | 'PROCESSING_ERROR'
  | 'WARMUP_COMPLETE'
  | 'SET_QUALITY'
  | 'GET_PERFORMANCE'
  | 'PERFORMANCE_REPORT';

export interface WorkerMessage {
  type: WorkerMessageType;
  payload?: unknown;
  timestamp: number;
  id: string;
}

export interface ProcessFrameMessage extends WorkerMessage {
  type: 'PROCESS_FRAME';
  payload: {
    imageData: ImageData;
    frameNumber: number;
    enableSegmentation: boolean;
    enableFaceMesh: boolean;
    enableHandTracking: boolean;
  };
}

// ============================================================================
// Debug Visualization Types
// ============================================================================

export interface HandSkeletonConfig {
  dotSize: number;
  boneWidth: number;
  color: string;
  highlightColor: string;
}

export const HAND_CONNECTIONS: Array<[number, number]> = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index finger
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle finger
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Ring finger
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm
  [5, 9], [9, 13], [13, 17],
];

export const HAND_LANDMARK_NAMES = [
  'WRIST',
  'THUMB_CMC', 'THUMB_MCP', 'THUMB_IP', 'THUMB_TIP',
  'INDEX_FINGER_MCP', 'INDEX_FINGER_PIP', 'INDEX_FINGER_DIP', 'INDEX_FINGER_TIP',
  'MIDDLE_FINGER_MCP', 'MIDDLE_FINGER_PIP', 'MIDDLE_FINGER_DIP', 'MIDDLE_FINGER_TIP',
  'RING_FINGER_MCP', 'RING_FINGER_PIP', 'RING_FINGER_DIP', 'RING_FINGER_TIP',
  'PINKY_MCP', 'PINKY_PIP', 'PINKY_DIP', 'PINKY_TIP',
] as const;

// ============================================================================
// Constants
// ============================================================================

export const MEDIAPIPE_CONSTANTS = {
  FACE_MESH_LANDMARK_COUNT: 468,
  HAND_LANDMARK_COUNT: 21,
  MAX_HANDS: 2,
  WARMUP_FRAMES: 10,
  MIN_FACE_CONFIDENCE: 0.8,
  MIN_HAND_CONFIDENCE: 0.5,
  HEAD_TILT_DEADZONE_DEGREES: 3,
  TARGET_FPS: 30,
  MIN_FPS_WARNING: 25,
  FPS_WARNING_WINDOW_MS: 1000,
  POSTURE_TRANSITION_MS: 500,
} as const;
