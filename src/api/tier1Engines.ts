/**
 * Tier 1 Ancient Instruments API Client (P3-S1-05, 12, 22, 26)
 * Backend endpoints for I-Ching, Vimshottari, Tarot, Runes, Numerology
 */

import type {
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
} from '../engines/tier1/shared/types';

// Re-export types for convenience
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
};

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ============================================================================
// Helper function for API calls
// ============================================================================

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.detail || error.message || 'Request failed');
  }

  return response.json();
}

// ============================================================================
// I-Ching Oracle API (P3-S1-05)
// ============================================================================

/**
 * POST /api/engines/i-ching
 * Submit hexagram lines and receive interpretation
 */
export async function getIChingReading(request: IChingRequest): Promise<IChingReading> {
  return apiFetch<IChingReading>('/api/engines/i-ching', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// ============================================================================
// Vimshottari Dasha API (P3-S1-12)
// ============================================================================

/**
 * POST /api/engines/vimshottari
 * Calculate Dasha timeline from birth data
 */
export async function getVimshottariReading(request: VimshottariRequest): Promise<VimshottariReading> {
  return apiFetch<VimshottariReading>('/api/engines/vimshottari', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// ============================================================================
// Tarot Arcana API (P3-S1-16)
// ============================================================================

/**
 * POST /api/engines/tarot
 * Draw and interpret tarot cards
 */
export async function getTarotReading(request: TarotRequest): Promise<TarotReading> {
  return apiFetch<TarotReading>('/api/engines/tarot', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// ============================================================================
// Rune Stones API (P3-S1-22)
// ============================================================================

/**
 * POST /api/engines/runes
 * Interpret cast rune stones
 */
export async function getRuneReading(request: RuneRequest): Promise<RuneReading> {
  return apiFetch<RuneReading>('/api/engines/runes', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// ============================================================================
// Numerology Matrix API (P3-S1-26)
// ============================================================================

/**
 * POST /api/engines/numerology
 * Calculate numerology chart
 */
export async function getNumerologyReading(request: NumerologyRequest): Promise<NumerologyReading> {
  return apiFetch<NumerologyReading>('/api/engines/numerology', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// ============================================================================
// Combined API Object
// ============================================================================

export const tier1EnginesApi = {
  iChing: {
    getReading: getIChingReading,
  },
  vimshottari: {
    getReading: getVimshottariReading,
  },
  tarot: {
    getReading: getTarotReading,
  },
  runes: {
    getReading: getRuneReading,
  },
  numerology: {
    getReading: getNumerologyReading,
  },
};

export default tier1EnginesApi;
