/**
 * CalibrationStateMachine — Finite state machine for calibration flow
 * 
 * P1-S2 Calibration Tasks:
 * - P1-S2-15: Alignment score function
 * - P1-S2-16: 3-second stillness hold timer
 * - P1-S2-18: CalibrationState state machine
 * - P1-S2-19: Calibration failure handler
 * - P1-S2-22: Progressive prompting
 * - P1-S2-41: Calibration data capture
 * - P1-S2-43: Calibration state persistence
 */

import type {
  CalibrationStateValue,
  CalibrationMetrics,
  CalibrationProgress,
  CalibrationConfig,
  SilhouetteTarget,
  AlignmentResult,
} from '../types';
import type { FaceLandmark } from '../bio/types';

// Default calibration configuration
const DEFAULT_CONFIG: CalibrationConfig = {
  alignmentThreshold: 0.85,
  holdRequiredDuration: 3000, // 3 seconds
  timeoutDuration: 30000, // 30 seconds
  prompt15s: true,
  prompt25s: true,
  prompt30s: true,
};

// Silhouette target configuration
const SILHOUETTE_CONFIG: SilhouetteTarget = {
  centerX: 0.5,
  centerY: 0.5,
  scale: 0.6,
  aspectRatio: 0.75, // Height/Width ratio for human face
};

// Key face landmarks for alignment
// MediaPipe Face Mesh indices:
// 1: Nose tip
// 33: Left eye inner
// 133: Left eye outer
// 362: Right eye inner
// 263: Right eye outer
// 152: Chin
// 10: Top of head
const KEY_LANDMARKS = {
  noseTip: 1,
  leftEye: 33,
  rightEye: 362,
  chin: 152,
  topHead: 10,
};

type StateTransition = {
  from: CalibrationStateValue;
  to: CalibrationStateValue;
  condition: string;
};

// Valid state transitions
const VALID_TRANSITIONS: StateTransition[] = [
  { from: 'Waiting', to: 'Detecting', condition: 'face_detected' },
  { from: 'Detecting', to: 'Aligning', condition: 'stable_detection' },
  { from: 'Detecting', to: 'Waiting', condition: 'face_lost' },
  { from: 'Aligning', to: 'Holding', condition: 'alignment_threshold_met' },
  { from: 'Aligning', to: 'Detecting', condition: 'alignment_poor' },
  { from: 'Holding', to: 'Complete', condition: 'hold_duration_met' },
  { from: 'Holding', to: 'Aligning', condition: 'alignment_lost' },
  { from: 'Holding', to: 'Failed', condition: 'timeout' },
  { from: 'Aligning', to: 'Failed', condition: 'timeout' },
  { from: 'Failed', to: 'Waiting', condition: 'reset' },
  { from: 'Complete', to: 'Waiting', condition: 'reset' },
];

export type CalibrationEvent =
  | { type: 'FACE_DETECTED'; landmarks: FaceLandmark[] }
  | { type: 'FACE_LOST' }
  | { type: 'TICK'; timestamp: number }
  | { type: 'RESET' }
  | { type: 'RESUME'; progress: CalibrationProgress };

export type CalibrationStateChangeCallback = (
  previousState: CalibrationStateValue,
  newState: CalibrationStateValue,
  progress: CalibrationProgress
) => void;

export type CalibrationPromptCallback = (promptType: 'pulse' | 'brighten' | 'reprompt') => void;

export class CalibrationStateMachine {
  private state: CalibrationStateValue = 'Waiting';
  private metrics: CalibrationMetrics = {
    alignmentScore: 0,
    peakAlignmentScore: 0,
    holdDuration: 0,
    holdStartTime: null,
    totalHoldTime: 0,
  };
  private config: CalibrationConfig;
  private startTime: number = 0;
  private timeoutAt: number | null = null;
  private promptsShown: number[] = [];
  private lastFaceDetectionTime: number = 0;
  private stableDetectionCount: number = 0;
  private readonly STABLE_DETECTION_THRESHOLD = 10; // 10 frames at 30fps ≈ 333ms
  
  private onStateChange?: CalibrationStateChangeCallback;
  private onPrompt?: CalibrationPromptCallback;
  private onComplete?: (metrics: CalibrationMetrics) => void;
  private onFailure?: () => void;
  
  constructor(
    config: Partial<CalibrationConfig> = {},
    callbacks?: {
      onStateChange?: CalibrationStateChangeCallback;
      onPrompt?: CalibrationPromptCallback;
      onComplete?: (metrics: CalibrationMetrics) => void;
      onFailure?: () => void;
    }
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.onStateChange = callbacks?.onStateChange;
    this.onPrompt = callbacks?.onPrompt;
    this.onComplete = callbacks?.onComplete;
    this.onFailure = callbacks?.onFailure;
  }
  
  /**
   * Get current state
   */
  getState(): CalibrationStateValue {
    return this.state;
  }
  
  /**
   * Get current metrics
   */
  getMetrics(): CalibrationMetrics {
    return { ...this.metrics };
  }
  
