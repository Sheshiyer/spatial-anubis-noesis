/**
 * Cartographer Path Trail Component
 * P2-S1-14: Splat particles leading to Breathfield
 * 
 * Creates a fading trail of splat particles that guide the user
 * toward the Breathfield zone. Trail fades over 3 seconds.
 */

import React, { useRef, useEffect, useMemo, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useCartographerTrail, createTrailGeometry, trailParticleVertexShader, trailParticleFragmentShader } from '../hooks';

interface CartographerTrailProps {
  /** Source position (vessel/camera position) */
  sourcePosition?: THREE.Vector3;
  /** Target position (Breathfield center) */
  targetPosition: THREE.Vector3;
  /** Whether trail is active */
  active?: boolean;
  /** Trail duration in seconds */
  duration?: number;
  /** Number of particles */
  particleCount?: number;
  /** Particle size */
  particleSize?: number;
  /** Start color */
  startColor?: THREE.Color;
  /** End color */
  endColor?: THREE.Color;
  /** Called when trail completes */
  onComplete?: () => void;
  /** Debug mode */
  debug?: boolean;
}

/**
 * Trail path visualization
 * Shows the spline curve as a glowing line
 */
const TrailPath: React.FC<{
  points: THREE.Vector3[];
  opacity: number;
}> = ({ points, opacity }) => {
  const lineRef = useRef<THREE.Line>(null);
  
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    return geo;
  }, [points]);
  
  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);
  
  if (points.length < 2) return null;
  
  return (
    <line ref={lineRef}>
      <primitive object={geometry} attach="geometry" />
      <lineBasicMaterial
        color="#B8860B"
        transparent
        opacity={opacity * 0.3}
        blending={THREE.AdditiveBlending}
      />
    </line>
  );
};

/**
 * Particle system for trail
 */
