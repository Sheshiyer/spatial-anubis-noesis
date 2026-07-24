/**
 * Gesture Detection System
 * P2-S2-14: Gesture-to-verb mapping
 * P2-S2-15: Gesture debouncing
 * P2-S2-16: Mudra detection
 * P2-S2-24: Two-hand detection for ORBIT
 */

import type { HandResult, HandLandmark } from '../bio/types';
import { KineticVerbType } from '../verbs/types';

// ============================================================================
// Gesture Types
// ============================================================================

export type GestureType =
  | 'OPEN_PALM'
  | 'FIST'
  | 'SWIPE'
  | 'PINCH'
  | 'ANJALI'      // Prayer mudra
  | 'CHIN'        // Index-thumb pinch
  | 'NONE';

export interface GestureResult {
  type: GestureType;
  confidence: number;
  hands: HandResult[];
  verbIntent: KineticVerbType | null;
  timestamp: number;
}

export interface GestureConfig {
  // Confidence thresholds
  minConfidence: number;
  orbitMinConfidence: number;
  
  // Debouncing (frames at 30fps)
  confirmFrames: number;  // 150ms = 5 frames
  releaseFrames: number;  // 100ms = 3 frames
  
  // Distance thresholds
  pinchThreshold: number;
  anjaliDistance: number;
  
  // Swipe detection
  swipeVelocityThreshold: number;
  swipeDirectionThreshold: number;
}

export const DEFAULT_GESTURE_CONFIG: GestureConfig = {
  minConfidence: 0.70,
  orbitMinConfidence: 0.80,
  confirmFrames: 5,
  releaseFrames: 3,
  pinchThreshold: 0.05,
  anjaliDistance: 0.05,
  swipeVelocityThreshold: 0.3,
  swipeDirectionThreshold: 0.7,
};

// ============================================================================
// Gesture Detector
// ============================================================================

export class GestureDetector {
  private config: GestureConfig;
  
  // Debounce state
  private pendingGesture: GestureType | null = null;
  private pendingFrames: number = 0;
  private releaseFrames: number = 0;
  private activeGesture: GestureType | null = null;
  
  // Swipe detection
  private handHistory: Map<string, HandHistory> = new Map();
  private readonly HISTORY_SIZE = 5;

  constructor(config: Partial<GestureConfig> = {}) {
    this.config = { ...DEFAULT_GESTURE_CONFIG, ...config };
  }

  /**
   * Detect gestures from hand tracking results
   */
  detect(hands: HandResult[]): GestureResult {
    const timestamp = performance.now();
    
    // Update hand history for swipe detection
    this.updateHandHistory(hands, timestamp);

    // Detect raw gesture
    const rawGesture = this.detectRawGesture(hands);
    
    // Apply debouncing
    const debouncedGesture = this.applyDebouncing(rawGesture);
    
    // Determine verb intent
    const verbIntent = this.mapGestureToVerb(debouncedGesture, hands);
    
    // Calculate overall confidence
    const confidence = this.calculateConfidence(hands, debouncedGesture);

    return {
      type: debouncedGesture,
      confidence,
      hands,
      verbIntent,
      timestamp,
    };
  }

  /**
   * Detect raw gesture without debouncing
   */
  private detectRawGesture(hands: HandResult[]): GestureType {
    // No hands
    if (hands.length === 0) {
      return 'NONE';
    }

    // Two-hand gestures (Mudras)
    if (hands.length === 2) {
      if (this.isAnjaliMudra(hands)) {
        return 'ANJALI';
      }
      
      // P2-S2-24: Two-hand ORBIT detection
      if (this.isOrbitGesture(hands)) {
        return 'OPEN_PALM';
      }
    }

    // Single hand gestures
    const hand = hands[0];
    
    // Check for swipe first (requires history)
    if (this.isSwipeGesture(hand)) {
      return 'SWIPE';
    }

    // Check for Chin mudra (both hands in pinch)
    if (hands.length === 2 && hands.every(h => this.isChinMudra(h))) {
      return 'CHIN';
    }

    // Check for pinch
    if (this.isPinchGesture(hand)) {
      return 'PINCH';
    }

    // Check for fist
    if (this.isFistGesture(hand)) {
      return 'FIST';
    }

    // Check for open palm
    if (this.isOpenPalmGesture(hand)) {
      return 'OPEN_PALM';
    }

    return 'NONE';
  }

