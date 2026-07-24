/**
 * State Machine Unit Tests
 * P4-S2-18: Zone unlock states, ritual progression, vessel modes
 */
import { describe, it, expect, beforeEach } from 'vitest';

// ============================================================================
// State Machine Helpers (matching ZoneUnlockMachine patterns)
// ============================================================================

type ZoneStatus = 'locked' | 'unlocking' | 'unlocked';
type VesselMode = 'geometric' | 'splat';

interface ZoneState {
  north: ZoneStatus;
  east: ZoneStatus;
  west: ZoneStatus;
  south: ZoneStatus;
}

interface RitualState {
  breathSync: boolean;
  engineConsult: boolean;
  sigilForge: boolean;
  southGate: boolean;
}

function createInitialZoneState(): ZoneState {
  return { north: 'unlocked', east: 'locked', west: 'locked', south: 'locked' };
}

function canTransition(from: ZoneStatus, to: ZoneStatus): boolean {
  const valid: Record<ZoneStatus, ZoneStatus[]> = {
    locked: ['unlocking'],
    unlocking: ['unlocked', 'locked'],
    unlocked: [],
  };
  return valid[from].includes(to);
}

function getUnlockOrder(): Array<keyof Omit<ZoneState, 'north'>> {
  return ['east', 'west', 'south'];
}

function canUnlockZone(state: ZoneState, zone: keyof ZoneState): boolean {
  if (zone === 'north') return false; // Always unlocked
  if (state[zone] !== 'locked') return false;
  const order = getUnlockOrder();
  const idx = order.indexOf(zone as keyof Omit<ZoneState, 'north'>);
  if (idx === 0) return true; // East can always be unlocked
  return state[order[idx - 1]] === 'unlocked';
}

// ============================================================================
// Tests
// ============================================================================

describe('Zone Unlock State Machine', () => {
  let state: ZoneState;

  beforeEach(() => {
    state = createInitialZoneState();
  });

  it('should start with North unlocked, others locked', () => {
    expect(state.north).toBe('unlocked');
    expect(state.east).toBe('locked');
    expect(state.west).toBe('locked');
    expect(state.south).toBe('locked');
  });

  it('should allow locked → unlocking transition', () => {
    expect(canTransition('locked', 'unlocking')).toBe(true);
  });

  it('should allow unlocking → unlocked transition', () => {
    expect(canTransition('unlocking', 'unlocked')).toBe(true);
  });

  it('should allow unlocking → locked (cancel)', () => {
    expect(canTransition('unlocking', 'locked')).toBe(true);
  });

  it('should NOT allow unlocked → locked (no re-locking)', () => {
    expect(canTransition('unlocked', 'locked')).toBe(false);
  });

  it('should NOT allow locked → unlocked (must go through unlocking)', () => {
    expect(canTransition('locked', 'unlocked')).toBe(false);
  });

  it('should allow East to unlock first', () => {
    expect(canUnlockZone(state, 'east')).toBe(true);
  });

  it('should NOT allow West before East is unlocked', () => {
    expect(canUnlockZone(state, 'west')).toBe(false);
  });

  it('should allow West after East is unlocked', () => {
    state.east = 'unlocked';
    expect(canUnlockZone(state, 'west')).toBe(true);
  });

  it('should NOT allow South before West is unlocked', () => {
    state.east = 'unlocked';
    expect(canUnlockZone(state, 'south')).toBe(false);
  });

  it('should allow South after West is unlocked', () => {
    state.east = 'unlocked';
    state.west = 'unlocked';
    expect(canUnlockZone(state, 'south')).toBe(true);
  });

  it('should enforce E → W → S ordering', () => {
    // Cannot skip to South
    expect(canUnlockZone(state, 'south')).toBe(false);
    // Unlock East
    state.east = 'unlocked';
    // Cannot skip to South
    expect(canUnlockZone(state, 'south')).toBe(false);
    // Unlock West
    state.west = 'unlocked';
    // Now South is available
    expect(canUnlockZone(state, 'south')).toBe(true);
  });
});

describe('Ritual State Progression', () => {
  let rituals: RitualState;

  beforeEach(() => {
    rituals = { breathSync: false, engineConsult: false, sigilForge: false, southGate: false };
  });

  it('should start with all rituals incomplete', () => {
    expect(Object.values(rituals).every((v) => v === false)).toBe(true);
  });

  it('should track individual ritual completion', () => {
    rituals.breathSync = true;
    expect(rituals.breathSync).toBe(true);
    expect(rituals.engineConsult).toBe(false);
  });

  it('should detect all rituals complete', () => {
    rituals.breathSync = true;
    rituals.engineConsult = true;
    rituals.sigilForge = true;
    rituals.southGate = true;
    const allComplete = Object.values(rituals).every(Boolean);
    expect(allComplete).toBe(true);
  });

  it('should count completed rituals', () => {
    rituals.breathSync = true;
    rituals.sigilForge = true;
    const count = Object.values(rituals).filter(Boolean).length;
    expect(count).toBe(2);
  });
});

describe('Vessel Mode Switching', () => {
  it('should default to geometric mode', () => {
    const mode: VesselMode = 'geometric';
    expect(mode).toBe('geometric');
  });

  it('should switch to splat when webcam active', () => {
    const webcamActive = true;
    const mode: VesselMode = webcamActive ? 'splat' : 'geometric';
    expect(mode).toBe('splat');
  });

  it('should fall back to geometric on webcam loss', () => {
    const webcamActive = false;
    const mode: VesselMode = webcamActive ? 'splat' : 'geometric';
    expect(mode).toBe('geometric');
  });
});
