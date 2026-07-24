/**
 * Segmentation mask processing pipeline
 * P1-S1-06: Build segmentation mask processing pipeline
 * - Raw mask → refined mask per frame
 * - Temporal stability filtering
 * - Output suitable for vessel rendering
 */

import { type ProcessedMask, type SegmentationResult } from './types';

export interface MaskProcessingOptions {
  temporalSmoothingFactor?: number; // 0-1, higher = more smoothing
  edgeSmoothness?: number; // 0-1, higher = smoother edges
  enableTemporalFiltering?: boolean;
}

export class MaskProcessingPipeline {
  private options: Required<MaskProcessingOptions>;
  private previousMask: Uint8Array | null = null;
  private maskHistory: Uint8Array[] = [];
  private readonly maxHistorySize = 3;

  constructor(options: MaskProcessingOptions = {}) {
    this.options = {
      temporalSmoothingFactor: 0.3,
      edgeSmoothness: 0.5,
      enableTemporalFiltering: true,
      ...options,
    };
  }

  process(segmentationResult: SegmentationResult): ProcessedMask | null {
    if (!segmentationResult.mask) {
      return null;
    }

    const { mask, width, height } = segmentationResult;
    
    // Convert ImageData to binary mask
    const binaryMask = this.imageDataToBinary(mask);
    
    // Apply temporal filtering for stability
    const smoothedMask = this.options.enableTemporalFiltering
      ? this.applyTemporalSmoothing(binaryMask)
      : binaryMask;
    
    // Apply edge smoothing
    const edgeSmoothedMask = this.applyEdgeSmoothing(smoothedMask, width, height);
    
    // Update history
    this.updateHistory(binaryMask);
    this.previousMask = binaryMask;

    // Calculate stability metrics
    const temporalStability = this.calculateTemporalStability();

    return {
      mask: edgeSmoothedMask,
      width,
      height,
      edgeSmoothness: this.options.edgeSmoothness,
      temporalStability,
    };
  }

  setOptions(options: Partial<MaskProcessingOptions>): void {
    this.options = { ...this.options, ...options };
  }

  reset(): void {
    this.previousMask = null;
    this.maskHistory = [];
  }

  private imageDataToBinary(imageData: ImageData): Uint8Array {
    const { data, width, height } = imageData;
    const binary = new Uint8Array(width * height);

    for (let i = 0; i < width * height; i++) {
      // Use alpha channel or average of RGB
      const alpha = data[i * 4 + 3] ?? 0;
      const r = data[i * 4] ?? 0;
      const g = data[i * 4 + 1] ?? 0;
      const b = data[i * 4 + 2] ?? 0;
      
      // Use max of alpha or average RGB
      const value = Math.max(alpha, (r + g + b) / 3);
      binary[i] = value > 128 ? 255 : 0;
    }

    return binary;
  }

  private applyTemporalSmoothing(currentMask: Uint8Array): Uint8Array {
    if (!this.previousMask || this.previousMask.length !== currentMask.length) {
      return currentMask;
    }

    const smoothed = new Uint8Array(currentMask.length);
    const alpha = this.options.temporalSmoothingFactor;
    const beta = 1 - alpha;

    for (let i = 0; i < currentMask.length; i++) {
      // Weighted average of current and previous
      const current = currentMask[i];
      const previous = this.previousMask[i];
      
      // Use threshold to prevent partial transparency
      const blended = current * beta + previous * alpha;
      smoothed[i] = blended > 128 ? 255 : 0;
    }

    return smoothed;
  }

  private applyEdgeSmoothing(mask: Uint8Array, width: number, height: number): Uint8Array {
    if (this.options.edgeSmoothness <= 0) {
      return mask;
    }

    // Simple box blur for edge smoothing
    const smoothed = new Uint8Array(mask.length);
    const kernelSize = Math.max(1, Math.floor(this.options.edgeSmoothness * 2));

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let count = 0;

        // Sample neighborhood
        for (let ky = -kernelSize; ky <= kernelSize; ky++) {
          for (let kx = -kernelSize; kx <= kernelSize; kx++) {
            const ny = y + ky;
            const nx = x + kx;

            if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
              sum += mask[ny * width + nx] > 0 ? 255 : 0;
              count++;
            }
          }
        }

        // Apply threshold
        const average = sum / count;
        smoothed[y * width + x] = average > 128 ? 255 : 0;
      }
    }

    return smoothed;
  }

  private updateHistory(mask: Uint8Array): void {
    this.maskHistory.push(new Uint8Array(mask));
    
    if (this.maskHistory.length > this.maxHistorySize) {
      this.maskHistory.shift();
    }
  }

  private calculateTemporalStability(): number {
    if (this.maskHistory.length < 2) {
      return 1.0;
    }

    // Calculate pixel-wise variance across history
    const maskSize = this.maskHistory[0].length;
    let totalVariance = 0;

    for (let i = 0; i < maskSize; i++) {
      let sum = 0;
      for (const mask of this.maskHistory) {
        sum += mask[i] > 0 ? 1 : 0;
      }
      const mean = sum / this.maskHistory.length;
      const variance = mean * (1 - mean); // Binary variance
      totalVariance += variance;
    }

    const avgVariance = totalVariance / maskSize;
    // Stability is inverse of variance (1 = perfectly stable)
    return 1 - avgVariance;
  }
}

// Factory function
export function createMaskProcessingPipeline(options?: MaskProcessingOptions): MaskProcessingPipeline {
  return new MaskProcessingPipeline(options);
}

// Utility: Create a distance transform (distance from edge)
export function createDistanceTransform(
  mask: Uint8Array,
  width: number,
  height: number
): Float32Array {
  const distances = new Float32Array(mask.length);
  const maxDistance = 50; // Maximum distance to calculate

  // Initialize: 0 for background, max for foreground
  for (let i = 0; i < mask.length; i++) {
    distances[i] = mask[i] > 0 ? maxDistance : 0;
  }

  // Simple distance transform (can be optimized)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      
      if (mask[idx] > 0) {
        // Find distance to nearest background pixel
        let minDist = maxDistance;
        
        for (let dy = -maxDistance; dy <= maxDistance && minDist > 0; dy++) {
          for (let dx = -maxDistance; dx <= maxDistance && minDist > 0; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            
            if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
              const nidx = ny * width + nx;
              if (mask[nidx] === 0) {
                const dist = Math.sqrt(dx * dx + dy * dy);
                minDist = Math.min(minDist, dist);
              }
            }
          }
        }
        
        distances[idx] = minDist;
      }
    }
  }

  return distances;
}

// Utility: Apply morphological operations
export function morphologicalOperation(
  mask: Uint8Array,
  width: number,
  height: number,
  operation: 'erode' | 'dilate',
  iterations = 1
): Uint8Array {
  let result = new Uint8Array(mask);

  for (let iter = 0; iter < iterations; iter++) {
    const newResult = new Uint8Array(result.length);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        let neighborCount = 0;
        let totalNeighbors = 0;

        // Check 3x3 neighborhood
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ny = y + dy;
            const nx = x + dx;

            if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
              totalNeighbors++;
              if (result[ny * width + nx] > 0) {
                neighborCount++;
              }
            }
          }
        }

        if (operation === 'dilate') {
          // Dilate: set to 255 if any neighbor is 255
          newResult[idx] = neighborCount > 0 ? 255 : 0;
        } else {
          // Erode: set to 0 if any neighbor is 0
          newResult[idx] = neighborCount === totalNeighbors ? 255 : 0;
        }
      }
    }

    result = newResult;
  }

  return result;
}
