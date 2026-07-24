/**
 * World LOD System Hook
 * P2-S1-24: Distance-based splat quality with hysteresis
 * 
 * Manages LOD switching based on camera distance:
 * - Near: High quality (100% splats)
 * - Medium: Reduced quality (70% splats)
 * - Far: Low quality (40% splats - 60% reduction)
 * - Hysteresis prevents thrashing between levels
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { LODTier, LODConfig } from '../types';

interface UseWorldLODOptions {
  /** LOD configuration */
  lodConfig?: Partial<LODConfig>;
  /** Hysteresis margin (distance units) */
  hysteresisMargin?: number;
  /** Minimum time between LOD switches (ms) */
  minSwitchInterval?: number;
  /** Callback when LOD changes */
  onLODChange?: (tier: LODTier, previousTier: LODTier) => void;
  /** Enable debug logging */
  debug?: boolean;
}

interface UseWorldLODReturn {
  /** Current LOD tier */
  currentTier: LODTier;
  /** Current quality multiplier (0-1) */
  qualityMultiplier: number;
  /** Maximum splats for current tier */
  maxSplats: number;
  /** Update LOD based on camera distance */
  updateDistance: (distance: number) => void;
  /** Force set LOD tier */
  setTier: (tier: LODTier) => void;
  /** Get LOD info for a distance */
  getLODInfo: (distance: number) => { tier: LODTier; maxSplats: number; quality: number };
  /** Whether LOD is currently switching */
  isTransitioning: boolean;
}

// Default LOD configuration
const DEFAULT_LOD_CONFIG: LODConfig = {
  maxSplats: {
    low: 50000,      // 40% of 125k max
    medium: 175000,  // 70% of 250k
    high: 500000,    // 100%
  },
  distanceThresholds: {
    low: 80,         // Beyond 80 units = low quality
    medium: 40,      // Beyond 40 units = medium quality
    high: 0,         // Below 40 units = high quality
  },
  qualityMultiplier: {
    low: 0.4,        // 60% reduction at far distance
    medium: 0.7,
    high: 1.0,
  },
};

/**
 * World LOD manager hook with hysteresis
 */
