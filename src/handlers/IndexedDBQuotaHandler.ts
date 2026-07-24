/**
 * IndexedDB Quota Handler
 * P4-S2: Handle quota exceeded errors
 *
 * LRU eviction of oldest cached worlds.
 * Keep 3 most recent.
 */

export interface CachedItem {
  id: string;
  name: string;
  data: any;
  timestamp: number;
  size: number; // Estimated size in bytes
}

export interface QuotaState {
  usage: number;
  quota: number;
  available: number;
  itemCount: number;
}

export interface IndexedDBQuotaHandlerOptions {
  maxItems?: number;
  storeName?: string;
  dbName?: string;
}

const DEFAULT_OPTIONS: Required<IndexedDBQuotaHandlerOptions> = {
  maxItems: 3,
  storeName: 'worlds',
  dbName: 'spatial_anubis_cache',
};

export class IndexedDBQuotaHandler {
  private static instance: IndexedDBQuotaHandler | null = null;
  private options: Required<IndexedDBQuotaHandlerOptions>;
  private db: IDBDatabase | null = null;
  private isActive = false;

  // Callbacks
  private quotaExceededCallbacks: Array<(itemsEvicted: number) => void> = [];
  private itemEvictedCallbacks: Array<(item: CachedItem) => void> = [];

  private constructor(options: IndexedDBQuotaHandlerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  static getInstance(options?: IndexedDBQuotaHandlerOptions): IndexedDBQuotaHandler {
    if (!IndexedDBQuotaHandler.instance) {
      IndexedDBQuotaHandler.instance = new IndexedDBQuotaHandler(options);
    }
    return IndexedDBQuotaHandler.instance;
  }

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<void> {
    if (this.isActive && this.db) {
      console.log('[IndexedDBQuotaHandler] Already initialized');
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.options.dbName, 1);

      request.onerror = () => {
        console.error('[IndexedDBQuotaHandler] Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isActive = true;
        console.log('[IndexedDBQuotaHandler] IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.options.storeName)) {
          const store = db.createObjectStore(this.options.storeName, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('[IndexedDBQuotaHandler] Created object store:', this.options.storeName);
        }
      };
    });
  }

  /**
   * Store item with quota handling
   */
  async storeItem(item: CachedItem): Promise<boolean> {
    if (!this.db) {
      console.error('[IndexedDBQuotaHandler] Database not initialized');
      return false;
    }

    try {
      // Try to store the item
      await this.putItem(item);
      console.log('[IndexedDBQuotaHandler] Item stored:', item.id);
      return true;

    } catch (error) {
      // Check if quota exceeded
      if (this.isQuotaExceededError(error)) {
        console.warn('[IndexedDBQuotaHandler] Quota exceeded, evicting old items...');

        // Evict old items and retry
        const evicted = await this.evictOldItems();

        if (evicted > 0) {
          try {
            await this.putItem(item);
            console.log('[IndexedDBQuotaHandler] Item stored after eviction:', item.id);
            return true;
          } catch (retryError) {
            console.error('[IndexedDBQuotaHandler] Failed to store item after eviction:', retryError);
            return false;
          }
        }
      }

      console.error('[IndexedDBQuotaHandler] Failed to store item:', error);
      return false;
    }
  }

  /**
   * Put item in IndexedDB
   */
  private async putItem(item: CachedItem): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.options.storeName], 'readwrite');
      const store = transaction.objectStore(this.options.storeName);
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Evict old items using LRU strategy
   */
  private async evictOldItems(): Promise<number> {
    if (!this.db) return 0;

    try {
      // Get all items sorted by timestamp
      const items = await this.getAllItemsSorted();

      // Calculate how many to keep vs evict
      const itemsToEvict = Math.max(0, items.length - this.options.maxItems + 1);

      if (itemsToEvict === 0) {
        console.log('[IndexedDBQuotaHandler] No items to evict');
        return 0;
      }

      // Evict oldest items
      const evictedItems = items.slice(0, itemsToEvict);

      for (const item of evictedItems) {
        await this.deleteItem(item.id);

        // Notify listeners
        this.itemEvictedCallbacks.forEach(callback => {
          try {
            callback(item);
          } catch (error) {
            console.error('[IndexedDBQuotaHandler] Item evicted callback error:', error);
          }
        });

        console.log('[IndexedDBQuotaHandler] Evicted item:', item.id, 'age:', Date.now() - item.timestamp, 'ms');
      }

      // Notify quota exceeded callbacks
      this.quotaExceededCallbacks.forEach(callback => {
        try {
          callback(evictedItems.length);
        } catch (error) {
          console.error('[IndexedDBQuotaHandler] Quota exceeded callback error:', error);
        }
      });

      console.log(`[IndexedDBQuotaHandler] Evicted ${evictedItems.length} old item(s)`);
      return evictedItems.length;

    } catch (error) {
      console.error('[IndexedDBQuotaHandler] Failed to evict items:', error);
      return 0;
    }
  }

  /**
   * Get all items sorted by timestamp (oldest first)
   */
  private async getAllItemsSorted(): Promise<CachedItem[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.options.storeName], 'readonly');
      const store = transaction.objectStore(this.options.storeName);
      const index = store.index('timestamp');
      const request = index.openCursor();

      const items: CachedItem[] = [];

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          items.push(cursor.value);
          cursor.continue();
        } else {
          resolve(items);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete item by ID
   */
  private async deleteItem(id: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.options.storeName], 'readwrite');
      const store = transaction.objectStore(this.options.storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Check if error is quota exceeded
   */
  private isQuotaExceededError(error: any): boolean {
    return (
      error instanceof DOMException &&
      (error.name === 'QuotaExceededError' || error.code === 22)
    );
  }

  /**
   * Get quota state (if available)
   */
  async getQuotaState(): Promise<QuotaState | null> {
    if (!('storage' in navigator && 'estimate' in navigator.storage)) {
      console.warn('[IndexedDBQuotaHandler] Storage API not available');
      return null;
    }

    try {
      const estimate = await navigator.storage.estimate();
      const items = await this.getAllItemsSorted();

      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
        available: (estimate.quota || 0) - (estimate.usage || 0),
        itemCount: items.length,
      };
    } catch (error) {
      console.error('[IndexedDBQuotaHandler] Failed to get quota state:', error);
      return null;
    }
  }

  /**
   * Get item count
   */
  async getItemCount(): Promise<number> {
    if (!this.db) return 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.options.storeName], 'readonly');
      const store = transaction.objectStore(this.options.storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all items
   */
  async getAllItems(): Promise<CachedItem[]> {
    return this.getAllItemsSorted();
  }

  /**
   * Clear all items
   */
  async clearAll(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.options.storeName], 'readwrite');
      const store = transaction.objectStore(this.options.storeName);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('[IndexedDBQuotaHandler] All items cleared');
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Manually trigger eviction
   */
  async manualEviction(): Promise<number> {
    return this.evictOldItems();
  }

  /**
   * Subscribe to quota exceeded events
   */
  onQuotaExceeded(callback: (itemsEvicted: number) => void): () => void {
    this.quotaExceededCallbacks.push(callback);
    return () => {
      const index = this.quotaExceededCallbacks.indexOf(callback);
      if (index !== -1) {
        this.quotaExceededCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to item evicted events
   */
  onItemEvicted(callback: (item: CachedItem) => void): () => void {
    this.itemEvictedCallbacks.push(callback);
    return () => {
      const index = this.itemEvictedCallbacks.indexOf(callback);
      if (index !== -1) {
        this.itemEvictedCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Clean up
   */
  destroy(): void {
    this.isActive = false;

    if (this.db) {
      this.db.close();
      this.db = null;
    }

    // Clear callbacks
    this.quotaExceededCallbacks = [];
    this.itemEvictedCallbacks = [];

    console.log('[IndexedDBQuotaHandler] Destroyed');
  }
}

// Singleton export
export const indexedDBQuotaHandler = IndexedDBQuotaHandler.getInstance();

/**
 * Estimate size of an object in bytes
 */
export function estimateObjectSize(obj: any): number {
  const str = JSON.stringify(obj);
  return new Blob([str]).size;
}
