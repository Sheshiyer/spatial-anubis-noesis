/**
 * Object State Machine Tests
 * P2-S2-08: Object FSM with validated transitions
 * P2-S2-09: Proximity wake system
 * P2-S2-12: Sleep/wake policy
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import {
  ObjectState,
  VALID_TRANSITIONS,
  ObjectStateConfig,
  DEFAULT_STATE_CONFIG,
} from '../../verbs/types';

// ============================================================================
// State Transition Tests
// ============================================================================

describe('ObjectStateMachine Transitions', () => {
  it('should allow Dormant -> Awakened transition', () => {
    expect(VALID_TRANSITIONS.Dormant).toContain('Awakened');
  });

  it('should not allow Dormant -> Active direct transition', () => {
    expect(VALID_TRANSITIONS.Dormant).not.toContain('Active');
  });

  it('should not allow Dormant -> Ritual direct transition', () => {
    expect(VALID_TRANSITIONS.Dormant).not.toContain('Ritual');
  });

  it('should allow Awakened -> Dormant transition', () => {
    expect(VALID_TRANSITIONS.Awakened).toContain('Dormant');
  });

  it('should allow Awakened -> Active transition', () => {
    expect(VALID_TRANSITIONS.Awakened).toContain('Active');
  });

  it('should allow Active -> Awakened transition', () => {
    expect(VALID_TRANSITIONS.Active).toContain('Awakened');
  });

  it('should allow Active -> Ritual transition', () => {
    expect(VALID_TRANSITIONS.Active).toContain('Ritual');
  });

  it('should allow Active -> Integrated transition', () => {
    expect(VALID_TRANSITIONS.Active).toContain('Integrated');
  });

  it('should allow Ritual -> Active transition', () => {
    expect(VALID_TRANSITIONS.Ritual).toContain('Active');
  });

  it('should allow Ritual -> Integrated transition', () => {
    expect(VALID_TRANSITIONS.Ritual).toContain('Integrated');
  });

  it('should not allow any transitions from Integrated', () => {
    expect(VALID_TRANSITIONS.Integrated).toHaveLength(0);
  });
});

// ============================================================================
// Proximity Configuration Tests
// ============================================================================

describe('Proximity Configuration', () => {
  it('should have correct awaken distance (<10u)', () => {
    expect(DEFAULT_STATE_CONFIG.awakenDistance).toBe(10);
  });

  it('should have correct dormant distance (>20u)', () => {
    expect(DEFAULT_STATE_CONFIG.dormantDistance).toBe(20);
  });

  it('should have correct rest velocity threshold', () => {
    expect(DEFAULT_STATE_CONFIG.sleepVelocityThreshold).toBe(0.1);
  });

  it('should have correct rest timeout', () => {
    expect(DEFAULT_STATE_CONFIG.restTimeoutMs).toBe(2000);
  });

  it('should trigger wake when within awakenDistance', () => {
    const distance = 8;
    const shouldWake = distance < DEFAULT_STATE_CONFIG.awakenDistance;
    expect(shouldWake).toBe(true);
  });

  it('should not trigger wake when beyond awakenDistance', () => {
    const distance = 12;
    const shouldWake = distance < DEFAULT_STATE_CONFIG.awakenDistance;
    expect(shouldWake).toBe(false);
  });

  it('should trigger sleep when beyond dormantDistance', () => {
    const distance = 25;
    const shouldSleep = distance > DEFAULT_STATE_CONFIG.dormantDistance;
    expect(shouldSleep).toBe(true);
  });

  it('should not trigger sleep when within dormantDistance', () => {
    const distance = 15;
    const shouldSleep = distance > DEFAULT_STATE_CONFIG.dormantDistance;
    expect(shouldSleep).toBe(false);
  });
});

// ============================================================================
// Distance Calculation Tests
// ============================================================================

describe('Distance Calculations', () => {
  it('should calculate distance correctly', () => {
    const objPos = new THREE.Vector3(3, 4, 0);
    const vesselPos = new THREE.Vector3(0, 0, 0);
    
    const distance = objPos.distanceTo(vesselPos);
    expect(distance).toBe(5); // 3-4-5 triangle
  });

  it('should calculate 3D distance correctly', () => {
    const objPos = new THREE.Vector3(1, 2, 2);
    const vesselPos = new THREE.Vector3(0, 0, 0);
    
    const distance = objPos.distanceTo(vesselPos);
    expect(distance).toBe(3); // sqrt(1 + 4 + 4) = sqrt(9) = 3
  });

  it('should handle zero distance', () => {
    const pos = new THREE.Vector3(1, 1, 1);
    const distance = pos.distanceTo(pos);
    expect(distance).toBe(0);
  });
});

// ============================================================================
// Rest Condition Tests
// ============================================================================

describe('Rest Conditions', () => {
  it('should detect rest when velocity is below threshold', () => {
    const velocity = { x: 0.05, y: 0.03, z: 0.02 };
    const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2);
    
    const isResting = speed < DEFAULT_STATE_CONFIG.sleepVelocityThreshold;
    expect(isResting).toBe(true);
  });

  it('should not detect rest when velocity is at threshold', () => {
    const velocity = { x: 0.1, y: 0, z: 0 };
    const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2);
    
    const isResting = speed < DEFAULT_STATE_CONFIG.sleepVelocityThreshold;
    expect(isResting).toBe(false);
  });

  it('should not detect rest when velocity exceeds threshold', () => {
    const velocity = { x: 0.5, y: 0.5, z: 0.5 };
    const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2);
    
    const isResting = speed < DEFAULT_STATE_CONFIG.sleepVelocityThreshold;
    expect(isResting).toBe(false);
  });
});

// ============================================================================
// State-to-RigidBody Mapping Tests
// ============================================================================

describe('State to RigidBody Type Mapping', () => {
  it('should map Dormant to fixed', async () => {
    const { STATE_TO_BODY_TYPE } = await import('../../verbs/types');
    expect(STATE_TO_BODY_TYPE.Dormant).toBe('fixed');
  });

  it('should map Awakened to dynamic', async () => {
    const { STATE_TO_BODY_TYPE } = await import('../../verbs/types');
    expect(STATE_TO_BODY_TYPE.Awakened).toBe('dynamic');
  });

  it('should map Active to dynamic', async () => {
    const { STATE_TO_BODY_TYPE } = await import('../../verbs/types');
    expect(STATE_TO_BODY_TYPE.Active).toBe('dynamic');
  });

  it('should map Ritual to kinematicPositionBased', async () => {
    const { STATE_TO_BODY_TYPE } = await import('../../verbs/types');
    expect(STATE_TO_BODY_TYPE.Ritual).toBe('kinematicPositionBased');
  });

  it('should map Integrated to fixed', async () => {
    const { STATE_TO_BODY_TYPE } = await import('../../verbs/types');
    expect(STATE_TO_BODY_TYPE.Integrated).toBe('fixed');
  });
});

// ============================================================================
// State Transition Chain Tests
// ============================================================================

describe('State Transition Chains', () => {
  it('should allow full progression Dormant -> Integrated', () => {
    const path: ObjectState[] = ['Dormant', 'Awakened', 'Active', 'Ritual', 'Integrated'];
    
    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];
      expect(VALID_TRANSITIONS[from]).toContain(to);
    }
  });

  it('should allow early integration Dormant -> Awakened -> Active -> Integrated', () => {
    const path: ObjectState[] = ['Dormant', 'Awakened', 'Active', 'Integrated'];
    
    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];
      expect(VALID_TRANSITIONS[from]).toContain(to);
    }
  });

  it('should allow return to dormant after awakening', () => {
    const path: ObjectState[] = ['Dormant', 'Awakened', 'Dormant'];
    
    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];
      expect(VALID_TRANSITIONS[from]).toContain(to);
    }
  });
});
