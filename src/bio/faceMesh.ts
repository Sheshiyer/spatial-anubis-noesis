/**
 * MediaPipe Face Landmarker module (tasks-vision API)
 * P1-S1-02: Face mesh with 478 landmark detection
 * P1-S1-29: Multi-face rejection (use largest face)
 * P1-S1-38: Confidence filtering
 *
 * Migrated from legacy @mediapipe/face_mesh to @mediapipe/tasks-vision
 * which uses the modern WASM runtime (no Emscripten Module.arguments issue).
 */

import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from '@mediapipe/tasks-vision';
import {
  type FaceMeshResult,
  type FaceLandmark,
  MEDIAPIPE_CONSTANTS,
} from './types';

export interface FaceMeshOptions {
  maxFaces?: number;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
  refineLandmarks?: boolean;
}

export class MediaPipeFaceMesh {
  private faceLandmarker: FaceLandmarker | null = null;
  private options: Required<FaceMeshOptions>;
  private isInitialized = false;
  private isInitializing = false;
  private lastTimestamp = 0;

  constructor(options: FaceMeshOptions = {}) {
    this.options = {
      maxFaces: 1,
      minDetectionConfidence: MEDIAPIPE_CONSTANTS.MIN_FACE_CONFIDENCE,
      minTrackingConfidence: 0.5,
      refineLandmarks: true,
      ...options,
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized || this.isInitializing) {
      return;
    }

    this.isInitializing = true;

    try {
      console.log('[FaceMesh] Loading WASM runtime...');
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm',
      );

      console.log('[FaceMesh] Creating FaceLandmarker...');
      this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: this.options.maxFaces,
        minFaceDetectionConfidence: this.options.minDetectionConfidence,
        minFacePresenceConfidence: this.options.minTrackingConfidence,
        minTrackingConfidence: this.options.minTrackingConfidence,
        outputFacialTransformationMatrixes: false,
      });

      this.isInitialized = true;
      console.log('[FaceMesh] Initialized successfully');
    } catch (error) {
      console.error('[FaceMesh] Failed to initialize:', error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  async processFrame(
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  ): Promise<FaceMeshResult | null> {
    if (!this.isInitialized || !this.faceLandmarker) {
      throw new Error('Face landmarker not initialized. Call initialize() first.');
    }

    try {
      // Ensure monotonically increasing timestamp
      const now = performance.now();
      const timestamp = now > this.lastTimestamp ? now : this.lastTimestamp + 1;
      this.lastTimestamp = timestamp;

      const results = this.faceLandmarker.detectForVideo(
        input as HTMLVideoElement,
        timestamp,
      );
      return this.processResults(results);
    } catch (error) {
      console.error('[FaceMesh] Processing error:', error);
      return null;
    }
  }

  setConfidenceThreshold(confidence: number): void {
    this.options.minDetectionConfidence = confidence;
    // The tasks-vision API doesn't support runtime option changes;
    // would need to recreate the landmarker. Skip for now.
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  dispose(): void {
    this.faceLandmarker?.close();
    this.faceLandmarker = null;
    this.isInitialized = false;
  }

  private processResults(results: FaceLandmarkerResult): FaceMeshResult | null {
    if (!results.faceLandmarks || results.faceLandmarks.length === 0) {
      return null;
    }

    // P1-S1-29: Use largest face if multiple detected
    const landmarks = this.selectPrimaryFace(results.faceLandmarks);
    if (!landmarks) return null;

    const faceLandmarks: FaceLandmark[] = landmarks.map((lm) => ({
      x: lm.x,
      y: lm.y,
      z: lm.z ?? 0,
      visibility: lm.visibility ?? 1.0,
    }));

    const confidence = this.calculateConfidence(faceLandmarks);
    if (confidence < this.options.minDetectionConfidence) {
      return null;
    }

    const boundingBox = this.calculateBoundingBox(faceLandmarks);

    return {
      landmarks: faceLandmarks,
      confidence,
      boundingBox,
      timestamp: performance.now(),
    };
  }

  private selectPrimaryFace(
    allFaces: Array<Array<{ x: number; y: number; z?: number; visibility?: number }>>,
  ): Array<{ x: number; y: number; z?: number; visibility?: number }> | null {
    if (allFaces.length === 0) return null;
    if (allFaces.length === 1) return allFaces[0] ?? null;

    // Select largest face by bounding box area
    let largest: Array<{ x: number; y: number; z?: number; visibility?: number }> | null = allFaces[0] ?? null;
    let largestArea = 0;

    for (const face of allFaces) {
      const area = this.estimateFaceArea(face);
      if (area > largestArea) {
        largestArea = area;
        largest = face;
      }
    }

    return largest;
  }

  private estimateFaceArea(
    face: Array<{ x: number; y: number }>,
  ): number {
    if (face.length < 10) return 0;

    let minX = 1, maxX = 0, minY = 1, maxY = 0;
    for (const lm of face) {
      minX = Math.min(minX, lm.x);
      maxX = Math.max(maxX, lm.x);
      minY = Math.min(minY, lm.y);
      maxY = Math.max(maxY, lm.y);
    }

    return (maxX - minX) * (maxY - minY);
  }

  private calculateConfidence(
    landmarks: Array<{ x: number; y: number; z?: number }>,
  ): number {
    let validPoints = 0;
    const totalPoints = landmarks.length;

    for (const lm of landmarks) {
      if (
        lm.x >= 0 && lm.x <= 1 &&
        lm.y >= 0 && lm.y <= 1 &&
        (!lm.z || !Number.isNaN(lm.z))
      ) {
        validPoints++;
      }
    }

    return validPoints / totalPoints;
  }

  private calculateBoundingBox(
    landmarks: FaceLandmark[],
  ): FaceMeshResult['boundingBox'] {
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
      width: xMax - xMin,
      height: yMax - yMin,
    };
  }
}

// Factory function
export function createFaceMesh(options?: FaceMeshOptions): MediaPipeFaceMesh {
  return new MediaPipeFaceMesh(options);
}

// Key landmark indices (478 landmarks in tasks-vision, superset of the old 468)
export const FACE_LANDMARK_INDICES = {
  NOSE_TIP: 4,
  NOSE_BRIDGE: 6,
  LEFT_EYE_OUTER: 33,
  LEFT_EYE_INNER: 133,
  RIGHT_EYE_OUTER: 362,
  RIGHT_EYE_INNER: 263,
  LEFT_EAR: 234,
  RIGHT_EAR: 454,
  CHIN: 152,
  MOUTH_LEFT: 61,
  MOUTH_RIGHT: 291,
  FOREHEAD_GLABELLA: 9,
} as const;