  /**
   * Get current progress for persistence
   */
  getProgress(): CalibrationProgress {
    return {
      state: this.state,
      metrics: { ...this.metrics },
      timeoutAt: this.timeoutAt,
      promptsShown: [...this.promptsShown],
    };
  }
  
  /**
   * Calculate alignment score between face landmarks and silhouette target
   * P1-S2-15: Alignment score function
   * 
   * Returns 0-1 alignment value:
   * - Perfect alignment (>0.95)
   * - 50% offset (<0.3)
   */
  calculateAlignment(landmarks: FaceLandmark[]): AlignmentResult {
    if (!landmarks || landmarks.length === 0) {
      return { score: 0, offsetX: 0, offsetY: 0, scale: 1, isAligned: false };
    }
    
    // Get key landmarks
    const nose = landmarks[KEY_LANDMARKS.noseTip];
    const leftEye = landmarks[KEY_LANDMARKS.leftEye];
    const rightEye = landmarks[KEY_LANDMARKS.rightEye];
    const chin = landmarks[KEY_LANDMARKS.chin];
    const topHead = landmarks[KEY_LANDMARKS.topHead];
    
    if (!nose || !leftEye || !rightEye || !chin || !topHead) {
      return { score: 0, offsetX: 0, offsetY: 0, scale: 1, isAligned: false };
    }
    
    // Calculate face center
    const faceCenterX = (leftEye.x + rightEye.x) / 2;
    const faceCenterY = (topHead.y + chin.y) / 2;
    
    // Calculate face size
    const faceWidth = Math.abs(rightEye.x - leftEye.x);
    const faceHeight = Math.abs(chin.y - topHead.y);
    const faceSize = Math.sqrt(faceWidth * faceWidth + faceHeight * faceHeight);
    
    // Calculate offset from target center
    const offsetX = faceCenterX - SILHOUETTE_CONFIG.centerX;
    const offsetY = faceCenterY - SILHOUETTE_CONFIG.centerY;
    
    // Calculate distance from center (normalized)
    const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
    
    // Calculate scale ratio (how well face size matches target)
    const targetSize = SILHOUETTE_CONFIG.scale * 0.3; // Approximate face size in normalized coords
    const scaleRatio = Math.min(faceSize / targetSize, targetSize / faceSize);
    const scaleScore = Math.max(0, (scaleRatio - 0.5) * 2); // Normalize to 0-1
    
    // Calculate position score (inverse of distance)
    // Perfect center = 1, 50% offset = ~0.3
    const positionScore = Math.max(0, 1 - distance * 2);
    
    // Combined score (weighted toward position)
    const score = positionScore * 0.7 + scaleScore * 0.3;
    
    return {
      score: Math.min(1, Math.max(0, score)),
      offsetX,
      offsetY,
      scale: faceSize / targetSize,
      isAligned: score >= this.config.alignmentThreshold,
    };
  }
  
  /**
   * Process an event
   */
  processEvent(event: CalibrationEvent): void {
    const previousState = this.state;
    
    switch (event.type) {
      case 'FACE_DETECTED':
        this.handleFaceDetected(event.landmarks);
        break;
        
      case 'FACE_LOST':
        this.handleFaceLost();
        break;
        
      case 'TICK':
        this.handleTick(event.timestamp);
        break;
        
      case 'RESET':
        this.reset();
        break;
        
      case 'RESUME':
        this.resume(event.progress);
        break;
    }
    
    // Notify state change
    if (previousState !== this.state && this.onStateChange) {
      this.onStateChange(previousState, this.state, this.getProgress());
    }
  }
  
  /**
   * Handle face detection
   */
  private handleFaceDetected(landmarks: FaceLandmark[]): void {
    this.lastFaceDetectionTime = Date.now();
    
    // Calculate alignment
    const alignment = this.calculateAlignment(landmarks);
    this.metrics.alignmentScore = alignment.score;
    this.metrics.peakAlignmentScore = Math.max(
      this.metrics.peakAlignmentScore,
      alignment.score
    );
    
    // State transitions based on current state
    switch (this.state) {
      case 'Waiting':
        this.stableDetectionCount++;
        if (this.stableDetectionCount >= this.STABLE_DETECTION_THRESHOLD) {
          this.transitionTo('Detecting');
        }
        break;
        
      case 'Detecting':
        this.stableDetectionCount++;
        if (this.stableDetectionCount >= this.STABLE_DETECTION_THRESHOLD * 2) {
          this.transitionTo('Aligning');
        }
        break;
        
      case 'Aligning':
        if (alignment.isAligned) {
          this.transitionTo('Holding');
        }
        break;
        
      case 'Holding':
        if (!alignment.isAligned) {
          // Lost alignment, go back to aligning
          this.metrics.holdStartTime = null;
          this.transitionTo('Aligning');
        }
        break;
    }
  }
  
