/**
 * API Client Module
 * 
 * Provides typed methods for all backend endpoints including:
 * - Health checks
 * - Authentication
 * - World generation
 * - Tier 1 Divination Engines (P3-S1)
 */

// Core API Client
export {
  apiClient,
  ApiError,
  getAssetUrl,
  initOfflineStorage,
  cacheWorldOffline,
  getCachedWorld,
  getCachedWorldByDasha,
} from './client';

export type {
  HealthResponse,
  ReadinessResponse,
  TokenResponse,
  DashaPlanet,
  GenerationStatus,
  BiomeMetadata,
  WorldGenerateRequest,
  WorldGenerateResponse,
  WorldStatusResponse,
  BiomeInfoResponse,
  RateLimitStatus,
} from './client';

// Tier 1 Divination Engines API (P3-S1)
export {
  tier1EnginesApi,
  getIChingReading,
  getVimshottariReading,
  getTarotReading,
  getRuneReading,
  getNumerologyReading,
} from './tier1Engines';

export type {
  IChingRequest,
  IChingReading,
  VimshottariRequest,
  VimshottariReading,
  TarotRequest,
  TarotReading,
  RuneRequest,
  RuneReading,
  NumerologyRequest,
  NumerologyReading,
} from './tier1Engines';