export function useWorldLOD(options: UseWorldLODOptions = {}): UseWorldLODReturn {
  const {
    lodConfig: customConfig,
    hysteresisMargin = 5,      // 5 unit hysteresis
    minSwitchInterval = 200,   // 200ms minimum between switches
    onLODChange,
    debug = false,
  } = options;
  
  // Merge config
  const lodConfig: LODConfig = {
    ...DEFAULT_LOD_CONFIG,
    ...customConfig,
    maxSplats: { ...DEFAULT_LOD_CONFIG.maxSplats, ...customConfig?.maxSplats },
    distanceThresholds: { ...DEFAULT_LOD_CONFIG.distanceThresholds, ...customConfig?.distanceThresholds },
    qualityMultiplier: { ...DEFAULT_LOD_CONFIG.qualityMultiplier, ...customConfig?.qualityMultiplier },
  };
  
  // State
  const [currentTier, setCurrentTier] = useState<LODTier>('high');
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Refs for hysteresis and throttling
  const lastSwitchTime = useRef<number>(0);
  const previousDistance = useRef<number>(0);
  const switchDirection = useRef<'up' | 'down' | null>(null);
  
  /**
   * Determine LOD tier for a given distance
   * With hysteresis to prevent thrashing
   */
  const getTierForDistance = useCallback((distance: number, currentTierValue: LODTier): LODTier => {
    const { distanceThresholds } = lodConfig;
    
    // Determine switch direction
    const isMovingAway = distance > previousDistance.current;
    const isMovingCloser = distance < previousDistance.current;
    
    // Apply hysteresis based on direction
    let thresholdOffset = 0;
    if (isMovingAway) {
      thresholdOffset = -hysteresisMargin; // Harder to switch to lower quality
    } else if (isMovingCloser) {
      thresholdOffset = hysteresisMargin; // Harder to switch to higher quality
    }
    
    // Check thresholds with hysteresis
    const highThreshold = distanceThresholds.medium + thresholdOffset;
    const mediumThreshold = distanceThresholds.low + thresholdOffset;
    
    // Determine new tier
    if (distance < highThreshold) {
      return 'high';
    } else if (distance < mediumThreshold) {
      return 'medium';
    } else {
      return 'low';
    }
  }, [lodConfig, hysteresisMargin]);
  
  /**
   * Get LOD info for a distance (without changing state)
   */
  const getLODInfo = useCallback((distance: number) => {
    const tier = getTierForDistance(distance, currentTier);
    return {
      tier,
      maxSplats: lodConfig.maxSplats[tier],
      quality: lodConfig.qualityMultiplier[tier],
    };
  }, [getTierForDistance, lodConfig, currentTier]);
  
  /**
   * Update LOD based on camera distance
   */
  const updateDistance = useCallback((distance: number) => {
    const now = performance.now();
    const timeSinceLastSwitch = now - lastSwitchTime.current;
    
    // Throttle switches
    if (timeSinceLastSwitch < minSwitchInterval) {
      previousDistance.current = distance;
      return;
    }
    
    // Determine if tier should change
    const newTier = getTierForDistance(distance, currentTier);
    
    if (newTier !== currentTier) {
      // Log switch
      if (debug) {
        console.log(`[useWorldLOD] Switching LOD: ${currentTier} → ${newTier} (distance: ${distance.toFixed(1)})`);
      }
      
      // Update direction tracking
      const tierOrder: LODTier[] = ['low', 'medium', 'high'];
      const currentIdx = tierOrder.indexOf(currentTier);
      const newIdx = tierOrder.indexOf(newTier);
      switchDirection.current = newIdx > currentIdx ? 'up' : 'down';
      
      // Transition effect
      setIsTransitioning(true);
      setTimeout(() => setIsTransitioning(false), 150);
      
      // Update tier
      const previousTier = currentTier;
      setCurrentTier(newTier);
      lastSwitchTime.current = now;
      
      // Notify callback
      onLODChange?.(newTier, previousTier);
    }
    
    previousDistance.current = distance;
  }, [currentTier, getTierForDistance, minSwitchInterval, onLODChange, debug]);
  
  /**
   * Force set LOD tier
   */
  const setTier = useCallback((tier: LODTier) => {
    if (tier !== currentTier) {
      if (debug) {
        console.log(`[useWorldLOD] Force setting LOD: ${currentTier} → ${tier}`);
      }
      
      const previousTier = currentTier;
      setCurrentTier(tier);
      lastSwitchTime.current = performance.now();
      onLODChange?.(tier, previousTier);
    }
  }, [currentTier, onLODChange, debug]);
  
  // Calculate derived values
  const maxSplats = lodConfig.maxSplats[currentTier];
  const qualityMultiplier = lodConfig.qualityMultiplier[currentTier];
  
  return {
    currentTier,
    qualityMultiplier,
    maxSplats,
    updateDistance,
    setTier,
    getLODInfo,
    isTransitioning,
  };
}

/**
 * LOD manager for multiple world objects
 * Tracks LOD independently for different world zones
 */
export function useWorldLODManager(
  zoneCount: number,
  options?: UseWorldLODOptions
) {
  const lodHooks = Array.from({ length: zoneCount }, (_, i) => 
    useWorldLOD({
      ...options,
      debug: options?.debug && i === 0, // Only debug first zone
    })
  );
  
  return {
    zones: lodHooks,
    updateAll: (distances: number[]) => {
      distances.forEach((distance, i) => {
        if (lodHooks[i]) {
          lodHooks[i].updateDistance(distance);
        }
      });
    },
    getTotalQuality: () => {
      return lodHooks.reduce((sum, hook) => sum + hook.qualityMultiplier, 0) / zoneCount;
    },
  };
}

export default useWorldLOD;
