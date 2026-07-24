/**
 * SparkJS Gaussian Splat Rendering System
 * P0-S2-01: SparkJS integration foundation
 * P1-S1-08: Create SparkJS Dynamic Cloud for vessel rendering
 * 
 * Implements dynamic splat cloud that maps webcam pixels to 3D positions
 */

import * as THREE from 'three';

/** Gaussian Splat data structure */
export interface SplatData {
  position: THREE.Vector3;
  scale: THREE.Vector3;
  rotation: THREE.Quaternion;
  color: THREE.Color;
  alpha: number;
}

/** Splat configuration for vessel rendering */
export interface SplatConfig {
  maxSplats: number;
  activeSplats: number;
  splatSize: number;
  depthCurve: number;
  samplingStride: number;
}

/** Default splat configuration for vessel */
export const DEFAULT_VESSEL_SPLAT_CONFIG: SplatConfig = {
  maxSplats: 150000,
  activeSplats: 7500,
  splatSize: 0.02,
  depthCurve: 0.5,
  samplingStride: 4,
};

/** Splat pool for efficient memory management */
export class SplatPool {
  private positions: Float32Array;
  private scales: Float32Array;
  private rotations: Float32Array;
  private colors: Float32Array;
  private alphas: Float32Array;
  private activeCount = 0;
  private maxCount: number;

  constructor(maxSplats: number) {
    this.maxCount = maxSplats;
    this.positions = new Float32Array(maxSplats * 3);
    this.scales = new Float32Array(maxSplats * 3);
    this.rotations = new Float32Array(maxSplats * 4);
    this.colors = new Float32Array(maxSplats * 3);
    this.alphas = new Float32Array(maxSplats);

    this.reset();
  }

  reset(): void {
    this.activeCount = 0;
    
    for (let i = 0; i < this.maxCount; i++) {
      this.positions[i * 3] = 0;
      this.positions[i * 3 + 1] = 0;
      this.positions[i * 3 + 2] = 0;
      
      this.scales[i * 3] = 1;
      this.scales[i * 3 + 1] = 1;
      this.scales[i * 3 + 2] = 1;
      
      this.rotations[i * 4] = 0;
      this.rotations[i * 4 + 1] = 0;
      this.rotations[i * 4 + 2] = 0;
      this.rotations[i * 4 + 3] = 1;
      
      this.colors[i * 3] = 1;
      this.colors[i * 3 + 1] = 1;
      this.colors[i * 3 + 2] = 1;
      
      this.alphas[i] = 0;
    }
  }

  setSplat(index: number, data: SplatData): void {
    if (index < 0 || index >= this.maxCount) return;

    this.positions[index * 3] = data.position.x;
    this.positions[index * 3 + 1] = data.position.y;
    this.positions[index * 3 + 2] = data.position.z;

    this.scales[index * 3] = data.scale.x;
    this.scales[index * 3 + 1] = data.scale.y;
    this.scales[index * 3 + 2] = data.scale.z;

    this.rotations[index * 4] = data.rotation.x;
    this.rotations[index * 4 + 1] = data.rotation.y;
    this.rotations[index * 4 + 2] = data.rotation.z;
    this.rotations[index * 4 + 3] = data.rotation.w;

    this.colors[index * 3] = data.color.r;
    this.colors[index * 3 + 1] = data.color.g;
    this.colors[index * 3 + 2] = data.color.b;

    this.alphas[index] = data.alpha;
  }

  getSplat(index: number): SplatData | null {
    if (index < 0 || index >= this.maxCount) return null;

    const r = this.colors[index * 3];
    const g = this.colors[index * 3 + 1];
    const b = this.colors[index * 3 + 2];
    const alpha = this.alphas[index];

    if (r === undefined || g === undefined || b === undefined || alpha === undefined) {
      return null;
    }

    return {
      position: new THREE.Vector3(
        this.positions[index * 3] ?? 0,
        this.positions[index * 3 + 1] ?? 0,
        this.positions[index * 3 + 2] ?? 0
      ),
      scale: new THREE.Vector3(
        this.scales[index * 3] ?? 1,
        this.scales[index * 3 + 1] ?? 1,
        this.scales[index * 3 + 2] ?? 1
      ),
      rotation: new THREE.Quaternion(
        this.rotations[index * 4] ?? 0,
        this.rotations[index * 4 + 1] ?? 0,
        this.rotations[index * 4 + 2] ?? 0,
        this.rotations[index * 4 + 3] ?? 1
      ),
      color: new THREE.Color(r, g, b),
      alpha,
    };
  }

