/**
 * I-Ching Oracle Engine
 * P3-S1-01 to 09
 */

export { IChingEngine } from './IChingEngine';
export { IChingDish } from './IChingDish';
export { IChingCoin } from './IChingCoin';
export { HexagramDisplay, ChangingHexagrams } from './HexagramDisplay';

export type {
  CoinState,
  CoinConfig,
  HexagramLine,
  HexagramState,
  DishConfig,
  LineVisual,
} from './types';

export {
  DEFAULT_COIN_CONFIG,
  COIN_FACE_VALUES,
  calculateLineValue,
  getLineType,
  isChangingLine,
  hexagramToNumber,
  DEFAULT_DISH_CONFIG,
  LINE_WIDTH,
  LINE_HEIGHT,
  LINE_DEPTH,
  LINE_GAP,
  LINE_SPACING,
} from './types';
