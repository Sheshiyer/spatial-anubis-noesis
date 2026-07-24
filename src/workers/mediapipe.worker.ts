/**
 * MediaPipe Web Worker
 * P1-S1-05: Create dedicated Web Worker for all MediaPipe processing
 * - Use transferable objects for frames
 * - Return segmentation masks + face/hand landmarks
 * - Target: <33ms round-trip at 30fps
 */

import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Hands } from '@mediapipe/hands';
import {
  type SegmentationResult,
  type FaceMeshResult,
  type HandTrackingResult,
  type MediaPipeResults,
  type SegmentationQuality,
  SEGMENTATION_QUALITY_PRESETS,
  MEDIAPIPE_CONSTANTS,
} from '../bio/types';

// ============================================================================
// Worker State
// ============================================================================

interface WorkerState {
  segmentation: SelfieSegmentation | null;
  faceMesh: FaceMesh | null;
  hands: Hands | null;
  isInitialized: boolean;
  isInitializing: boolean;
  frameCount: number;
  warmupComplete: boolean;
  quality: SegmentationQuality;
}

const state: WorkerState = {
  segmentation: null,
  faceMesh: null,
  hands: null,
  isInitialized: false,
  isInitializing: false,
  frameCount: 0,
  warmupComplete: false,
  quality: 'balanced',
};

// Performance tracking
let frameStartTime = 0;
let segmentationTime = 0;
let faceMeshTime = 0;
let handTrackingTime = 0;

// ============================================================================
// Message Types
// ============================================================================

type WorkerIncomingMessage =
  | { type: 'INIT'; payload: { quality?: SegmentationQuality } }
  | { type: 'PROCESS_FRAME'; payload: ProcessFramePayload }
  | { type: 'SET_QUALITY'; payload: { quality: SegmentationQuality } }
  | { type: 'DISPOSE' };

type WorkerOutgoingMessage =
  | { type: 'INIT_PROGRESS'; payload: { model: string; progress: number } }
  | { type: 'INIT_COMPLETE' }
  | { type: 'INIT_ERROR'; payload: { error: string } }
  | { type: 'FRAME_PROCESSED'; payload: FrameProcessedPayload }
  | { type: 'WARMUP_COMPLETE' }
  | { type: 'PERFORMANCE_REPORT'; payload: PerformancePayload };

interface ProcessFramePayload {
  imageData: ImageData;
  frameNumber: number;
  enableSegmentation: boolean;
  enableFaceMesh: boolean;
  enableHandTracking: boolean;
}

interface FrameProcessedPayload {
  results: MediaPipeResults;
  performance: {
    totalTime: number;
    segmentationTime: number;
    faceMeshTime: number;
    handTrackingTime: number;
  };
}

interface PerformancePayload {
  currentFrameTime: number;
  averageFrameTime: number;
  p99Latency: number;
  fps: number;
  totalProcessingTime: number;
}

// ============================================================================
// Initialization
// ============================================================================

