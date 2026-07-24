/**
 * useBioTracking — Master hook for webcam + MediaPipe bio-tracking
 *
 * Composes:
 * - WebcamCapture (getUserMedia at 30fps)
 * - MediaPipeFaceMesh (468 landmarks)
 * - MediaPipeSegmentation (selfie mask)
 * - HeadTiltSmoother (temporal smoothing)
 * - Bio-state estimation (coherence, LQD, entropy)
 *
 * StrictMode-safe: each effect invocation captures its own instances
 * in a closure, so double-mount/unmount cycles don't corrupt state.
 */

import { useEffect, useRef, useState } from 'react';
import { createWebcamCapture, type WebcamCapture } from './webcam';
import { createFaceMesh, type MediaPipeFaceMesh } from './faceMesh';
import {
  createSegmentation,
  createBinaryMask,
  type MediaPipeSegmentation,
} from './segmentation';
import { calculateHeadTilt, HeadTiltSmoother } from './headTilt';
import type { FaceMeshResult, HeadTiltResult } from './types';

export interface BioTrackingState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  faceMeshResult: FaceMeshResult | null;
  segmentationMask: Uint8Array | null;
  maskDimensions: { width: number; height: number };
  headTilt: HeadTiltResult | null;
  videoElement: HTMLVideoElement | null;
  bioState: {
    coherence: number;
    lqd: number;
    entropy: number;
    breathPhase: number;
  };
}

/**
 * Master bio-tracking hook
 * @param enabled - When true, starts webcam + MediaPipe initialization
 */
