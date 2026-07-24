/**
 * Witness Agents Module
 * P2-S3: Aletheos & Pichet Witness Agents
 * 
 * - Aletheos: Coherence-based friction modifier
 * - Pichet: Physical cycle-based gravity modifier
 * - GateCheck: Combined evaluation protocol
 */

// Aletheos Agent
export {
  AletheosAgent,
  CoherenceDurationTimer,
  createAletheosAgent,
  createCoherenceTimer,
} from './Aletheos';

// Pichet Agent
export {
  PichetAgent,
  GravityController,
  createPichetAgent,
  createGravityController,
  GRAVITY_TIERS,
  getGravityTierInfo,
} from './Pichet';

// Gate Check Protocol
export {
  GateCheckProtocol,
  RitualGate,
  createGateCheckProtocol,
  createRitualGate,
} from './GateCheck';

// React Hooks
export {
  useAletheos,
  usePichet,
  useGateCheck,
  useWitnessAgents,
  useCoherenceDurationTimer,
  useGravityController,
} from './useWitness';

// Types
export type {
  WitnessType,
  WitnessState,
  AletheosThresholds,
  AletheosState,
  PichetThresholds,
  PichetState,
  GateCheckResult,
  GateCheckThresholds,
  WitnessEvent,
  WitnessEventType,
  WitnessEventListener,
} from './types';

// Constants
export {
  DEFAULT_ALETHEOS_THRESHOLDS,
  DEFAULT_PICHET_THRESHOLDS,
  DEFAULT_GATE_CHECK_THRESHOLDS,
} from './types';
