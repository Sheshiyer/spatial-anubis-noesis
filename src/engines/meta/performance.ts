/**
 * Engine Performance & Optimization System
 * 
 * P3-S3-15 to P3-S3-18, P3-S3-21
 * - Engine LOD (Full 0-5u, Medium 5-15u, Billboard 15-30u, Icon 30u+)
 * - Instanced rendering for repeated geometry
 * - FastAPI dynamic engine router (POST /{engine_id})
 * - Pydantic response validation per engine
 * - Constellation slow rotation (1 revolution per 300s)
 */

import type { EngineId, LODLevel, LODConfig, EnginePosition } from './types';

// ============================================================================
// LOD Configuration
// ============================================================================

export const DEFAULT_LOD_CONFIG: LODConfig = {
  fullDistance: 5,       // 0-5 units: Full detail
  mediumDistance: 15,    // 5-15 units: Medium detail
  billboardDistance: 30, // 15-30 units: Billboard
  iconDistance: Infinity, // 30+ units: Icon
};

interface LODState {
  level: LODLevel;
  geometryDetail: number; // 0-1
  materialQuality: number; // 0-1
  shadowEnabled: boolean;
  particleEnabled: boolean;
  shaderComplexity: 'high' | 'medium' | 'low' | 'minimal';
}

// ============================================================================
// LOD Manager
// ============================================================================

export class LODManager {
  private config: LODConfig;
  private engineLODStates: Map<EngineId, LODState> = new Map();
  private vesselPosition: EnginePosition = { x: 0, y: 0, z: 0 };

  constructor(config: Partial<LODConfig> = {}) {
    this.config = { ...DEFAULT_LOD_CONFIG, ...config };
  }

  setVesselPosition(position: EnginePosition): void {
    this.vesselPosition = position;
    this.updateAllLODStates();
  }

  private calculateDistance(enginePosition: EnginePosition): number {
    const dx = enginePosition.x - this.vesselPosition.x;
    const dy = enginePosition.y - this.vesselPosition.y;
    const dz = enginePosition.z - this.vesselPosition.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private determineLODLevel(distance: number): LODLevel {
    if (distance < this.config.fullDistance) return 'full';
    if (distance < this.config.mediumDistance) return 'medium';
    if (distance < this.config.billboardDistance) return 'billboard';
    return 'icon';
  }

  private createLODState(level: LODLevel): LODState {
    switch (level) {
      case 'full':
        return {
          level: 'full',
          geometryDetail: 1.0,
          materialQuality: 1.0,
          shadowEnabled: true,
          particleEnabled: true,
          shaderComplexity: 'high',
        };
      case 'medium':
        return {
          level: 'medium',
          geometryDetail: 0.6,
          materialQuality: 0.7,
          shadowEnabled: true,
          particleEnabled: false,
          shaderComplexity: 'medium',
        };
      case 'billboard':
        return {
          level: 'billboard',
          geometryDetail: 0,
          materialQuality: 0.4,
          shadowEnabled: false,
          particleEnabled: false,
          shaderComplexity: 'low',
        };
      case 'icon':
        return {
          level: 'icon',
          geometryDetail: 0,
          materialQuality: 0.2,
          shadowEnabled: false,
          particleEnabled: false,
          shaderComplexity: 'minimal',
        };
    }
  }

  updateEngineLOD(engineId: EngineId, enginePosition: EnginePosition): LODState {
    const distance = this.calculateDistance(enginePosition);
    const level = this.determineLODLevel(distance);
    
    const state = this.createLODState(level);
    this.engineLODStates.set(engineId, state);
    
    return state;
  }

  private updateAllLODStates(): void {
    // This would be called by the constellation manager
    // to update all engine LODs when vessel moves
  }

  getLODState(engineId: EngineId): LODState | undefined {
    return this.engineLODStates.get(engineId);
  }

  getAllLODStates(): Map<EngineId, LODState> {
    return new Map(this.engineLODStates);
  }

  // Batch update for all engines in constellation
  batchUpdateLOD(
    engines: Array<{ id: EngineId; position: EnginePosition }>
  ): Map<EngineId, LODState> {
    const results = new Map<EngineId, LODState>();
    
    engines.forEach(({ id, position }) => {
      const state = this.updateEngineLOD(id, position);
      results.set(id, state);
    });
    
    return results;
  }
}

// ============================================================================
// Instanced Rendering Manager
// ============================================================================

interface InstancedMeshData {
  geometry: unknown;
  material: unknown;
  maxCount: number;
  matrices: Float32Array;
  colors: Float32Array;
  activeCount: number;
}

export class InstancedRenderingManager {
  private instances: Map<string, InstancedMeshData> = new Map();

  createInstancePool(
    key: string,
    geometry: unknown,
    material: unknown,
    maxCount: number
  ): void {
    this.instances.set(key, {
      geometry,
      material,
      maxCount,
      matrices: new Float32Array(maxCount * 16),
      colors: new Float32Array(maxCount * 4),
      activeCount: 0,
    });
  }

