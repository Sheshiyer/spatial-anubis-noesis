/**
 * API Timeout Handler
 * P4-S2: Pre-cached world substitution on API timeout
 *
 * Loads cached world from IndexedDB when API times out (5s).
 * Shows "offline mode" indicator and retries in background.
 */

export interface CachedWorld {
  id: string;
  name: string;
  data: any;
  timestamp: number;
  version: string;
}

export interface ApiTimeoutOptions {
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
}

const DEFAULT_OPTIONS: Required<ApiTimeoutOptions> = {
  timeoutMs: 5000,
  maxRetries: 3,
  retryDelayMs: 2000,
};

export class ApiTimeoutHandler {
  private static instance: ApiTimeoutHandler | null = null;
  private db: IDBDatabase | null = null;
  private isOfflineMode = false;
  private retryInProgress = false;
  private options: Required<ApiTimeoutOptions>;
  private offlineModeCallbacks: Array<(isOffline: boolean) => void> = [];

  private constructor(options: ApiTimeoutOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  static getInstance(options?: ApiTimeoutOptions): ApiTimeoutHandler {
    if (!ApiTimeoutHandler.instance) {
      ApiTimeoutHandler.instance = new ApiTimeoutHandler(options);
    }
    return ApiTimeoutHandler.instance;
  }

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<void> {
    if (this.db) {
      console.log('[ApiTimeoutHandler] Already initialized');
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open('spatial_anubis_cache', 1);

      request.onerror = () => {
        console.error('[ApiTimeoutHandler] Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[ApiTimeoutHandler] IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store for worlds
        if (!db.objectStoreNames.contains('worlds')) {
          const store = db.createObjectStore('worlds', { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('[ApiTimeoutHandler] Created worlds object store');
        }
      };
    });
  }

  /**
   * Fetch world with timeout and caching
   */
  async fetchWorld(worldId: string, fetchFn: () => Promise<any>): Promise<{ data: any; fromCache: boolean }> {
    try {
      // Attempt to fetch with timeout
      const data = await this.fetchWithTimeout(fetchFn, this.options.timeoutMs);

      // Cache the successful result
      await this.cacheWorld(worldId, data);

      // Exit offline mode if we were in it
      if (this.isOfflineMode) {
        this.setOfflineMode(false);
      }

      return { data, fromCache: false };

    } catch (error) {
      console.warn('[ApiTimeoutHandler] Fetch failed, loading from cache:', error);

      // Load from cache
      const cached = await this.getCachedWorld(worldId);

      if (cached) {
        this.setOfflineMode(true);

        // Retry in background
        this.retryInBackground(worldId, fetchFn);

        return { data: cached.data, fromCache: true };
      }

      // No cache available
      throw new Error('API timeout and no cached data available');
    }
  }

  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout<T>(fetchFn: () => Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      fetchFn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('API request timed out')), timeoutMs)
      ),
    ]);
  }

  /**
   * Cache world to IndexedDB
   */
  private async cacheWorld(worldId: string, data: any): Promise<void> {
    if (!this.db) {
      console.warn('[ApiTimeoutHandler] Cannot cache: DB not initialized');
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['worlds'], 'readwrite');
      const store = transaction.objectStore('worlds');

      const world: CachedWorld = {
        id: worldId,
        name: data.name || worldId,
        data,
        timestamp: Date.now(),
        version: '1.0',
      };

      const request = store.put(world);

      request.onsuccess = () => {
        console.log('[ApiTimeoutHandler] World cached:', worldId);
        resolve();
      };

      request.onerror = () => {
        console.error('[ApiTimeoutHandler] Failed to cache world:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get cached world from IndexedDB
   */
  private async getCachedWorld(worldId: string): Promise<CachedWorld | null> {
    if (!this.db) {
      console.warn('[ApiTimeoutHandler] Cannot get cache: DB not initialized');
      return null;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['worlds'], 'readonly');
      const store = transaction.objectStore('worlds');
      const request = store.get(worldId);

      request.onsuccess = () => {
        const world = request.result as CachedWorld | undefined;
        if (world) {
          console.log('[ApiTimeoutHandler] Loaded from cache:', worldId, 'age:', Date.now() - world.timestamp, 'ms');
        }
        resolve(world || null);
      };

      request.onerror = () => {
        console.error('[ApiTimeoutHandler] Failed to get cached world:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Retry fetch in background
   */
  private async retryInBackground(worldId: string, fetchFn: () => Promise<any>): Promise<void> {
    if (this.retryInProgress) {
      console.log('[ApiTimeoutHandler] Retry already in progress');
      return;
    }

    this.retryInProgress = true;

    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      await new Promise(resolve => setTimeout(resolve, this.options.retryDelayMs * attempt));

      try {
        console.log(`[ApiTimeoutHandler] Background retry ${attempt}/${this.options.maxRetries}`);

        const data = await this.fetchWithTimeout(fetchFn, this.options.timeoutMs);

        // Success! Cache and exit offline mode
        await this.cacheWorld(worldId, data);
        this.setOfflineMode(false);

        console.log('[ApiTimeoutHandler] Background retry successful');
        this.retryInProgress = false;
        return;

      } catch (error) {
        console.warn(`[ApiTimeoutHandler] Background retry ${attempt} failed:`, error);
      }
    }

    console.warn('[ApiTimeoutHandler] All background retries failed');
    this.retryInProgress = false;
  }

  /**
   * Get all cached worlds
   */
  async getAllCachedWorlds(): Promise<CachedWorld[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['worlds'], 'readonly');
      const store = transaction.objectStore('worlds');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result as CachedWorld[]);
      };

      request.onerror = () => {
        console.error('[ApiTimeoutHandler] Failed to get all cached worlds:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['worlds'], 'readwrite');
      const store = transaction.objectStore('worlds');
      const request = store.clear();

      request.onsuccess = () => {
        console.log('[ApiTimeoutHandler] Cache cleared');
        resolve();
      };

      request.onerror = () => {
        console.error('[ApiTimeoutHandler] Failed to clear cache:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Set offline mode and notify listeners
   */
  private setOfflineMode(isOffline: boolean): void {
    if (this.isOfflineMode === isOffline) return;

    this.isOfflineMode = isOffline;
    console.log('[ApiTimeoutHandler] Offline mode:', isOffline);

    this.offlineModeCallbacks.forEach(callback => {
      try {
        callback(isOffline);
      } catch (error) {
        console.error('[ApiTimeoutHandler] Offline mode callback error:', error);
      }
    });
  }

  /**
   * Check if in offline mode
   */
  isOffline(): boolean {
    return this.isOfflineMode;
  }

  /**
   * Subscribe to offline mode changes
   */
  onOfflineModeChange(callback: (isOffline: boolean) => void): () => void {
    this.offlineModeCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.offlineModeCallbacks.indexOf(callback);
      if (index !== -1) {
        this.offlineModeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Clean up
   */
  destroy(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }

    this.isOfflineMode = false;
    this.retryInProgress = false;
    this.offlineModeCallbacks = [];

    console.log('[ApiTimeoutHandler] Destroyed');
  }
}

// Singleton export
export const apiTimeoutHandler = ApiTimeoutHandler.getInstance();
