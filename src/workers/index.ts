/**
 * Workers module — Web Workers for off-main-thread processing
 */

// MediaPipe Worker
export { default as MediaPipeWorker } from './mediapipe.worker?worker';

// Worker message types
export type {
  WorkerIncomingMessage,
  WorkerOutgoingMessage,
  ProcessFramePayload,
  FrameProcessedPayload,
  PerformancePayload,
} from './mediapipe.worker';

// Worker manager for main thread
export class MediaPipeWorkerManager {
  private worker: Worker | null = null;
  private messageCallbacks: Map<string, (data: unknown) => void> = new Map();
  private messageId = 0;

  async initialize(): Promise<void> {
    if (this.worker) {
      return;
    }

    // Dynamic import for worker
    const WorkerConstructor = (await import('./mediapipe.worker?worker')).default;
    this.worker = new WorkerConstructor();

    this.worker.onmessage = (event) => {
      const { type, payload, id } = event.data;
      
      // Handle callback responses
      if (id && this.messageCallbacks.has(id)) {
        const callback = this.messageCallbacks.get(id);
        this.messageCallbacks.delete(id);
        callback?.(payload);
      }

      // Emit events
      this.emit(type, payload);
    };

    // Wait for worker to be ready
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Worker initialization timeout')), 10000);
      
      const checkReady = (event: MessageEvent) => {
        if (event.data.type === 'INIT_PROGRESS' && event.data.payload.model === 'worker') {
          clearTimeout(timeout);
          this.worker?.removeEventListener('message', checkReady);
          resolve();
        }
      };
      
      this.worker?.addEventListener('message', checkReady);
    });
  }

  send(type: string, payload?: unknown): void {
    this.worker?.postMessage({ type, payload, timestamp: performance.now() });
  }

  sendWithTransfer(type: string, payload: unknown, transferables: Transferable[]): void {
    this.worker?.postMessage(
      { type, payload, timestamp: performance.now() },
      transferables
    );
  }

  request(type: string, payload?: unknown): Promise<unknown> {
    return new Promise((resolve) => {
      const id = `msg_${++this.messageId}`;
      this.messageCallbacks.set(id, resolve);
      this.worker?.postMessage({ type, payload, id, timestamp: performance.now() });
    });
  }

  dispose(): void {
    this.send('DISPOSE');
    this.worker?.terminate();
    this.worker = null;
    this.messageCallbacks.clear();
  }

  // Event handling
  private listeners: Map<string, Array<(payload: unknown) => void>> = new Map();

  on(event: string, callback: (payload: unknown) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);

    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  private emit(event: string, payload: unknown): void {
    this.listeners.get(event)?.forEach((callback) => {
      try {
        callback(payload);
      } catch (err) {
        console.error(`Error in worker event listener for ${event}:`, err);
      }
    });
  }
}

// Factory function
export function createMediaPipeWorkerManager(): MediaPipeWorkerManager {
  return new MediaPipeWorkerManager();
}
