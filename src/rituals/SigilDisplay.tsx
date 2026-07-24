/**
 * Sigil SVG Display in 3D
 * P4-S1-22: Forged sigil SVG display
 *
 * Forged sigil floats above anvil as emissive plane.
 * Takes SVG path data and renders it as Three.js texture on billboard.
 * Glow effect with bloom.
 */

import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/** Sigil display configuration */
export interface SigilDisplayConfig {
  /** Display position (above anvil) */
  position: THREE.Vector3;
  /** Billboard size */
  size: number;
  /** Glow color (Aged Gold) */
  glowColor: THREE.Color;
  /** Glow intensity */
  glowIntensity: number;
  /** Float animation height */
  floatHeight: number;
  /** Float animation speed */
  floatSpeed: number;
  /** Rotation speed (radians/sec) */
  rotationSpeed: number;
  /** SVG canvas resolution */
  resolution: number;
}

/** Default display config */
export const DEFAULT_DISPLAY_CONFIG: SigilDisplayConfig = {
  position: new THREE.Vector3(-32, 2.5, 0), // Above anvil
  size: 1.0,
  glowColor: new THREE.Color(0xC5A442), // Aged Gold
  glowIntensity: 2.0,
  floatHeight: 0.2,
  floatSpeed: 1.0,
  rotationSpeed: 0.3,
  resolution: 512,
};

/** Sigil display state */
export interface SigilDisplayState {
  /** Is sigil visible */
  isVisible: boolean;
  /** Current float offset */
  floatOffset: number;
  /** Current rotation */
  rotation: number;
  /** Fade-in progress (0-1) */
  fadeProgress: number;
}

/** Sigil Display component props */
export interface SigilDisplayProps {
  /** SVG path data */
  svgPath: string;
  /** Position override */
  position?: [number, number, number];
  /** Configuration override */
  config?: Partial<SigilDisplayConfig>;
  /** Billboard mode (always face camera) */
  billboard?: boolean;
  /** Callback when fully visible */
  onFullyVisible?: () => void;
}

/**
 * Convert SVG path to canvas texture
 */
function svgToTexture(
  svgPath: string,
  resolution: number,
  color: THREE.Color
): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = resolution;
  canvas.height = resolution;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    console.error('[SigilDisplay] Failed to get 2D context');
    return new THREE.Texture();
  }

  // Clear canvas
  ctx.fillStyle = 'rgba(0, 0, 0, 0)';
  ctx.fillRect(0, 0, resolution, resolution);

  // Draw SVG path
  const path = new Path2D(svgPath);

  // Set up rendering
  ctx.save();
  ctx.translate(resolution / 2, resolution / 2);
  ctx.scale(resolution / 2, resolution / 2);

  // Stroke the path with glow color
  ctx.strokeStyle = `rgb(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)})`;
  ctx.lineWidth = 0.02;
  ctx.stroke(path);

  // Fill the path
  ctx.fillStyle = `rgb(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)})`;
  ctx.fill(path);

  ctx.restore();

  // Create texture
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  return texture;
}

/**
 * Sigil Display R3F Component
 * Renders SVG as glowing billboard
 */
export function SigilDisplay({
  svgPath,
  position,
  config: configOverride,
  billboard = true,
  onFullyVisible,
}: SigilDisplayProps) {
  const config = { ...DEFAULT_DISPLAY_CONFIG, ...configOverride };
  const displayPos = position
    ? new THREE.Vector3(...position)
    : config.position;

  const meshRef = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [state, setState] = useState<SigilDisplayState>({
    isVisible: false,
    floatOffset: 0,
    rotation: 0,
    fadeProgress: 0,
  });

  // Generate texture from SVG path
  useEffect(() => {
    if (svgPath) {
      console.log('[SigilDisplay] Generating texture from SVG path');
      const tex = svgToTexture(svgPath, config.resolution, config.glowColor);
      setTexture(tex);
      setState(prev => ({ ...prev, isVisible: true }));
    }
  }, [svgPath, config.resolution, config.glowColor]);

  // Animation loop
  useFrame((frameState, delta) => {
    if (!state.isVisible || !meshRef.current) return;

    // Fade in
    if (state.fadeProgress < 1.0) {
      const newProgress = Math.min(1.0, state.fadeProgress + delta);
      setState(prev => ({ ...prev, fadeProgress: newProgress }));

      if (newProgress >= 1.0 && onFullyVisible) {
        onFullyVisible();
      }
    }

    // Float animation
    const floatOffset = Math.sin(frameState.clock.elapsedTime * config.floatSpeed) * config.floatHeight;
    setState(prev => ({ ...prev, floatOffset }));
    meshRef.current.position.y = displayPos.y + floatOffset;

    // Rotation animation
    const rotation = (frameState.clock.elapsedTime * config.rotationSpeed) % (Math.PI * 2);
    setState(prev => ({ ...prev, rotation }));

    if (billboard) {
      // Billboard: always face camera
      meshRef.current.quaternion.copy(frameState.camera.quaternion);
    } else {
      // Rotate around Y axis
      meshRef.current.rotation.y = rotation;
    }

    // Update material opacity
    const material = meshRef.current.material as THREE.MeshStandardMaterial;
    material.opacity = state.fadeProgress;
    material.emissiveIntensity = config.glowIntensity * state.fadeProgress;
  });

  if (!texture || !state.isVisible) {
    return null;
  }

  return (
    <mesh
      ref={meshRef}
      position={[displayPos.x, displayPos.y, displayPos.z]}
    >
      <planeGeometry args={[config.size, config.size]} />
      <meshStandardMaterial
        map={texture}
        transparent
        opacity={state.fadeProgress}
        emissive={config.glowColor}
        emissiveIntensity={config.glowIntensity * state.fadeProgress}
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />

      {/* Glow light */}
      <pointLight
        color={config.glowColor}
        intensity={config.glowIntensity * state.fadeProgress * 3}
        distance={5}
        decay={2}
      />
    </mesh>
  );
}

/**
 * Generate simple geometric sigil path (placeholder)
 * Real implementation would come from backend Sigil Compiler
 */
export function generatePlaceholderSigil(): string {
  // Simple star shape
  const points: [number, number][] = [];
  const outerRadius = 0.8;
  const innerRadius = 0.4;
  const numPoints = 5;

  for (let i = 0; i < numPoints * 2; i++) {
    const angle = (i * Math.PI) / numPoints - Math.PI / 2;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    points.push([
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
    ]);
  }

  // Convert to SVG path
  let path = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i][0]} ${points[i][1]}`;
  }
  path += ' Z';

  return path;
}

/**
 * Validate SVG path data
 */
export function isValidSvgPath(path: string): boolean {
  if (!path || typeof path !== 'string') return false;

  // Basic SVG path validation (starts with M, contains valid commands)
  const validCommands = /^[MLHVCSQTAZmlhvcsqtaz\d\s,.-]+$/;
  return validCommands.test(path) && path.trim().length > 0;
}

/**
 * Extract sigil complexity score (for visual feedback)
 * Returns 0-1 based on path complexity
 */
export function getSigilComplexity(path: string): number {
  if (!isValidSvgPath(path)) return 0;

  // Count command letters
  const commands = path.match(/[MLHVCSQTAZmlhvcsqtaz]/g) || [];
  const complexity = Math.min(1, commands.length / 50);

  return complexity;
}
