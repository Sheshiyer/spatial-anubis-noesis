/**
 * MediaPipe Image Segmentation module (tasks-vision API)
 * P1-S1-01: Selfie segmentation for vessel mask
 * P1-S1-41: Quality selector
 *
 * Migrated from legacy @mediapipe/selfie_segmentation to @mediapipe/tasks-vision
 * which uses the modern WASM runtime (no Emscripten Module.arguments issue).
 */

import {
  ImageSegmenter,
  FilesetResolver,
} from '@mediapipe/tasks-vision';
import {
  type SegmentationResult,
  type SegmentationQuality,
  SEGMENTATION_QUALITY_PRESETS,
  type SegmentationQualityConfig,
} from './types';

export interface SegmentationOptions {
  quality: SegmentationQuality;
}

export class MediaPipeSegmentation {
  private segmenter: ImageSegmenter | null = null;
  private config: SegmentationQualityConfig;
  private isInitialized = false;
  private isInitializing = false;
  private lastTimestamp = 0;

  constructor(options: Partial<SegmentationOptions> = {}) {
    this.config = SEGMENTATION_QUALITY_PRESETS[options.quality ?? 'balanced'];
  }

  async initialize(): Promise<void> {
    if (this.isInitialized || this.isInitializing) {
      return;
    }

    this.isInitializing = true;

    try {
      console.log('[Segmentation] Loading WASM runtime...');
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm',
      );

      console.log('[Segmentation] Creating ImageSegmenter...');
      this.segmenter = await ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter_landscape/float16/latest/selfie_segmenter_landscape.tflite',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        outputCategoryMask: true,
        outputConfidenceMasks: false,
      });

      this.isInitialized = true;
      console.log('[Segmentation] Initialized successfully');
    } catch (error) {
      console.error('[Segmentation] Failed to initialize:', error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  async processFrame(
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  ): Promise<SegmentationResult | null> {
    if (!this.isInitialized || !this.segmenter) {
      throw new Error('Segmentation not initialized. Call initialize() first.');
    }

    try {
      // Ensure monotonically increasing timestamp
      const now = performance.now();
      const timestamp = now > this.lastTimestamp ? now : this.lastTimestamp + 1;
      this.lastTimestamp = timestamp;

      const result = this.segmenter.segmentForVideo(
        input as HTMLVideoElement,
        timestamp,
      );

      if (result.categoryMask) {
        const maskData = result.categoryMask.getAsUint8Array();
        const width = result.categoryMask.width;
        const height = result.categoryMask.height;

        // Convert category mask (0/1 values) to RGBA ImageData for compatibility
        // with createBinaryMask and downstream consumers
        const rgba = new Uint8ClampedArray(width * height * 4);
        for (let i = 0; i < width * height; i++) {
          // Category mask: 0 = background, 1+ = person
          const val = (maskData[i] ?? 0) > 0 ? 255 : 0;
          rgba[i * 4] = val;
          rgba[i * 4 + 1] = val;
          rgba[i * 4 + 2] = val;
          rgba[i * 4 + 3] = val;
        }

        const mask = new ImageData(rgba, width, height);

        // Free GPU resources
        result.categoryMask.close();

        return { mask, width, height, timestamp: performance.now() };
      }

      return null;
    } catch (error) {
      console.error('[Segmentation] Processing error:', error);
      return null;
    }
  }

  setQuality(quality: SegmentationQuality): void {
    this.config = SEGMENTATION_QUALITY_PRESETS[quality];
    // The tasks-vision API doesn't support runtime option changes;
    // would need to recreate the segmenter. Skip for now.
  }

  getQuality(): SegmentationQuality {
    return this.config.mode;
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  dispose(): void {
    this.segmenter?.close();
    this.segmenter = null;
    this.isInitialized = false;
  }
}

// Factory function
export function createSegmentation(
  options?: Partial<SegmentationOptions>,
): MediaPipeSegmentation {
  return new MediaPipeSegmentation(options);
}

// Utility to convert segmentation mask to binary mask
export function createBinaryMask(
  segmentationMask: ImageData,
  threshold = 0.5,
): Uint8Array {
  const { data, width, height } = segmentationMask;
  const binaryMask = new Uint8Array(width * height);

  for (let i = 0; i < width * height; i++) {
    // Use alpha channel or first channel depending on format
    const value = data[i * 4 + 3] ?? data[i * 4] ?? 0;
    binaryMask[i] = value > threshold * 255 ? 255 : 0;
  }

  return binaryMask;
}

// Apply horizontal flip to mask (for mirror mode)
export function flipMaskHorizontal(
  mask: Uint8Array,
  width: number,
  height: number,
): Uint8Array {
  const flipped = new Uint8Array(mask.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = y * width + x;
      const dstIdx = y * width + (width - 1 - x);
      flipped[dstIdx] = mask[srcIdx] ?? 0;
    }
  }

  return flipped;
}
