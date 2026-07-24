/**
 * Segmentation Mask Texture Upload
 * P1-S1-43: Efficient GPU texture transfer via texSubImage2D
 * P1-S1-25: Bilateral filter for edge-preserving noise reduction
 */

import * as THREE from 'three';

/** Texture upload configuration */
export interface SegmentationTextureConfig {
  width: number;
  height: number;
  format: THREE.PixelFormat;
  type: THREE.TextureDataType;
  minFilter: THREE.MinificationTextureFilter;
  magFilter: THREE.MagnificationTextureFilter;
}

/** Default texture config */
export const DEFAULT_SEGMENTATION_TEXTURE_CONFIG: SegmentationTextureConfig = {
  width: 640,
  height: 480,
  format: THREE.LuminanceFormat,
  type: THREE.UnsignedByteType,
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
};

/**
 * GPU texture manager for segmentation masks
 * P1-S1-43: Efficient transfer via texSubImage2D
 */
export class SegmentationTextureManager {
  private texture: THREE.DataTexture;
  private config: SegmentationTextureConfig;
  private gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  private textureLocation: WebGLTexture | null = null;
  private lastUploadTime = 0;

  constructor(config: Partial<SegmentationTextureConfig> = {}) {
    this.config = { ...DEFAULT_SEGMENTATION_TEXTURE_CONFIG, ...config };
    
    // Create initial data buffer
    const size = this.config.width * this.config.height;
    const data = new Uint8Array(size);

    // Create Three.js texture
    this.texture = new THREE.DataTexture(
      data,
      this.config.width,
      this.config.height,
      this.config.format,
      this.config.type
    );
    
    this.texture.minFilter = this.config.minFilter;
    this.texture.magFilter = this.config.magFilter;
    this.texture.needsUpdate = true;
  }

  /**
   * Initialize WebGL context for efficient uploads
   */
  initialize(gl: WebGLRenderingContext | WebGL2RenderingContext): void {
    this.gl = gl;
    
    // Create WebGL texture
    if (gl) {
      this.textureLocation = gl.createTexture();
    }
  }

  /**
   * Upload mask data to GPU
   * P1-S1-43: Efficient transfer via texSubImage2D
   * Target: <2ms per frame
   */
  uploadMask(maskData: Uint8Array | Uint8ClampedArray): void {
    const startTime = performance.now();

    // Validate data size
    const expectedSize = this.config.width * this.config.height;
    if (maskData.length !== expectedSize) {
      console.warn(
        `[SegmentationTexture] Data size mismatch: expected ${expectedSize}, got ${maskData.length}`
      );
      return;
    }

    // Use texSubImage2D for efficient update if WebGL is available
    if (this.gl && this.textureLocation) {
      this.uploadWithTexSubImage2D(maskData);
    } else {
      // Fallback to Three.js texture update
      this.uploadWithThreeJS(maskData);
    }

    const uploadTime = performance.now() - startTime;
    if (uploadTime > 2) {
      console.warn(
        `[SegmentationTexture] Upload time ${uploadTime.toFixed(2)}ms exceeds 2ms target`
      );
    }
    
    this.lastUploadTime = uploadTime;
  }

  /**
   * Upload using WebGL texSubImage2D
   * More efficient for updating existing texture
   */
  private uploadWithTexSubImage2D(maskData: Uint8Array | Uint8ClampedArray): void {
    if (!this.gl || !this.textureLocation) return;

    const gl = this.gl;

    gl.bindTexture(gl.TEXTURE_2D, this.textureLocation);
    
    // Use texSubImage2D to update only the changed region
    // This is faster than creating a new texture each frame
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0, // level
      0, // xoffset
      0, // yoffset
      this.config.width,
      this.config.height,
      gl.LUMINANCE,
      gl.UNSIGNED_BYTE,
      maskData
    );

    // Also update Three.js texture data reference
    this.texture.image.data.set(maskData);
    this.texture.needsUpdate = false; // Already uploaded via WebGL
  }

  /**
   * Upload using Three.js (fallback)
   */
  private uploadWithThreeJS(maskData: Uint8Array | Uint8ClampedArray): void {
    this.texture.image.data.set(maskData);
    this.texture.needsUpdate = true;
  }

  /**
   * Get the texture for use in shaders
   */
  getTexture(): THREE.DataTexture {
    return this.texture;
  }

  /**
   * Get last upload time
   */
  getLastUploadTime(): number {
    return this.lastUploadTime;
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.texture.dispose();
    
    if (this.gl && this.textureLocation) {
      this.gl.deleteTexture(this.textureLocation);
    }
  }
}

/**
 * P1-S1-25: Bilateral filter for segmentation mask
 * Preserves edges while removing noise
 */
export function applyBilateralFilter(
  input: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  spatialSigma = 2.0,
  intensitySigma = 30.0,
  kernelRadius = 3
): Uint8Array {
  const output = new Uint8Array(input.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const centerIdx = y * width + x;
      const centerValue = input[centerIdx];

      let sum = 0;
      let weightSum = 0;

      // Iterate over kernel
      for (let ky = -kernelRadius; ky <= kernelRadius; ky++) {
        for (let kx = -kernelRadius; kx <= kernelRadius; kx++) {
          const sampleX = Math.max(0, Math.min(width - 1, x + kx));
          const sampleY = Math.max(0, Math.min(height - 1, y + ky));
          const sampleIdx = sampleY * width + sampleX;
          const sampleValue = input[sampleIdx];

          // Skip if values are undefined
          if (sampleValue === undefined || centerValue === undefined) continue;

          // Spatial weight (Gaussian based on distance)
          const spatialDist = kx * kx + ky * ky;
          const spatialWeight = Math.exp(
            -spatialDist / (2 * spatialSigma * spatialSigma)
          );

          // Intensity weight (Gaussian based on value difference)
          const intensityDiff = sampleValue - centerValue;
          const intensityWeight = Math.exp(
            -(intensityDiff * intensityDiff) / (2 * intensitySigma * intensitySigma)
          );

          // Combined weight
          const weight = spatialWeight * intensityWeight;

          sum += sampleValue * weight;
          weightSum += weight;
        }
      }

      output[centerIdx] = weightSum > 0 ? Math.round(sum / weightSum) : 0;
    }
  }

  return output;
}

/**
 * Measure noise level in mask
 * Returns percentage of pixel-level noise
 */
export function measureMaskNoise(
  rawMask: Uint8Array | Uint8ClampedArray,
  filteredMask: Uint8Array
): number {
  let diffCount = 0;
  const threshold = 10; // Pixel value difference threshold

  for (let i = 0; i < rawMask.length; i++) {
    const raw = rawMask[i];
    const filtered = filteredMask[i];
    if (raw !== undefined && filtered !== undefined && Math.abs(raw - filtered) > threshold) {
      diffCount++;
    }
  }

  return (diffCount / rawMask.length) * 100;
}
