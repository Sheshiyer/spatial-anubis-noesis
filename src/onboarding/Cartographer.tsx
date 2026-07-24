/**
 * Cartographer Component — Dynamic splat cloud entity
 * P1-S2-10, P1-S2-35, P1-S2-40: Gold splat humanoid with breathing motion and attention tracking
 */
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CartographerProps {
  visible?: boolean;
  position?: [number, number, number];
  targetPosition?: [number, number, number];
  scale?: number;
  onNavigate?: () => void;
}

const GOLD_COLOR = new THREE.Color('#B8860B');
const SPLAT_COUNT = 200;
const BREATH_FREQUENCY = 0.15; // Hz
const BREATH_SCALE_MIN = 0.95;
const BREATH_SCALE_MAX = 1.05;

export function Cartographer({
  visible = true,
  position = [0, 0, 0],
  targetPosition,
  scale = 1,
  onNavigate,
}: CartographerProps) {
  const meshRef = useRef<THREE.Points>(null);
  const basePositionsRef = useRef<Float32Array>(new Float32Array(SPLAT_COUNT * 3));
  const navigateStartRef = useRef<number | null>(null);

  // Generate humanoid splat cloud positions
  const { positions, sizes } = useMemo(() => {
    const positions = new Float32Array(SPLAT_COUNT * 3);
    const sizes = new Float32Array(SPLAT_COUNT);

    // Humanoid proportions (simplified)
    const sections = [
      // Head - 20 splats
      { y: [1.5, 1.8], r: [0, 0.25], count: 20 },
      // Torso - 60 splats
      { y: [0.8, 1.5], r: [0, 0.35], count: 60 },
      // Arms - 30 splats each
      { y: [0.6, 1.3], r: [0.35, 0.55], count: 30 },
      // Legs - 30 splats each
      { y: [-0.2, 0.6], r: [0.15, 0.35], count: 30 },
    ];

    let idx = 0;
    sections.forEach((section) => {
      const sectionCount = Math.floor(section.count);
      for (let i = 0; i < sectionCount && idx < SPLAT_COUNT; i++) {
        const y = section.y[0] + Math.random() * (section.y[1] - section.y[0]);
        const r = section.r[0] + Math.random() * (section.r[1] - section.r[0]);
        
        // Determine left/right for arms and legs
        const side = i % 2 === 0 ? -1 : 1;
        const xOffset = r > 0.3 ? side * (r - 0.1) : 0;
        
        positions[idx * 3] = xOffset + (Math.random() - 0.5) * 0.1;
        positions[idx * 3 + 1] = y;
        positions[idx * 3 + 2] = (Math.random() - 0.5) * r * 0.5;

        // Varied sizes for organic feel
        sizes[idx] = 0.02 + Math.random() * 0.04;

        idx++;
      }
    });

    // Store base positions for animation
    basePositionsRef.current = new Float32Array(positions);

    return { positions, sizes };
  }, []);

  // Colors - all gold variations
  const colors = useMemo(() => {
    const colors = new Float32Array(SPLAT_COUNT * 3);
    for (let i = 0; i < SPLAT_COUNT; i++) {
      // Slight variation in gold
      const variation = 0.9 + Math.random() * 0.2;
      colors[i * 3] = GOLD_COLOR.r * variation;
      colors[i * 3 + 1] = GOLD_COLOR.g * variation;
      colors[i * 3 + 2] = GOLD_COLOR.b * variation;
    }
    return colors;
  }, []);

  // Animation: breathing motion and attention tracking
  useFrame((state) => {
    if (!meshRef.current) return;

    const time = state.clock.elapsedTime;
    const mesh = meshRef.current;

    // P1-S2-34: Breathing motion (0.95-1.05 scale at 0.15Hz)
    const breathPhase = Math.sin(time * BREATH_FREQUENCY * Math.PI * 2);
    const breathScale =
      BREATH_SCALE_MIN + (breathPhase + 1) / 2 * (BREATH_SCALE_MAX - BREATH_SCALE_MIN);
    mesh.scale.setScalar(scale * breathScale);

    // P1-S2-35: Attention tracking - face vessel direction
    if (targetPosition) {
      const target = new THREE.Vector3(...targetPosition);
      mesh.lookAt(target);
      
      // Smooth rotation with damping
      const targetRotation = mesh.rotation.clone();
      mesh.rotation.y += (targetRotation.y - mesh.rotation.y) * 0.1;
    }

    // P1-S2-40: Navigation hint - drift toward North after calibration
    if (onNavigate && !navigateStartRef.current) {
      navigateStartRef.current = time;
    }

    if (navigateStartRef.current && time - navigateStartRef.current > 2) {
      // Drift north (negative Z) at 0.5 units/sec
      const deltaTime = state.clock.getDelta();
      mesh.position.z -= 0.5 * deltaTime;
    }
  });

  if (!visible) return null;

  return (
    <points ref={meshRef} position={position}>
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
