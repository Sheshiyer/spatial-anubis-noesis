/**
 * Path B Calibration Flow — Skip silhouette, spawn geometric vessel
 * P1-S2-33: Direct to geometric vessel with navigation hint glow
 */
import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { createPortal } from 'react-dom';
import * as THREE from 'three';
import { useOnboardingStore } from '../state/onboardingStore';
import './styles.css';

interface PathBCalibrationProps {
  onComplete?: () => void;
}

const BONE_COLOR = new THREE.Color('#F5F0E8');
const GOLD_COLOR = new THREE.Color('#B8860B');

/**
 * P1-S2-33: Path B calibration — skip silhouette, spawn geometric vessel
 */
export function PathBCalibration({ onComplete }: PathBCalibrationProps) {
  const { completeCalibration } = useOnboardingStore();
  const [visible, setVisible] = useState(true);
  const [spawnProgress, setSpawnProgress] = useState(0);

  useEffect(() => {
    // Spawn geometric vessel
    const startTime = performance.now();
    const duration = 1500;

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const t = Math.min(1, elapsed / duration);
      setSpawnProgress(t);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        completeCalibration('geometric');
        // Show navigation hint for a moment
        setTimeout(() => {
          setVisible(false);
          onComplete?.();
        }, 1000);
      }
    };

    requestAnimationFrame(animate);
  }, [completeCalibration, onComplete]);

  if (!visible) return null;

  return createPortal(
    <div className="descent-overlay" data-phase="complete">
      <div className="descent-overlay__layer descent-overlay__layer--deep-ink">
        <Canvas
          camera={{ position: [0, 0, 5], fov: 60 }}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={0.3} color="#1A1A2E" />
          <directionalLight position={[5, 5, 5]} intensity={1} color="#F5F0E8" />
          
          <GeometricVessel progress={spawnProgress} />
          <NavigationHintGlow visible={spawnProgress > 0.8} />
        </Canvas>
      </div>
    </div>,
    document.body
  );
}

function GeometricVessel({ progress }: { progress: number }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;

    // Ease-out scale
    const easeT = 1 - Math.pow(1 - progress, 3);
    groupRef.current.scale.setScalar(easeT);

    // Rotation
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
        <meshStandardMaterial
          color={BONE_COLOR}
          emissive={BONE_COLOR}
          emissiveIntensity={0.3}
        />
      </mesh>

      <mesh rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.8, 0.02, 8, 32]} />
        <meshStandardMaterial
          color={BONE_COLOR}
          emissive={BONE_COLOR}
          emissiveIntensity={0.3}
        />
      </mesh>
    </group>
  );
}

function NavigationHintGlow({ visible }: { visible: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current || !visible) return;

    // Pulsing navigation hint
    const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.3 + 0.7;
    meshRef.current.scale.setScalar(pulse);
  });

  if (!visible) return null;

  return (
    <group position={[0, 0, -2]}>
      {/* North direction glow */}
      <mesh ref={meshRef}>
        <ringGeometry args={[0.5, 0.6, 32]} />
        <meshBasicMaterial
          color={GOLD_COLOR}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Direction arrow */}
      <mesh position={[0, 0.8, 0]}>
        <coneGeometry args={[0.2, 0.4, 3]} />
        <meshBasicMaterial color={GOLD_COLOR} transparent opacity={0.6} />
      </mesh>
    </group>
  );
}
