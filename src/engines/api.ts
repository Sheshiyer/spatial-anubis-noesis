/**
 * Engines API Client
 * Backend endpoint wrappers for all engine types
 * P3-S2-29 to 31: Backend endpoints
 */

import { apiClient } from '../api/client';
import type { 
  EngineApiResponse,
  BiorhythmApiRequest,
  GeneKeysApiRequest,
  HumanDesignApiRequest,
  ChronobiologyApiRequest,
  TransitApiRequest,
  SomaticCanticleApiRequest,
} from './types';
import type { BiorhythmData } from './tier2/types';
import type { GeneKeysProfile, HDProfile, ChronobiologyData } from './tier2/types';
import type { CelestialSphereData, SomaticCanticleData, ConvergenceScore } from './tier3/types';

/**
 * Biorhythm Compass API
 * P3-S2-31: Backend endpoint POST /api/engines/biorhythm
 */
export async function fetchBiorhythmData(
  request: BiorhythmApiRequest
): Promise<EngineApiResponse<BiorhythmData>> {
  const response = await fetch(`${apiClient['baseUrl']}/api/engines/biorhythm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Biorhythm API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Gene Keys Helix API
 * P3-S2-30: Backend endpoint POST /api/engines/gene-keys
 */
export async function fetchGeneKeysData(
  request: GeneKeysApiRequest
): Promise<EngineApiResponse<GeneKeysProfile>> {
  const response = await fetch(`${apiClient['baseUrl']}/api/engines/gene-keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Gene Keys API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Human Design Bodygraph API
 * P3-S2-29: Backend endpoint POST /api/engines/human-design
 */
export async function fetchHumanDesignData(
  request: HumanDesignApiRequest
): Promise<EngineApiResponse<HDProfile>> {
  const response = await fetch(`${apiClient['baseUrl']}/api/engines/human-design`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Human Design API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Chronobiology Clock API
 * P3-S2-12: Backend endpoint POST /api/engines/chronobiology
 */
export async function fetchChronobiologyData(
  request: ChronobiologyApiRequest
): Promise<EngineApiResponse<ChronobiologyData>> {
  const response = await fetch(`${apiClient['baseUrl']}/api/engines/chronobiology`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Chronobiology API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Transit Overlay API
 * P3-S2-23: Backend endpoint POST /api/engines/transit
 */
export async function fetchTransitData(
  request: TransitApiRequest
): Promise<EngineApiResponse<CelestialSphereData>> {
  const response = await fetch(`${apiClient['baseUrl']}/api/engines/transit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Transit API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Somatic Canticle Index API
 * P3-S2-25: Backend endpoint POST /api/engines/somatic-canticle
 */
export async function fetchSomaticCanticleData(
  request: SomaticCanticleApiRequest
): Promise<EngineApiResponse<SomaticCanticleData>> {
  const response = await fetch(`${apiClient['baseUrl']}/api/engines/somatic-canticle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Somatic Canticle API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Convergence Analysis API
 */
export async function fetchConvergenceAnalysis(
  engineData: Record<string, unknown>
): Promise<EngineApiResponse<ConvergenceScore>> {
  const response = await fetch(`${apiClient['baseUrl']}/api/engines/convergence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ engines: engineData }),
  });

  if (!response.ok) {
    throw new Error(`Convergence API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Mock API implementations for development
 * These simulate backend responses when API is not available
 */

export async function mockFetchBiorhythmData(
  request: BiorhythmApiRequest
): Promise<EngineApiResponse<BiorhythmData>> {
  const birthDate = request.birthDate ? new Date(request.birthDate) : new Date('1990-01-01');
  const now = new Date();
  now.setDate(now.getDate() + (request.scrubOffset ?? 0));
  
  const daysSinceBirth = (now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24);
  
  // Calculate cycles
  const physicalDays = daysSinceBirth % 23;
  const emotionalDays = daysSinceBirth % 28;
  const intellectualDays = daysSinceBirth % 33;
  
  const data: BiorhythmData = {
    physical: {
      type: 'physical',
      value: Math.round(Math.sin((2 * Math.PI * physicalDays) / 23) * 100),
      phase: physicalDays / 23,
      daysInCycle: Math.floor(physicalDays),
      color: '#C65D3B',
    },
    emotional: {
      type: 'emotional',
      value: Math.round(Math.sin((2 * Math.PI * emotionalDays) / 28) * 100),
      phase: emotionalDays / 28,
      daysInCycle: Math.floor(emotionalDays),
      color: '#4A90A4',
    },
    intellectual: {
      type: 'intellectual',
      value: Math.round(Math.sin((2 * Math.PI * intellectualDays) / 33) * 100),
      phase: intellectualDays / 33,
      daysInCycle: Math.floor(intellectualDays),
      color: '#5A8F5A',
    },
    birthDate: birthDate.toISOString().split('T')[0] ?? '',
    currentDate: now.toISOString().split('T')[0] ?? '',
    projection: Array.from({ length: 30 }, (_, i) => {
      const projDate = new Date(now);
      projDate.setDate(projDate.getDate() + i);
      const days = (projDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24);
      return {
        date: projDate.toISOString().split('T')[0] ?? '',
        physical: Math.round(Math.sin((2 * Math.PI * (days % 23)) / 23) * 100),
        emotional: Math.round(Math.sin((2 * Math.PI * (days % 28)) / 28) * 100),
        intellectual: Math.round(Math.sin((2 * Math.PI * (days % 33)) / 33) * 100),
      };
    }),
  };

  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
}

export async function mockFetchGeneKeysData(
  request: GeneKeysApiRequest
): Promise<EngineApiResponse<GeneKeysProfile>> {
  const birthDate = request.birthDate ? new Date(request.birthDate) : new Date('1990-01-01');
  const dayOfYear = Math.floor((birthDate.getTime() - new Date(birthDate.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  
  const allKeys = Array.from({ length: 64 }, (_, i) => ({
    number: i + 1,
    sphere: i + 1,
    shadow: `Shadow ${i + 1}`,
    gift: `Gift ${i + 1}`,
    siddhi: `Siddhi ${i + 1}`,
    activation: 'gift' as const,
    activationLevel: 50,
  }));

  const data: GeneKeysProfile = {
    lifesWork: allKeys[(dayOfYear) % 64] ?? allKeys[0]!,
    evolution: allKeys[(dayOfYear * 2) % 64] ?? allKeys[1]!,
    radiance: allKeys[(dayOfYear * 3) % 64] ?? allKeys[2]!,
    purpose: allKeys[(dayOfYear * 4) % 64] ?? allKeys[3]!,
    attraction: allKeys[(dayOfYear * 5) % 64] ?? allKeys[4]!,
    pearl: allKeys[(dayOfYear * 6) % 64] ?? allKeys[5]!,
    culture: allKeys[(dayOfYear * 7) % 64] ?? allKeys[6]!,
    allKeys,
  };

  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
}

export async function mockFetchHumanDesignData(
  request: HumanDesignApiRequest
): Promise<EngineApiResponse<HDProfile>> {
  const birthDate = request.birthDate ? new Date(request.birthDate) : new Date('1990-01-01');
  const hash = birthDate.getTime() % 100;
  
  const centers = [
    { id: 'head' as const, name: 'Head', definition: hash > 40 ? 'defined' as const : 'undefined' as const, position: [0, 4, 0] as [number, number, number], gates: [64, 61, 63], color: '' },
    { id: 'ajna' as const, name: 'Ajna', definition: hash > 50 ? 'defined' as const : 'undefined' as const, position: [0, 2.5, 0] as [number, number, number], gates: [47, 24, 4, 11, 43], color: '' },
    { id: 'throat' as const, name: 'Throat', definition: hash > 30 ? 'defined' as const : 'undefined' as const, position: [0, 1, 0] as [number, number, number], gates: [62, 23, 56, 35, 12, 45, 33, 20, 31, 8, 16], color: '' },
    { id: 'g' as const, name: 'G Center', definition: hash > 45 ? 'defined' as const : 'undefined' as const, position: [0, -0.5, 0] as [number, number, number], gates: [1, 13, 25, 46, 10, 7, 15, 2], color: '' },
    { id: 'heart' as const, name: 'Heart', definition: hash > 60 ? 'defined' as const : 'undefined' as const, position: [-1.5, -0.5, 0] as [number, number, number], gates: [51, 26, 21, 40], color: '' },
    { id: 'sacral' as const, name: 'Sacral', definition: hash > 35 ? 'defined' as const : 'undefined' as const, position: [0, -2, 0] as [number, number, number], gates: [5, 14, 29, 34, 27, 59, 9, 42, 3], color: '' },
    { id: 'spleen' as const, name: 'Spleen', definition: hash > 55 ? 'defined' as const : 'undefined' as const, position: [-2.5, -1.5, 0] as [number, number, number], gates: [48, 18, 57, 28, 44, 50, 32], color: '' },
    { id: 'solarPlexus' as const, name: 'Solar Plexus', definition: hash > 42 ? 'defined' as const : 'undefined' as const, position: [1.5, -1, 0] as [number, number, number], gates: [36, 6, 37, 49, 55, 22, 30], color: '' },
    { id: 'root' as const, name: 'Root', definition: hash > 38 ? 'defined' as const : 'undefined' as const, position: [0, -3.5, 0] as [number, number, number], gates: [19, 41, 60, 52, 53, 54, 38, 58, 39], color: '' },
  ].map(c => ({ ...c, color: c.definition === 'defined' ? '#D4AF37' : '#6B6B6B' }));

  const definedCenters = centers.filter(c => c.definition === 'defined').map(c => c.id);
  
  const types = ['manifestor', 'generator', 'manifesting_generator', 'projector', 'reflector'] as const;
  const type = types[hash % types.length];

  const data: HDProfile = {
    type,
    authority: definedCenters.includes('solarPlexus') ? 'emotional' : 
               definedCenters.includes('sacral') ? 'sacral' : 
               definedCenters.includes('spleen') ? 'splenic' : 'mental',
    strategy: type === 'manifestor' ? 'inform' : 
              type === 'generator' || type === 'manifesting_generator' ? 'respond' : 
              type === 'projector' ? 'wait_invitation' : 'wait_lunar',
    profile: `${(hash % 6) + 1}/${((hash * 3) % 6) + 1}`,
    definedCenters,
    undefinedCenters: centers.filter(c => c.definition !== 'defined').map(c => c.id),
    centers,
    channels: definedCenters.includes('sacral') && definedCenters.includes('root') ? [[42, 53], [3, 60]] : [],
  };

  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
}

export async function mockFetchChronobiologyData(
  request: ChronobiologyApiRequest
): Promise<EngineApiResponse<ChronobiologyData>> {
  const now = request.overrideTime ? new Date(request.overrideTime) : new Date();
  const hour = now.getHours();
  
  const getPhase = (h: number) => {
    if (h >= 22 || h < 6) return 'sleep';
    if (h >= 6 && h < 8) return 'wake';
    if (h >= 8 && h < 12) return 'peak';
    if (h >= 12 && h < 14) return 'dip';
    if (h >= 14 && h < 18) return 'peak';
    return 'wind_down';
  };

  const data: ChronobiologyData = {
    deviceTime: now.toISOString(),
    timezone: request.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    currentPhase: getPhase(hour),
    chronotype: 'intermediate',
    zones: [
      { phase: 'wake', startHour: 6, endHour: 8, color: '#4A5568', description: 'Cortisol awakening response', activities: ['Gentle awakening', 'Light exposure'] },
      { phase: 'peak', startHour: 8, endHour: 12, color: '#D4AF37', description: 'Peak cognitive performance', activities: ['Complex tasks', 'Decision making'] },
      { phase: 'dip', startHour: 12, endHour: 14, color: '#708090', description: 'Post-lunch dip', activities: ['Light tasks', 'Walking'] },
      { phase: 'peak', startHour: 14, endHour: 18, color: '#D4AF37', description: 'Second peak', activities: ['Creative work', 'Collaboration'] },
      { phase: 'wind_down', startHour: 18, endHour: 22, color: '#8B4513', description: 'Melatonin onset', activities: ['Relaxation', 'Dim lights'] },
      { phase: 'sleep', startHour: 22, endHour: 6, color: '#1A1A2E', description: 'Restoration', activities: ['Deep sleep', 'Memory consolidation'] },
    ],
    cortisolPeak: 7,
    melatoninOnset: 21,
    tempMinimum: 4,
    sleepWindow: { start: 22, end: 6 },
    wakeWindow: { start: 6, end: 7 },
  };

  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
}