const TrailParticles: React.FC<{
  points: THREE.Vector3[];
  progress: number;
  duration: number;
  particleSize: number;
  startColor: THREE.Color;
  endColor: THREE.Color;
}> = ({ points, progress, duration, particleSize, startColor, endColor }) => {
  const pointsRef = useRef<THREE.Points>(null);

  // Create particle geometry
  const geometry = useMemo(() => {
    const positions: number[] = [];
    const colors: number[] = [];
    const sizes: number[] = [];
    const lifes: number[] = [];

    points.forEach((point, i) => {
      const t = i / (points.length - 1);

      // Position with slight randomization
      const jitter = 0.5;
      positions.push(
        point.x + (Math.random() - 0.5) * jitter,
        point.y + (Math.random() - 0.5) * jitter,
        point.z + (Math.random() - 0.5) * jitter
      );

      // Color gradient
      const color = new THREE.Color().lerpColors(startColor, endColor, t);
      colors.push(color.r, color.g, color.b);

      // Size variation
      const size = particleSize * (1 + Math.random() * 0.5) * (1 - t * 0.3);
      sizes.push(size);

      // Initial life
      lifes.push(1);
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    geo.setAttribute('life', new THREE.Float32BufferAttribute(lifes, 1));

    return geo;
  }, [points, particleSize, startColor, endColor]);

  // Create shader material synchronously so it's available on first render
  const [material] = useState(() => new THREE.ShaderMaterial({
    vertexShader: trailParticleVertexShader,
    fragmentShader: trailParticleFragmentShader,
    uniforms: {
      uTime: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));

  // Dispose on unmount
  useEffect(() => {
    return () => { material.dispose(); };
  }, [material]);
  
  // Animate particles
  useFrame(({ clock }) => {
    if (!pointsRef.current) return;

    const time = clock.getElapsedTime();
    material.uniforms.uTime.value = time;
    
    // Update life attribute based on progress
    const lifeAttr = pointsRef.current.geometry.attributes.life;
    const count = lifeAttr.count;
    
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      // Staggered fade - particles at start fade later
      const staggerOffset = t * 0.5;
      const adjustedProgress = Math.max(0, progress - staggerOffset);
      const life = Math.max(0, 1 - adjustedProgress / (duration / 3));
      lifeAttr.setX(i, life);
    }
    lifeAttr.needsUpdate = true;
  });
  
  return (
    <points ref={pointsRef}>
      <primitive object={geometry} attach="geometry" />
      <primitive object={material} attach="material" />
    </points>
  );
};

/**
 * Floating waypoint markers
 */
const WaypointMarkers: React.FC<{
  points: THREE.Vector3[];
  progress: number;
}> = ({ points, progress }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  // Select a few waypoints along the path
  const waypoints = useMemo(() => {
    const count = 5;
    return Array.from({ length: count }, (_, i) => {
      const t = (i + 1) / (count + 1);
      const index = Math.floor(t * (points.length - 1));
      return points[index];
    }).filter(Boolean);
  }, [points]);
  
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    
    groupRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const showDelay = i * 0.15;
      const showProgress = Math.max(0, Math.min(1, (progress - showDelay) / 0.3));
      
      mesh.scale.setScalar(showProgress);
      mesh.rotation.y = clock.getElapsedTime() * 2;
      mesh.position.y += Math.sin(clock.getElapsedTime() * 3 + i) * 0.005;
      
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.opacity = showProgress * 0.5 * (1 - progress * 0.3);
    });
  });
  
  if (waypoints.length === 0) return null;
  
  return (
    <group ref={groupRef}>
      {waypoints.map((point, i) => (
        <mesh key={i} position={point}>
          <octahedronGeometry args={[0.8, 0]} />
          <meshBasicMaterial
            color="#B8860B"
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
};

/**
 * Main Cartographer Trail Component
 */
export const CartographerTrail: React.FC<CartographerTrailProps> = ({
  sourcePosition: initialSource,
  targetPosition,
  active = false,
  duration = 3,
  particleCount = 50,
  particleSize = 0.5,
  startColor = new THREE.Color(0xB8860B), // Aged Gold
  endColor = new THREE.Color(0xF5F0E8),   // Bone
  onComplete,
  debug = false,
}) => {
  const { camera } = useThree();
  const [sourcePos, setSourcePos] = useState<THREE.Vector3>(
    initialSource || camera.position
  );
  const [trailProgress, setTrailProgress] = useState(0);
  
  // Trail hook
  const {
    particles,
    isActive: isTrailActive,
    start: startTrail,
    update: updateTrail,
    getPathPoints,
  } = useCartographerTrail({
    config: {
      duration,
      particleCount,
      particleSize,
      startColor,
      endColor,
    },
    targetPosition,
    sourcePosition: sourcePos,
    active: false,
    debug,
  });
  
  // Get path points for visualization
  const pathPoints = useMemo(() => getPathPoints(50), [getPathPoints]);
  
  // Start trail when active
  useEffect(() => {
    if (active && !isTrailActive) {
      const start = initialSource || camera.position;
      setSourcePos(start);
      startTrail(start, targetPosition);
      setTrailProgress(0);
      
      if (debug) {
        console.log('[CartographerTrail] Starting trail', { start, target: targetPosition });
      }
    }
  }, [active, isTrailActive, initialSource, camera.position, targetPosition, startTrail, debug]);
  
  // Update trail animation
  useFrame((state, delta) => {
    if (!isTrailActive) return;
    
    const currentSource = initialSource || camera.position;
    updateTrail(delta, currentSource);
    
    // Update progress
    setTrailProgress(prev => {
      const newProgress = prev + delta / duration;
      if (newProgress >= 1) {
        onComplete?.();
        return 1;
      }
      return newProgress;
    });
  });
  
  if (!active && !isTrailActive) return null;
  
  return (
    <group>
      {/* Spline path line */}
      <TrailPath points={pathPoints} opacity={1 - trailProgress} />
      
      {/* Particle trail */}
      {pathPoints.length > 0 && (
        <TrailParticles
          points={pathPoints}
          progress={trailProgress}
          duration={duration}
          particleSize={particleSize}
          startColor={startColor}
          endColor={endColor}
        />
      )}
      
      {/* Waypoint markers */}
      <WaypointMarkers points={pathPoints} progress={trailProgress} />
      
      {/* Target glow */}
      <group position={targetPosition}>
        <mesh>
          <sphereGeometry args={[2, 16, 16]} />
          <meshBasicMaterial
            color="#B8860B"
            transparent
            opacity={0.2 * (1 - trailProgress * 0.5)}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        <pointLight
          color="#B8860B"
          intensity={2 * (1 - trailProgress * 0.5)}
          distance={20}
          decay={2}
        />
      </group>
    </group>
  );
};

export default CartographerTrail;
