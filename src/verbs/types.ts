/**
 * Kinetic Verbs Type Definitions
 * P2-S2: Kinetic Verbs & Physics Interaction
 */

import type * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import type { HandResult } from '../bio/types';

// ============================================================================
// Element Types
// ============================================================================

export type ElementType = 'fire' | 'water' | 'earth' | 'air' | 'void';

export interface ElementalAffinity {
  primary: ElementType;
  secondary?: ElementType;
}

// ============================================================================
// Object State Machine
// ============================================================================

export type ObjectState = 
  | 'Dormant'     // Fixed, no physics, sleeping
  | 'Awakened'    // Dynamic but stable, awaiting interaction
  | 'Active'      // Full physics, being interacted with
  | 'Ritual'      // Kinematic, controlled by ritual
  | 'Integrated'; // Transitioning to completion

export interface StateTransition {
  from: ObjectState;
  to: ObjectState;
  trigger: 'proximity' | 'grasp' | 'release' | 'rest' | 'ritual' | 'integrate' | 'distance';
  timestamp: number;
}

export interface ObjectStateConfig {
  dormantDistance: number;   // >20u: sleep
  awakenDistance: number;    // <10u: wake
  sleepVelocityThreshold: number;  // <0.1 for 2s
  restTimeoutMs: number;
}

export const DEFAULT_STATE_CONFIG: ObjectStateConfig = {
  dormantDistance: 20,
  awakenDistance: 10,
  sleepVelocityThreshold: 0.1,
  restTimeoutMs: 2000,
};

// Valid state transitions
export const VALID_TRANSITIONS: Record<ObjectState, ObjectState[]> = {
  Dormant: ['Awakened'],
  Awakened: ['Dormant', 'Active'],
  Active: ['Awakened', 'Ritual', 'Integrated'],
  Ritual: ['Active', 'Integrated'],
  Integrated: [], // Terminal state
};

// RigidBody type per state
export const STATE_TO_BODY_TYPE: Record<ObjectState, RAPIER.RigidBodyType> = {
  Dormant: 'fixed',
  Awakened: 'dynamic',
  Active: 'dynamic',
  Ritual: 'kinematicPositionBased',
  Integrated: 'fixed',
};

// ============================================================================
// Kinetic Verbs
// ============================================================================

export type KineticVerbType = 
  | 'GRASP' 
  | 'THROW' 
  | 'ORBIT' 
  | 'STRIKE' 
  | 'BREATHE_SYNC' 
  | 'REST'
  | 'IDLE';

export interface VerbState {
  current: KineticVerbType;
  previous: KineticVerbType;
  isActive: boolean;
  startTime: number;
  targetObjectId: string | null;
}

export interface VerbTransition {
  verb: KineticVerbType;
  targetId: string | null;
  timestamp: number;
  allowed: boolean;
}

// Verb configuration constants
export const VERB_CONFIG = {
  GRASP: {
    springStiffness: 200.0,
    springDamping: 10.0,
    maxDistance: 3.0,
    maxInventory: 2,
  },
  THROW: {
    velocityBufferSize: 5,
    velocityMultiplier: 2.5,
    maxImpulse: 50.0,
    maxVelocity: 50.0,
  },
  ORBIT: {
    minHandConfidence: 0.80,
    releaseThreshold: 0.70,
    radius: 2.0,
  },
  STRIKE: {
    baseThreshold: 12.0,
    tiers: {
      Perfect: { min: 20, max: 30 },
      Adequate: { min: 12, max: 20 },
      Weak: { min: 5, max: 12 },
      Reckless: { min: 30, max: Infinity },
    },
  },
  BREATHE_SYNC: {
    coherenceThreshold: 0.70,
    requiredCycles: 3,
    minScale: 0.8,
    maxScale: 1.4,
  },
  REST: {
    velocityThreshold: 0.1,
    timeoutMs: 2000,
  },
  GLOBAL: {
    cooldownMs: 200,
  },
} as const;

