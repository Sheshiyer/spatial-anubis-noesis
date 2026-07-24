/**
 * Progressive World Loader Hook
 * P2-S1-10: Client-side world streaming with LOD tiers
 * 
 * Manages the loading sequence:
 * 1. Download splat data with progress tracking
 * 2. Parse low-res LOD first (blurry visible ~1s)
 * 3. Stream higher LODs (full quality ~5s)
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { WorldAssets, LoadingProgress, LODTier, LoadingPhase } from '../types';

interface UseWorldLoaderOptions {
  /** Low quality splat count */
  lowQualitySplats?: number;
  /** Medium quality splat count */
  mediumQualitySplats?: number;
  /** High quality splat count */
  highQualitySplats?: number;
  /** Target time for blurry visible (ms) */
  blurryVisibleTarget?: number;
  /** Target time for full quality (ms) */
  fullQualityTarget?: number;
}

interface UseWorldLoaderReturn {
  /** Current loading progress */
  progress: LoadingProgress;
  /** Whether loading is complete */
  isComplete: boolean;
  /** Error if loading failed */
  error: Error | null;
  /** Start loading a world */
  loadWorld: (assets: WorldAssets) => Promise<void>;
  /** Reset loader state */
  reset: () => void;
  /** Loaded splat data by LOD tier */
  splatData: Record<LODTier, ArrayBuffer | null>;
  /** Currently active LOD tier for rendering */
  activeTier: LODTier;
}

const DEFAULT_OPTIONS: Required<UseWorldLoaderOptions> = {
  lowQualitySplats: 50000,
  mediumQualitySplats: 200000,
  highQualitySplats: 500000,
  blurryVisibleTarget: 1000,
  fullQualityTarget: 5000,
};

/**
 * Progressive world loader with LOD streaming
 */