  /**
   * Handle face lost
   */
  private handleFaceLost(): void {
    this.stableDetectionCount = 0;
    
    if (this.state === 'Detecting' || this.state === 'Aligning') {
      // Check if face has been lost for too long
      const timeSinceDetection = Date.now() - this.lastFaceDetectionTime;
      if (timeSinceDetection > 1000) {
        this.transitionTo('Waiting');
      }
    } else if (this.state === 'Holding') {
      // Lost face during hold, reset
      this.metrics.holdStartTime = null;
      this.transitionTo('Aligning');
    }
  }
  
  /**
   * Handle tick (called on each frame)
   * P1-S2-16: 3-second stillness hold timer
   * P1-S2-22: Progressive prompting
   */
  private handleTick(timestamp: number): void {
    // Initialize start time on first tick
    if (this.startTime === 0) {
      this.startTime = timestamp;
      this.timeoutAt = timestamp + this.config.timeoutDuration;
    }
    
    // Update hold duration if in Holding state
    if (this.state === 'Holding') {
      if (this.metrics.holdStartTime === null) {
        this.metrics.holdStartTime = timestamp;
      }
      
      this.metrics.holdDuration = timestamp - this.metrics.holdStartTime;
      this.metrics.totalHoldTime = this.metrics.holdDuration;
      
      // Check if hold duration is complete
      if (this.metrics.holdDuration >= this.config.holdRequiredDuration) {
        this.transitionTo('Complete');
        return;
      }
    }
    
    // Check for timeout and progressive prompts
    if (this.timeoutAt && timestamp >= this.timeoutAt) {
      this.transitionTo('Failed');
      return;
    }
    
    // Progressive prompting
    const elapsed = timestamp - this.startTime;
    
    if (this.config.prompt15s && elapsed >= 15000 && !this.promptsShown.includes(15)) {
      this.promptsShown.push(15);
      this.onPrompt?.('pulse');
    }
    
    if (this.config.prompt25s && elapsed >= 25000 && !this.promptsShown.includes(25)) {
      this.promptsShown.push(25);
      this.onPrompt?.('brighten');
    }
    
    if (this.config.prompt30s && elapsed >= 30000 && !this.promptsShown.includes(30)) {
      this.promptsShown.push(30);
      this.onPrompt?.('reprompt');
    }
  }
  
  /**
   * Transition to a new state
   */
  private transitionTo(newState: CalibrationStateValue): void {
    const previousState = this.state;
    
    // Validate transition
    const isValidTransition = VALID_TRANSITIONS.some(
      (t) => t.from === previousState && t.to === newState
    );
    
    if (!isValidTransition && previousState !== newState) {
      console.warn(`[CalibrationStateMachine] Invalid transition: ${previousState} -> ${newState}`);
      return;
    }
    
    this.state = newState;
    
    // Handle state entry
    switch (newState) {
      case 'Waiting':
        this.resetMetrics();
        this.startTime = 0;
        this.timeoutAt = null;
        this.promptsShown = [];
        break;
        
      case 'Aligning':
        this.metrics.holdStartTime = null;
        break;
        
      case 'Holding':
        if (this.metrics.holdStartTime === null) {
          this.metrics.holdStartTime = Date.now();
        }
        break;
        
      case 'Complete':
        this.onComplete?.(this.getMetrics());
        break;
        
      case 'Failed':
        this.onFailure?.();
        break;
    }
  }
  
  /**
   * Reset the state machine
   */
  private reset(): void {
    this.state = 'Waiting';
    this.resetMetrics();
    this.startTime = 0;
    this.timeoutAt = null;
    this.promptsShown = [];
    this.stableDetectionCount = 0;
  }
  
  /**
   * Resume from persisted progress
   * P1-S2-43: Calibration state persistence
   */
  private resume(progress: CalibrationProgress): void {
    this.state = progress.state;
    this.metrics = { ...progress.metrics };
    this.timeoutAt = progress.timeoutAt;
    this.promptsShown = [...progress.promptsShown];
  }
  
  /**
   * Reset metrics
   */
  private resetMetrics(): void {
    this.metrics = {
      alignmentScore: 0,
      peakAlignmentScore: 0,
      holdDuration: 0,
      holdStartTime: null,
      totalHoldTime: 0,
    };
  }
  
  /**
   * Force reset to Waiting state
   */
  forceReset(): void {
    this.processEvent({ type: 'RESET' });
  }
  
  /**
   * Check if a specific transition is valid
   */
  static isValidTransition(from: CalibrationStateValue, to: CalibrationStateValue): boolean {
    return VALID_TRANSITIONS.some((t) => t.from === from && t.to === to);
  }
  
  /**
   * Get valid next states from current state
   */
  getValidNextStates(): CalibrationStateValue[] {
    return VALID_TRANSITIONS
      .filter((t) => t.from === this.state)
      .map((t) => t.to);
  }
}

export { VALID_TRANSITIONS, DEFAULT_CONFIG, SILHOUETTE_CONFIG, KEY_LANDMARKS };
