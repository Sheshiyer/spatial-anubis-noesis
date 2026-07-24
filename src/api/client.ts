/**
 * API Client for Spatial Anubis Backend
 * 
 * Provides typed methods for all backend endpoints.
 */

// Types
export interface HealthResponse {
  status: string;
  version: string;
  timestamp: string;
}

export interface ReadinessResponse {
  status: string;
  checks: {
    database: boolean;
    world_labs_api: boolean;
  };
  timestamp: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export type DashaPlanet = 
  | 'sun' | 'moon' | 'mars' | 'mercury' | 'jupiter' 
  | 'venus' | 'saturn' | 'rahu' | 'ketu';

export type GenerationStatus = 
  | 'pending' | 'processing' | 'completed' | 'failed' | 'fallback_used';

export interface BiomeMetadata {
  material_keywords: string[];
  lighting_preset: string;
  fog_config: {
    density: number;
    color: string;
    height_falloff: number;
    scattering: number;
  };
  fog_density: number;
  fog_color: string;
  ambient_color: string;
  atmosphere_description: string;
}

export interface WorldGenerateRequest {
  dasha_planet: DashaPlanet;
  archetype: string;
}

export interface WorldGenerateResponse {
  job_id: string;
  status: GenerationStatus;
  message: string;
  estimated_completion_seconds: number;
}

export interface WorldStatusResponse {
  job_id: string;
  status: GenerationStatus;
  progress_percent: number;
  splat_url?: string;
  glb_url?: string;
  collision_mesh_url?: string;
  biome_metadata?: BiomeMetadata;
  dasha_planet: DashaPlanet;
  archetype: string;
  created_at: string;
  generated_at?: string;
  error_message?: string;
  retry_count: number;
}

export interface BiomeInfoResponse {
  dasha_planet: DashaPlanet;
  name: string;
  description: string;
  metadata: BiomeMetadata;
}

export interface RateLimitStatus {
  resource_type: string;
  allowed: boolean;
  remaining_seconds: number;
  limit: number;
  window_seconds: number;
}

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new ApiError(response.status, error.detail || error.message || 'Request failed');
    }

    return response.json();
  }

  // Health Endpoints
  async health(): Promise<HealthResponse> {
    return this.fetch<HealthResponse>('/health');
  }

  async ready(): Promise<ReadinessResponse> {
    return this.fetch<ReadinessResponse>('/ready');
  }

  // Auth Endpoints
  async login(userId: string): Promise<TokenResponse> {
    return this.fetch<TokenResponse>(`/api/v1/auth/login?user_id=${encodeURIComponent(userId)}`, {
      method: 'POST',
    });
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    return this.fetch<TokenResponse>('/api/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  }

  async logout(): Promise<{ message: string }> {
    return this.fetch<{ message: string }>('/api/v1/auth/logout', {
      method: 'POST',
    });
  }

  // World Endpoints
  async generateWorld(request: WorldGenerateRequest): Promise<WorldGenerateResponse> {
    return this.fetch<WorldGenerateResponse>('/api/v1/worlds/generate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getWorldStatus(jobId: string): Promise<WorldStatusResponse> {
    return this.fetch<WorldStatusResponse>(`/api/v1/worlds/${jobId}`);
  }

  async listWorlds(limit: number = 10, offset: number = 0): Promise<WorldStatusResponse[]> {
    return this.fetch<WorldStatusResponse[]>(`/api/v1/worlds/?limit=${limit}&offset=${offset}`);
  }

  async getBiomeInfo(planet: DashaPlanet): Promise<BiomeInfoResponse> {
    return this.fetch<BiomeInfoResponse>(`/api/v1/worlds/biome/${planet}`);
  }

  async getRateLimitStatus(): Promise<RateLimitStatus> {
    return this.fetch<RateLimitStatus>('/api/v1/worlds/rate-limit/status');
  }

  // Polling helper for world generation
  async pollWorldGeneration(
    jobId: string,
    onProgress?: (status: WorldStatusResponse) => void,
    pollInterval: number = 2000,
    maxAttempts: number = 60
  ): Promise<WorldStatusResponse> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await this.getWorldStatus(jobId);
      
      onProgress?.(status);
      
      if (status.status === 'completed' || status.status === 'fallback_used') {
        return status;
      }
      
      if (status.status === 'failed') {
        throw new Error(status.error_message || 'World generation failed');
      }
      
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    throw new Error('World generation timeout');
  }

  // Generate and wait for completion
  async generateAndWait(
    request: WorldGenerateRequest,
    onProgress?: (status: WorldStatusResponse) => void
  ): Promise<WorldStatusResponse> {
    const { job_id } = await this.generateWorld(request);
    return this.pollWorldGeneration(job_id, onProgress);
  }
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isUnauthorized(): boolean {
    return this.statusCode === 401;
  }

  get isRateLimited(): boolean {
    return this.statusCode === 429;
  }
}

// Singleton instance
export const apiClient = new ApiClient();

// React/Vue composable helpers
export function getAssetUrl(assetPath: string): string {
  if (assetPath.startsWith('http')) return assetPath;
  return `${API_BASE_URL}${assetPath}`;
}

// IndexedDB helpers for offline storage
const DB_NAME = 'SpatialAnubisWorlds';
const DB_VERSION = 1;
const WORLD_STORE = 'worlds';

export async function initOfflineStorage(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(WORLD_STORE)) {
        const store = db.createObjectStore(WORLD_STORE, { keyPath: 'job_id' });
        store.createIndex('dasha_planet', 'dasha_planet', { unique: false });
        store.createIndex('created_at', 'created_at', { unique: false });
      }
    };
  });
}

export async function cacheWorldOffline(world: WorldStatusResponse): Promise<void> {
  const db = await initOfflineStorage();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(WORLD_STORE, 'readwrite');
    const store = transaction.objectStore(WORLD_STORE);
    const request = store.put({
      ...world,
      cached_at: new Date().toISOString(),
    });
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getCachedWorld(jobId: string): Promise<WorldStatusResponse | null> {
  const db = await initOfflineStorage();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(WORLD_STORE, 'readonly');
    const store = transaction.objectStore(WORLD_STORE);
    const request = store.get(jobId);
    
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getCachedWorldByDasha(
  dashaPlanet: DashaPlanet
): Promise<WorldStatusResponse | null> {
  const db = await initOfflineStorage();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(WORLD_STORE, 'readonly');
    const store = transaction.objectStore(WORLD_STORE);
    const index = store.index('dasha_planet');
    const request = index.getAll(dashaPlanet);
    
    request.onsuccess = () => {
      const worlds = request.result;
      // Return most recent
      const sorted = worlds.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      resolve(sorted[0] || null);
    };
    request.onerror = () => reject(request.error);
  });
}

export default apiClient;