export function useWorldLoader(
  options: UseWorldLoaderOptions = {}
): UseWorldLoaderReturn {
  const opts = useMemo(
    () => ({ ...DEFAULT_OPTIONS, ...options }),
    [
      options.lowQualitySplats,
      options.mediumQualitySplats,
      options.highQualitySplats,
      options.blurryVisibleTarget,
      options.fullQualityTarget,
    ]
  );
  
  // State
  const [progress, setProgress] = useState<LoadingProgress>({
    phase: 'idle',
    overall: 0,
    download: 0,
    lodTier: 'low',
    elapsedMs: 0,
  });
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [splatData, setSplatData] = useState<Record<LODTier, ArrayBuffer | null>>({
    low: null,
    medium: null,
    high: null,
  });
  const [activeTier, setActiveTier] = useState<LODTier>('low');
  
  // Refs for cleanup and timing
  const abortControllerRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);
  const tierTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoadingRef = useRef<boolean>(false);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (tierTimeoutRef.current) {
        clearTimeout(tierTimeoutRef.current);
      }
    };
  }, []);
  
  /**
   * Download splat file with progress tracking
   */
  const downloadSplat = useCallback(async (
    url: string,
    onProgress: (downloaded: number, total: number) => void
  ): Promise<ArrayBuffer> => {
    // Abort previous fetch to prevent concurrent pile-up
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    const response = await fetch(url, {
      signal: abortControllerRef.current.signal,
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download splat: ${response.status} ${response.statusText}`);
    }
    
    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }
    
    const chunks: Uint8Array[] = [];
    let downloaded = 0;
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      chunks.push(value);
      downloaded += value.length;
      onProgress(downloaded, total);
    }
    
    // Concatenate chunks
    const allChunks = new Uint8Array(downloaded);
    let position = 0;
    for (const chunk of chunks) {
      allChunks.set(chunk, position);
      position += chunk.length;
    }
    
    return allChunks.buffer;
  }, []);
  
  /**
   * Parse splat data for specific LOD tier
   * In production, this would decode .splat or .ply format
   */
  const parseSplatLOD = useCallback((
    buffer: ArrayBuffer,
    tier: LODTier,
    maxSplats: number
  ): ArrayBuffer => {
    // For .splat format, each splat is 32 bytes:
    // 3x float32 position, 3x float32 scale, 4x uint8 color, 4x uint8 rotation
    const splatSize = 32;
    const totalSplats = buffer.byteLength / splatSize;
    const targetSplats = Math.min(totalSplats, maxSplats);
    
    if (targetSplats >= totalSplats) {
      return buffer; // Full quality
    }
    
    // Downsample by taking every Nth splat
    const stride = Math.floor(totalSplats / targetSplats);
    const resultSize = targetSplats * splatSize;
    const result = new ArrayBuffer(resultSize);
    const sourceView = new Uint8Array(buffer);
    const resultView = new Uint8Array(result);
    
    for (let i = 0; i < targetSplats; i++) {
      const sourceIdx = i * stride * splatSize;
      const resultIdx = i * splatSize;
      resultView.set(sourceView.subarray(sourceIdx, sourceIdx + splatSize), resultIdx);
    }
    
    return result;
  }, []);
  
  /**
   * Load world with progressive LOD
   */
  const loadWorld = useCallback(async (assets: WorldAssets): Promise<void> => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    // Reset state
    setError(null);
    setIsComplete(false);
    setSplatData({ low: null, medium: null, high: null });
    setActiveTier('low');
    startTimeRef.current = performance.now();
    
    try {
      // Phase 1: Downloading
      setProgress(prev => ({
        ...prev,
        phase: 'downloading',
        lodTier: 'low',
      }));
      
      const buffer = await downloadSplat(assets.splatUrl, (downloaded, total) => {
        const downloadProgress = total > 0 ? downloaded / total : 0;
        setProgress(prev => ({
          ...prev,
          download: downloadProgress,
          overall: downloadProgress * 0.3, // Download is 30% of total
        }));
      });
      
      // Phase 2: Parsing low quality (blurry visible ~1s)
      setProgress(prev => ({
        ...prev,
        phase: 'parsing',
        lodTier: 'low',
        overall: 0.3,
      }));
      
      const lowData = parseSplatLOD(buffer, 'low', opts.lowQualitySplats);
      setSplatData(prev => ({ ...prev, low: lowData }));
      setActiveTier('low');
      
      const elapsed = performance.now() - startTimeRef.current;
      const remainingToBlurry = Math.max(0, opts.blurryVisibleTarget - elapsed);
      
      // Ensure we hit the 1s target for blurry visible
      await new Promise(resolve => {
        tierTimeoutRef.current = setTimeout(resolve, remainingToBlurry);
      });
      
      // Phase 3: Parsing medium quality
      setProgress(prev => ({
        ...prev,
        phase: 'parsing',
        lodTier: 'medium',
        overall: 0.5,
      }));
      
      const mediumData = parseSplatLOD(buffer, 'medium', opts.mediumQualitySplats);
      setSplatData(prev => ({ ...prev, medium: mediumData }));
      setActiveTier('medium');
      
      // Phase 4: Parsing high quality (full quality ~5s)
      const elapsed2 = performance.now() - startTimeRef.current;
      const remainingToFull = Math.max(0, opts.fullQualityTarget - elapsed2);
      
      setProgress(prev => ({
        ...prev,
        lodTier: 'high',
        overall: 0.7,
      }));
      
      // Stream high quality data
      await new Promise(resolve => {
        tierTimeoutRef.current = setTimeout(resolve, Math.min(remainingToFull, 1000));
      });
      
      const highData = parseSplatLOD(buffer, 'high', opts.highQualitySplats);
      setSplatData(prev => ({ ...prev, high: highData }));
      setActiveTier('high');
      
      // Complete
      const totalElapsed = performance.now() - startTimeRef.current;
      setProgress({
        phase: 'ready',
        overall: 1,
        download: 1,
        lodTier: 'high',
        elapsedMs: totalElapsed,
      });
      setIsComplete(true);
      
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setProgress(prev => ({ ...prev, phase: 'idle' }));
    } finally {
      isLoadingRef.current = false;
    }
  }, [downloadSplat, parseSplatLOD, opts]);
  
  /**
   * Reset loader state
   */
  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    if (tierTimeoutRef.current) {
      clearTimeout(tierTimeoutRef.current);
    }
    
    setProgress({
      phase: 'idle',
      overall: 0,
      download: 0,
      lodTier: 'low',
      elapsedMs: 0,
    });
    setIsComplete(false);
    setError(null);
    setSplatData({ low: null, medium: null, high: null });
    setActiveTier('low');
  }, []);
  
  return {
    progress,
    isComplete,
    error,
    loadWorld,
    reset,
    splatData,
    activeTier,
  };
}

export default useWorldLoader;
