/**
 * Witness Agent Types
 * P2-S3: Aletheos & Pichet Witness Agents
 */

/** Witness Agent types */
export type WitnessType = 'aletheos' | 'pichet';

/** Witness Agent state */
export interface WitnessState {
  type: WitnessType;
  isActive: boolean;
  currentValue: number;
  lastUpdate: number;
}

/** Aletheos friction thresholds */
export interface AletheosThresholds {
  /** Coherence threshold for tracking (default: 70) */
  coherenceThreshold: number;
  /** 30s -> friction 0.8 */
  level1Duration: number;
  level1Friction: number;
  /** 60s -> friction 0.5 */
  level2Duration: number;
  level2Friction: number;
  /** 120s -> friction 0.3 */
  level3Duration: number;
  level3Friction: number;
}

/** Default Aletheos thresholds */
export const DEFAULT_ALETHEOS_THRESHOLDS: AletheosThresholds = {
  coherenceThreshold: 70,
  level1Duration: 30,
  level1Friction: 0.8,
  level2Duration: 60,
  level2Friction: 0.5,
  level3Duration: 120,
  level3Friction: 0.3,
};

/** Aletheos state */
export interface AletheosState extends WitnessState {
  type: 'aletheos';
  sustainedDuration: number; // seconds above threshold
  currentFriction: number;
  flowStateAchieved: boolean;
  history: Array<{ timestamp: number; duration: number; friction: number }>;
}

/** Pichet gravity thresholds */
export interface PichetThresholds {
  /** >70 -> 1.0x gravity */
  highThreshold: number;
  highMultiplier: number;
  /** 50-70 -> 1.3x gravity */
  mediumThreshold: number;
  mediumMultiplier: number;
  /** 30-50 -> 1.8x gravity */
  lowThreshold: number;
  lowMultiplier: number;
  /** <30 -> 2.5x gravity */
  veryLowMultiplier: number;
}

/** Default Pichet thresholds */
export const DEFAULT_PICHET_THRESHOLDS: PichetThresholds = {
  highThreshold: 70,
  highMultiplier: 1.0,
  mediumThreshold: 50,
  mediumMultiplier: 1.3,
  lowThreshold: 30,
  lowMultiplier: 1.8,
  veryLowMultiplier: 2.5,
};

/** Pichet state */
export interface PichetState extends WitnessState {
  type: 'pichet';
  physicalCycleScore: number;
  currentGravity: number;
  history: Array<{ timestamp: number; score: number; gravity: number }>;
}

/** Gate Check Protocol result */
export interface GateCheckResult {
  /** Whether the ritual can proceed */
  allowed: boolean;
  /** Current Aletheos friction */
  friction: number;
  /** Current Pichet gravity */
  gravity: number;
  /** Block reason if not allowed */
  blockReason: string | null;
  /** Check timestamp */
  timestamp: number;
}

/** Gate Check thresholds */
export interface GateCheckThresholds {
  /** Maximum allowed friction (block if above) */
  maxFriction: number;
  /** Maximum allowed gravity multiplier (block if above) */
  maxGravity: number;
}

/** Default gate check thresholds */
export const DEFAULT_GATE_CHECK_THRESHOLDS: GateCheckThresholds = {
  maxFriction: 0.6,
  maxGravity: 1.5,
};

/** Witness Agent event types */
export type WitnessEventType = 
  | 'friction_changed'
  | 'gravity_changed'
  | 'flow_state_achieved'
  | 'gate_blocked'
  | 'gate_allowed';

/** Witness Agent event */
export interface WitnessEvent {
  type: WitnessEventType;
  witness: WitnessType;
  value: number;
  previousValue: number;
  timestamp: number;
  data?: Record<string, unknown>;
}

/** Witness event listener */
export type WitnessEventListener = (event: WitnessEvent) => void;
