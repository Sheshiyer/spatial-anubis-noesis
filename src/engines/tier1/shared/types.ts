/**
 * Tier 1 Ancient Instruments - Shared Types
 * P3-S1: I-Ching, Vimshottari, Tarot, Runes, Numerology
 */

import type * as THREE from 'three';
import type { KineticVerbType } from '../../../verbs/types';

// ============================================================================
// Engine State Types
// ============================================================================

export type EngineId = 
  | 'i-ching' 
  | 'vimshottari' 
  | 'tarot' 
  | 'runes' 
  | 'numerology';

export type EngineStatus = 'locked' | 'unlocked' | 'active' | 'completed';

export type InteractionState = 'idle' | 'hovered' | 'engaged' | 'reading_in_progress';

export interface EnginePosition {
  x: number;
  y: number;
  z: number;
  angle: number;
}

export interface Tier1EngineState {
  engineId: EngineId;
  status: EngineStatus;
  position: EnginePosition;
  interaction: InteractionState;
  lastInteractionTimestamp: number | null;
  currentReading: EngineReading | null;
  history: EngineReadingSummary[];
}

export interface EngineReading {
  readingId: string;
  timestamp: number;
  engineId: EngineId;
  inputData: unknown;
  outputData: unknown;
}

export interface EngineReadingSummary {
  readingId: string;
  timestamp: number;
  summary: string;
}

// ============================================================================
// Spatial Configuration
// ============================================================================

export const EAST_WING_CENTER = { x: 50, y: 0, z: 0 };
export const TIER_1_RADIUS = 5;
export const TIER_1_Y_OFFSET = -1;

// 72° spacing for 5 engines
export const TIER_1_ANGLES = [0, 72, 144, 216, 288] as const;

export const ENGINE_POSITIONS: Record<EngineId, EnginePosition> = {
  'vimshottari': { x: 5, y: -1, z: 0, angle: 0 },
  'i-ching': { x: 1.55, y: -1, z: 4.76, angle: 72 },
  'tarot': { x: -4.05, y: -1, z: 2.94, angle: 144 },
  'runes': { x: -4.05, y: -1, z: -2.94, angle: 216 },
  'numerology': { x: 1.55, y: -1, z: -4.76, angle: 288 },
};

// Convert relative to absolute positions
export function getAbsolutePosition(engineId: EngineId): THREE.Vector3 {
  const rel = ENGINE_POSITIONS[engineId];
  return new THREE.Vector3(
    EAST_WING_CENTER.x + rel.x,
    EAST_WING_CENTER.y + rel.y,
    EAST_WING_CENTER.z + rel.z
  );
}

// ============================================================================
// Visual State
// ============================================================================

export interface EngineVisualState {
  primaryColor: string;
  emissiveIntensity: number;
  scaleMultiplier: number;
  bloomEnabled: boolean;
}

export const DEFAULT_ENGINE_VISUAL: EngineVisualState = {
  primaryColor: '#6B6B6B', // Stone Grey
  emissiveIntensity: 0,
  scaleMultiplier: 1.0,
  bloomEnabled: false,
};

export const ACTIVE_ENGINE_VISUAL: Record<EngineId, EngineVisualState> = {
  'i-ching': {
    primaryColor: '#B8860B', // Aged Gold
    emissiveIntensity: 0.5,
    scaleMultiplier: 1.0,
    bloomEnabled: true,
  },
  'vimshottari': {
    primaryColor: '#B8860B', // Aged Gold
    emissiveIntensity: 0.8,
    scaleMultiplier: 1.0,
    bloomEnabled: true,
  },
  'tarot': {
    primaryColor: '#F5F0E8', // Bone
    emissiveIntensity: 0.3,
    scaleMultiplier: 1.0,
    bloomEnabled: true,
  },
  'runes': {
    primaryColor: '#B8860B', // Aged Gold
    emissiveIntensity: 0.4,
    scaleMultiplier: 1.0,
    bloomEnabled: true,
  },
  'numerology': {
    primaryColor: '#F5F0E8', // Bone
    emissiveIntensity: 0.5,
    scaleMultiplier: 1.0,
    bloomEnabled: true,
  },
};

// ============================================================================
// 3D Text Display System
// ============================================================================