// ============================================================================
// Strike Outcome Tiers
// ============================================================================

export type StrikeTier = 'Perfect' | 'Adequate' | 'Weak' | 'Reckless';

export interface StrikeOutcome {
  tier: StrikeTier;
  momentum: number;
  targetId: string;
  timestamp: number;
}

export function calculateStrikeTier(momentum: number): StrikeTier {
  if (momentum >= 30) return 'Reckless';
  if (momentum >= 20) return 'Perfect';
  if (momentum >= 12) return 'Adequate';
  return 'Weak';
}

export function getTierColor(tier: StrikeTier): string {
  switch (tier) {
    case 'Perfect': return '#FFD700'; // Gold
    case 'Adequate': return '#C65D3B'; // Terracotta
    case 'Weak': return '#6B6B6B'; // Stone grey
    case 'Reckless': return '#DC143C'; // Crimson
  }
}

// ============================================================================
// Grasp / Spring Joint
// ============================================================================

export interface SpringJointConfig {
  stiffness: number;
  damping: number;
  maxDistance: number;
}

export interface GraspState {
  objectId: string;
  joint: RAPIER.ImpulseJoint | null;
  handPosition: THREE.Vector3;
  startTime: number;
  mass: number;
}

// ============================================================================
// Throw Physics
// ============================================================================

export interface VelocitySample {
  position: THREE.Vector3;
  timestamp: number;
  velocity: THREE.Vector3;
}

export interface ThrowState {
  objectId: string;
  velocityBuffer: VelocitySample[];
  isCharging: boolean;
}

// ============================================================================
// Orbit
// ============================================================================

export interface OrbitState {
  objectId: string;
  centerPosition: THREE.Vector3;
  radius: number;
  angularVelocity: THREE.Vector3;
  joint: RAPIER.ImpulseJoint | null;
  handSeparation: number;
}

// ============================================================================
// Breathe Sync
// ============================================================================

export interface BreathSyncState {
  objectId: string;
  coherenceCycles: number;
  lastBreathPhase: number;
  isAttuned: boolean;
  attunementProgress: number; // 0-1
  baseScale: number;
}

// ============================================================================
// Ritual Object
// ============================================================================

export interface RitualObject {
  id: string;
  name: string;
  element: ElementType;
  state: ObjectState;
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  scale: number;
  mass: number;
  rigidBody: RAPIER.RigidBody | null;
  collider: RAPIER.Collider | null;
  visualMesh: THREE.Object3D | null;
  
  // State timing
  stateTransitions: StateTransition[];
  restStartTime: number | null;
  lastActiveTime: number;
  
  // Visual effects
  awakenedOscillation: number;
  activeGlowIntensity: number;
  dissolveProgress: number;
  
  // CCD for fast objects
  ccdEnabled: boolean;
}

// ============================================================================
// Inventory
// ============================================================================

export interface InventoryState {
  graspedObjects: string[];
  maxSlots: number;
}

// ============================================================================
// Hover
// ============================================================================

export interface HoverState {
  hoveredObjectId: string | null;
  hoverStartTime: number;
  originalScale: number;
}

// ============================================================================
// Verb Events
// ============================================================================

export interface VerbEventMap {
  'verb:activate': { verb: KineticVerbType; targetId: string | null };
  'verb:deactivate': { verb: KineticVerbType; targetId: string | null };
  'verb:complete': { verb: KineticVerbType; targetId: string | null; result: unknown };
  'grasp:start': { objectId: string; handPosition: THREE.Vector3 };
  'grasp:end': { objectId: string; thrown: boolean };
  'throw:release': { objectId: string; velocity: THREE.Vector3; impulse: number };
  'strike:impact': { outcome: StrikeOutcome };
  'breath:attune': { objectId: string; cycles: number };
  'rest:enter': { objectId: string };
  'state:change': { objectId: string; from: ObjectState; to: ObjectState };
}
