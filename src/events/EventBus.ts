/**
 * Collision Event Bus
 * P2-S3-09: Event bus for collision events
 */

import {
  type AnyCollisionEvent,
  type CollisionEventType,
  type CollisionEventListener,
  type EventBusConfig,
  DEFAULT_EVENT_BUS_CONFIG,
} from './types';

/** Event Bus for collision events */
export class CollisionEventBus {
  private listeners: Map<CollisionEventType, Set<CollisionEventListener>> = new Map();
  private config: EventBusConfig;
  private history: AnyCollisionEvent[] = [];

  constructor(config: Partial<EventBusConfig> = {}) {
    this.config = { ...DEFAULT_EVENT_BUS_CONFIG, ...config };
    this.initializeListeners();
  }

  /** Subscribe to an event type */
  on<T extends AnyCollisionEvent>(
    type: T['type'],
    listener: CollisionEventListener<T>
  ): () => void {
    const typeListeners = this.listeners.get(type) ?? new Set();

    if (typeListeners.size >= this.config.maxListeners) {
      console.warn(`[EventBus] Max listeners (${this.config.maxListeners}) reached for ${type}`);
      return () => {};
    }

    typeListeners.add(listener as CollisionEventListener);
    this.listeners.set(type, typeListeners);

    return () => {
      typeListeners.delete(listener as CollisionEventListener);
    };
  }

  /** Subscribe once to an event type */
  once<T extends AnyCollisionEvent>(
    type: T['type'],
    listener: CollisionEventListener<T>
  ): () => void {
    const onceListener: CollisionEventListener<T> = (event) => {
      unsubscribe();
      listener(event);
    };

    const unsubscribe = this.on(type, onceListener);
    return unsubscribe;
  }

  /** Emit an event */
  emit<T extends AnyCollisionEvent>(event: T): void {
    // Add to history
    if (this.config.trackHistory) {
      this.history.push(event);
      if (this.history.length > this.config.maxHistorySize) {
        this.history.shift();
      }
    }

    // Notify listeners
    const typeListeners = this.listeners.get(event.type);
    if (typeListeners) {
      typeListeners.forEach((listener) => {
        try {
          listener(event);
        } catch (err) {
          console.error(`[EventBus] Listener error for ${event.type}:`, err);
        }
      });
    }
  }

  /** Get event history */
  getHistory(): AnyCollisionEvent[] {
    return [...this.history];
  }

  /** Get filtered history by type */
  getHistoryByType<T extends AnyCollisionEvent>(type: T['type']): T[] {
    return this.history.filter((e) => e.type === type) as T[];
  }

  /** Clear history */
  clearHistory(): void {
    this.history = [];
  }

  /** Get listener count for a type */
  getListenerCount(type: CollisionEventType): number {
    return this.listeners.get(type)?.size ?? 0;
  }

  /** Remove all listeners for a type */
  removeAllListeners(type?: CollisionEventType): void {
    if (type) {
      this.listeners.delete(type);
    } else {
      this.listeners.clear();
      this.initializeListeners();
    }
  }

  private initializeListeners(): void {
    const types: CollisionEventType[] = [
      'proximity_wake',
      'ritual_activation',
      'zone_transition',
      'resonance_check',
      'settle',
    ];
    types.forEach((type) => {
      this.listeners.set(type, new Set());
    });
  }
}

/** Global event bus instance */
let globalEventBus: CollisionEventBus | null = null;

/** Get global event bus */
export function getGlobalEventBus(): CollisionEventBus {
  if (!globalEventBus) {
    globalEventBus = new CollisionEventBus();
  }
  return globalEventBus;
}

/** Reset global event bus */
export function resetGlobalEventBus(): void {
  globalEventBus = null;
}

/** Factory function */
export function createEventBus(config?: Partial<EventBusConfig>): CollisionEventBus {
  return new CollisionEventBus(config);
}