  setActiveCount(count: number): void {
    this.activeCount = Math.max(0, Math.min(count, this.maxCount));
  }

  getActiveCount(): number {
    return this.activeCount;
  }

  getMaxCount(): number {
    return this.maxCount;
  }

  getPositionArray(): Float32Array {
    return this.positions;
  }

  getScaleArray(): Float32Array {
    return this.scales;
  }

  getRotationArray(): Float32Array {
    return this.rotations;
  }

  getColorArray(): Float32Array {
    return this.colors;
  }

  getAlphaArray(): Float32Array {
    return this.alphas;
  }
}

/**
 * Map 2D pixel coordinates to curved 3D surface
 * P1-S1-09: Implement pixel-to-3D-space mapping on curved plane
 */
export function mapPixelToCurved3D(
  pixelX: number,
  pixelY: number,
  imageWidth: number,
  imageHeight: number,
  config: SplatConfig
): THREE.Vector3 {
  const u = (pixelX / imageWidth) * 2 - 1;
  const v = (pixelY / imageHeight) * 2 - 1;

  const x = u * 0.5;
  const y = v * 0.75;

  const distanceFromCenter = Math.sqrt(u * u + v * v);
  const z = -config.depthCurve * (distanceFromCenter * distanceFromCenter);

  return new THREE.Vector3(x, y, z);
}

/**
 * Generate splat cloud from segmentation mask and video frame
 * P1-S1-08: Map webcam pixels to 3D splats
 */
export function generateSplatCloudFromMask(
  mask: Uint8Array | Uint8ClampedArray,
  maskWidth: number,
  maskHeight: number,
  videoFrame: HTMLVideoElement | HTMLCanvasElement,
  config: SplatConfig,
  pool: SplatPool
): void {
  const stride = config.samplingStride;
  let splatIndex = 0;

  const canvas = document.createElement('canvas');
  canvas.width = maskWidth;
  canvas.height = maskHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.drawImage(videoFrame, 0, 0, maskWidth, maskHeight);
  const frameData = ctx.getImageData(0, 0, maskWidth, maskHeight);
  const pixels = frameData.data;

  for (let y = 0; y < maskHeight; y += stride) {
    for (let x = 0; x < maskWidth; x += stride) {
      if (splatIndex >= pool.getMaxCount()) break;

      const maskIndex = y * maskWidth + x;
      const maskValue = mask[maskIndex];

      if (maskValue !== undefined && maskValue > 128) {
        const pixelIndex = maskIndex * 4;
        const r = pixels[pixelIndex];
        const g = pixels[pixelIndex + 1];
        const b = pixels[pixelIndex + 2];

        if (r === undefined || g === undefined || b === undefined) continue;

        const position = mapPixelToCurved3D(x, y, maskWidth, maskHeight, config);

        position.x += (Math.random() - 0.5) * 0.02;
        position.y += (Math.random() - 0.5) * 0.02;
        position.z += (Math.random() - 0.5) * 0.01;

        const splat: SplatData = {
          position,
          scale: new THREE.Vector3(
            config.splatSize * (0.8 + Math.random() * 0.4),
            config.splatSize * (0.8 + Math.random() * 0.4),
            config.splatSize * 0.5
          ),
          rotation: new THREE.Quaternion().setFromEuler(
            new THREE.Euler(
              Math.random() * Math.PI,
              Math.random() * Math.PI,
              Math.random() * Math.PI
            )
          ),
          color: new THREE.Color(r / 255, g / 255, b / 255),
          alpha: maskValue / 255,
        };

        pool.setSplat(splatIndex++, splat);
      }
    }
  }

  pool.setActiveCount(splatIndex);
}

/**
 * SparkJS renderer for Three.js
 * P1-S1-08: 60fps target vessel rendering
 */
export class SparkJSRenderer {
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private mesh: THREE.Points;
  private pool: SplatPool;
  private config: SplatConfig;

