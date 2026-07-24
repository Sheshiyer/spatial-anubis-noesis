/**
 * Breath-Sync Projection Component
 * P4-S1-12: Coherence check causes artifact to expand and project text
 *
 * When bio coherence exceeds threshold (60), the dodecahedron expands
 * and canticle text projects outward as floating 3D text with typewriter effect.
 */

import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/** Breath-sync projection props */
export interface BreathSyncProjectionProps {
  /** Artifact center position */
  artifactPosition: THREE.Vector3;
  /** Bio-coherence value (0-100) */
  coherence: number;
  /** Coherence threshold for activation */
  coherenceThreshold?: number;
  /** Whether artifact is engaged */
  isEngaged: boolean;
  /** Canticle text to project */
  canticleText?: string;
  /** Callback when projection starts */
  onProjectionStart?: () => void;
  /** Callback when projection ends */
  onProjectionEnd?: () => void;
}

/** Default constants */
const PROJECTION_CONSTANTS = {
  COHERENCE_THRESHOLD: 60,
  EXPANSION_SCALE: 2.5,
  EXPANSION_DURATION: 1.5, // seconds
  TEXT_RADIUS: 2.0,
  TEXT_COUNT: 8,
  ROTATION_SPEED: 0.2, // radians per second
  FADE_IN_DURATION: 0.5,
} as const;

/** Projection state */
type ProjectionState = 'idle' | 'expanding' | 'active' | 'contracting';

/**
 * Breath-Sync Projection Component
 * Manages expansion and text projection based on coherence
 */
export const BreathSyncProjection: React.FC<BreathSyncProjectionProps> = ({
  artifactPosition,
  coherence,
  coherenceThreshold = PROJECTION_CONSTANTS.COHERENCE_THRESHOLD,
  isEngaged,
  canticleText = 'Breathe. Witness. Become.',
  onProjectionStart,
  onProjectionEnd,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [projectionState, setProjectionState] = useState<ProjectionState>('idle');
  const [expansionProgress, setExpansionProgress] = useState(0);
  const expansionStartTime = useRef(0);
  const rotationAngle = useRef(0);

  // Check if coherence threshold is met and artifact is engaged
  const shouldProject = coherence >= coherenceThreshold && isEngaged;

  // Trigger projection state changes
  useEffect(() => {
    if (shouldProject && projectionState === 'idle') {
      console.log('[BreathSyncProjection] Starting projection');
      setProjectionState('expanding');
      expansionStartTime.current = performance.now() / 1000;
      onProjectionStart?.();
    } else if (!shouldProject && projectionState === 'active') {
      console.log('[BreathSyncProjection] Ending projection');
      setProjectionState('contracting');
      expansionStartTime.current = performance.now() / 1000;
    }
  }, [shouldProject, projectionState, onProjectionStart]);

  // Update expansion and rotation
  useFrame(() => {
    if (!groupRef.current) return;

    const currentTime = performance.now() / 1000;

    // Update expansion progress
    if (projectionState === 'expanding') {
      const elapsed = currentTime - expansionStartTime.current;
      const progress = Math.min(1.0, elapsed / PROJECTION_CONSTANTS.EXPANSION_DURATION);
      setExpansionProgress(progress);

      if (progress >= 1.0) {
        setProjectionState('active');
      }
    } else if (projectionState === 'contracting') {
      const elapsed = currentTime - expansionStartTime.current;
      const progress = Math.max(0, 1.0 - elapsed / PROJECTION_CONSTANTS.EXPANSION_DURATION);
      setExpansionProgress(progress);

      if (progress <= 0) {
        setProjectionState('idle');
        onProjectionEnd?.();
      }
    }

    // Update rotation
    if (projectionState === 'active' || projectionState === 'expanding') {
      rotationAngle.current += PROJECTION_CONSTANTS.ROTATION_SPEED * (1 / 60); // Assume 60fps
      groupRef.current.rotation.y = rotationAngle.current;
    }

    // Update position to follow artifact
    groupRef.current.position.copy(artifactPosition);
  });

  // Calculate current scale based on expansion
  const currentScale = 1.0 + (PROJECTION_CONSTANTS.EXPANSION_SCALE - 1.0) * expansionProgress;

  // Don't render anything if idle
  if (projectionState === 'idle') {
    return null;
  }

  return (
    <group ref={groupRef} scale={[currentScale, currentScale, currentScale]}>
      {/* Expansion sphere (wireframe) */}
      <ExpansionSphere opacity={expansionProgress} />

      {/* Projected text elements */}
      {projectionState !== 'contracting' && (
        <ProjectedTextRing
          text={canticleText}
          radius={PROJECTION_CONSTANTS.TEXT_RADIUS}
          count={PROJECTION_CONSTANTS.TEXT_COUNT}
          opacity={expansionProgress}
        />
      )}
    </group>
  );
};

/** Expansion sphere props */
interface ExpansionSphereProps {
  opacity: number;
}

/**
 * Expansion Sphere
 * Wireframe sphere that expands from artifact
 */
const ExpansionSphere: React.FC<ExpansionSphereProps> = ({ opacity }) => {
  const agedGold = new THREE.Color(0xC5A442);

  return (
    <mesh>
      <icosahedronGeometry args={[1, 2]} />
      <meshBasicMaterial
        color={agedGold}
        wireframe={true}
        transparent={true}
        opacity={opacity * 0.4}
      />
    </mesh>
  );
};

/** Projected text ring props */
interface ProjectedTextRingProps {
  text: string;
  radius: number;
  count: number;
  opacity: number;
}

/**
 * Projected Text Ring
 * Text elements arranged in a circle around artifact
 */
const ProjectedTextRing: React.FC<ProjectedTextRingProps> = ({
  text,
  radius,
  count,
  opacity,
}) => {
  const textElements: React.ReactNode[] = [];

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    textElements.push(
      <group key={i} position={[x, 0, z]}>
        {/* Billboard text - always faces camera */}
        <TextBillboard text={text} opacity={opacity} angle={angle} />
      </group>
    );
  }

  return <>{textElements}</>;
};

/** Text billboard props */
interface TextBillboardProps {
  text: string;
  opacity: number;
  angle: number;
}

/**
 * Text Billboard
 * Simple mesh with text (placeholder for @react-three/drei Text)
 */
const TextBillboard: React.FC<TextBillboardProps> = ({ text, opacity, angle }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const agedGold = new THREE.Color(0xC5A442);

  // Billboard effect - always face camera
  useFrame(({ camera }) => {
    if (meshRef.current) {
      meshRef.current.lookAt(camera.position);
    }
  });

  // For now, render a placeholder plane
  // In production, replace with @react-three/drei Text component
  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[1.5, 0.3]} />
      <meshBasicMaterial
        color={agedGold}
        transparent={true}
        opacity={opacity * 0.8}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

/**
 * Calculate whether coherence meets threshold
 */
export function meetsCoherenceThreshold(
  coherence: number,
  threshold: number = PROJECTION_CONSTANTS.COHERENCE_THRESHOLD
): boolean {
  return coherence >= threshold;
}

export default BreathSyncProjection;
