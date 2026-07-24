/**
 * MediaPipe Hand Tracking module
 * P1-S1-03: Set up MediaPipe Hand Landmarker with 21 landmarks per hand
 */

import { Hands } from '@mediapipe/hands';
import {
  type HandTrackingResult,
  type HandResult,
  type HandLandmark,
  MEDIAPIPE_CONSTANTS,
} from './types';

export interface HandTrackingOptions {
  maxHands?: number;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
  onResults?: (results: HandTrackingResult | null) => void;
}

export class MediaPipeHandTracking {
  private hands: Hands | null = null;
  private options: Required<HandTrackingOptions>;
  private isInitialized = false;
  private isInitializing = false;
  private lastResult: HandTrackingResult | null = null;

  constructor(options: HandTrackingOptions = {}) {
    this.options = {
      maxHands: MEDIAPIPE_CONSTANTS.MAX_HANDS,
      minDetectionConfidence: MEDIAPIPE_CONSTANTS.MIN_HAND_CONFIDENCE,
      minTrackingConfidence: 0.5,
      onResults: undefined,
      ...options,
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized || this.isInitializing) {
      return;
    }

    this.isInitializing = true;

    try {
      this.hands = new Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        },
      });

      this.hands.setOptions({
        maxNumHands: this.options.maxHands,
        modelComplexity: 1,
        minDetectionConfidence: this.options.minDetectionConfidence,
        minTrackingConfidence: this.options.minTrackingConfidence,
      });

      this.hands.onResults((results) => {
        this.lastResult = this.processResults(results);
        this.options.onResults?.(this.lastResult);
      });

      // Initialize with dummy image
      const dummyCanvas = document.createElement('canvas');
      dummyCanvas.width = 1;
      dummyCanvas.height = 1;
      const dummyCtx = dummyCanvas.getContext('2d');
      if (dummyCtx) {
        dummyCtx.fillStyle = '#000000';
        dummyCtx.fillRect(0, 0, 1, 1);
        await this.hands.send({ image: dummyCanvas });
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize hand tracking:', error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  async processFrame(input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement): Promise<HandTrackingResult | null> {
    if (!this.isInitialized || !this.hands) {
      throw new Error('Hand tracking not initialized. Call initialize() first.');
    }

    try {
      await this.hands.send({ image: input });
      return this.lastResult;
    } catch (error) {
      console.error('Hand tracking processing error:', error);
      return null;
    }
  }

  setConfidenceThreshold(confidence: number): void {
    this.options.minDetectionConfidence = confidence;
    
    if (this.hands) {
      this.hands.setOptions({
        maxNumHands: this.options.maxHands,
        modelComplexity: 1,
        minDetectionConfidence: confidence,
        minTrackingConfidence: this.options.minTrackingConfidence,
      });
    }
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  dispose(): void {
    this.hands?.close();
    this.hands = null;
    this.isInitialized = false;
    this.lastResult = null;
  }

  private processResults(results: {
    multiHandLandmarks?: Array<Array<{ x: number; y: number; z: number }>>;
    multiHandedness?: Array<{ label: string; score: number }>;
    image?: { width: number; height: number };
  }): HandTrackingResult | null {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      return {
        hands: [],
        timestamp: performance.now(),
      };
    }

    const hands: HandResult[] = results.multiHandLandmarks.map((landmarks, index) => {
      const handedness = results.multiHandedness?.[index];
      
      const handLandmarks: HandLandmark[] = landmarks.map((lm) => ({
        x: lm.x,
        y: lm.y,
        z: lm.z,
        visibility: 1.0,
      }));

      const boundingBox = this.calculateBoundingBox(handLandmarks);

      return {
        landmarks: handLandmarks,
        handedness: (handedness?.label as 'Left' | 'Right') ?? 'Right',
        score: handedness?.score ?? 0,
        boundingBox,
      };
    });

    return {
      hands,
      timestamp: performance.now(),
    };
  }

  private calculateBoundingBox(landmarks: HandLandmark[]): HandResult['boundingBox'] {
    let xMin = 1, xMax = 0, yMin = 1, yMax = 0;

    for (const lm of landmarks) {
      xMin = Math.min(xMin, lm.x);
      xMax = Math.max(xMax, lm.x);
      yMin = Math.min(yMin, lm.y);
      yMax = Math.max(yMax, lm.y);
    }

    return {
      xMin,
      yMin,
      xMax,
      yMax,
    };
  }
}

// Factory function
export function createHandTracking(options?: HandTrackingOptions): MediaPipeHandTracking {
  return new MediaPipeHandTracking(options);
}

// Hand landmark indices
export const HAND_LANDMARK_INDICES = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_FINGER_MCP: 5,
  INDEX_FINGER_PIP: 6,
  INDEX_FINGER_DIP: 7,
  INDEX_FINGER_TIP: 8,
  MIDDLE_FINGER_MCP: 9,
  MIDDLE_FINGER_PIP: 10,
  MIDDLE_FINGER_DIP: 11,
  MIDDLE_FINGER_TIP: 12,
  RING_FINGER_MCP: 13,
  RING_FINGER_PIP: 14,
  RING_FINGER_DIP: 15,
  RING_FINGER_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
} as const;

// Hand connections for visualization
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
  // Palm connections
  [5, 9], [9, 13], [13, 17],
];

// Finger tip indices
export const FINGER_TIPS = [4, 8, 12, 16, 20] as const;

// Calculate hand openness (0-1, where 1 is fully open)
export function calculateHandOpenness(hand: HandResult): number {
  const { landmarks } = hand;
  if (landmarks.length < 21) return 0;

  const wrist = landmarks[0];
  const tips = FINGER_TIPS.map((i) => landmarks[i]);
  const mcps = [5, 9, 13, 17].map((i) => landmarks[i]);

  // Calculate average distance from wrist to tips
  let tipDistance = 0;
  for (const tip of tips) {
    if (!tip || !wrist) continue;
    const dx = tip.x - wrist.x;
    const dy = tip.y - wrist.y;
    const dz = tip.z - wrist.z;
    tipDistance += Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  tipDistance /= tips.length;

  // Calculate average distance from wrist to MCPs (knuckles)
  let mcpDistance = 0;
  for (const mcp of mcps) {
    if (!mcp || !wrist) continue;
    const dx = mcp.x - wrist.x;
    const dy = mcp.y - wrist.y;
    const dz = mcp.z - wrist.z;
    mcpDistance += Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  mcpDistance /= mcps.length;

  // Openness ratio: tips should be much further than MCPs when hand is open
  const ratio = tipDistance / (mcpDistance + 0.001);
  
  // Normalize to 0-1 range (typical ratio ranges from ~1.5 to ~3.5)
  return Math.min(1, Math.max(0, (ratio - 1.5) / 2));
}