  /**
   * Apply debouncing to gesture detection
   * P2-S2-15: 150ms confirmation (5 frames), 100ms release (3 frames)
   */
  private applyDebouncing(detectedGesture: GestureType): GestureType {
    // Same gesture detected - increment confirmation
    if (detectedGesture === this.pendingGesture) {
      this.pendingFrames++;
      this.releaseFrames = 0;
    } else {
      // Different gesture - check release
      this.releaseFrames++;
      
      if (this.releaseFrames >= this.config.releaseFrames) {
        // Fully released, start new pending
        this.pendingGesture = detectedGesture;
        this.pendingFrames = 1;
        this.releaseFrames = 0;
      }
    }

    // Check if we should activate the gesture
    if (this.pendingFrames >= this.config.confirmFrames) {
      if (this.pendingGesture !== this.activeGesture) {
        this.activeGesture = this.pendingGesture;
        console.log(`[GestureDetector] Gesture activated: ${this.activeGesture}`);
      }
    }

    // Check if we should release the active gesture
    if (this.releaseFrames >= this.config.releaseFrames && this.activeGesture !== null) {
      if (detectedGesture !== this.activeGesture) {
        console.log(`[GestureDetector] Gesture released: ${this.activeGesture}`);
        this.activeGesture = null;
      }
    }

    return this.activeGesture ?? 'NONE';
  }

  /**
   * Map detected gesture to Kinetic Verb intent
   * P2-S2-14: Gesture-to-verb mapping
   */
  private mapGestureToVerb(gesture: GestureType, hands: HandResult[]): KineticVerbType | null {
    switch (gesture) {
      case 'OPEN_PALM':
        // Two hands = ORBIT, one hand = GRASP ready
        return hands.length >= 2 ? 'ORBIT' : 'IDLE';
        
      case 'FIST':
        return 'GRASP'; // Holding grasped object
        
      case 'SWIPE':
        return 'THROW';
        
      case 'PINCH':
        return 'GRASP'; // Fine grasp
        
      case 'ANJALI':
        return 'BREATHE_SYNC'; // Prayer = breathfield
        
      case 'CHIN':
        return 'REST'; // Contemplation = rest
        
      default:
        return null;
    }
  }

  /**
   * Check for open palm gesture
   */
  private isOpenPalmGesture(hand: HandResult): boolean {
    const landmarks = hand.landmarks;
    if (landmarks.length < 21) return false;

    // Check if fingers are extended
    const fingerTips = [8, 12, 16, 20];
    const fingerPips = [6, 10, 14, 18];
    
    let extendedCount = 0;
    
    for (let i = 0; i < fingerTips.length; i++) {
      const tip = landmarks[fingerTips[i]];
      const pip = landmarks[fingerPips[i]];
      const wrist = landmarks[0];
      
      // Tip should be further from wrist than PIP
      const tipDist = this.distance(tip, wrist);
      const pipDist = this.distance(pip, wrist);
      
      if (tipDist > pipDist * 1.2) {
        extendedCount++;
      }
    }

    // Open palm has 3+ extended fingers
    return extendedCount >= 3;
  }

