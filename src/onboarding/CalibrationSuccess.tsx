/**
 * Calibration Success Transition — Silhouette dissolve to vessel
 * P1-S2-20, P1-S2-29: Smooth transition from calibration to vessel
 */
import { useEffect, useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { VesselType } from '../types/onboarding';
import { useOnboardingStore } from '../state/onboardingStore';
import './styles.css';

interface CalibrationSuccessProps {
  vesselType: VesselType;
  onComplete?: () => void;
}

const BONE_COLOR = new THREE.Color('#F5F0E8');
const GOLD_COLOR = new THREE.Color('#B8860B');

export function CalibrationSuccess({ vesselType, onComplete }: CalibrationSuccessProps) {
  const [showVessel, setShowVessel] = useState(false);
  const [transitionProgress, setTransitionProgress] = useState(0);
  const { completeCalibration } = useOnboardingStore();

  useEffect(() => {
    // Start transition after brief delay
    const startDelay = setTimeout(() => {
      setShowVessel(true);
      
      // Animate transition progress
      const startTime = performance.now();
      const duration = 1500; // P1-S2-20: 1.5 seconds total
      
      const animate = (time: number) => {
        const elapsed = time - startTime;
        const t = Math.min(1, elapsed / duration);
        setTransitionProgress(t);
        
        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          completeCalibration(vesselType);
          onComplete?.();
        }
      };
      
      requestAnimationFrame(animate);
    }, 100);
    
    return () => clearTimeout(startDelay);
  }, [vesselType, completeCalibration, onComplete]);

  return (
    <div className="calibration-success-container">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.3} color="#1A1A2E" />
        <directionalLight position={[5, 5, 5]} intensity={1} color="#F5F0E8" />
        
        {showVessel && vesselType === 'splat' && (
          <VesselSplatCloud progress={transitionProgress} />
        )}
        
        {showVessel && vesselType === 'geometric' && (
          <VesselGeometric progress={transitionProgress} />
        )}
      </Canvas>
    </div>
  );
}

/**
 * P1-S2-29: Vessel spawn animation — splats materialize from edges inward
 */
function VesselSplatCloud({ progress }: { progress: number }) {
  const meshRef = useRef<THREE.Points>(null);
  const SPLAT_COUNT = 150;
  
  const { positions, basePositions, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(SPLAT_COUNT * 3);
    const basePositions = new Float32Array(SPLAT_COUNT * 3);
    const colors = new Float32Array(SPLAT_COUNT * 3);
    const sizes = new Float32Array(SPLAT_COUNT);
    
    // Crystalline ship shape (simplified)
    for (let i = 0; i < SPLAT_COUNT; i++) {
      const t = i / SPLAT_COUNT;
      
      // Crystalline structure
      const angle = t * Math.PI * 4;
      const radius = 0.5 + Math.sin(t * Math.PI * 2) * 0.3;
      const x = Math.cos(angle) * radius;
      const y = (t - 0.5) * 2;
      const z = Math.sin(angle) * radius * 0.5;
      
      basePositions[i * 3] = x;
      basePositions[i * 3 + 1] = y;
      basePositions[i * 3 + 2] = z;
      
      // Start from edges (scaled outward)
      positions[i * 3] = x * 3;
      positions[i * 3 + 1] = y * 3;
      positions[i * 3 + 2] = z * 3;
      
      // Bone white with slight variation
      const variation = 0.95 + Math.random() * 0.1;
      colors[i * 3] = BONE_COLOR.r * variation;
      colors[i * 3 + 1] = BONE_COLOR.g * variation;
      colors[i * 3 + 2] = BONE_COLOR.b * variation;
      
      sizes[i] = 0.03 + Math.random() * 0.02;
    }
    
    return { positions, basePositions, colors, sizes };
  }, []);

  useFrame(() => {
    if (!meshRef.current) return;
    
    const positionAttr = meshRef.current.geometry.attributes.position;
    if (!positionAttr) return;
    
    const array = positionAttr.array as Float32Array;
    
    // Ease-out cubic for smooth arrival
    const easeT = 1 - Math.pow(1 - progress, 3);
    
    for (let i = 0; i < SPLAT_COUNT; i++) {
      const idx = i * 3;
      const baseX = basePositions[idx] ?? 0;
      const baseY = basePositions[idx + 1] ?? 0;
      const baseZ = basePositions[idx + 2] ?? 0;
      
      array[idx] = baseX * 3 * (1 - easeT) + baseX * easeT;
      array[idx + 1] = baseY * 3 * (1 - easeT) + baseY * easeT;
      array[idx + 2] = baseZ * 3 * (1 - easeT) + baseZ * easeT;
    }
    
    positionAttr.needsUpdate = true;
    
    // Slow rotation
    meshRef.current.rotation.y += 0.005;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={SPLAT_COUNT}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={SPLAT_COUNT}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={SPLAT_COUNT}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/**
 * P1-S2-33: Path B geometric vessel
 */
function VesselGeometric({ progress }: { progress: number }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (!groupRef.current) return;
    
    // Scale from 0 to 1
    const easeT = 1 - Math.pow(1 - progress, 3);
    groupRef.current.scale.setScalar(easeT);
    
    // Slow rotation
    groupRef.current.rotation.y += 0.01;
    groupRef.current.rotation.x = Math.sin(Date.now() * 0.001) * 0.1;
  });

  return (
    <group ref={groupRef} scale={0}>
      {/* Central crystal */}
      <mesh>
        <octahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial
          color={GOLD_COLOR}
          metalness={0.8}
          roughness={0.2}
          emissive={GOLD_COLOR}
          emissiveIntensity={0.2}
        />
      </mesh>
      
      {/* Orbiting rings */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.8, 0.02, 8, 32]} />
        <meshStandardMaterial color={BONE_COLOR} emissive={BONE_COLOR} emissiveIntensity={0.3} />
      </mesh>
      
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.8, 0.02, 8, 32]} />
        <meshStandardMaterial color={BONE_COLOR} emissive={BONE_COLOR} emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}
