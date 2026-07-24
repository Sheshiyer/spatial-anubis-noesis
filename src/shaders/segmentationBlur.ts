/**
 * Segmentation Mask Smoothstep Edge Blur Shader
 * P1-S1-07: Implement smoothstep edge blur shader on segmentation mask
 * P1-S1-23: Implement splat transparency at body edges
 */

/**
 * Vertex shader for segmentation mask processing
 */
export const segmentationBlurVertexShader = `
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * Fragment shader for smoothstep edge blur on segmentation mask
 * Creates organic falloff at mask boundaries instead of hard cut
 * 
 * Uniforms:
 * - maskTexture: The segmentation mask texture
 * - edgeWidth: Width of the gradient falloff in UV space (default: 0.01 = ~8px at 1080p)
 * - edgeAlpha: Alpha at the very edge (default: 0.5 for ghostly effect)
 * - centerAlpha: Alpha at the center of the mask (default: 1.0)
 */
export const segmentationBlurFragmentShader = `
  uniform sampler2D maskTexture;
  uniform float edgeWidth;
  uniform float edgeAlpha;
  uniform float centerAlpha;
  uniform vec2 resolution;
  
  varying vec2 vUv;
  
  // Smoothstep function for smooth interpolation
  float smoothStep(float edge0, float edge1, float x) {
    float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
  }
  
  // Sample mask with bilinear filtering at offset
  float sampleMask(vec2 uv) {
    return texture2D(maskTexture, uv).r;
  }
  
  // Calculate edge distance using gradient
  float calculateEdgeFactor(vec2 uv) {
    vec2 texel = 1.0 / resolution;
    
    // Sample neighboring pixels for edge detection
    float center = sampleMask(uv);
    float left = sampleMask(uv - vec2(texel.x, 0.0));
    float right = sampleMask(uv + vec2(texel.x, 0.0));
    float up = sampleMask(uv - vec2(0.0, texel.y));
    float down = sampleMask(uv + vec2(0.0, texel.y));
    
    // Calculate gradient magnitude (edge strength)
    float dx = abs(right - left) * 0.5;
    float dy = abs(up - down) * 0.5;
    float gradient = sqrt(dx * dx + dy * dy);
    
    // Distance from edge (approximate)
    float edgeDistance = center / max(gradient, 0.001);
    
    return edgeDistance;
  }
  
  void main() {
    float maskValue = sampleMask(vUv);
    
    // Discard completely outside mask
    if (maskValue < 0.01) {
      discard;
    }
    
    // Calculate edge factor
    float edgeFactor = calculateEdgeFactor(vUv);
    
    // Smoothstep from edge to center
    // edgeWidth controls the falloff distance
    float smoothedMask = smoothStep(0.0, edgeWidth * 50.0, edgeFactor);
    
    // Interpolate alpha from edgeAlpha to centerAlpha
    float finalAlpha = mix(edgeAlpha, centerAlpha, smoothedMask * maskValue);
    
    // Output grayscale mask with alpha
    gl_FragColor = vec4(vec3(maskValue), finalAlpha * maskValue);
  }
`;

/**
 * Shader uniforms for segmentation blur
 */
export interface SegmentationBlurUniforms {
  maskTexture: { value: THREE.Texture | null };
  edgeWidth: { value: number };
  edgeAlpha: { value: number };
  centerAlpha: { value: number };
  resolution: { value: THREE.Vector2 };
}

/**
 * Create default uniforms for segmentation blur shader
 */
export function createSegmentationBlurUniforms(
  resolution: { width: number; height: number }
): SegmentationBlurUniforms {
  return {
    maskTexture: { value: null },
    edgeWidth: { value: 0.008 }, // ~8px at 1080p
    edgeAlpha: { value: 0.5 }, // Ghostly edge
    centerAlpha: { value: 1.0 },
    resolution: { value: new THREE.Vector2(resolution.width, resolution.height) },
  };
}

/**
 * Bilateral filter parameters for edge-preserving noise reduction
 * P1-S1-25: Implement bilateral filter on segmentation mask
 */
export interface BilateralFilterParams {
  /** Spatial sigma (pixel distance weight) */
  spatialSigma: number;
  /** Color/intensity sigma (value similarity weight) */
  intensitySigma: number;
  /** Kernel radius in pixels */
  kernelRadius: number;
}

/** Default bilateral filter parameters */
export const DEFAULT_BILATERAL_PARAMS: BilateralFilterParams = {
  spatialSigma: 2.0,
  intensitySigma: 0.1,
  kernelRadius: 3,
};

/**
 * Bilateral filter fragment shader
 * Preserves edges while removing noise
 */
export const bilateralFilterFragmentShader = `
  uniform sampler2D inputTexture;
  uniform vec2 resolution;
  uniform float spatialSigma;
  uniform float intensitySigma;
  uniform int kernelRadius;
  
  varying vec2 vUv;
  
  void main() {
    vec2 texel = 1.0 / resolution;
    float centerValue = texture2D(inputTexture, vUv).r;
    
    float sum = 0.0;
    float weightSum = 0.0;
    
    // Iterate over kernel
    for (int x = -5; x <= 5; x++) {
      for (int y = -5; y <= 5; y++) {
        if (abs(x) > kernelRadius || abs(y) > kernelRadius) continue;
        
        vec2 offset = vec2(float(x), float(y)) * texel;
        float sampleValue = texture2D(inputTexture, vUv + offset).r;
        
        // Spatial weight (Gaussian based on distance)
        float spatialDist = float(x * x + y * y);
        float spatialWeight = exp(-spatialDist / (2.0 * spatialSigma * spatialSigma));
        
        // Intensity weight (Gaussian based on value difference)
        float intensityDiff = sampleValue - centerValue;
        float intensityWeight = exp(-(intensityDiff * intensityDiff) / (2.0 * intensitySigma * intensitySigma));
        
        // Combined weight
        float weight = spatialWeight * intensityWeight;
        
        sum += sampleValue * weight;
        weightSum += weight;
      }
    }
    
    float filteredValue = sum / max(weightSum, 0.001);
    
    gl_FragColor = vec4(vec3(filteredValue), 1.0);
  }
`;

// Import THREE for types
import * as THREE from 'three';
