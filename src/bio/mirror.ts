/**
 * Webcam horizontal mirror mode
 * P1-S1-35: Implement webcam horizontal mirror mode
 * - Natural self-viewing (mirror behavior)
 */

import { type FrameData } from './types';

export interface MirrorOptions {
  enabled?: boolean;
}

export class MirrorController {
  private enabled: boolean;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  constructor(options: MirrorOptions = {}) {
    this.enabled = options.enabled ?? true;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  // Apply mirror transform to a canvas context
  applyToContext(ctx: CanvasRenderingContext2D, width: number): void {
    if (!this.enabled) {
      return;
    }

    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }

  // Mirror an ImageData horizontally
  mirrorImageData(imageData: ImageData): ImageData {
    if (!this.enabled) {
      return imageData;
    }

    const { width, height, data } = imageData;
    const mirroredData = new Uint8ClampedArray(data.length);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIdx = (y * width + x) * 4;
        const dstIdx = (y * width + (width - 1 - x)) * 4;

        mirroredData[dstIdx] = data[srcIdx];
        mirroredData[dstIdx + 1] = data[srcIdx + 1];
        mirroredData[dstIdx + 2] = data[srcIdx + 2];
        mirroredData[dstIdx + 3] = data[srcIdx + 3];
      }
    }

    return new ImageData(mirroredData, width, height);
  }

  // Mirror frame data
  processFrame(frame: FrameData): FrameData {
    if (!this.enabled || !frame.data) {
      return frame;
    }

    return {
      ...frame,
      data: this.mirrorImageData(frame.data),
    };
  }

  // Transform coordinates from mirrored to original space
  transformCoordinates(x: number, width: number): number {
    if (!this.enabled) {
      return x;
    }
    return width - 1 - x;
  }

  // Transform normalized coordinates (0-1)
  transformNormalized(x: number): number {
    if (!this.enabled) {
      return x;
    }
    return 1 - x;
  }

  // Transform landmark coordinates
  transformLandmarks<T extends { x: number; y: number }>(landmarks: T[], imageWidth?: number): T[] {
    if (!this.enabled) {
      return landmarks;
    }

    return landmarks.map((lm) => ({
      ...lm,
      x: imageWidth !== undefined ? this.transformCoordinates(lm.x, imageWidth) : this.transformNormalized(lm.x),
    }));
  }
}

// Factory function
export function createMirrorController(options?: MirrorOptions): MirrorController {
  return new MirrorController(options);
}

// CSS transform for video elements
export function getMirrorCSS(enabled: boolean): string {
  return enabled ? 'scaleX(-1)' : 'scaleX(1)';
}

// WebGL texture coordinate transform
export function getMirrorTextureMatrix(enabled: boolean): Float32Array {
  if (!enabled) {
    // Identity matrix
    return new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ]);
  }

  // Horizontal flip matrix
  return new Float32Array([
      -1, 0, 0, 0,
       0, 1, 0, 0,
       0, 0, 1, 0,
       1, 0, 0, 1,
  ]);
}