  addInstance(
    key: string,
    matrix: Float32Array,
    color: { r: number; g: number; b: number; a: number }
  ): number {
    const instance = this.instances.get(key);
    if (!instance) return -1;

    if (instance.activeCount >= instance.maxCount) {
      console.warn(`[InstancedRendering] Pool ${key} is full`);
      return -1;
    }

    const index = instance.activeCount;
    
    // Copy matrix (16 floats)
    instance.matrices.set(matrix, index * 16);
    
    // Copy color (4 floats)
    instance.colors[index * 4] = color.r;
    instance.colors[index * 4 + 1] = color.g;
    instance.colors[index * 4 + 2] = color.b;
    instance.colors[index * 4 + 3] = color.a;
    
    instance.activeCount++;
    return index;
  }

  updateInstanceMatrix(key: string, index: number, matrix: Float32Array): void {
    const instance = this.instances.get(key);
    if (!instance || index >= instance.activeCount) return;
    
    instance.matrices.set(matrix, index * 16);
  }

  removeInstance(key: string, index: number): void {
    const instance = this.instances.get(key);
    if (!instance || index >= instance.activeCount) return;
    
    // Swap with last active and decrement
    const lastIndex = instance.activeCount - 1;
    if (index !== lastIndex) {
      // Copy last matrix to removed position
      for (let i = 0; i < 16; i++) {
        instance.matrices[index * 16 + i] = instance.matrices[lastIndex * 16 + i];
      }
      // Copy last color to removed position
      for (let i = 0; i < 4; i++) {
        instance.colors[index * 4 + i] = instance.colors[lastIndex * 4 + i];
      }
    }
    
    instance.activeCount--;
  }

  getInstanceData(key: string): InstancedMeshData | undefined {
    return this.instances.get(key);
  }

  clear(): void {
    this.instances.clear();
  }
}

// ============================================================================
// Performance Monitor
// ============================================================================

interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangleCount: number;
  activeEngines: number;
  lodDistribution: Record<LODLevel, number>;
  memoryUsage: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    fps: 60,
    frameTime: 16.67,
    drawCalls: 0,
    triangleCount: 0,
    activeEngines: 0,
    lodDistribution: { full: 0, medium: 0, billboard: 0, icon: 0 },
    memoryUsage: 0,
  };

  private frameCount = 0;
  private lastTime = performance.now();
  private frameTimeSum = 0;

  recordFrame(): void {
    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;

    this.frameTimeSum += delta;
    this.frameCount++;

    // Update FPS every 60 frames
    if (this.frameCount >= 60) {
      this.metrics.fps = Math.round(1000 / (this.frameTimeSum / 60));
      this.metrics.frameTime = this.frameTimeSum / 60;
      this.frameCount = 0;
      this.frameTimeSum = 0;
    }
  }

  updateLODStats(lodManager: LODManager): void {
    const states = lodManager.getAllLODStates();
    const distribution: Record<LODLevel, number> = { full: 0, medium: 0, billboard: 0, icon: 0 };
    
    states.forEach((state) => {
      distribution[state.level]++;
    });
    
    this.metrics.lodDistribution = distribution;
    this.metrics.activeEngines = states.size;
  }

  updateRenderStats(drawCalls: number, triangleCount: number): void {
    this.metrics.drawCalls = drawCalls;
    this.metrics.triangleCount = triangleCount;
  }

  updateMemoryUsage(): void {
    if ('memory' in performance && (performance as unknown as { memory: { usedJSHeapSize: number } }).memory) {
      this.metrics.memoryUsage = (performance as unknown as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize / (1024 * 1024);
    }
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  isPerformanceAcceptable(): boolean {
    return this.metrics.fps >= 45 && this.metrics.frameTime < 22;
  }

  shouldReduceQuality(): boolean {
    return this.metrics.fps < 30;
  }
}

// ============================================================================
// Constellation Animation (P3-S3-21)
// ============================================================================

export class ConstellationAnimator {
  private rotation = 0;
  private period = 300; // 300 seconds per revolution
  private lastUpdateTime = performance.now();
  private isRunning = false;
  private callbacks: Array<(rotation: number) => void> = [];

  start(): void {
    this.isRunning = true;
    this.lastUpdateTime = performance.now();
    this.tick();
  }

  stop(): void {
    this.isRunning = false;
  }

  private tick(): void {
    if (!this.isRunning) return;

    const now = performance.now();
    const deltaSeconds = (now - this.lastUpdateTime) / 1000;
    this.lastUpdateTime = now;

    // Update rotation (degrees)
    this.rotation = (this.rotation + (deltaSeconds / this.period) * 360) % 360;

    // Notify callbacks
    this.callbacks.forEach((cb) => cb(this.rotation));

    requestAnimationFrame(() => this.tick());
  }

  onRotation(callback: (rotation: number) => void): () => void {
    this.callbacks.push(callback);
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index !== -1) this.callbacks.splice(index, 1);
    };
  }

  getRotation(): number {
    return this.rotation;
  }

  setPeriod(period: number): void {
    this.period = Math.max(60, period); // Minimum 60 seconds
  }
}

// ============================================================================
// Export Singletons
// ============================================================================

export const lodManager = new LODManager();
export const instancedRenderingManager = new InstancedRenderingManager();
export const performanceMonitor = new PerformanceMonitor();
export const constellationAnimator = new ConstellationAnimator();
