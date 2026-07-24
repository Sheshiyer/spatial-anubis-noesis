/**
 * Cartographer Path Trail
 * P2-S1-14: Splat particles leading to Breathfield
 * 
 * Creates a fading trail of splat particles that guide the user
 * toward the Breathfield zone. Trail fades over 3 seconds.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { TrailConfig, TrailParticle } from '../types';

interface UseCartographerTrailOptions {
  /** Trail configuration */
  config?: Partial<TrailConfig>;
  /** Target position (Breathfield) */
  targetPosition?: THREE.Vector3;
  /** Source position (current vessel position) */
  sourcePosition?: THREE.Vector3;
  /** Whether trail is active */
  active?: boolean;
  /** Enable debug logging */
  debug?: boolean;
}

interface UseCartographerTrailReturn {
  /** Current trail particles */
  particles: TrailParticle[];
  /** Whether trail is active */
  isActive: boolean;
  /** Start the trail animation */
  start: (source: THREE.Vector3, target: THREE.Vector3) => void;
  /** Stop the trail */
  stop: () => void;
  /** Update trail (call each frame) */
  update: (deltaTime: number, sourcePosition: THREE.Vector3) => void;
  /** Get spline path points */
  getPathPoints: (divisions?: number) => THREE.Vector3[];
  /** Reset trail */
  reset: () => void;
}

// Default trail configuration
const DEFAULT_CONFIG: TrailConfig = {
  duration: 3.0,           // 3 second fade
  particleCount: 50,       // Number of particles
  particleSize: 0.5,       // Base particle size
  startColor: new THREE.Color(0xB8860B),  // Aged Gold
  endColor: new THREE.Color(0xF5F0E8),    // Bone
  controlPoints: [],
};

/**
 * Create a smooth spline path from source to target
 */
function createSplinePath(
  source: THREE.Vector3,
  target: THREE.Vector3,
  heightOffset: number = 2
): THREE.CatmullRomCurve3 {
  // Calculate midpoint with height offset for arc
  const midpoint = new THREE.Vector3()
    .addVectors(source, target)
    .multiplyScalar(0.5);
  midpoint.y += heightOffset;
  
  // Add some variation based on direction
  const direction = new THREE.Vector3().subVectors(target, source).normalize();
  const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x);
  
  // Create control points for smooth curve
  const controlPoints = [
    source.clone(),
    new THREE.Vector3()
      .addVectors(source, midpoint)
      .multiplyScalar(0.5)
      .add(perpendicular.clone().multiplyScalar(2)),
    midpoint,
    new THREE.Vector3()
      .addVectors(midpoint, target)
      .multiplyScalar(0.5)
      .add(perpendicular.clone().multiplyScalar(-2)),
    target.clone(),
  ];
  
  return new THREE.CatmullRomCurve3(controlPoints);
}

/**
 * Initialize trail particles along spline
 */
function initializeParticles(
  spline: THREE.CatmullRomCurve3,
  count: number,
  size: number,
  startColor: THREE.Color,
  endColor: THREE.Color
): TrailParticle[] {
  const particles: TrailParticle[] = [];
  
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const position = spline.getPoint(t);
    
    // Color gradient along trail
    const color = new THREE.Color().lerpColors(startColor, endColor, t);
    
    // Size variation
    const particleSize = size * (1 - t * 0.5); // Smaller at end
    
    particles.push({
      position: position.clone(),
      life: 1.0, // Full life
      size: particleSize,
      color: color.clone(),
      velocity: new THREE.Vector3(),
    });
  }
  
  return particles;
}

/**
 * Cartographer trail hook
 */
