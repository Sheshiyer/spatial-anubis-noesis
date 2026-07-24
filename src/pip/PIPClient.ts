/**
 * PIP Real-Time Client
 * P2-S3-01: Connect real PIP Analysis Engine via WebSocket/SSE
 * - Real-time: coherence, LQD, entropy, breath_phase
 * - >10Hz update rate
 */

import {
  type PIPData,
  type PIPClientConfig,
  type PIPHealthStatus,
  type PIPEvent,
  type PIPEventListener,
  DEFAULT_PIP_CONFIG,
  type PIPConnectionState,
} from './types';

/** Real-time PIP Analysis Engine client */
export class PIPClient {
  private config: PIPClientConfig;
  private ws: WebSocket | null = null;
  private eventSource: EventSource | null = null;
  private listeners: Map<PIPEvent['type'], Set<PIPEventListener>> = new Map();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private lastData: PIPData | null = null;
  private state: PIPConnectionState = 'disconnected';
  private lastUpdateTime = 0;
  private updateCount = 0;
  private updateRateCheckInterval: ReturnType<typeof setInterval> | null = null;
  private currentUpdateRate = 0;
  private mockFallback: boolean = false;

  constructor(config: Partial<PIPClientConfig> = {}) {
    this.config = { ...DEFAULT_PIP_CONFIG, ...config };
    this.initializeListeners();
  }

  /** Get current connection state */
  getConnectionState(): PIPConnectionState {
    return this.state;
  }

  /** Get last received data */
  getLastData(): PIPData | null {
    return this.lastData;
  }

  /** Get health status */
  getHealthStatus(): PIPHealthStatus {
    return {
      state: this.state,
      lastUpdateAt: this.lastUpdateTime,
      updateRate: this.currentUpdateRate,
      reconnectAttempts: this.reconnectAttempts,
      latencyMs: this.lastData ? Date.now() - this.lastData.timestamp : 0,
      isHealthy: this.state === 'connected' && this.currentUpdateRate >= 10,
    };
  }

