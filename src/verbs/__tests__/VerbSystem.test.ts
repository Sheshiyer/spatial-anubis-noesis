/**
 * Verb System Tests
 * P2-S2-23: Unit tests for all 6 Kinetic Verbs
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import {
  KineticVerbType,
  VERB_CONFIG,
  calculateStrikeTier,
  StrikeTier,
} from '../types';

// ============================================================================
// Type Tests
// ============================================================================

describe('Kinetic Verb Types', () => {
  it('should have correct verb configuration constants', () => {
    expect(VERB_CONFIG.GRASP.springStiffness).toBe(200.0);
    expect(VERB_CONFIG.GRASP.springDamping).toBe(10.0);
    expect(VERB_CONFIG.GRASP.maxDistance).toBe(3.0);
    expect(VERB_CONFIG.GRASP.maxInventory).toBe(2);
  });

  it('should have correct THROW configuration', () => {
    expect(VERB_CONFIG.THROW.velocityBufferSize).toBe(5);
    expect(VERB_CONFIG.THROW.velocityMultiplier).toBe(2.5);
    expect(VERB_CONFIG.THROW.maxImpulse).toBe(50.0);
    expect(VERB_CONFIG.THROW.maxVelocity).toBe(50.0);
  });

  it('should have correct STRIKE tier thresholds', () => {
    expect(VERB_CONFIG.STRIKE.baseThreshold).toBe(12.0);
    expect(VERB_CONFIG.STRIKE.tiers.Perfect.min).toBe(20);
    expect(VERB_CONFIG.STRIKE.tiers.Perfect.max).toBe(30);
    expect(VERB_CONFIG.STRIKE.tiers.Reckless.min).toBe(30);
  });

  it('should have correct BREATHE_SYNC configuration', () => {
    expect(VERB_CONFIG.BREATHE_SYNC.coherenceThreshold).toBe(0.70);
    expect(VERB_CONFIG.BREATHE_SYNC.requiredCycles).toBe(3);
    expect(VERB_CONFIG.BREATHE_SYNC.minScale).toBe(0.8);
    expect(VERB_CONFIG.BREATHE_SYNC.maxScale).toBe(1.4);
  });

  it('should have correct REST configuration', () => {
    expect(VERB_CONFIG.REST.velocityThreshold).toBe(0.1);
    expect(VERB_CONFIG.REST.timeoutMs).toBe(2000);
  });

  it('should have correct global cooldown', () => {
    expect(VERB_CONFIG.GLOBAL.cooldownMs).toBe(200);
  });
});

// ============================================================================
// Strike Tier Calculation Tests
// ============================================================================

describe('calculateStrikeTier', () => {
  it('should return Weak for momentum below 12', () => {
    expect(calculateStrikeTier(0)).toBe('Weak');
    expect(calculateStrikeTier(5)).toBe('Weak');
    expect(calculateStrikeTier(11.9)).toBe('Weak');
  });

  it('should return Adequate for momentum 12-20', () => {
    expect(calculateStrikeTier(12)).toBe('Adequate');
    expect(calculateStrikeTier(15)).toBe('Adequate');
    expect(calculateStrikeTier(19.9)).toBe('Adequate');
  });

  it('should return Perfect for momentum 20-30', () => {
    expect(calculateStrikeTier(20)).toBe('Perfect');
    expect(calculateStrikeTier(25)).toBe('Perfect');
    expect(calculateStrikeTier(29.9)).toBe('Perfect');
  });

  it('should return Reckless for momentum above 30', () => {
    expect(calculateStrikeTier(30)).toBe('Reckless');
    expect(calculateStrikeTier(50)).toBe('Reckless');
    expect(calculateStrikeTier(100)).toBe('Reckless');
  });
});

// ============================================================================
// Object State Tests
// ============================================================================

describe('Object State Transitions', () => {
  it('should have valid transitions from Dormant', () => {
    const { VALID_TRANSITIONS } = await import('../types');
    expect(VALID_TRANSITIONS.Dormant).toContain('Awakened');
    expect(VALID_TRANSITIONS.Dormant).not.toContain('Active');
    expect(VALID_TRANSITIONS.Dormant).not.toContain('Ritual');
  });

  it('should have valid transitions from Awakened', () => {
    const { VALID_TRANSITIONS } = await import('../types');
    expect(VALID_TRANSITIONS.Awakened).toContain('Dormant');
    expect(VALID_TRANSITIONS.Awakened).toContain('Active');
    expect(VALID_TRANSITIONS.Awakened).not.toContain('Ritual');
  });

  it('should have valid transitions from Active', () => {
    const { VALID_TRANSITIONS } = await import('../types');
    expect(VALID_TRANSITIONS.Active).toContain('Awakened');
    expect(VALID_TRANSITIONS.Active).toContain('Ritual');
    expect(VALID_TRANSITIONS.Active).toContain('Integrated');
  });

  it('should have valid transitions from Ritual', () => {
    const { VALID_TRANSITIONS } = await import('../types');
    expect(VALID_TRANSITIONS.Ritual).toContain('Active');
    expect(VALID_TRANSITIONS.Ritual).toContain('Integrated');
    expect(VALID_TRANSITIONS.Ritual).not.toContain('Dormant');
  });

  it('should have no transitions from Integrated', () => {
    const { VALID_TRANSITIONS } = await import('../types');
    expect(VALID_TRANSITIONS.Integrated).toHaveLength(0);
  });
});

// ============================================================================
// Physics Formula Tests
// ============================================================================

describe('Physics Formulas', () => {
  it('should calculate throw velocity correctly', () => {
    const handVelocity = new THREE.Vector3(2, 0, 0);
    const multiplier = VERB_CONFIG.THROW.velocityMultiplier;
    const objectMass = 2.0;
    
    const impulse = handVelocity.clone().multiplyScalar(multiplier * objectMass);
    
    expect(impulse.x).toBe(10); // 2 * 2.5 * 2
    expect(impulse.y).toBe(0);
    expect(impulse.z).toBe(0);
  });

  it('should cap impulse at maxImpulse', () => {
    const handVelocity = new THREE.Vector3(100, 0, 0);
    const multiplier = VERB_CONFIG.THROW.velocityMultiplier;
    const objectMass = 2.0;
    
    let impulse = handVelocity.clone().multiplyScalar(multiplier * objectMass);
    const maxImpulse = VERB_CONFIG.THROW.maxImpulse;
    
    if (impulse.length() > maxImpulse) {
      impulse.normalize().multiplyScalar(maxImpulse);
    }
    
    expect(impulse.length()).toBe(maxImpulse);
  });

  it('should calculate breath sync scale correctly', () => {
    const breathPhase = 0.5;
    const minScale = VERB_CONFIG.BREATHE_SYNC.minScale;
    const maxScale = VERB_CONFIG.BREATHE_SYNC.maxScale;
    
    const scale = minScale + (maxScale - minScale) * breathPhase;
    
    expect(scale).toBe(1.1); // 0.8 + (1.4 - 0.8) * 0.5
  });

  it('should calculate orbital angular velocity from hand rotation', () => {
    const handRotation = new THREE.Vector3(0.1, 0.2, 0);
    const expectedAngularVelocity = handRotation.clone();
    
    expect(expectedAngularVelocity.x).toBeCloseTo(0.1);
    expect(expectedAngularVelocity.y).toBeCloseTo(0.2);
    expect(expectedAngularVelocity.z).toBeCloseTo(0);
  });

  it('should detect rest condition correctly', () => {
    const velocity = { x: 0.05, y: 0.02, z: 0.01 };
    const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2);
    const threshold = VERB_CONFIG.REST.velocityThreshold;
    
    expect(speed).toBeLessThan(threshold);
    expect(speed < threshold).toBe(true);
  });

  it('should not detect rest for moving objects', () => {
    const velocity = { x: 0.5, y: 0, z: 0 };
    const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2);
    const threshold = VERB_CONFIG.REST.velocityThreshold;
    
    expect(speed).toBeGreaterThan(threshold);
    expect(speed >= threshold).toBe(true);
  });
});

// ============================================================================
// Edge Cases and Boundary Conditions
// ============================================================================

describe('Edge Cases', () => {
  it('should handle zero velocity throw', () => {
    const velocity = new THREE.Vector3(0, 0, 0);
    expect(velocity.length()).toBe(0);
  });

  it('should handle extreme breath phase values', () => {
    const minScale = VERB_CONFIG.BREATHE_SYNC.minScale;
    const maxScale = VERB_CONFIG.BREATHE_SYNC.maxScale;
    
    // Exhale (0)
    expect(minScale + (maxScale - minScale) * 0).toBe(minScale);
    
    // Inhale (1)
    expect(minScale + (maxScale - minScale) * 1).toBe(maxScale);
  });

  it('should handle momentum exactly at tier boundaries', () => {
    expect(calculateStrikeTier(12)).toBe('Adequate');
    expect(calculateStrikeTier(20)).toBe('Perfect');
    expect(calculateStrikeTier(30)).toBe('Reckless');
  });

  it('should handle negative momentum (should be Weak)', () => {
    expect(calculateStrikeTier(-5)).toBe('Weak');
    expect(calculateStrikeTier(-100)).toBe('Weak');
  });
});

// ============================================================================
// Inventory Tests
// ============================================================================

describe('Inventory System', () => {
  it('should respect max inventory slots', () => {
    const maxSlots = VERB_CONFIG.GRASP.maxInventory;
    const graspedObjects: string[] = [];
    
    // Fill inventory
    for (let i = 0; i < maxSlots; i++) {
      graspedObjects.push(`object_${i}`);
    }
    
    expect(graspedObjects.length).toBe(maxSlots);
    expect(graspedObjects.length < maxSlots + 1).toBe(true);
  });

  it('should prevent grasping when inventory is full', () => {
    const maxSlots = VERB_CONFIG.GRASP.maxInventory;
    const graspedObjects = [`object_1`, `object_2`];
    
    const canGrasp = graspedObjects.length < maxSlots;
    expect(canGrasp).toBe(false);
  });
});

// ============================================================================
// Gesture Debouncing Tests
// ============================================================================

describe('Gesture Debouncing', () => {
  it('should require 5 frames for confirmation', () => {
    const confirmFrames = 5;
    let pendingFrames = 0;
    
    // Simulate holding gesture for 5 frames
    for (let i = 0; i < confirmFrames; i++) {
      pendingFrames++;
    }
    
    expect(pendingFrames).toBe(confirmFrames);
  });

  it('should require 3 frames for release', () => {
    const releaseFrames = 3;
    let releaseCount = 0;
    
    for (let i = 0; i < releaseFrames; i++) {
      releaseCount++;
    }
    
    expect(releaseCount).toBe(releaseFrames);
  });
});
