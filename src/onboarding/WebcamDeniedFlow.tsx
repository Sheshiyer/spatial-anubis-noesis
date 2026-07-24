/**
 * Webcam Permission Denied Flow — Path B geometric vessel
 * P1-S2-39: No text, Path B geometric vessel, <1 second transition
 */
import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { createPortal } from 'react-dom';
import * as THREE from 'three';
import { useOnboardingStore } from '../state/onboardingStore';
import './styles.css';

interface WebcamDeniedFlowProps {
  onComplete?: () => void;
}

const BONE_COLOR = new THREE.Color('#F5F0E8');
const GOLD_COLOR = new THREE.Color('#B8860B');

/**
 * P1-S2-39: Permission denied — instant Path B geometric vessel
 */
export function WebcamDeniedFlow({ onComplete }: WebcamDeniedFlowProps) {
  const { denyCalibration } = useOnboardingStore();
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // P1-S2-39: <1 second transition
    const startTime = performance.now();
    const duration = 800;

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const t = Math.min(1, elapsed / duration);
      setProgress(t);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        denyCalibration();
        setTimeout(() => {
          setVisible(false);
          onComplete?.();
        }, 200);
      }
    };

    requestAnimationFrame(animate);
  }, [denyCalibration, onComplete]);

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
          <GeometricVessel progress={progress} />
          <NavigationHint visible={progress > 0.8} />
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

    // Scale from 0 to 1 with ease-out
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

      {/* Outer glow hint */}
      <mesh>
        <sphereGeometry args={[1.2, 16, 16]} />
        <meshBasicMaterial
          color={GOLD_COLOR}
          transparent
          opacity={0.1}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}

function NavigationHint({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <group position={[0, 0, -2]}>
      <mesh>
        <ringGeometry args={[0.3, 0.35, 32]} />
        <meshBasicMaterial color={GOLD_COLOR} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