async function initialize(quality: SegmentationQuality = 'balanced'): Promise<void> {
  if (state.isInitialized || state.isInitializing) {
    return;
  }

  state.isInitializing = true;
  state.quality = quality;

  try {
    // Initialize segmentation
    postMessage({
      type: 'INIT_PROGRESS',
      payload: { model: 'segmentation', progress: 0 },
    } as WorkerOutgoingMessage);

    state.segmentation = new SelfieSegmentation({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
      },
    });

    state.segmentation.setOptions({
      modelSelection: 1,
      selfieMode: true,
    });

    // Wait for segmentation to be ready
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Segmentation initialization timeout')), 30000);
      
      const dummyCanvas = new OffscreenCanvas(1, 1);
      const dummyCtx = dummyCanvas.getContext('2d');
      if (dummyCtx) {
        dummyCtx.fillStyle = '#000000';
        dummyCtx.fillRect(0, 0, 1, 1);
        state.segmentation!.send({ image: dummyCanvas as unknown as HTMLCanvasElement })
          .then(() => {
            clearTimeout(timeout);
            resolve();
          })
          .catch((err: Error) => {
            clearTimeout(timeout);
            reject(err);
          });
      }
    });

    postMessage({
      type: 'INIT_PROGRESS',
      payload: { model: 'segmentation', progress: 1 },
    } as WorkerOutgoingMessage);

    // Initialize face mesh
    postMessage({
      type: 'INIT_PROGRESS',
      payload: { model: 'faceMesh', progress: 0 },
    } as WorkerOutgoingMessage);

    state.faceMesh = new FaceMesh({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
      },
    });

    state.faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: MEDIAPIPE_CONSTANTS.MIN_FACE_CONFIDENCE,
      minTrackingConfidence: 0.5,
    });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Face mesh initialization timeout')), 30000);
      
      const dummyCanvas = new OffscreenCanvas(1, 1);
      const dummyCtx = dummyCanvas.getContext('2d');
      if (dummyCtx) {
        dummyCtx.fillStyle = '#000000';
        dummyCtx.fillRect(0, 0, 1, 1);
        state.faceMesh!.send({ image: dummyCanvas as unknown as HTMLCanvasElement })
          .then(() => {
            clearTimeout(timeout);
            resolve();
          })
          .catch((err: Error) => {
            clearTimeout(timeout);
            reject(err);
          });
      }
    });

    postMessage({
      type: 'INIT_PROGRESS',
      payload: { model: 'faceMesh', progress: 1 },
    } as WorkerOutgoingMessage);

    // Initialize hand tracking
    postMessage({
      type: 'INIT_PROGRESS',
      payload: { model: 'handTracking', progress: 0 },
    } as WorkerOutgoingMessage);

    state.hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      },
    });

    state.hands.setOptions({
      maxNumHands: MEDIAPIPE_CONSTANTS.MAX_HANDS,
      modelComplexity: 1,
      minDetectionConfidence: MEDIAPIPE_CONSTANTS.MIN_HAND_CONFIDENCE,
      minTrackingConfidence: 0.5,
    });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Hand tracking initialization timeout')), 30000);
      
      const dummyCanvas = new OffscreenCanvas(1, 1);
      const dummyCtx = dummyCanvas.getContext('2d');
      if (dummyCtx) {
        dummyCtx.fillStyle = '#000000';
        dummyCtx.fillRect(0, 0, 1, 1);
        state.hands!.send({ image: dummyCanvas as unknown as HTMLCanvasElement })
          .then(() => {
            clearTimeout(timeout);
            resolve();
          })
          .catch((err: Error) => {
            clearTimeout(timeout);
            reject(err);
          });
      }
    });

    postMessage({
      type: 'INIT_PROGRESS',
      payload: { model: 'handTracking', progress: 1 },
    } as WorkerOutgoingMessage);

    state.isInitialized = true;
    postMessage({ type: 'INIT_COMPLETE' } as WorkerOutgoingMessage);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
    postMessage({
      type: 'INIT_ERROR',
      payload: { error: errorMessage },
    } as WorkerOutgoingMessage);
  } finally {
    state.isInitializing = false;
  }
}

function setQuality(quality: SegmentationQuality): void {
  state.quality = quality;
  const config = SEGMENTATION_QUALITY_PRESETS[quality];
  
  state.segmentation?.setOptions({
    modelSelection: 1,
    selfieMode: config.selfieMode,
  });
}

function dispose(): void {
  state.segmentation?.close();
  state.faceMesh?.close();
  state.hands?.close();
  
  state.segmentation = null;
  state.faceMesh = null;
  state.hands = null;
  state.isInitialized = false;
  state.frameCount = 0;
  state.warmupComplete = false;
}

// ============================================================================
// Frame Processing
// ============================================================================

async function processFrame(payload: ProcessFramePayload): Promise<void> {
  if (!state.isInitialized) {
    return;
  }

  frameStartTime = performance.now();
  const { imageData, frameNumber, enableSegmentation, enableFaceMesh, enableHandTracking } = payload;

  // P1-S1-32: Warmup - discard first 10 frames
  if (!state.warmupComplete) {
    state.frameCount++;
    if (state.frameCount < MEDIAPIPE_CONSTANTS.WARMUP_FRAMES) {
      return;
    }
    state.warmupComplete = true;
    postMessage({ type: 'WARMUP_COMPLETE' } as WorkerOutgoingMessage);
  }

  // Create canvas from ImageData
  const canvas = new OffscreenCanvas(imageData.width, imageData.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }
  ctx.putImageData(imageData, 0, 0);

  // Process with each enabled model
  let segmentationResult: SegmentationResult | null = null;
  let faceMeshResult: FaceMeshResult | null = null;
  let handTrackingResult: HandTrackingResult | null = null;

  try {
    // Segmentation
    if (enableSegmentation && state.segmentation) {
      const segStart = performance.now();
      segmentationResult = await processSegmentation(canvas);
      segmentationTime = performance.now() - segStart;
    }

    // Face Mesh
    if (enableFaceMesh && state.faceMesh) {
      const faceStart = performance.now();
      faceMeshResult = await processFaceMesh(canvas);
      faceMeshTime = performance.now() - faceStart;
    }

    // Hand Tracking
    if (enableHandTracking && state.hands) {
      const handStart = performance.now();
      handTrackingResult = await processHandTracking(canvas);
      handTrackingTime = performance.now() - handStart;
    }
  } catch (error) {
    console.error('Processing error:', error);
  }

  const totalTime = performance.now() - frameStartTime;

  const results: MediaPipeResults = {
    segmentation: segmentationResult,
    faceMesh: faceMeshResult,
    handTracking: handTrackingResult,
    timestamp: performance.now(),
    frameNumber,
  };

  postMessage({
    type: 'FRAME_PROCESSED',
    payload: {
      results,
      performance: {
        totalTime,
        segmentationTime,
        faceMeshTime,
        handTrackingTime,
      },
    },
  } as WorkerOutgoingMessage);
}