  /** Connect to PIP Analysis Engine */
  async connect(): Promise<boolean> {
    if (this.state === 'connected' || this.state === 'connecting') {
      return true;
    }

    this.setState('connecting');

    try {
      if (this.config.transport === 'websocket') {
        await this.connectWebSocket();
      } else {
        await this.connectSSE();
      }
      
      this.startUpdateRateMonitor();
      this.emit({ type: 'connect', timestamp: Date.now() });
      return true;
    } catch (error) {
      console.error('[PIP] Connection failed:', error);
      this.handleError(error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /** Disconnect from PIP Analysis Engine */
  disconnect(): void {
    this.clearReconnectTimer();
    this.stopUpdateRateMonitor();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.setState('disconnected');
    this.emit({ type: 'disconnect', timestamp: Date.now() });
  }

  /** Subscribe to PIP events */
  on(type: PIPEvent['type'], listener: PIPEventListener): () => void {
    const typeListeners = this.listeners.get(type) ?? new Set();
    typeListeners.add(listener);
    this.listeners.set(type, typeListeners);

    // Return unsubscribe function
    return () => {
      typeListeners.delete(listener);
    };
  }

  /** Subscribe to data updates only */
  onData(callback: (data: PIPData) => void): () => void {
    return this.on('data', (event) => {
      if (event.data) {
        callback(event.data);
      }
    });
  }

  /** Check if connected */
  isConnected(): boolean {
    return this.state === 'connected';
  }

  /** Check if using mock fallback */
  isMockFallback(): boolean {
    return this.mockFallback;
  }

  private initializeListeners(): void {
    const eventTypes: PIPEvent['type'][] = ['data', 'connect', 'disconnect', 'error', 'reconnect', 'fallback', 'restore'];
    eventTypes.forEach((type) => {
      this.listeners.set(type, new Set());
    });
  }

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.config.endpoint;
      
      try {
        this.ws = new WebSocket(wsUrl);
        
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, 10000);

        this.ws.onopen = () => {
          clearTimeout(timeout);
          this.setState('connected');
          this.reconnectAttempts = 0;
          console.log('[PIP] WebSocket connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data as string) as PIPData;
            this.handleData(data);
          } catch (err) {
            console.error('[PIP] Failed to parse message:', err);
          }
        };

        this.ws.onerror = (error) => {
          clearTimeout(timeout);
          reject(new Error('WebSocket error'));
        };

        this.ws.onclose = () => {
          if (this.state === 'connected') {
            this.handleDisconnect();
          }
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  private async connectSSE(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.eventSource = new EventSource(this.config.endpoint);
        
        const timeout = setTimeout(() => {
          reject(new Error('SSE connection timeout'));
        }, 10000);

        this.eventSource.onopen = () => {
          clearTimeout(timeout);
          this.setState('connected');
          this.reconnectAttempts = 0;
          console.log('[PIP] SSE connected');
          resolve();
        };

        this.eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as PIPData;
            this.handleData(data);
          } catch (err) {
            console.error('[PIP] Failed to parse SSE message:', err);
          }
        };

        this.eventSource.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('SSE error'));
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  private handleData(data: PIPData): void {
    this.lastData = data;
    this.lastUpdateTime = Date.now();
    this.updateCount++;
    this.emit({ type: 'data', data, timestamp: Date.now() });
  }

  private handleDisconnect(): void {
    this.setState('disconnected');
    
    if (this.config.autoReconnect) {
      this.attemptReconnect();
    }
  }

  private handleError(error: Error): void {
    this.setState('error');
    this.emit({ type: 'error', error, timestamp: Date.now() });
    
    if (this.config.autoReconnect) {
      this.attemptReconnect();
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.log('[PIP] Max reconnect attempts reached');
      
      if (this.config.fallbackToMock) {
        this.enableMockFallback();
      }
      return;
    }

    this.setState('reconnecting');
    this.reconnectAttempts++;
    
    const delay = Math.min(
      this.config.reconnectBaseDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.config.reconnectMaxDelay
    );

    console.log(`[PIP] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.emit({ type: 'reconnect', timestamp: Date.now() });
      this.connect().catch(() => {
        // Error handled in connect()
      });
    }, delay);
  }

  private enableMockFallback(): void {
    console.log('[PIP] Falling back to mock data');
    this.mockFallback = true;
    this.setState('fallback');
    this.emit({ type: 'fallback', timestamp: Date.now() });
    
    // Start mock data generation
    this.startMockData();
  }

  private startMockData(): void {
    const interval = 1000 / this.config.targetUpdateRateHz;
    
    const generateMockData = (): PIPData => {
      const now = Date.now();
      const breathPhase = (Math.sin(now / 3000 * Math.PI * 2) + 1) / 2;
      
      return {
        coherence: 50 + Math.sin(now / 10000) * 30,
        lqd: 50 + Math.cos(now / 8000) * 25,
        entropy: 30 + Math.sin(now / 12000) * 20,
        breathPhase,
        physicalCycle: 60 + Math.sin(now / 15000) * 20,
        timestamp: now,
      };
    };

    const mockInterval = setInterval(() => {
      if (!this.mockFallback) {
        clearInterval(mockInterval);
        return;
      }
      this.handleData(generateMockData());
    }, interval);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private startUpdateRateMonitor(): void {
    this.updateRateCheckInterval = setInterval(() => {
      this.currentUpdateRate = this.updateCount;
      this.updateCount = 0;
    }, 1000);
  }

  private stopUpdateRateMonitor(): void {
    if (this.updateRateCheckInterval) {
      clearInterval(this.updateRateCheckInterval);
      this.updateRateCheckInterval = null;
    }
  }

  private setState(state: PIPConnectionState): void {
    this.state = state;
  }

  private emit(event: PIPEvent): void {
    const typeListeners = this.listeners.get(event.type);
    if (typeListeners) {
      typeListeners.forEach((listener) => {
        try {
          listener(event);
        } catch (err) {
          console.error('[PIP] Event listener error:', err);
        }
      });
    }
  }
}

/** Factory function for creating PIP client */
export function createPIPClient(config?: Partial<PIPClientConfig>): PIPClient {
  return new PIPClient(config);
}
