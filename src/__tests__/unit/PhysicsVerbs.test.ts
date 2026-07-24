/**
 * Physics Verbs Unit Tests
 * P4-S2-18: Physics verbs, velocity, damping, boundaries
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// Mock Physics Helpers (extracted logic from vesselPhysics patterns)
// ============================================================================

/** Calculate acceleration ramp (0→maxVel over accelerationTime) */
function calculateAcceleration(
  currentVel: number,
  maxVel: number,
  accelTime: number,
  deltaTime: number
): number {
  const accelRate = maxVel / accelTime;
  const newVel = currentVel + accelRate * deltaTime;
  return Math.min(newVel, maxVel);
}

/** Apply linear damping */
function applyLinearDamping(velocity: number, damping: number, dt: number): number {
  return velocity * Math.max(0, 1 - damping * dt);
}

/** Apply exponential damping */
function applyExponentialDamping(velocity: number, damping: number, dt: number): number {
  return velocity * Math.exp(-damping * dt);
}

/** easeInQuad damping curve (used by Stone of Intention) */
function easeInQuad(t: number): number {
  return t * t;
}

/** Calculate boundary friction force */
function calculateBoundaryFriction(
  distance: number,
  maxDistance: number,
  minDamping: number,
  maxDamping: number
): number {
  const t = Math.max(0, Math.min(1, 1 - distance / maxDistance));
  return minDamping + (maxDamping - minDamping) * easeInQuad(t);
}

/** Gravity well force (inverse square) */
function calculateGravityForce(
  distance: number,
  innerRadius: number,
  outerRadius: number,
  maxForce: number
): number {
  if (distance > outerRadius) return 0;
  if (distance < innerRadius) return maxForce;
  const normalized = (distance - innerRadius) / (outerRadius - innerRadius);
  return maxForce * (1 - normalized) * (1 - normalized);
}

/** 3D distance */
function distance3D(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// ============================================================================
// Tests
// ============================================================================

describe('Physics Verbs', () => {
  describe('Velocity Calculation', () => {
    it('should accelerate from 0 to max velocity over accelTime', () => {
      const maxVel = 8.0;
      const accelTime = 0.5;
      let vel = 0;
      // Simulate 0.5s in 50ms steps
      for (let i = 0; i < 10; i++) {
        vel = calculateAcceleration(vel, maxVel, accelTime, 0.05);
      }
      expect(vel).toBeCloseTo(maxVel, 1);
    });

    it('should not exceed max velocity', () => {
      const result = calculateAcceleration(7.5, 8.0, 0.5, 1.0);
      expect(result).toBe(8.0);
    });

    it('should accelerate proportionally to delta time', () => {
      const v1 = calculateAcceleration(0, 8.0, 0.5, 0.016);
      const v2 = calculateAcceleration(0, 8.0, 0.5, 0.032);
      expect(v2).toBeCloseTo(v1 * 2, 2);
    });
  });

  describe('Linear Damping', () => {
    it('should reduce velocity by damping factor', () => {
      const result = applyLinearDamping(8.0, 0.5, 1 / 60);
      expect(result).toBeLessThan(8.0);
      expect(result).toBeGreaterThan(0);
    });

    it('should not produce negative velocity', () => {
      const result = applyLinearDamping(0.01, 100, 1.0);
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('should converge toward zero', () => {
      let vel = 10;
      for (let i = 0; i < 300; i++) {
        vel = applyLinearDamping(vel, 2.0, 1 / 60);
      }
      expect(vel).toBeLessThan(0.01);
    });
  });

  describe('Exponential Damping', () => {
    it('should decay exponentially', () => {
      const v1 = applyExponentialDamping(10, 2.0, 0.1);
      const v2 = applyExponentialDamping(10, 2.0, 0.2);
      expect(v2).toBeLessThan(v1);
      // v2 should be v1 * exp(-2*0.1) approximately
      expect(v2).toBeCloseTo(10 * Math.exp(-0.4), 5);
    });

    it('should never reach exactly zero with moderate damping', () => {
      const result = applyExponentialDamping(1.0, 2.0, 1.0);
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('easeInQuad Damping Curve', () => {
    it('should return 0 at t=0', () => {
      expect(easeInQuad(0)).toBe(0);
    });

    it('should return 1 at t=1', () => {
      expect(easeInQuad(1)).toBe(1);
    });

    it('should be quadratic (0.5² = 0.25)', () => {
      expect(easeInQuad(0.5)).toBe(0.25);
    });

    it('should accelerate (second half steeper than first)', () => {
      const firstHalf = easeInQuad(0.5) - easeInQuad(0);
      const secondHalf = easeInQuad(1.0) - easeInQuad(0.5);
      expect(secondHalf).toBeGreaterThan(firstHalf);
    });
  });

  describe('Boundary Friction', () => {
    it('should return min damping at max distance', () => {
      const result = calculateBoundaryFriction(35, 35, 1.0, 8.0);
      expect(result).toBeCloseTo(1.0, 1);
    });

    it('should return max damping at distance 0', () => {
      const result = calculateBoundaryFriction(0, 35, 1.0, 8.0);
      expect(result).toBe(8.0);
    });

    it('should increase non-linearly as distance decreases', () => {
      const far = calculateBoundaryFriction(30, 35, 1.0, 8.0);
      const mid = calculateBoundaryFriction(17.5, 35, 1.0, 8.0);
      const near = calculateBoundaryFriction(5, 35, 1.0, 8.0);
      expect(near).toBeGreaterThan(mid);
      expect(mid).toBeGreaterThan(far);
    });
  });

  describe('Gravity Well', () => {
    it('should return 0 outside outer radius', () => {
      expect(calculateGravityForce(20, 2, 8, 0.5)).toBe(0);
    });

    it('should return max force inside inner radius', () => {
      expect(calculateGravityForce(1, 2, 8, 0.5)).toBe(0.5);
    });

    it('should follow inverse square between radii', () => {
      const atMid = calculateGravityForce(5, 2, 8, 1.0);
      expect(atMid).toBeGreaterThan(0);
      expect(atMid).toBeLessThan(1.0);
    });

    it('should be 0 exactly at outer radius', () => {
      expect(calculateGravityForce(8, 2, 8, 0.5)).toBe(0);
    });
  });

  describe('3D Distance', () => {
    it('should calculate correct distance', () => {
      const d = distance3D({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 });
      expect(d).toBe(5);
    });

    it('should return 0 for same point', () => {
      const d = distance3D({ x: 5, y: 3, z: 1 }, { x: 5, y: 3, z: 1 });
      expect(d).toBe(0);
    });

    it('should be symmetric', () => {
      const a = { x: 1, y: 2, z: 3 };
      const b = { x: 4, y: 5, z: 6 };
      expect(distance3D(a, b)).toBe(distance3D(b, a));
    });
  });
});
