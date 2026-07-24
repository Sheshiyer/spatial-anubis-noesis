/**
 * React Hooks for Witness Agents
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { AletheosAgent, createAletheosAgent, createCoherenceTimer } from './Aletheos';
import { PichetAgent, createPichetAgent, createGravityController } from './Pichet';
import { GateCheckProtocol, createGateCheckProtocol, createRitualGate } from './GateCheck';
import type { AletheosState, PichetState, GateCheckResult, WitnessEvent } from './types';
import type { PIPData } from '../pip/types';

/** Hook for Aletheos agent */
export function useAletheos() {
  const agentRef = useRef(createAletheosAgent());
  const [state, setState] = useState<AletheosState>(agentRef.current.getState());
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const unsubscribe = agentRef.current.onEvent(() => {
      setState(agentRef.current.getState());
      setDuration(agentRef.current.getSustainedDuration());
    });

    return unsubscribe;
  }, []);

  const update = useCallback((coherence: number) => {
    agentRef.current.update(coherence);
    setDuration(agentRef.current.getSustainedDuration());
  }, []);

  const updateFromPIP = useCallback((data: PIPData | null) => {
    if (data) {
      agentRef.current.update(data.coherence);
      setDuration(agentRef.current.getSustainedDuration());
    }
  }, []);

  const reset = useCallback(() => {
    agentRef.current.reset();
    setState(agentRef.current.getState());
    setDuration(0);
  }, []);

  return {
    ...state,
    duration,
    friction: state.currentFriction,
    isFlowState: state.flowStateAchieved,
    update,
    updateFromPIP,
    reset,
    agent: agentRef.current,
  };
}

/** Hook for Pichet agent */
export function usePichet() {
  const agentRef = useRef(createPichetAgent());
  const [state, setState] = useState<PichetState>(agentRef.current.getState());

  useEffect(() => {
    const unsubscribe = agentRef.current.onEvent(() => {
      setState(agentRef.current.getState());
    });

    return unsubscribe;
  }, []);

  const update = useCallback((physicalCycleScore: number) => {
    agentRef.current.update(physicalCycleScore);
  }, []);

  const updateFromPIP = useCallback((data: PIPData | null) => {
    if (data) {
      agentRef.current.update(data.physicalCycle);
    }
  }, []);

  const reset = useCallback(() => {
    agentRef.current.reset();
    setState(agentRef.current.getState());
  }, []);

  return {
    ...state,
    gravity: state.currentGravity,
    tier: agentRef.current.getGravityTier(),
    update,
    updateFromPIP,
    reset,
    agent: agentRef.current,
  };
}

/** Hook for Gate Check Protocol */
export function useGateCheck(aletheos: AletheosAgent, pichet: PichetAgent) {
  const protocolRef = useRef(createGateCheckProtocol(aletheos, pichet));
  const ritualGateRef = useRef(createRitualGate(protocolRef.current));
  const [result, setResult] = useState<GateCheckResult>({
    allowed: true,
    friction: 1.0,
    gravity: 1.0,
    blockReason: null,
    timestamp: Date.now(),
  });
  const [status, setStatus] = useState({
    canProceed: true,
    frictionOk: true,
    gravityOk: true,
  });

  useEffect(() => {
    const unsubscribe = protocolRef.current.onEvent((event: WitnessEvent) => {
      if (event.type === 'gate_allowed' || event.type === 'gate_blocked') {
        const lastResult = protocolRef.current.getLastResult();
        if (lastResult) {
          setResult(lastResult);
        }
        setStatus(protocolRef.current.getStatus());
      }
    });

    // Initial evaluation
    const initialResult = protocolRef.current.evaluate();
    setResult(initialResult);
    setStatus(protocolRef.current.getStatus());

    return unsubscribe;
  }, [aletheos, pichet]);

  const evaluate = useCallback(() => {
    const newResult = protocolRef.current.evaluate();
    setResult(newResult);
    setStatus(protocolRef.current.getStatus());
    return newResult;
  }, []);

  const requestTransition = useCallback((fromState: string, toState: string) => {
    return ritualGateRef.current.requestTransition(fromState, toState);
  }, []);

  return {
    ...result,
    ...status,
    evaluate,
    requestTransition,
    protocol: protocolRef.current,
    ritualGate: ritualGateRef.current,
  };
}

/** Combined hook for all Witness Agents */
export function useWitnessAgents() {
  const aletheos = useAletheos();
  const pichet = usePichet();
  const gateCheck = useGateCheck(aletheos.agent, pichet.agent);

  const updateFromPIP = useCallback((data: PIPData | null) => {
    aletheos.updateFromPIP(data);
    pichet.updateFromPIP(data);
  }, [aletheos, pichet]);

  const reset = useCallback(() => {
    aletheos.reset();
    pichet.reset();
    gateCheck.protocol.reset();
  }, [aletheos, pichet, gateCheck.protocol]);

  return {
    aletheos: {
      friction: aletheos.friction,
      duration: aletheos.duration,
      isFlowState: aletheos.isFlowState,
      state: aletheos,
    },
    pichet: {
      gravity: pichet.gravity,
      tier: pichet.tier,
      state: pichet,
    },
    gateCheck: {
      canProceed: gateCheck.canProceed,
      frictionOk: gateCheck.frictionOk,
      gravityOk: gateCheck.gravityOk,
      blockReason: gateCheck.blockReason,
    },
    updateFromPIP,
    reset,
  };
}

/** Hook for coherence duration timer */
export function useCoherenceDurationTimer(coherenceThreshold = 70) {
  const timerRef = useRef(createCoherenceTimer(coherenceThreshold));
  const [duration, setDuration] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const unsubscribe = timerRef.current.onDuration((newDuration) => {
      setDuration(newDuration);
    });

    return unsubscribe;
  }, []);

  const update = useCallback((coherence: number) => {
    timerRef.current.update(coherence);
    setIsActive(timerRef.current.isActive());
    setDuration(timerRef.current.getDuration());
  }, []);

  const reset = useCallback(() => {
    timerRef.current.stop();
    setDuration(0);
    setIsActive(false);
  }, []);

  return {
    duration,
    isActive,
    update,
    reset,
  };
}

/** Hook for gravity controller */
export function useGravityController(baseGravity = -9.81) {
  const controllerRef = useRef(createGravityController(baseGravity));
  const [gravity, setGravity] = useState(baseGravity);
  const [multiplier, setMultiplier] = useState(1.0);

  const update = useCallback((deltaTime: number, newMultiplier?: number) => {
    if (newMultiplier !== undefined && newMultiplier !== multiplier) {
      controllerRef.current.setMultiplier(newMultiplier);
      setMultiplier(newMultiplier);
    }
    const newGravity = controllerRef.current.update(deltaTime);
    setGravity(newGravity);
    return newGravity;
  }, [multiplier]);

  const setGravityMultiplier = useCallback((newMultiplier: number) => {
    controllerRef.current.setMultiplier(newMultiplier);
    setMultiplier(newMultiplier);
  }, []);

  return {
    gravity,
    multiplier,
    update,
    setMultiplier: setGravityMultiplier,
  };
}