  constructor(config: SplatConfig = DEFAULT_VESSEL_SPLAT_CONFIG) {
    this.config = config;
    this.pool = new SplatPool(config.maxSplats);

    this.geometry = new THREE.BufferGeometry();
    this.updateGeometry();

    const uniforms = {
      uTime: { value: 0 },
      uCoherence: { value: 0 },
      uLqd: { value: 0 },
      uEntropy: { value: 0 },
    };

    this.material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: this.getVertexShader(),
      fragmentShader: this.getFragmentShader(),
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    this.mesh = new THREE.Points(this.geometry, this.material);
    this.mesh.frustumCulled = false;
  }

  getMesh(): THREE.Points {
    return this.mesh;
  }

  getPool(): SplatPool {
    return this.pool;
  }

  private updateGeometry(): void {
    this.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.pool.getPositionArray(), 3)
    );
    this.geometry.setAttribute(
      'scale',
      new THREE.BufferAttribute(this.pool.getScaleArray(), 3)
    );
    this.geometry.setAttribute(
      'rotation',
      new THREE.BufferAttribute(this.pool.getRotationArray(), 4)
    );
    this.geometry.setAttribute(
      'color',
      new THREE.BufferAttribute(this.pool.getColorArray(), 3)
    );
    this.geometry.setAttribute(
      'alpha',
      new THREE.BufferAttribute(this.pool.getAlphaArray(), 1)
    );
  }

  updateFromMask(
    mask: Uint8Array | Uint8ClampedArray,
    maskWidth: number,
    maskHeight: number,
    videoFrame: HTMLVideoElement | HTMLCanvasElement
  ): void {
    generateSplatCloudFromMask(
      mask,
      maskWidth,
      maskHeight,
      videoFrame,
      this.config,
      this.pool
    );

    const positionAttr = this.geometry.getAttribute('position');
    const colorAttr = this.geometry.getAttribute('color');
    const alphaAttr = this.geometry.getAttribute('alpha');

    if (positionAttr) positionAttr.needsUpdate = true;
    if (colorAttr) colorAttr.needsUpdate = true;
    if (alphaAttr) alphaAttr.needsUpdate = true;

    this.geometry.setDrawRange(0, this.pool.getActiveCount());
  }

  updateUniforms(uniforms: {
    uTime?: number;
    uCoherence?: number;
    uLqd?: number;
    uEntropy?: number;
  }): void {
    const mats = this.material.uniforms;
    if (uniforms.uTime !== undefined && mats.uTime) mats.uTime.value = uniforms.uTime;
    if (uniforms.uCoherence !== undefined && mats.uCoherence) mats.uCoherence.value = uniforms.uCoherence;
    if (uniforms.uLqd !== undefined && mats.uLqd) mats.uLqd.value = uniforms.uLqd;
    if (uniforms.uEntropy !== undefined && mats.uEntropy) mats.uEntropy.value = uniforms.uEntropy;
  }

  setPosition(position: THREE.Vector3): void {
    this.mesh.position.copy(position);
  }

  setRotation(rotation: THREE.Quaternion): void {
    this.mesh.quaternion.copy(rotation);
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }

  private getVertexShader(): string {
    return `
      attribute vec3 scale;
      attribute vec4 rotation;
      attribute vec3 color;
      attribute float alpha;
      
      uniform float uTime;
      uniform float uCoherence;
      uniform float uLqd;
      uniform float uEntropy;
      
      varying vec3 vColor;
      varying float vAlpha;
      
      vec3 rotateByQuaternion(vec3 v, vec4 q) {
        return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
      }
      
      void main() {
        vColor = mix(vec3(0.102, 0.102, 0.18), vec3(0.722, 0.525, 0.043), uCoherence);
        vAlpha = alpha * (0.8 + 0.2 * uCoherence);
        
        float breathing = 1.0 + uLqd * 0.1;
        vec3 finalScale = scale * breathing;
        
        vec3 transformed = rotateByQuaternion(position, rotation) * finalScale;
        
        vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = 20.0 * finalScale.x * (10.0 / -mvPosition.z);
      }
    `;
  }

  private getFragmentShader(): string {
    return `
      varying vec3 vColor;
      varying float vAlpha;
      
      void main() {
        vec2 coord = gl_PointCoord - vec2(0.5);
        float dist = length(coord);
        
        if (dist > 0.5) discard;
        
        float gaussian = exp(-dist * dist * 8.0);
        
        gl_FragColor = vec4(vColor, vAlpha * gaussian);
      }
    `;
  }
}
