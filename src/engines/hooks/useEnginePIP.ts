/**
 * React Hook: useEnginePIP
 * Integrates engines with PIP (Psychophysiological Interface Protocol)
 * P3-S2-02: PIP sync for all Tier 2 engines
 */

import { useEffect, useRef, useCallback } from 'react';
import { usePIP } from '../../pip/usePIP';
import { useEngines } from './useEngines';
import { createBiorhythmEngine } from '../tier2/BiorhythmEngine';
import { createChronobiologyEngine } from '../tier2/ChronobiologyEngine';
import type { BiorhythmEngine } from '../tier2/BiorhythmEngine';
import type { ChronobiologyEngine } from '../tier2/ChronobiologyEngine';
import type { PIPData } from '../../pip/types';

interface EnginePIPConfig {
  /** Birth date for calculation-based engines */
  birthDate?: string;
  /** Enable biorhythm PIP sync */
  enableBiorhythm?: boolean;
  /** Enable chronobiology PIP sync */
  enableChronobiology?: boolean;
}

/**
 * Hook to integrate engines with PIP data
 */
export function useEnginePIP(config: EnginePIPConfig = {}) {
  const { pipData, isConnected, health } = usePIP();
  const { engineManager } = useEngines();
  const biorhythmRef = useRef<BiorhythmEngine | null>(null);
  const chronobiologyRef = useRef<ChronobiologyEngine | null>(null);

  // Initialize engines
  useEffect(() => {
    if (config.birthDate) {
      if (config.enableBiorhythm !== false) {
        biorhythmRef.current = createBiorhythmEngine(config.birthDate);
        biorhythmRef.current.calculate();
      }
    }
    
    if (config.enableChronobiology !== false) {
      chronobiologyRef.current = createChronobiologyEngine();
      chronobiologyRef.current.generateData();
    }
  }, [config.birthDate, config.enableBiorhythm, config.enableChronobiology]);

  // Update PIP status in engine manager
  useEffect(() => {
    engineManager.updatePIPStatus(isConnected, health);
  }, [engineManager, isConnected, health]);

  // Sync PIP data with engines
  useEffect(() => {
    if (!pipData) return;

    // Update engine manager with PIP data
    engineManager.updatePIPData(pipData);

    // Sync with biorhythm engine
    if (biorhythmRef.current) {
      // Extract bio-data sources from PIP
      const bioSource = {
        hrv: pipData.physicalCycle ?? 50,
        facialAffect: 50, // Would come from face mesh analysis
        blinkRate: 15, // Would come from face mesh analysis
        timestamp: pipData.timestamp,
      };
      
      biorhythmRef.current.syncWithPIP(pipData, bioSource);
    }

    // Sync with chronobiology engine
    if (chronobiologyRef.current) {
      chronobiologyRef.current.updateWithPIP(pipData);
    }
  }, [pipData, engineManager]);

  // Get current biorhythm data
  const getBiorhythmData = useCallback(() => {
    return biorhythmRef.current?.getData() ?? null;
  }, []);

  // Get current chronobiology data
  const getChronobiologyData = useCallback(() => {
    return chronobiologyRef.current?.getData() ?? null;
  }, []);

  // Update biorhythm scrub
  const updateBiorhythmScrub = useCallback((offset: number) => {
    biorhythmRef.current?.updateScrub(offset);
  }, []);

  return {
    // PIP status
    isConnected,
    pipData,
    
    // Engine data getters
    getBiorhythmData,
    getChronobiologyData,
    
    // Interactions
    updateBiorhythmScrub,
    
    // Engine instances (for advanced use)
    biorhythmEngine: biorhythmRef.current,
    chronobiologyEngine: chronobiologyRef.current,
  };
}
