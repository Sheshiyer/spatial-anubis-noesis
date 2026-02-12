/**
 * Utility functions for synchronizing Three.js objects with Rapier physics
 * P0-S1-15: Three.js ↔ Rapier sync
 */

import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';

/**
 * Sync Three.js object position/rotation from Rapier rigid body
 */
export function syncThreeFromRapier(
  threeObject: THREE.Object3D,
  rigidBody: RAPIER.RigidBody
): void {
  const position = rigidBody.translation();
  const rotation = rigidBody.rotation();

  threeObject.position.set(position.x, position.y, position.z);
  threeObject.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
}

/**
 * Sync Rapier rigid body from Three.js object position/rotation
 */
export function syncRapierFromThree(
  rigidBody: RAPIER.RigidBody,
  threeObject: THREE.Object3D
): void {
  rigidBody.setTranslation(
    {
      x: threeObject.position.x,
      y: threeObject.position.y,
      z: threeObject.position.z,
    },
    true
  );

  rigidBody.setRotation(
    {
      x: threeObject.quaternion.x,
      y: threeObject.quaternion.y,
      z: threeObject.quaternion.z,
      w: threeObject.quaternion.w,
    },
    true
  );
}

/**
 * Apply force to a rigid body (for kinetic interactions)
 */
export function applyForce(rigidBody: RAPIER.RigidBody, force: THREE.Vector3, wakeUp = true): void {
  rigidBody.applyImpulse({ x: force.x, y: force.y, z: force.z }, wakeUp);
}

/**
 * Apply torque to a rigid body (for rotational interactions)
 */
export function applyTorque(
  rigidBody: RAPIER.RigidBody,
  torque: THREE.Vector3,
  wakeUp = true
): void {
  rigidBody.applyTorqueImpulse({ x: torque.x, y: torque.y, z: torque.z }, wakeUp);
}

/**
 * Check if two rigid bodies are colliding
 * Note: Uses collider-level contact detection
 */
export function areColliding(
  world: RAPIER.World,
  bodyA: RAPIER.RigidBody,
  bodyB: RAPIER.RigidBody
): boolean {
  let colliding = false;

  // Iterate through all colliders on bodyA
  const numCollidersA = bodyA.numColliders();
  for (let i = 0; i < numCollidersA; i++) {
    const colliderA = bodyA.collider(i);

    world.contactPairsWith(colliderA, (otherCollider) => {
      // Check if the other collider belongs to bodyB
      const otherBody = otherCollider.parent();
      if (otherBody && otherBody.handle === bodyB.handle) {
        colliding = true;
      }
    });

    if (colliding) break;
  }

  return colliding;
}
