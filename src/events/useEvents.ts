/**
 * React Hooks for Event System
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { CollisionEventBus, getGlobalEventBus } from './EventBus';
import {
  type AnyCollisionEvent,
  type ProximityWakeEvent,
  type ZoneTransitionEvent,
  type CollisionEventType,
} from './types';

/** Hook for collision events */
export function useCollisionEvents<T extends AnyCollisionEvent>(
  type: T['type'],
  eventBus: CollisionEventBus = getGlobalEventBus()
) {
  const [lastEvent, setLastEvent] = useState<T | null>(null);
  const [eventCount, setEventCount] = useState(0);

  useEffect(() => {
    const unsubscribe = eventBus.on(type, (event) => {
      setLastEvent(event as T);
      setEventCount((c) => c + 1);
    });

    return unsubscribe;
  }, [type, eventBus]);

  return { lastEvent, eventCount };
}

/** Hook for proximity wake events */
export function useProximityWake(
  sourceId: string,
  eventBus: CollisionEventBus = getGlobalEventBus()
) {
  const [awakeTargets, setAwakeTargets] = useState<Set<string>>(new Set());
  const { lastEvent } = useCollisionEvents<ProximityWakeEvent>('proximity_wake', eventBus);

  useEffect(() => {
    if (lastEvent && lastEvent.sourceId === sourceId) {
      setAwakeTargets((prev) => new Set([...prev, lastEvent.targetId]));
    }
  }, [lastEvent, sourceId]);

  const isTargetAwake = useCallback(
    (targetId: string) => awakeTargets.has(targetId),
    [awakeTargets]
  );

  const clearAwake = useCallback(() => {
    setAwakeTargets(new Set());
  }, []);

  return {
    awakeTargets: Array.from(awakeTargets),
    isTargetAwake,
    clearAwake,
  };
}

/** Hook for zone transition events */
export function useZoneTransition(
  sourceId: string,
  eventBus: CollisionEventBus = getGlobalEventBus()
) {
  const [currentZone, setCurrentZone] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionProgress, setTransitionProgress] = useState(0);
  const { lastEvent } = useCollisionEvents<ZoneTransitionEvent>('zone_transition', eventBus);

  useEffect(() => {
    if (lastEvent && lastEvent.sourceId === sourceId) {
      setIsTransitioning(lastEvent.transitionProgress < 1);
      setTransitionProgress(lastEvent.transitionProgress);
      if (lastEvent.transitionProgress >= 1) {
        setCurrentZone(lastEvent.toZone);
      }
    }
  }, [lastEvent, sourceId]);

  return {
    currentZone,
    isTransitioning,
    transitionProgress,
  };
}

/** Hook for event history */
export function useEventHistory(
  eventBus: CollisionEventBus = getGlobalEventBus(),
  maxEvents = 100
) {
  const [history, setHistory] = useState<AnyCollisionEvent[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const fullHistory = eventBus.getHistory();
      setHistory(fullHistory.slice(-maxEvents));
    }, 100);

    return () => clearInterval(interval);
  }, [eventBus, maxEvents]);

  const clearHistory = useCallback(() => {
    eventBus.clearHistory();
    setHistory([]);
  }, [eventBus]);

  return { history, clearHistory };
}

/** Hook for multiple event types */
export function useMultiEventListener(
  types: CollisionEventType[],
  eventBus: CollisionEventBus = getGlobalEventBus()
) {
  const [events, setEvents] = useState<Map<CollisionEventType, AnyCollisionEvent>>(new Map());
  const unsubsRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    // Clear previous subscriptions
    unsubsRef.current.forEach((unsub) => unsub());
    unsubsRef.current = [];

    // Subscribe to new types
    types.forEach((type) => {
      const unsub = eventBus.on(type, (event) => {
        setEvents((prev) => new Map([...prev, [type, event]]));
      });
      unsubsRef.current.push(unsub);
    });

    return () => {
      unsubsRef.current.forEach((unsub) => unsub());
    };
  }, [types, eventBus]);

  return events;
}
