/**
 * I-Ching Oracle Types
 * P3-S1-01 to 09: I-Ching Oracle Engine
 */

import * as THREE from 'three';

// ============================================================================
// Coin Types
// ============================================================================

export interface CoinState {
  id: string;
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  isSettled: boolean;
  faceUp: 'yang' | 'yin' | null;
  settledAt: number | null;
}

export interface CoinConfig {
  mass: number;
  restitution: number;
  radius: number;
  thickness: number;
}

export const DEFAULT_COIN_CONFIG: CoinConfig = {
  mass: 0.3,
  restitution: 0.6,
  radius: 0.15,
  thickness: 0.02,
};

// Coin face values for 3-coin method
// 3 coins: 2 (yin/plain) + 2 (yin/plain) + 2 (yin/plain) = 6 (old yin, changing)
// 3 coins: 3 (yang/char) + 2 + 2 = 7 (young yang, stable)
// 3 coins: 3 + 3 + 2 = 8 (young yin, stable)
// 3 coins: 3 + 3 + 3 = 9 (old yang, changing)
export const COIN_FACE_VALUES = {
  yin: 2,   // Plain side
  yang: 3,  // Character side
};

// ============================================================================
// Hexagram Building
// ============================================================================

export interface HexagramLine {
  position: number; // 1-6 (bottom to top)
  lineType: 'yang' | 'yin';
  changing: boolean;
  value: 6 | 7 | 8 | 9;
}

export interface HexagramState {
  lines: HexagramLine[];
  isComplete: boolean;
  currentLineIndex: number; // 0-5, which line we're building
}

// Line values from 3 coins
export function calculateLineValue(coins: ('yin' | 'yang')[]): 6 | 7 | 8 | 9 {
  const sum = coins.reduce((acc, face) => acc + COIN_FACE_VALUES[face], 0);
  return sum as 6 | 7 | 8 | 9;
}

export function getLineType(value: 6 | 7 | 8 | 9): 'yang' | 'yin' {
  // 7, 9 = yang (odd)
  // 6, 8 = yin (even)
  return value % 2 === 1 ? 'yang' : 'yin';
}

export function isChangingLine(value: 6 | 7 | 8 | 9): boolean {
  // 6 (old yin) and 9 (old yang) are changing
  return value === 6 || value === 9;
}

// Convert hexagram lines to number 1-64
// Uses King Wen sequence
export function hexagramToNumber(lines: ('yang' | 'yin')[]): number {
  // Binary encoding: yang = 1, yin = 0
  // Bottom line is least significant bit
  let binary = 0;
  for (let i = 0; i < 6; i++) {
    if (lines[i] === 'yang') {
      binary |= (1 << i);
    }
  }
  
  // King Wen sequence mapping (simplified - would need full lookup in production)
  // This is a placeholder - actual implementation would use the full I-Ching sequence
  const KING_WEN_SEQUENCE = [
    1, 44, 13, 33, 10, 6, 25, 12,
    9, 57, 37, 53, 61, 59, 42, 20,
    14, 50, 30, 56, 38, 64, 21, 35,
    26, 18, 22, 52, 41, 4, 27, 23,
    43, 28, 49, 31, 58, 47, 17, 45,
    5, 48, 63, 40, 51, 62, 32, 55,
    34, 8, 3, 29, 60, 39, 46, 15,
    16, 7, 2, 36, 24, 19, 11, 54
  ];
  
  return KING_WEN_SEQUENCE[binary] ?? binary + 1;
}

// ============================================================================
// Dish Configuration
// ============================================================================

export interface DishConfig {
  radius: number;
  height: number;
  position: THREE.Vector3;
}

export const DEFAULT_DISH_CONFIG: DishConfig = {
  radius: 1.0,
  height: 0.1,
  position: new THREE.Vector3(0, 0.5, 0),
} as const;

// ============================================================================
// Line Visualization
// ============================================================================

export interface LineVisual {
  position: THREE.Vector3;
  isYang: boolean;
  isChanging: boolean;
  scale: number;
  opacity: number;
}

// Yang = solid bar
// Yin = broken bar (two segments with gap)
// Changing = pulsing Terracotta glow

export const LINE_WIDTH = 0.8;
export const LINE_HEIGHT = 0.1;
export const LINE_DEPTH = 0.05;
export const LINE_GAP = 0.2; // Gap for yin lines
export const LINE_SPACING = 0.25; // Vertical spacing between lines