async function processSegmentation(
  canvas: OffscreenCanvas
): Promise<SegmentationResult | null> {
  if (!state.segmentation) return null;

  return new Promise((resolve) => {
    const handleResults = (results: {
      segmentationMask: { getAsImageData: () => ImageData } | null;
      image: { width: number; height: number };
    }) => {
      state.segmentation!.onResults(() => {}); // Clear handler
      
      let mask: ImageData | null = null;
      if (results.segmentationMask) {
        try {
          mask = results.segmentationMask.getAsImageData();
        } catch {
          // Failed to get mask
        }
      }

      resolve({
        mask,
        width: results.image.width,
        height: results.image.height,
        timestamp: performance.now(),
      });
    };

    state.segmentation!.onResults(handleResults);
    state.segmentation!.send({ image: canvas as unknown as HTMLCanvasElement }).catch(() => {
      resolve(null);
    });
  });
}

async function processFaceMesh(
  canvas: OffscreenCanvas
): Promise<FaceMeshResult | null> {
  if (!state.faceMesh) return null;

  return new Promise((resolve) => {
    const handleResults = (results: {
      multiFaceLandmarks?: Array<Array<{ x: number; y: number; z: number }>>;
      image?: { width: number; height: number };
    }) => {
      state.faceMesh!.onResults(() => {}); // Clear handler

      const landmarks = results.multiFaceLandmarks?.[0];
      if (!landmarks) {
        resolve(null);
        return;
      }

      // Calculate bounding box
      let xMin = 1, xMax = 0, yMin = 1, yMax = 0;
      for (const lm of landmarks) {
        xMin = Math.min(xMin, lm.x);
        xMax = Math.max(xMax, lm.x);
        yMin = Math.min(yMin, lm.y);
        yMax = Math.max(yMax, lm.y);
      }

      const width = results.image?.width ?? 1;
      const height = results.image?.height ?? 1;

      resolve({
        landmarks: landmarks.map((lm) => ({
          x: lm.x,
          y: lm.y,
          z: lm.z,
          visibility: 1.0,
        })),
        confidence: 1.0,
        boundingBox: {
          xMin: xMin * width,
          yMin: yMin * height,
          xMax: xMax * width,
          yMax: yMax * height,
          width: (xMax - xMin) * width,
          height: (yMax - yMin) * height,
        },
        timestamp: performance.now(),
      });
    };

    state.faceMesh!.onResults(handleResults);
    state.faceMesh!.send({ image: canvas as unknown as HTMLCanvasElement }).catch(() => {
      resolve(null);
    });
  });
}

async function processHandTracking(
  canvas: OffscreenCanvas
): Promise<HandTrackingResult | null> {
  if (!state.hands) return null;

  return new Promise((resolve) => {
    const handleResults = (results: {
      multiHandLandmarks?: Array<Array<{ x: number; y: number; z: number }>>;
      multiHandedness?: Array<{ label: string; score: number }>;
    }) => {
      state.hands!.onResults(() => {}); // Clear handler

      const hands = results.multiHandLandmarks?.map((landmarks, index) => {
        const handedness = results.multiHandedness?.[index];
        
        let xMin = 1, xMax = 0, yMin = 1, yMax = 0;
        for (const lm of landmarks) {
          xMin = Math.min(xMin, lm.x);
          xMax = Math.max(xMax, lm.x);
          yMin = Math.min(yMin, lm.y);
          yMax = Math.max(yMax, lm.y);
        }

        return {
          landmarks: landmarks.map((lm) => ({
            x: lm.x,
            y: lm.y,
            z: lm.z,
            visibility: 1.0,
          })),
          handedness: (handedness?.label as 'Left' | 'Right') ?? 'Right',
          score: handedness?.score ?? 0,
          boundingBox: { xMin, yMin, xMax, yMax },
        };
      }) ?? [];

      resolve({
        hands,
        timestamp: performance.now(),
      });
    };

    state.hands!.onResults(handleResults);
    state.hands!.send({ image: canvas as unknown as HTMLCanvasElement }).catch(() => {
      resolve(null);
    });
  });
}

// ============================================================================
// Message Handler
// ============================================================================

self.onmessage = async (event: MessageEvent<WorkerIncomingMessage>) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'INIT':
      await initialize(payload?.quality);
      break;
    case 'PROCESS_FRAME':
      await processFrame(payload);
      break;
    case 'SET_QUALITY':
      setQuality(payload.quality);
      break;
    case 'DISPOSE':
      dispose();
      break;
    default:
      console.warn('Unknown message type:', type);
  }
};

// Notify that worker is ready
postMessage({ type: 'INIT_PROGRESS', payload: { model: 'worker', progress: 1 } } as WorkerOutgoingMessage);
