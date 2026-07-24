/**
 * Dasha Transition Component
 * P4-S1-09: Cross-fade transition when planetary period changes
 *
 * When a user returns and their Dasha period has changed,
 * smoothly cross-fade the biome using dissolve shader.
 * 5-second transition duration.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { DashaPeriod, DashaChangeResult } from './DashaDetection';
import {
  createDissolveUniforms,
  type DissolveUniforms,
} from '../shaders/dissolve';

/** Dasha transition props */
export interface DashaTransitionProps {
  /** Dasha change detection result */
  dashaChange: DashaChangeResult;
  /** Callback when transition completes */
  onTransitionComplete?: () => void;
  /** Transition duration in seconds */
  duration?: number;
  /** Children to render (new biome) */
  children?: React.ReactNode;
}

/** Transition state */
type TransitionState = 'idle' | 'transitioning' | 'complete';

/**
 * Dasha Transition Component
 * Wraps the world content and applies dissolve transition when Dasha changes
 */
export const DashaTransition: React.FC<DashaTransitionProps> = ({
  dashaChange,
  onTransitionComplete,
  duration = 5.0,
  children,
}) => {
  const [transitionState, setTransitionState] = useState<TransitionState>('idle');
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const progressRef = useRef(0);
  const startTimeRef = useRef(0);

  // Initialize transition when Dasha change is detected
  useEffect(() => {
    if (dashaChange.shouldTransition && transitionState === 'idle') {
      console.log(
        `[DashaTransition] Starting transition: ${dashaChange.oldPeriod} -> ${dashaChange.newPeriod}`
      );
      setTransitionState('transitioning');
      progressRef.current = 0;
      startTimeRef.current = performance.now() / 1000;
    }
  }, [dashaChange, transitionState]);

  // Update transition progress
  useFrame(() => {
    if (transitionState !== 'transitioning' || !materialRef.current) {
      return;
    }

    const currentTime = performance.now() / 1000;
    const elapsed = currentTime - startTimeRef.current;
    const progress = Math.min(1.0, elapsed / duration);

    progressRef.current = progress;

    // Update shader uniform
    if (materialRef.current.uniforms.uProgress) {
      materialRef.current.uniforms.uProgress.value = progress;
    }

    if (materialRef.current.uniforms.uTime) {
      materialRef.current.uniforms.uTime.value = currentTime;
    }

    // Check if complete
    if (progress >= 1.0) {
      setTransitionState('complete');
      onTransitionComplete?.();
      console.log('[DashaTransition] Transition complete');
    }
  });

  // Don't render transition overlay if not transitioning
  if (!dashaChange.shouldTransition || transitionState === 'idle') {
    return <>{children}</>;
  }

  // If transition is complete, just render children
  if (transitionState === 'complete') {
    return <>{children}</>;
  }

  return (
    <group>
      {/* New biome (children) */}
      {children}

      {/* Dissolve overlay during transition */}
      {transitionState === 'transitioning' && (
        <DashaDissolveOverlay
          ref={materialRef}
          oldPeriod={dashaChange.oldPeriod}
          newPeriod={dashaChange.newPeriod}
        />
      )}
    </group>
  );
};

/** Dissolve overlay props */
interface DashaDissolveOverlayProps {
  oldPeriod: DashaPeriod | null;
  newPeriod: DashaPeriod;
}

/**
 * Dissolve overlay shader material
 * Renders a fullscreen quad with dissolve effect
 */
const DashaDissolveOverlay = React.forwardRef<
  THREE.ShaderMaterial,
  DashaDissolveOverlayProps
>(({ oldPeriod, newPeriod }, ref) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Create dissolve material
  const material = React.useMemo(() => {
    const uniforms = createDissolveUniforms();

    // Use aged gold for edge color
    uniforms.uEdgeColor.value = new THREE.Color(0xC5A442); // Aged Gold

    return new THREE.ShaderMaterial({
      vertexShader: dashaDissolveVertexShader,
      fragmentShader: dashaDissolveFragmentShader,
      uniforms,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
  }, []);

  // Expose material ref
  React.useImperativeHandle(ref, () => material, [material]);

  return (
    <mesh ref={meshRef} material={material} renderOrder={999}>
      {/* Fullscreen plane */}
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
});

DashaDissolveOverlay.displayName = 'DashaDissolveOverlay';

/**
 * Vertex shader for Dasha dissolve
 * Simple fullscreen quad in screen space
 */
const dashaDissolveVertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vPosition = position;

    // Render in screen space
    gl_Position = vec4(position.xy, 0.999, 1.0);
  }
`;

/**
 * Fragment shader for Dasha dissolve
 * Based on dissolve shader pattern
 */
const dashaDissolveFragmentShader = `
  uniform float uTime;
  uniform float uProgress;
  uniform float uNoiseScale;
  uniform float uEdgeWidth;
  uniform vec3 uEdgeColor;

  varying vec2 vUv;

  // Simplex noise function
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    // Generate noise pattern
    vec3 noisePos = vec3(vUv * uNoiseScale, uTime * 0.1);
    float noiseVal = snoise(noisePos);

    // Add detail noise
    float detailNoise = snoise(noisePos * 2.0 + vec3(100.0));
    noiseVal = noiseVal * 0.7 + detailNoise * 0.3;

    // Normalize to 0-1
    noiseVal = (noiseVal + 1.0) * 0.5;

    // Calculate dissolve threshold
    float threshold = uProgress;

    // Create edge
    float edgeLow = threshold - uEdgeWidth * 0.5;
    float edgeHigh = threshold + uEdgeWidth * 0.5;

    // Dissolve mask - fade from opaque to transparent
    float alpha = 1.0 - smoothstep(edgeLow, edgeHigh, noiseVal);

    // Edge glow
    float edgeDist = abs(noiseVal - threshold);
    float edgeGlow = 1.0 - smoothstep(0.0, uEdgeWidth * 0.5, edgeDist);

    // Old biome darkening overlay
    vec3 color = vec3(0.0);

    // Add edge glow
    color = mix(color, uEdgeColor, edgeGlow * 0.7);

    // Output - alpha controls visibility of old biome darkening
    gl_FragColor = vec4(color, alpha * 0.8);
  }
`;

export default DashaTransition;