export function useCartographerTrail(
  options: UseCartographerTrailOptions = {}
): UseCartographerTrailReturn {
  const {
    config: customConfig,
    targetPosition: initialTarget,
    sourcePosition: initialSource,
    active = false,
    debug = false,
  } = options;
  
  // Merge config
  const config: TrailConfig = {
    ...DEFAULT_CONFIG,
    ...customConfig,
  };
  
  // State
  const [particles, setParticles] = useState<TrailParticle[]>([]);
  const [isActive, setIsActive] = useState(active);
  const [spline, setSpline] = useState<THREE.CatmullRomCurve3 | null>(null);
  
  // Refs
  const elapsedRef = useRef(0);
  const sourceRef = useRef<THREE.Vector3 | null>(initialSource || null);
  const targetRef = useRef<THREE.Vector3 | null>(initialTarget || null);
  const animationRef = useRef<number>(0);
  
  /**
   * Start the trail animation
   */
  const start = useCallback((source: THREE.Vector3, target: THREE.Vector3) => {
    if (debug) {
      console.log('[useCartographerTrail] Starting trail');
    }
    
    sourceRef.current = source.clone();
    targetRef.current = target.clone();
    elapsedRef.current = 0;
    
    // Create spline path
    const newSpline = createSplinePath(source, target);
    setSpline(newSpline);
    
    // Initialize particles
    const initialParticles = initializeParticles(
      newSpline,
      config.particleCount,
      config.particleSize,
      config.startColor,
      config.endColor
    );
    setParticles(initialParticles);
    setIsActive(true);
  }, [config, debug]);
  
  /**
   * Stop the trail
   */
  const stop = useCallback(() => {
    setIsActive(false);
    cancelAnimationFrame(animationRef.current);
    if (debug) {
      console.log('[useCartographerTrail] Stopped');
    }
  }, [debug]);
  
  /**
   * Update trail particles
   */
  const update = useCallback((deltaTime: number, sourcePosition: THREE.Vector3) => {
    if (!isActive || !spline || !targetRef.current) return;
    
    elapsedRef.current += deltaTime;
    
    // Recalculate spline if source moved significantly
    const sourceMoved = sourceRef.current && 
      sourcePosition.distanceTo(sourceRef.current) > 1.0;
    
    if (sourceMoved) {
      sourceRef.current = sourcePosition.clone();
      const newSpline = createSplinePath(sourcePosition, targetRef.current);
      setSpline(newSpline);
      
      // Update particle positions along new spline
      setParticles(prev => prev.map((particle, i) => {
        const t = i / (prev.length - 1);
        return {
          ...particle,
          position: newSpline.getPoint(t),
        };
      }));
    }
    
    // Update particle life (fade over duration)
    const lifeDecay = deltaTime / config.duration;
    
    setParticles(prev => {
      return prev.map((particle, i) => {
        // Staggered fade - particles at start fade later
        const staggerOffset = (i / prev.length) * 0.5;
        const adjustedElapsed = elapsedRef.current - staggerOffset;
        
        if (adjustedElapsed < 0) {
          return particle; // Not started fading yet
        }
        
        const newLife = Math.max(0, 1 - (adjustedElapsed / config.duration));
        
        // Add subtle movement
        const time = elapsedRef.current;
        const movement = new THREE.Vector3(
          Math.sin(time * 2 + i) * 0.01,
          Math.cos(time * 1.5 + i) * 0.01,
          Math.sin(time * 1 + i) * 0.01
        );
        
        return {
          ...particle,
          life: newLife,
          position: particle.position.clone().add(movement),
        };
      }).filter(p => p.life > 0.01); // Remove dead particles
    });
    
    // Stop if all particles dead
    if (elapsedRef.current > config.duration + 1) {
      setIsActive(false);
    }
  }, [isActive, spline, config, debug]);
  
  /**
   * Get path points for rendering
   */
  const getPathPoints = useCallback((divisions: number = 50): THREE.Vector3[] => {
    if (!spline) return [];
    return spline.getPoints(divisions);
  }, [spline]);
  
  /**
   * Reset trail
   */
  const reset = useCallback(() => {
    setParticles([]);
    setSpline(null);
    setIsActive(false);
    elapsedRef.current = 0;
    sourceRef.current = null;
    targetRef.current = null;
  }, []);
  
  // Auto-start if positions provided
  useEffect(() => {
    if (active && initialSource && initialTarget && !isActive) {
      start(initialSource, initialTarget);
    }
  }, [active, initialSource, initialTarget, start, isActive]);
  
  // Cleanup
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, []);
  
  return {
    particles,
    isActive,
    start,
    stop,
    update,
    getPathPoints,
    reset,
  };
}

/**
 * Create trail geometry for rendering
 */
export function createTrailGeometry(particles: TrailParticle[]): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  
  const positions: number[] = [];
  const colors: number[] = [];
  const sizes: number[] = [];
  const lifes: number[] = [];
  
  particles.forEach(particle => {
    positions.push(particle.position.x, particle.position.y, particle.position.z);
    colors.push(particle.color.r, particle.color.g, particle.color.b);
    sizes.push(particle.size * particle.life);
    lifes.push(particle.life);
  });
  
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
  geometry.setAttribute('life', new THREE.Float32BufferAttribute(lifes, 1));
  
  return geometry;
}

/**
 * Trail particle vertex shader
 */
export const trailParticleVertexShader = `
  attribute float size;
  attribute float life;
  attribute vec3 color;
  
  varying vec3 vColor;
  varying float vLife;
  
  void main() {
    vColor = color;
    vLife = life;
    
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    // Size attenuation
    gl_PointSize = size * (300.0 / -mvPosition.z) * life;
  }
`;

/**
 * Trail particle fragment shader
 */
export const trailParticleFragmentShader = `
  varying vec3 vColor;
  varying float vLife;
  
  void main() {
    // Circular particle
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    
    if (dist > 0.5) discard;
    
    // Soft edge
    float alpha = (0.5 - dist) * 2.0 * vLife;
    
    // Glow effect
    vec3 glow = vColor * (1.0 + (0.5 - dist));
    
    gl_FragColor = vec4(glow, alpha);
  }
`;

export default useCartographerTrail;