export function useBioTracking(enabled: boolean): BioTrackingState {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [faceMeshResult, setFaceMeshResult] = useState<FaceMeshResult | null>(null);
  const [segmentationMask, setSegmentationMask] = useState<Uint8Array | null>(null);
  const [maskDimensions, setMaskDimensions] = useState({ width: 640, height: 480 });
  const [headTilt, setHeadTilt] = useState<HeadTiltResult | null>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [bioState, setBioState] = useState({
    coherence: 0,
    lqd: 0,
    entropy: 0,
    breathPhase: 0,
  });

  // HeadTiltSmoother persists across effect re-runs (stateful, not instance-managed)
  const headTiltSmootherRef = useRef(new HeadTiltSmoother());

  // Bio-state estimation counters (shared across effect re-runs for continuity)
  const faceDetectionCountRef = useRef(0);
  const faceLostCountRef = useRef(0);
  const lastFaceSizeRef = useRef(0);
  const faceSizeHistoryRef = useRef<number[]>([]);
  const frameCountRef = useRef(0);

  useEffect(() => {
    console.log('[BioTracking] useEffect fired, enabled =', enabled);
    if (!enabled) return;

    // ── Per-invocation state (StrictMode-safe) ──────────────────────
    // Each effect invocation gets its own cancelled flag and instances.
    // When StrictMode double-mounts, cleanup from mount #1 only affects
    // mount #1's instances, not mount #2's.
    let cancelled = false;
    let webcam: WebcamCapture | null = null;
    let fm: MediaPipeFaceMesh | null = null;
    let seg: MediaPipeSegmentation | null = null;

    setIsLoading(true);
    setError(null);

    async function init() {
      try {
        // ── Step 1: Start webcam (getUserMedia → browser permission dialog) ──
        console.log('[BioTracking] ▶ init() called, enabled =', enabled);
        console.log('[BioTracking] Step 1: Creating webcam capture...');
        webcam = createWebcamCapture({
          width: 640,
          height: 480,
          frameRate: 30,
          mirrored: true,
        });

        console.log('[BioTracking] Step 1: Calling webcam.start() (getUserMedia)...');
        await webcam.start();
        console.log('[BioTracking] Step 1: ✓ Webcam started, stream active');

        if (cancelled) {
          console.log('[BioTracking] Cancelled after webcam start (StrictMode cleanup)');
          webcam.stop();
          return;
        }

        const video = webcam.getVideoElement();
        if (!video) {
          throw new Error('Webcam started but no video element available');
        }
        setVideoElement(video);

        // ── Step 2: Load MediaPipe models from CDN ──
        console.log('[BioTracking] Step 2: Creating MediaPipe instances...');
        fm = createFaceMesh();
        seg = createSegmentation({ quality: 'balanced' });

        console.log('[BioTracking] Step 2: Loading WASM models from CDN...');
        await Promise.all([fm.initialize(), seg.initialize()]);
        console.log('[BioTracking] Step 2: ✓ MediaPipe models loaded');

        if (cancelled) {
          console.log('[BioTracking] Cancelled after model load (StrictMode cleanup)');
          webcam.stop();
          fm.dispose();
          seg.dispose();
          return;
        }

        // ── Step 3: Register frame processing callback ──
        // Capture fm/seg in closure so they're the right instances
        const faceMeshInstance = fm;
        const segInstance = seg;

        webcam.onFrame(async () => {
          if (cancelled || !video) return;

          frameCountRef.current++;

          // Process face mesh every frame (head tracking needs smoothness)
          try {
            const fmResult = await faceMeshInstance.processFrame(video);
            if (cancelled) return;

            if (fmResult) {
              setFaceMeshResult(fmResult);

              const tilt = calculateHeadTilt(fmResult);
              const smoothed = headTiltSmootherRef.current.smooth(tilt);
              setHeadTilt(smoothed);

              faceDetectionCountRef.current++;
              faceLostCountRef.current = 0;
              updateBioStateFromRefs(
                fmResult,
                frameCountRef.current,
                faceDetectionCountRef.current,
                lastFaceSizeRef,
                faceSizeHistoryRef,
                setBioState,
              );
            } else {
              faceLostCountRef.current++;
              if (faceLostCountRef.current > 30) {
                setHeadTilt(null);
              }
            }
          } catch {
            // Face mesh processing can occasionally fail, skip frame
          }

          // Process segmentation every 3rd frame (mask changes slowly)
          if (frameCountRef.current % 3 === 0) {
            try {
              const segResult = await segInstance.processFrame(video);
              if (cancelled) return;

              if (segResult?.mask) {
                const binary = createBinaryMask(segResult.mask, 0.5);
                setSegmentationMask(binary);
                setMaskDimensions({
                  width: segResult.width,
                  height: segResult.height,
                });
              }
            } catch {
              // Segmentation can occasionally fail, skip frame
            }
          }
        });

        if (!cancelled) {
          console.log('[BioTracking] Fully initialized — bio tracking active');
          setIsInitialized(true);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to initialize bio tracking';
        console.error('[BioTracking] ✗ Init FAILED:', message);
        console.error('[BioTracking] Full error:', err);

        if (!cancelled) {
          setError(message);
          setIsLoading(false);
        }

        // Clean up partial init
        webcam?.stop();
        fm?.dispose();
        seg?.dispose();
      }
    }

    init();

    // ── Cleanup: stops THIS invocation's instances ──
    return () => {
      console.log('[BioTracking] Cleaning up...');
      cancelled = true;
      webcam?.stop();
      fm?.dispose();
      seg?.dispose();
      headTiltSmootherRef.current.reset();
      setIsInitialized(false);
      setVideoElement(null);
    };
  }, [enabled]);

  return {
    isInitialized,
    isLoading,
    error,
    faceMeshResult,
    segmentationMask,
    maskDimensions,
    headTilt,
    videoElement,
    bioState,
  };
}

/**
 * Estimate bio-state from face mesh data
 */
function updateBioStateFromRefs(
  fm: FaceMeshResult,
  frameCount: number,
  faceDetectionCount: number,
  lastFaceSize: { current: number },
  faceSizeHistory: { current: number[] },
  setBioState: (state: { coherence: number; lqd: number; entropy: number; breathPhase: number }) => void
) {
  const faceSize = fm.boundingBox.width * fm.boundingBox.height;
  faceSizeHistory.current.push(faceSize);
  if (faceSizeHistory.current.length > 60) {
    faceSizeHistory.current.shift();
  }

  const history = faceSizeHistory.current;

  // Coherence: face detection stability
  const detectionRate = Math.min(1, (faceDetectionCount / Math.max(1, frameCount)) * 1.5);
  const coherence = detectionRate * fm.confidence;

  // LQD: breathing proxy from face size oscillation
  let lqd = 0;
  if (history.length >= 30) {
    const mean = history.reduce((a, b) => a + b, 0) / history.length;
    const variance = history.reduce((a, b) => a + (b - mean) ** 2, 0) / history.length;
    const cv = Math.sqrt(variance) / (mean + 0.001);
    lqd = Math.min(1, cv * 20);
  }

  // Entropy: face position jitter
  let entropy = 0;
  if (lastFaceSize.current > 0) {
    const sizeDelta = Math.abs(faceSize - lastFaceSize.current);
    const normalizedDelta = sizeDelta / (lastFaceSize.current + 0.001);
    entropy = Math.min(1, normalizedDelta * 5);
  }
  lastFaceSize.current = faceSize;

  // Breath phase: sine wave
  const breathPhase = history.length > 10 ? (Math.sin(frameCount * 0.05) + 1) / 2 : 0;

  setBioState({ coherence, lqd, entropy, breathPhase });
}
