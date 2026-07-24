/**
 * Biome Crossfade Component
 * P4-S1-30: Biome cross-fade when Dasha changes
 *
 * When Dasha period changes, the old world dissolves with dissolve shader
 * and new world materializes over 5 seconds.
 */

import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  BiomeTransitionController,
  createBiomeTransitionController,
  type BiomeTransitionState,
} from '../shaders/biomeTransition';
import type { DashaPeriod } from '../vessel/DashaDetection';

/** Biome crossfade props */
export interface BiomeCrossfadeProps {
  /** Old Dasha period (before transition) */
  oldPeriod: DashaPeriod | null;
  /** New Dasha period (after transition) */
  newPeriod: DashaPeriod;
  /** Should start transition */
  shouldTransition: boolean;
  /** Callback when transition completes */
  onTransitionComplete?: () => void;
  /** Transition duration in seconds */
  duration?: number;
  /** Old biome content */
  oldBiome?: React.ReactNode;
  /** New biome content */
  newBiome: React.ReactNode;
}

/**
 * Biome Crossfade Component
 * Handles smooth visual transition between biomes using dissolve shader
 */
export const BiomeCrossfade: React.FC<BiomeCrossfadeProps> = ({
  oldPeriod,
  newPeriod,
  shouldTransition,
  onTransitionComplete,
  duration = 5.0,
  oldBiome,
  newBiome,
}) => {
  const [transitionController] = useState(() =>
    createBiomeTransitionController({ duration })
  );
  const [transitionState, setTransitionState] = useState<BiomeTransitionState>('idle');
  const oldBiomeGroupRef = useRef<THREE.Group>(null);
  const newBiomeGroupRef = useRef<THREE.Group>(null);

  // Start transition when shouldTransition becomes true
  useEffect(() => {
    if (shouldTransition && transitionState === 'idle' && oldPeriod && newPeriod) {
      console.log(`[BiomeCrossfade] Starting transition: ${oldPeriod} -> ${newPeriod}`);
      transitionController.startTransition(oldPeriod, newPeriod);
      setTransitionState('transitioning');
    }
  }, [shouldTransition, transitionState, oldPeriod, newPeriod, transitionController]);

  // Update transition
  useFrame((_, delta) => {
    if (transitionController.getState() === 'transitioning') {
      transitionController.update(delta);

      const progress = transitionController.getProgress();

      // Update old biome opacity (fade out)
      if (oldBiomeGroupRef.current) {
        oldBiomeGroupRef.current.traverse((object) => {
          if (object instanceof THREE.Mesh && object.material) {
            const material = object.material as THREE.Material;
            if ('opacity' in material) {
              (material as THREE.MeshStandardMaterial).opacity = 1.0 - progress;
              material.transparent = true;
            }
          }
        });
      }

      // Update new biome opacity (fade in)
      if (newBiomeGroupRef.current) {
        newBiomeGroupRef.current.traverse((object) => {
          if (object instanceof THREE.Mesh && object.material) {
            const material = object.material as THREE.Material;
            if ('opacity' in material) {
              (material as THREE.MeshStandardMaterial).opacity = progress;
              material.transparent = true;
            }
          }
        });
      }

      // Check if complete
      if (transitionController.getState() === 'complete') {
        setTransitionState('complete');
        onTransitionComplete?.();
        console.log('[BiomeCrossfade] Transition complete');
      }
    }
  });

  // If not transitioning, just render new biome
  if (!shouldTransition || transitionState === 'idle') {
    return <>{newBiome}</>;
  }

  // If transition complete, just render new biome
  if (transitionState === 'complete') {
    return <>{newBiome}</>;
  }

  // During transition, render both biomes
  return (
    <>
      {/* Old biome (fading out) */}
      {oldBiome && (
        <group ref={oldBiomeGroupRef} name="old-biome">
          {oldBiome}
        </group>
      )}

      {/* New biome (fading in) */}
      <group ref={newBiomeGroupRef} name="new-biome">
        {newBiome}
      </group>

      {/* Dissolve effect overlay */}
      <DissolveEffectMesh
        progress={transitionController.getProgress()}
        uniforms={transitionController.getUniforms()}
      />
    </>
  );
};

/** Dissolve effect mesh props */
interface DissolveEffectMeshProps {
  progress: number;
  uniforms: ReturnType<BiomeTransitionController['getUniforms']>;
}

/**
 * Dissolve Effect Mesh
 * Renders dissolve pattern using shader material
 */
const DissolveEffectMesh: React.FC<DissolveEffectMeshProps> = ({
  progress,
  uniforms,
}) => {
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  // Update uniforms
  useFrame(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uProgress.value = progress;
    }
  });

  return (
    <mesh renderOrder={100}>
      <planeGeometry args={[100, 100]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={dissolveOverlayVertexShader}
        fragmentShader={dissolveOverlayFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

/**
 * Dissolve overlay vertex shader
 */
const dissolveOverlayVertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * Dissolve overlay fragment shader
 */
const dissolveOverlayFragmentShader = `
  uniform float uTime;
  uniform float uProgress;
  uniform float uNoiseScale;
  uniform float uEdgeWidth;
  uniform vec3 uEdgeColor;

  varying vec2 vUv;
  varying vec3 vPosition;

  // Simplex noise
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
    // Generate noise pattern for dissolve
    vec3 noisePos = vec3(vUv * uNoiseScale, uTime * 0.1);
    float noiseVal = snoise(noisePos);
    noiseVal = (noiseVal + 1.0) * 0.5;

    // Calculate dissolve threshold
    float threshold = uProgress;
    float edgeLow = threshold - uEdgeWidth * 0.5;
    float edgeHigh = threshold + uEdgeWidth * 0.5;

    // Dissolve alpha
    float alpha = smoothstep(edgeLow, edgeHigh, noiseVal);

    // Edge glow
    float edgeDist = abs(noiseVal - threshold);
    float edgeGlow = 1.0 - smoothstep(0.0, uEdgeWidth * 0.5, edgeDist);

    // Color with edge glow
    vec3 color = mix(vec3(0.0), uEdgeColor, edgeGlow * 0.6);

    // Subtle darkening overlay during transition
    float darkening = (1.0 - uProgress) * 0.3;
    color = mix(color, vec3(0.0), darkening);

    gl_FragColor = vec4(color, alpha * 0.5);
  }
`;

export default BiomeCrossfade;