  /**
   * Check for fist gesture
   */
  private isFistGesture(hand: HandResult): boolean {
    const landmarks = hand.landmarks;
    if (landmarks.length < 21) return false;

    // Check if fingers are curled
    const fingerTips = [8, 12, 16, 20];
    const fingerMcps = [5, 9, 13, 17];
    
    let curledCount = 0;
    
    for (let i = 0; i < fingerTips.length; i++) {
      const tip = landmarks[fingerTips[i]];
      const mcp = landmarks[fingerMcps[i]];
      const wrist = landmarks[0];
      
      // Tip should be close to MCP (curled)
      const tipToMcpDist = this.distance(tip, mcp);
      const mcpToWristDist = this.distance(mcp, wrist);
      
      if (tipToMcpDist < mcpToWristDist * 0.6) {
        curledCount++;
      }
    }

    // Fist has 3+ curled fingers
    return curledCount >= 3;
  }

  /**
   * Check for pinch gesture (thumb to index)
   */
  private isPinchGesture(hand: HandResult): boolean {
    const landmarks = hand.landmarks;
    if (landmarks.length < 21) return false;

    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    
    const distance = this.distance(thumbTip, indexTip);
    return distance < this.config.pinchThreshold;
  }

  /**
   * Check for swipe gesture based on velocity
   */
  private isSwipeGesture(hand: HandResult): boolean {
    const history = this.handHistory.get(hand.handedness);
    if (!history || history.positions.length < 3) return false;

    // Calculate velocity from recent history
    const recent = history.positions.slice(-3);
    const dx = recent[recent.length - 1].x - recent[0].x;
    const dy = recent[recent.length - 1].y - recent[0].y;
    
    const velocity = Math.sqrt(dx * dx + dy * dy);
    const direction = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
    
    // Swipe requires high velocity and consistent direction
    if (velocity < this.config.swipeVelocityThreshold) return false;
    
    // Check direction consistency
    let consistentDirection = true;
    for (let i = 1; i < recent.length; i++) {
      const stepDx = recent[i].x - recent[i - 1].x;
      const stepDy = recent[i].y - recent[i - 1].y;
      
      if (direction === 'horizontal' && Math.abs(stepDx) < Math.abs(stepDy)) {
        consistentDirection = false;
        break;
      }
      if (direction === 'vertical' && Math.abs(stepDy) < Math.abs(stepDx)) {
        consistentDirection = false;
        break;
      }
    }

    return consistentDirection;
  }

  /**
   * P2-S2-16: Check for Anjali mudra (prayer pose)
   * Both palms facing each other within 5cm
   */
  private isAnjaliMudra(hands: HandResult[]): boolean {
    if (hands.length !== 2) return false;

    const leftHand = hands.find(h => h.handedness === 'Left');
    const rightHand = hands.find(h => h.handedness === 'Right');
    
    if (!leftHand || !rightHand) return false;

    // Check palm distance (using wrist positions as proxy)
    const leftWrist = leftHand.landmarks[0];
    const rightWrist = rightHand.landmarks[0];
    
    const palmDistance = this.distance(leftWrist, rightWrist);
    return palmDistance < this.config.anjaliDistance;
  }

  /**
   * P2-S2-16: Check for Chin mudra (index-thumb touch)
   */
  private isChinMudra(hand: HandResult): boolean {
    const landmarks = hand.landmarks;
    if (landmarks.length < 21) return false;

    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    
    const distance = this.distance(thumbTip, indexTip);
    return distance < this.config.pinchThreshold * 1.5;
  }

  /**
   * P2-S2-24: Check for ORBIT gesture (both hands open palm, high confidence)
   */
  private isOrbitGesture(hands: HandResult[]): boolean {
    if (hands.length !== 2) return false;

    // Both hands must be open palm with high confidence
    return hands.every(hand => 
      hand.score >= this.config.orbitMinConfidence &&
      this.isOpenPalmGesture(hand)
    );
  }

  /**
   * Update hand position history for velocity calculation
   */
  private updateHandHistory(hands: HandResult[], timestamp: number): void {
    for (const hand of hands) {
      let history = this.handHistory.get(hand.handedness);
      if (!history) {
        history = { positions: [], timestamps: [] };
        this.handHistory.set(hand.handedness, history);
      }

      // Add current position
      const wrist = hand.landmarks[0];
      history.positions.push({ x: wrist.x, y: wrist.y, z: wrist.z });
      history.timestamps.push(timestamp);

      // Trim history
      if (history.positions.length > this.HISTORY_SIZE) {
        history.positions.shift();
        history.timestamps.shift();
      }
    }

    // Clean up old hands
    for (const [handedness, history] of this.handHistory) {
      if (history.timestamps.length > 0 && 
          timestamp - history.timestamps[history.timestamps.length - 1] > 500) {
        this.handHistory.delete(handedness);
      }
    }
  }