export interface Text3DConfig {
  position: THREE.Vector3;
  content: string;
  font: string;
  primaryColor: string;
  accentColor: string;
  warningColor: string;
  fadeDistance: number;
  animationStyle: 'typewriter' | 'fade' | 'instant';
  typingSpeed: number; // ms per character
  billboard: boolean;
}

export const DEFAULT_TEXT_3D_CONFIG: Text3DConfig = {
  position: new THREE.Vector3(0, 0, 0),
  content: '',
  font: 'Inter',
  primaryColor: '#F5F0E8', // Bone
  accentColor: '#B8860B', // Aged Gold
  warningColor: '#C65D3B', // Terracotta
  fadeDistance: 15,
  animationStyle: 'typewriter',
  typingSpeed: 40,
  billboard: true,
};

// ============================================================================
// Filament Connections
// ============================================================================

export interface FilamentConnection {
  fromEngine: EngineId;
  toEngine: EngineId;
  strength: number; // 0-1
  crossReferences: number;
  pulsePhase: number;
}

// ============================================================================
// Loading States
// ============================================================================

export interface LoadingState {
  isLoading: boolean;
  type: 'anticipation' | 'reading' | 'calculation';
  progress: number;
  particleBurst: boolean;
}

// ============================================================================
// API Response Types
// ============================================================================

// I-Ching
export interface IChingLine {
  value: 6 | 7 | 8 | 9;
  changing: boolean;
  position: number; // 1-6 (bottom to top)
}

export interface IChingReading {
  hexagramNumber: number;
  hexagramName: {
    chinese: string;
    english: string;
  };
  lines: IChingLine[];
  transformedHexagram?: {
    number: number;
    name: {
      chinese: string;
      english: string;
    };
  };
  interpretation: string;
  changingLinesInterpretation?: string[];
}

export interface IChingRequest {
  lines: IChingLine[];
  question?: string;
  method: 'three_coin';
}

// Vimshottari
export type DashaPlanet = 
  | 'sun' | 'moon' | 'mars' | 'mercury' | 'jupiter' 
  | 'venus' | 'saturn' | 'rahu' | 'ketu';

export interface VimshottariPeriod {
  planet: DashaPlanet;
  startDate: string;
  endDate: string;
  durationYears: number;
}

export interface VimshottariReading {
  currentMahaDasha: VimshottariPeriod;
  currentAntarDasha: VimshottariPeriod;
  currentPratyantarDasha: VimshottariPeriod;
  timeline: VimshottariPeriod[];
  interpretation: string;
}

export interface VimshottariRequest {
  birthDatetime: string;
  birthLocation: {
    latitude: number;
    longitude: number;
  };
  queryDepth: 'mahadasha' | 'antardasha' | 'pratyantardasha';
}

// Tarot
export interface TarotCard {
  id: number;
  name: string;
  arcana: 'major' | 'minor';
  suit?: 'cups' | 'wands' | 'swords' | 'pentacles';
  number?: number;
  reversed: boolean;
}

export type TarotSpread = 'single' | 'three_card' | 'celtic_cross';

export interface TarotReading {
  cards: TarotCard[];
  spread: TarotSpread;
  interpretation: string;
  positionMeanings: string[];
}

export interface TarotRequest {
  cardIds: number[];
  spreadType: TarotSpread;
  reversed: boolean[];
  natalContext?: unknown;
}

// Runes
export interface RuneStone {
  glyph: string;
  glyphId: number; // 0-24 (Fehu through Othala + Blank)
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  upright: boolean;
}

export type RuneCastType = 'single' | 'three_norn' | 'five_element' | 'nine_grid';

export interface RuneReading {
  stones: RuneStone[];
  castType: RuneCastType;
  interpretation: string;
  relationships: {
    from: number;
    to: number;
    type: string;
  }[];
}

export interface RuneRequest {
  runes: RuneStone[];
  castType: RuneCastType;
}

// Numerology
export interface NumerologyChart {
  lifePath: number;
  expression: number;
  soulUrge: number;
  personality: number;
  maturity: number;
  personalYear: number;
  pinnacles: number[];
  challenges: number[];
  grid: number[][]; // 9x9 intensity matrix
}

export interface NumerologyReading {
  chart: NumerologyChart;
  interpretation: string;
}

export interface NumerologyRequest {
  birthDate: string;
  fullName: string;
  system: 'pythagorean' | 'chaldean';
}
