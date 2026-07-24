/**
 * Cardinal Direction Glow Effects
 * P2-S1-13: N/E/S/W atmospheric lights with shader post-processing
 * 
 * Renders four directional glow effects at cardinal positions
 * with configurable color and intensity per zone.
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { createCardinalGlowMaterial, animateGlowIntensities, updateGlowIntensity } from '../shaders';
import type { CardinalZones, ZoneConfig } from '../types';

interface CardinalGlowsProps {
  /** Zone configurations for each direction */
  zones?: Partial<CardinalZones>;
  /** Whether glows are active */
  active?: boolean;
  /** Reveal progress (0-1) for staggered activation */
  revealProgress?: number;
  /** Glow radius in world units */
  glowRadius?: number;
  /** Distance from center for glow positions */
  distanceFromCenter?: number;
  /** Enable pulse animation */
  pulse?: boolean;
  /** Debug mode */
  debug?: boolean;
}

// Default zone configurations with brand colors
const DEFAULT_ZONES: CardinalZones = {
  north: {
    position: new THREE.Vector3(0, 5, -50),
    glowColor: '#B8860B', // Aged Gold
    intensity: 1.0,
    radius: 20,
  },
  east: {
    position: new THREE.Vector3(50, 5, 0),
    glowColor: '#C65D3B', // Terracotta
    intensity: 0.8,
    radius: 20,
  },
  south: {
    position: new THREE.Vector3(0, 5, 50),
    glowColor: '#F5F0E8', // Bone
    intensity: 0.9,
    radius: 20,
  },
  west: {
    position: new THREE.Vector3(-50, 5, 0),
    glowColor: '#6B6B6B', // Stone Grey
    intensity: 0.7,
    radius: 20,
  },
};

/**
 * Individual glow orb component
 */