  /**
   * Calculate overall gesture confidence
   */
  private calculateConfidence(hands: HandResult[], gesture: GestureType): number {
    if (hands.length === 0) return 0;
    
    const handConfidence = hands.reduce((sum, h) => sum + h.score, 0) / hands.length;
    
    // Reduce confidence for NONE gesture
    if (gesture === 'NONE') {
      return handConfidence * 0.5;
    }
    
    return handConfidence;
  }

  /**
   * Calculate Euclidean distance between two landmarks
   */
  private distance(a: HandLandmark, b: HandLandmark): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Get current active gesture
   */
  getActiveGesture(): GestureType {
    return this.activeGesture ?? 'NONE';
  }

  /**
   * Reset detector state
   */
  reset(): void {
    this.pendingGesture = null;
    this.pendingFrames = 0;
    this.releaseFrames = 0;
    this.activeGesture = null;
    this.handHistory.clear();
  }
}

// ============================================================================
// Hand History Interface
// ============================================================================

interface HandHistory {
  positions: { x: number; y: number; z: number }[];
  timestamps: number[];
}

// ============================================================================
// Velocity Tracker
// P2-S2-13: Hand velocity tracker with rolling 5-frame buffer
// ============================================================================

export class VelocityTracker {
  private bufferSize: number;
  private samples: Map<string, VelocitySample[]> = new Map();

  constructor(bufferSize: number = 5) {
    this.bufferSize = bufferSize;
  }

  /**
   * Add a velocity sample
   */
  addSample(handId: string, position: { x: number; y: number; z: number }): void {
    let handSamples = this.samples.get(handId);
    if (!handSamples) {
      handSamples = [];
      this.samples.set(handId, handSamples);
    }

    const now = performance.now();
    
    // Calculate velocity from last sample
    let velocity = { x: 0, y: 0, z: 0 };
    if (handSamples.length > 0) {
      const last = handSamples[handSamples.length - 1];
      const dt = (now - last.timestamp) / 1000; // Convert to seconds
      if (dt > 0) {
        velocity = {
          x: (position.x - last.position.x) / dt,
          y: (position.y - last.position.y) / dt,
          z: (position.z - last.position.z) / dt,
        };
      }
    }

    handSamples.push({
      position: { ...position },
      timestamp: now,
      velocity,
    });

    // Trim buffer
    if (handSamples.length > this.bufferSize) {
      handSamples.shift();
    }
  }

  /**
   * Get smoothed velocity for a hand
   */
  getSmoothedVelocity(handId: string): { x: number; y: number; z: number } | null {
    const samples = this.samples.get(handId);
    if (!samples || samples.length === 0) return null;

    // Average velocities
    const avg = samples.reduce(
      (sum, s) => ({
        x: sum.x + s.velocity.x,
        y: sum.y + s.velocity.y,
        z: sum.z + s.velocity.z,
      }),
      { x: 0, y: 0, z: 0 }
    );

    return {
      x: avg.x / samples.length,
      y: avg.y / samples.length,
      z: avg.z / samples.length,
    };
  }

  /**
   * Get instantaneous speed
   */
  getSpeed(handId: string): number {
    const velocity = this.getSmoothedVelocity(handId);
    if (!velocity) return 0;

    return Math.sqrt(
      velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2
    );
  }

  /**
   * Clear all samples
   */
  clear(): void {
    this.samples.clear();
  }
}

interface VelocitySample {
  position: { x: number; y: number; z: number };
  timestamp: number;
  velocity: { x: number; y: number; z: number };
}
