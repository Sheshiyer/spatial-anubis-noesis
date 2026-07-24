/**
 * Crystal Spawn from Stone Ash
 * P4-S1-17: Crystal materializes from burned stone
 *
 * After Stone of Intention burns in fire circle, a crystal materializes.
 * This is the first Sigil Forge material.
 * Animated spawn with scale-up and glow effect.
 */

import * as THREE from 'three';

/** Crystal spawn state */
export type CrystalSpawnState = 'dormant' | 'spawning' | 'complete';

/** Crystal configuration */
export interface CrystalConfig {
  /** Crystal base color (Aged Gold) */
  baseColor: THREE.Color;
  /** Crystal glow color */
  glowColor: THREE.Color;
  /** Spawn animation duration (seconds) */
  spawnDuration: number;
  /** Final crystal scale */
  finalScale: number;
  /** Crystal geometry type */
  geometryType: 'octahedron' | 'icosahedron' | 'dodecahedron';
  /** Number of geometry subdivisions */
  detail: number;
}

/** Default crystal config */
export const DEFAULT_CRYSTAL_CONFIG: CrystalConfig = {
  baseColor: new THREE.Color(0xC5A442), // Aged Gold
  glowColor: new THREE.Color(0xD4AF37), // Bright Gold
  spawnDuration: 2.0,
  finalScale: 0.4,
  geometryType: 'icosahedron',
  detail: 0,
};

/** Crystal spawn animation data */
export interface CrystalSpawnData {
  /** Current spawn progress (0-1) */
  progress: number;
  /** Current scale */
  currentScale: number;
  /** Current glow intensity */
  glowIntensity: number;
  /** Current rotation */
  rotation: THREE.Euler;
  /** Spawn state */
  state: CrystalSpawnState;
}

/** Crystal spawn controller */
export class CrystalSpawnController {
  private config: CrystalConfig;
  private spawnData: CrystalSpawnData;
  private elapsedTime: number;
  private spawnPosition: THREE.Vector3;

  constructor(
    spawnPosition: THREE.Vector3,
    config: Partial<CrystalConfig> = {}
  ) {
    this.config = { ...DEFAULT_CRYSTAL_CONFIG, ...config };
    this.spawnPosition = spawnPosition.clone();
    this.elapsedTime = 0;
    this.spawnData = {
      progress: 0,
      currentScale: 0,
      glowIntensity: 0,
      rotation: new THREE.Euler(0, 0, 0),
      state: 'dormant',
    };
  }

  /**
   * Start crystal spawn animation
   */
  startSpawn(): void {
    if (this.spawnData.state !== 'dormant') {
      console.warn('[CrystalSpawn] Cannot start spawn - already spawning or complete');
      return;
    }

    console.log('[CrystalSpawn] Starting crystal spawn animation');
    this.spawnData.state = 'spawning';
    this.elapsedTime = 0;
  }

  /**
   * Update crystal spawn animation
   * Call this in your render loop
   */
  update(deltaTime: number): CrystalSpawnData {
    if (this.spawnData.state !== 'spawning') {
      return this.spawnData;
    }

    this.elapsedTime += deltaTime;
    const progress = Math.min(1, this.elapsedTime / this.config.spawnDuration);

    // Ease-out cubic for smooth spawn
    const eased = 1 - Math.pow(1 - progress, 3);

    // Update scale (grow from 0 to finalScale)
    this.spawnData.currentScale = eased * this.config.finalScale;

    // Update glow intensity (peak at 50%, fade to normal)
    const glowCurve = Math.sin(progress * Math.PI);
    this.spawnData.glowIntensity = glowCurve * 2.0;

    // Update rotation (slow spin during spawn)
    this.spawnData.rotation.y = eased * Math.PI * 2;

    // Update progress
    this.spawnData.progress = progress;

    // Check for completion
    if (progress >= 1.0) {
      this.spawnData.state = 'complete';
      console.log('[CrystalSpawn] Crystal spawn complete');
    }

    return this.spawnData;
  }

  /**
   * Get current spawn data
   */
  getSpawnData(): CrystalSpawnData {
    return { ...this.spawnData };
  }

  /**
   * Get spawn position
   */
  getSpawnPosition(): THREE.Vector3 {
    return this.spawnPosition.clone();
  }

  /**
   * Get crystal state
   */
  getState(): CrystalSpawnState {
    return this.spawnData.state;
  }

  /**
   * Check if spawn is complete
   */
  isComplete(): boolean {
    return this.spawnData.state === 'complete';
  }

  /**
   * Reset spawn controller
   */
  reset(): void {
    this.elapsedTime = 0;
    this.spawnData = {
      progress: 0,
      currentScale: 0,
      glowIntensity: 0,
      rotation: new THREE.Euler(0, 0, 0),
      state: 'dormant',
    };
  }

  /**
   * Create crystal geometry based on config
   */
  createGeometry(): THREE.BufferGeometry {
    switch (this.config.geometryType) {
      case 'octahedron':
        return new THREE.OctahedronGeometry(1, this.config.detail);
      case 'dodecahedron':
        return new THREE.DodecahedronGeometry(1, this.config.detail);
      case 'icosahedron':
      default:
        return new THREE.IcosahedronGeometry(1, this.config.detail);
    }
  }

  /**
   * Create crystal material with current glow
   */
  createMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: this.config.baseColor,
      emissive: this.config.glowColor,
      emissiveIntensity: this.spawnData.glowIntensity,
      roughness: 0.2,
      metalness: 0.8,
      transparent: true,
      opacity: Math.min(1, this.spawnData.progress * 2),
    });
  }

  /**
   * Update material with current glow intensity
   */
  updateMaterial(material: THREE.MeshStandardMaterial): void {
    material.emissiveIntensity = this.spawnData.glowIntensity;
    material.opacity = Math.min(1, this.spawnData.progress * 2);
    material.needsUpdate = true;
  }
}

/**
 * Factory function to create crystal spawn controller
 */
export function createCrystalSpawn(
  spawnPosition: THREE.Vector3,
  config?: Partial<CrystalConfig>
): CrystalSpawnController {
  return new CrystalSpawnController(spawnPosition, config);
}

/**
 * Calculate crystal spawn position from ash position
 * Slight upward offset for visual effect
 */
export function calculateCrystalSpawnPosition(
  ashPosition: THREE.Vector3
): THREE.Vector3 {
  return new THREE.Vector3(
    ashPosition.x,
    ashPosition.y + 0.5, // Hover above ash
    ashPosition.z
  );
}

/**
 * Create crystal particle effect for spawn
 * Returns particle positions for effect
 */
export function generateSpawnParticles(
  spawnPosition: THREE.Vector3,
  count: number = 50
): THREE.Vector3[] {
  const particles: THREE.Vector3[] = [];

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const radius = 0.3 + Math.random() * 0.2;
    const height = Math.random() * 0.5;

    particles.push(
      new THREE.Vector3(
        spawnPosition.x + Math.cos(angle) * radius,
        spawnPosition.y + height,
        spawnPosition.z + Math.sin(angle) * radius
      )
    );
  }

  return particles;
}