const GlowOrb: React.FC<{
  position: THREE.Vector3;
  color: string;
  intensity: number;
  radius: number;
  pulse?: boolean;
  delay?: number;
}> = ({ position, color, intensity, radius, pulse = true, delay = 0 }) => {
  const lightRef = useRef<THREE.PointLight>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(({ clock }) => {
    if (!lightRef.current || !meshRef.current) return;
    
    const time = clock.getElapsedTime() - delay;
    if (time < 0) return;
    
    // Pulse effect
    const pulseFactor = pulse ? 1 + Math.sin(time * 1.5) * 0.1 : 1;
    const currentIntensity = intensity * pulseFactor * Math.min(1, time);
    
    lightRef.current.intensity = currentIntensity * 2;
    
    // Scale mesh
    const scale = 1 + Math.sin(time * 2) * 0.05;
    meshRef.current.scale.setScalar(scale);
    
    // Update material opacity
    const material = meshRef.current.material as THREE.MeshBasicMaterial;
    material.opacity = currentIntensity * 0.3;
  });
  
  return (
    <group position={position}>
      {/* Point light */}
      <pointLight
        ref={lightRef}
        color={color}
        intensity={intensity}
        distance={radius * 3}
        decay={1.5}
      />
      
      {/* Glow mesh */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[radius * 0.3, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={intensity * 0.3}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      
      {/* Outer glow */}
      <mesh>
        <sphereGeometry args={[radius * 0.6, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={intensity * 0.1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

/**
 * Volumetric glow beams
 */
const GlowBeams: React.FC<{
  zones: CardinalZones;
  revealProgress: number;
}> = ({ zones, revealProgress }) => {
  const beamsRef = useRef<THREE.Group>(null);
  
  const beamConfigs = useMemo(() => [
    { zone: zones.north, key: 'north', color: zones.north.glowColor },
    { zone: zones.east, key: 'east', color: zones.east.glowColor },
    { zone: zones.south, key: 'south', color: zones.south.glowColor },
    { zone: zones.west, key: 'west', color: zones.west.glowColor },
  ], [zones]);
  
  useFrame(({ clock }) => {
    if (!beamsRef.current) return;
    
    beamsRef.current.children.forEach((beam, i) => {
      const config = beamConfigs[i];
      if (!config) return;
      
      const mesh = beam as THREE.Mesh;
      const material = mesh.material as THREE.MeshBasicMaterial;
      
      // Calculate beam visibility based on reveal progress
      // Staggered reveal: North first, then East, South, West
      const staggerDelay = i * 0.15;
      const beamProgress = Math.max(0, Math.min(1, 
        (revealProgress - staggerDelay) / (1 - staggerDelay)
      ));
      
      material.opacity = config.zone.intensity * beamProgress * 0.15;
      
      // Subtle rotation
      mesh.rotation.y = clock.getElapsedTime() * 0.1 * (i % 2 === 0 ? 1 : -1);
    });
  });
  
  if (revealProgress <= 0) return null;
  
  return (
    <group ref={beamsRef}>
      {beamConfigs.map((config, i) => (
        <mesh key={config.key} position={config.zone.position}>
          <coneGeometry args={[config.zone.radius, config.zone.radius * 4, 32, 1, true]} />
          <meshBasicMaterial
            color={config.color}
            transparent
            opacity={0}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
};

/**
 * Main Cardinal Glows Component
 */
export const CardinalGlows: React.FC<CardinalGlowsProps> = ({
  zones: customZones,
  active = true,
  revealProgress = 1,
  glowRadius = 20,
  distanceFromCenter = 50,
  pulse = true,
  debug = false,
}) => {
  const { camera } = useThree();
  const shaderMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  
  // Merge zone configurations
  const zones: CardinalZones = useMemo(() => {
    const merged: CardinalZones = { ...DEFAULT_ZONES };
    
    if (customZones) {
      (Object.keys(customZones) as Array<keyof CardinalZones>).forEach(key => {
        const zone = customZones[key];
        if (zone) {
          merged[key] = { ...merged[key], ...zone };
        }
      });
    }
    
    // Apply distance from center
    merged.north.position.z = -distanceFromCenter;
    merged.east.position.x = distanceFromCenter;
    merged.south.position.z = distanceFromCenter;
    merged.west.position.x = -distanceFromCenter;
    
    // Apply radius
    (Object.keys(merged) as Array<keyof CardinalZones>).forEach(key => {
      merged[key].radius = glowRadius;
    });
    
    return merged;
  }, [customZones, distanceFromCenter, glowRadius]);
  
  // Create shader material for atmospheric glow
  useEffect(() => {
    shaderMaterialRef.current = createCardinalGlowMaterial(zones);
    
    if (debug) {
      console.log('[CardinalGlows] Created', zones);
    }
    
    return () => {
      shaderMaterialRef.current?.dispose();
    };
  }, [zones, debug]);
  
  // Update camera position in shader
  useFrame(() => {
    if (!shaderMaterialRef.current) return;
    shaderMaterialRef.current.uniforms.uCameraPosition.value.copy(camera.position);
  });
  
  // Calculate staggered intensities based on reveal progress
  const intensities = useMemo(() => {
    return animateGlowIntensities(revealProgress, 1);
  }, [revealProgress]);
  
  if (!active) return null;
  
  return (
    <group>
      {/* Glow orbs at cardinal positions */}
      <GlowOrb
        position={zones.north.position}
        color={zones.north.glowColor}
        intensity={zones.north.intensity * intensities.north}
        radius={zones.north.radius}
        pulse={pulse}
        delay={0}
      />
      <GlowOrb
        position={zones.east.position}
        color={zones.east.glowColor}
        intensity={zones.east.intensity * intensities.east}
        radius={zones.east.radius}
        pulse={pulse}
        delay={0.3}
      />
      <GlowOrb
        position={zones.south.position}
        color={zones.south.glowColor}
        intensity={zones.south.intensity * intensities.south}
        radius={zones.south.radius}
        pulse={pulse}
        delay={0.6}
      />
      <GlowOrb
        position={zones.west.position}
        color={zones.west.glowColor}
        intensity={zones.west.intensity * intensities.west}
        radius={zones.west.radius}
        pulse={pulse}
        delay={0.9}
      />
      
      {/* Volumetric beams */}
      <GlowBeams zones={zones} revealProgress={revealProgress} />
    </group>
  );
};

export default CardinalGlows;
