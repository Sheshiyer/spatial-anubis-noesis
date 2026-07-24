/**
 * Visit Traces — Session history as light traces in South zone
 * P1-S2-26: One trace per visit on floor
 */
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { VisitTrace } from '../types/onboarding';
import { useOnboardingStore } from '../state/onboardingStore';

interface VisitTracesProps {
  visible?: boolean;
}

const TRACE_COLOR = new THREE.Color('#F5F0E8');

export function VisitTraces({ visible = true }: VisitTracesProps) {
  const { visitTraces } = useOnboardingStore();

  if (!visible || visitTraces.length === 0) return null;

  return (
    <group position={[0, -2, 3]}> {/* South zone floor */}
      {visitTraces.map((trace) => (
        <Trace key={trace.id} trace={trace} />
      ))}
    </group>
  );
}

function Trace({ trace }: { trace: VisitTrace }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Random position around the trace coordinates
  const position = useMemo(() => {
    return [trace.x, 0, trace.z] as [number, number, number];
  }, [trace.x, trace.z]);

  useFrame((state) => {
    if (!meshRef.current) return;
    
    // Subtle pulsing based on age of trace
    const age = (Date.now() - trace.timestamp) / 1000;
    const pulse = Math.sin(state.clock.elapsedTime + age) * 0.1 + 0.9;
    
    meshRef.current.scale.setScalar(pulse);
    
    // Fade out very old traces
    const maxAge = 300; // 5 minutes
    const opacity = Math.max(0, 1 - age / maxAge);
    
    if (meshRef.current.material instanceof THREE.Material) {
      meshRef.current.material.opacity = opacity * 0.3;
    }
  });

  return (
    <mesh ref={meshRef} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.3, 16]} />
      <meshBasicMaterial
        color={TRACE_COLOR}
        transparent
        opacity={0.3}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * Hook to add a visit trace when entering South zone
 */
export function useVisitTrace() {
  const { addVisitTrace, visitCount } = useOnboardingStore();

  const leaveTrace = () => {
    // Random position in South zone
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 4;
    const x = Math.cos(angle) * radius;
    const z = 3 + Math.random() * 3; // South area

    addVisitTrace({
      timestamp: Date.now(),
      x,
      z,
    });
  };

  return { leaveTrace, visitCount };
}
