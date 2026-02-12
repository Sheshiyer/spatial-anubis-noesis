/**
 * Rapier Physics Integration
 * P0-S1-13: Initialize Rapier WASM physics world
 * P0-S1-14: Fixed-timestep physics loop implementation
 */

import RAPIER from '@dimforge/rapier3d-compat';

let rapierInstance: typeof RAPIER | null = null;
let physicsWorld: RAPIER.World | null = null;

/**
 * Initialize Rapier WASM module and create physics world
 * Gravity set to -9.81 on Y-axis (Earth standard)
 */
export async function initializeRapier(): Promise<typeof RAPIER> {
  if (rapierInstance) {
    return rapierInstance;
  }

  await RAPIER.init();
  rapierInstance = RAPIER;

  const gravity = { x: 0.0, y: -9.81, z: 0.0 };
  physicsWorld = new RAPIER.World(gravity);

  console.log('[Rapier] Initialized:', RAPIER.version());
  console.log('[Rapier] Physics world created with gravity:', gravity);

  return rapierInstance;
}

/**
 * Get the current physics world instance
 */
export function getPhysicsWorld(): RAPIER.World {
  if (!physicsWorld) {
    throw new Error('[Rapier] Physics world not initialized. Call initializeRapier() first.');
  }
  return physicsWorld;
}

/**
 * Get the Rapier instance
 */
export function getRapier(): typeof RAPIER {
  if (!rapierInstance) {
    throw new Error('[Rapier] WASM not initialized. Call initializeRapier() first.');
  }
  return rapierInstance;
}

/**
 * Fixed-timestep physics loop with accumulator pattern
 * Target: 60fps (16.67ms per frame)
 */
export class PhysicsLoop {
  private readonly fixedDeltaTime = 1 / 60; // 16.67ms
  private accumulator = 0;
  private lastTime = performance.now();
  private maxAccumulator = 0.25; // 250ms max to prevent spiral of death

  /**
   * Update physics simulation with fixed timestep
   * Call this in your render loop
   */
  update(): number {
    const currentTime = performance.now() / 1000; // Convert to seconds
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Prevent spiral of death (when physics can't keep up)
    const clampedDelta = Math.min(deltaTime, this.maxAccumulator);
    this.accumulator += clampedDelta;

    let stepsExecuted = 0;

    // Execute fixed timestep updates
    while (this.accumulator >= this.fixedDeltaTime) {
      const world = getPhysicsWorld();
      world.step();
      this.accumulator -= this.fixedDeltaTime;
      stepsExecuted++;

      // Safety limit: max 4 steps per frame
      if (stepsExecuted >= 4) {
        this.accumulator = 0;
        break;
      }
    }

    return stepsExecuted;
  }

  /**
   * Get interpolation alpha for smooth rendering between physics steps
   */
  getAlpha(): number {
    return this.accumulator / this.fixedDeltaTime;
  }

  /**
   * Reset the accumulator (useful when pausing/resuming)
   */
  reset(): void {
    this.accumulator = 0;
    this.lastTime = performance.now() / 1000;
  }
}

/**
 * Create a static ground plane for testing
 */
export function createGroundPlane(width: number, height: number): RAPIER.RigidBody {
  const world = getPhysicsWorld();
  const RAPIER = getRapier();

  const groundBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0, 0);
  const groundBody = world.createRigidBody(groundBodyDesc);

  const groundColliderDesc = RAPIER.ColliderDesc.cuboid(width / 2, 0.1, height / 2);
  world.createCollider(groundColliderDesc, groundBody);

  console.log('[Rapier] Ground plane created:', { width, height });
  return groundBody;
}
