/**
 * React Hooks for PIP Integration
 * P2-S3: React integration hooks
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  PIPClient,
  type PIPData,
  type PIPClientConfig,
  type PIPHealthStatus,
} from './types';
import { PIPDataSmoother } from './smoothing';
import { GlobalCoherenceDamping } from './physicsBridge';

/** Hook for PIP client instance */
export function usePIPClient(config?: Partial<PIPClientConfig>) {
  const clientRef = useRef<PIPClient | null>(null);

  if (!clientRef.current) {
    clientRef.current = new PIPClient(config);
  }

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      clientRef.current?.disconnect();
    };
  }, []);

  return clientRef.current;
}

/** Hook for real-time PIP data */
export function usePIPData(client: PIPClient, smooth = true) {
  const [data, setData] = useState<PIPData | null>(null);
  const [health, setHealth] = useState<PIPHealthStatus>({
    state: 'disconnected',
    lastUpdateAt: null,
    updateRate: 0,
    reconnectAttempts: 0,
    latencyMs: 0,
    isHealthy: false,
  });
  
  const smootherRef = useRef(smooth ? new PIPDataSmoother() : null);

  useEffect(() => {
    // Subscribe to data updates
    const unsubscribeData = client.onData((rawData) => {
      if (smootherRef.current) {
        setData(smootherRef.current.smooth(rawData));
      } else {
        setData(rawData);
      }
    });

    // Subscribe to connection state changes
    const unsubscribeConnect = client.on('connect', () => {
      setHealth((h) => ({ ...h, state: 'connected' }));
    });

    const unsubscribeDisconnect = client.on('disconnect', () => {
      setHealth((h) => ({ ...h, state: 'disconnected' }));
    });

    const unsubscribeError = client.on('error', () => {
      setHealth((h) => ({ ...h, state: 'error' }));
    });

    // Health check interval
    const healthInterval = setInterval(() => {
      setHealth(client.getHealthStatus());
    }, 1000);

    // Connect on mount
    client.connect().catch(console.error);

    return () => {
      unsubscribeData();
      unsubscribeConnect();
      unsubscribeDisconnect();
      unsubscribeError();
      clearInterval(healthInterval);
    };
  }, [client]);

  const connect = useCallback(() => client.connect(), [client]);
  const disconnect = useCallback(() => client.disconnect(), [client]);

  return {
    data,
    health,
    connect,
    disconnect,
    isConnected: client.isConnected(),
    isMockFallback: client.isMockFallback(),
  };
}

/** Hook for coherence-based damping */
export function useCoherenceDamping(client: PIPClient, enabled = true) {
  const [damping, setDamping] = useState(0.1);
  const controllerRef = useRef(new GlobalCoherenceDamping());

  useEffect(() => {
    if (!enabled) {
      controllerRef.current.stop();
      return;
    }

    controllerRef.current.start();

    const unsubscribe = client.onData((data) => {
      const newDamping = controllerRef.current.update(data);
      setDamping(newDamping);
    });

    return () => {
      unsubscribe();
      controllerRef.current.stop();
    };
  }, [client, enabled]);

  return {
    damping,
    registerBody: controllerRef.current.registerBody.bind(controllerRef.current),
    unregisterBody: controllerRef.current.unregisterBody.bind(controllerRef.current),
  };
}

/** Hook for PIP data smoothing */
export function usePIPSmoothing(enabled = true) {
  const smootherRef = useRef(new PIPDataSmoother());

  const smooth = useCallback((data: PIPData): PIPData => {
    if (!enabled) return data;
    return smootherRef.current.smooth(data);
  }, [enabled]);

  const reset = useCallback(() => {
    smootherRef.current.reset();
  }, []);

  return { smooth, reset };
}

/** Hook for coherence duration tracking */
export function useCoherenceDuration(
  data: PIPData | null,
  threshold = 70
) {
  const [duration, setDuration] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const lastAboveThresholdRef = useRef(false);

  useEffect(() => {
    if (!data) return;

    const isAboveThreshold = data.coherence >= threshold;

    if (isAboveThreshold && !lastAboveThresholdRef.current) {
      // Just crossed above threshold
      startTimeRef.current = Date.now();
    } else if (!isAboveThreshold && lastAboveThresholdRef.current) {
      // Just dropped below threshold
      startTimeRef.current = null;
      setDuration(0);
    }

    lastAboveThresholdRef.current = isAboveThreshold;

    if (isAboveThreshold && startTimeRef.current) {
      setDuration((Date.now() - startTimeRef.current) / 1000);
    }
  }, [data, threshold]);

  return duration;
}

/** Hook for breath cycle tracking */
export function useBreathCycle(data: PIPData | null) {
  const [cycleCount, setCycleCount] = useState(0);
  const [isInhaling, setIsInhaling] = useState(false);
  const lastPhaseRef = useRef(0);

  useEffect(() => {
    if (!data) return;

    const phase = data.breathPhase;
    const lastPhase = lastPhaseRef.current;

    // Detect inhale (phase increasing through 0.5) or exhale (phase decreasing)
    setIsInhaling(phase > 0.5);

    // Detect complete cycle (crossing from high to low)
    if (lastPhase > 0.8 && phase < 0.2) {
      setCycleCount((c) => c + 1);
    }

    lastPhaseRef.current = phase;
  }, [data]);

  return {
    cycleCount,
    isInhaling,
    breathPhase: data?.breathPhase ?? 0,
  };
}
