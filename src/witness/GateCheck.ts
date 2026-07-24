/**
 * Gate Check Protocol
 * P2-S3-08: Combined Aletheos + Pichet evaluation
 * Block ritual if friction > 0.6 OR gravity > 1.5x
 */

import {
  type GateCheckResult,
  type GateCheckThresholds,
  type WitnessEvent,
  type WitnessEventListener,
  DEFAULT_GATE_CHECK_THRESHOLDS,
} from './types';
import { type AletheosAgent } from './Aletheos';
import { type PichetAgent } from './Pichet';

/** Gate Check Protocol */
export class GateCheckProtocol {
  private thresholds: GateCheckThresholds;
  private aletheos: AletheosAgent;
  private pichet: PichetAgent;
  private lastResult: GateCheckResult | null = null;
  private listeners: Set<WitnessEventListener> = new Set();
  private checkHistory: GateCheckResult[] = [];

  constructor(
    aletheos: AletheosAgent,
    pichet: PichetAgent,
    thresholds: Partial<GateCheckThresholds> = {}
  ) {
    this.aletheos = aletheos;
    this.pichet = pichet;
    this.thresholds = { ...DEFAULT_GATE_CHECK_THRESHOLDS, ...thresholds };

    // Listen to agent events
    this.aletheos.onEvent((event) => {
      if (event.type === 'friction_changed') {
        this.evaluate();
      }
    });

    this.pichet.onEvent((event) => {
      if (event.type === 'gravity_changed') {
        this.evaluate();
      }
    });
  }

  /** Perform gate check evaluation */
  evaluate(): GateCheckResult {
    const friction = this.aletheos.getFriction();
    const gravity = this.pichet.getGravity();
    const now = Date.now();

    let allowed = true;
    const blockReasons: string[] = [];

    // Check friction threshold
    if (friction > this.thresholds.maxFriction) {
      allowed = false;
      blockReasons.push(`Friction too high (${friction.toFixed(2)} > ${this.thresholds.maxFriction})`);
    }

    // Check gravity threshold
    if (gravity > this.thresholds.maxGravity) {
      allowed = false;
      blockReasons.push(`Gravity too high (${gravity.toFixed(2)}x > ${this.thresholds.maxGravity}x)`);
    }

    const result: GateCheckResult = {
      allowed,
      friction,
      gravity,
      blockReason: blockReasons.length > 0 ? blockReasons.join('; ') : null,
      timestamp: now,
    };

    this.lastResult = result;
    this.checkHistory.push(result);

    // Keep only last 100 checks
    if (this.checkHistory.length > 100) {
      this.checkHistory.shift();
    }

    // Emit event
    this.emit({
      type: allowed ? 'gate_allowed' : 'gate_blocked',
      witness: 'aletheos', // Primary witness for gate check
      value: allowed ? 1 : 0,
      previousValue: this.lastResult?.allowed ? 1 : 0,
      timestamp: now,
      data: { friction, gravity, blockReason: result.blockReason },
    });

    return result;
  }

  /** Check if ritual can proceed */
  canProceed(): boolean {
    return this.evaluate().allowed;
  }

  /** Get last check result */
  getLastResult(): GateCheckResult | null {
    return this.lastResult;
  }

  /** Get check history */
  getHistory(): GateCheckResult[] {
    return [...this.checkHistory];
  }

  /** Get current status summary */
  getStatus(): {
    canProceed: boolean;
    friction: number;
    gravity: number;
    frictionOk: boolean;
    gravityOk: boolean;
  } {
    const friction = this.aletheos.getFriction();
    const gravity = this.pichet.getGravity();

    return {
      canProceed: friction <= this.thresholds.maxFriction && gravity <= this.thresholds.maxGravity,
      friction,
      gravity,
      frictionOk: friction <= this.thresholds.maxFriction,
      gravityOk: gravity <= this.thresholds.maxGravity,
    };
  }

  /** Subscribe to events */
  onEvent(listener: WitnessEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Emit event */
  private emit(event: WitnessEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error('[GateCheck] Event listener error:', err);
      }
    });
  }

  /** Update thresholds */
  setThresholds(thresholds: Partial<GateCheckThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
    // Re-evaluate with new thresholds
    this.evaluate();
  }

  /** Get thresholds */
  getThresholds(): GateCheckThresholds {
    return { ...this.thresholds };
  }

  /** Reset history */
  reset(): void {
    this.checkHistory = [];
    this.lastResult = null;
  }
}

/** Ritual gate with integration check */
export class RitualGate {
  private protocol: GateCheckProtocol;
  private pendingTransitions: Array<{
    id: string;
    fromState: string;
    toState: string;
    timestamp: number;
  }> = [];

  constructor(protocol: GateCheckProtocol) {
    this.protocol = protocol;
  }

  /** Request ritual state transition */
  requestTransition(fromState: string, toState: string): {
    allowed: boolean;
    reason: string | null;
    transitionId: string;
  } {
    const result = this.protocol.evaluate();
    const transitionId = `transition_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (result.allowed) {
      this.pendingTransitions.push({
        id: transitionId,
        fromState,
        toState,
        timestamp: Date.now(),
      });
    }

    return {
      allowed: result.allowed,
      reason: result.blockReason,
      transitionId,
    };
  }

  /** Confirm transition completion */
  confirmTransition(transitionId: string): void {
    const index = this.pendingTransitions.findIndex((t) => t.id === transitionId);
    if (index !== -1) {
      this.pendingTransitions.splice(index, 1);
    }
  }

  /** Get pending transitions */
  getPendingTransitions(): typeof this.pendingTransitions {
    return [...this.pendingTransitions];
  }

  /** Clear pending transitions */
  clearPending(): void {
    this.pendingTransitions = [];
  }
}

/** Factory functions */
export function createGateCheckProtocol(
  aletheos: AletheosAgent,
  pichet: PichetAgent,
  thresholds?: Partial<GateCheckThresholds>
): GateCheckProtocol {
  return new GateCheckProtocol(aletheos, pichet, thresholds);
}

export function createRitualGate(protocol: GateCheckProtocol): RitualGate {
  return new RitualGate(protocol);
}
