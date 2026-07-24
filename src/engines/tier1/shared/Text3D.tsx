/**
 * Shared 3D Text System (P3-S1-30)
 * Billboard text with typewriter animation and fade at distance
 */

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, extend, ReactThreeFiber } from '@react-three/fiber';
import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import type { Text3DConfig } from './types';
import { DEFAULT_TEXT_3D_CONFIG } from './types';

// Extend Three.js with TextGeometry
extend({ TextGeometry });

// Declare TextGeometry for JSX
declare global {
  namespace JSX {
    interface IntrinsicElements {
      textGeometry: ReactThreeFiber.Object3DNode<TextGeometry, typeof TextGeometry>;
    }
  }
}

// ============================================================================
// Font Loading
// ============================================================================

let fontCache: Record<string, ReturnType<typeof FontLoader.prototype.parse>> = {};

async function loadFont(fontUrl: string): Promise<ReturnType<typeof FontLoader.prototype.parse> | null> {
  if (fontCache[fontUrl]) return fontCache[fontUrl];
  
  try {
    const response = await fetch(fontUrl);
    const fontData = await response.json();
    const loader = new FontLoader();
    const font = loader.parse(fontData);
    fontCache[fontUrl] = font;
    return font;
  } catch (e) {
    console.error('[Text3D] Failed to load font:', e);
    return null;
  }
}

// ============================================================================
// Text3D Component
// ============================================================================

interface Text3DProps {
  config?: Partial<Text3DConfig>;
  visible?: boolean;
  onComplete?: () => void;
}

export const Text3D: React.FC<Text3DProps> = ({
  config = {},
  visible = true,
  onComplete,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [font, setFont] = useState<ReturnType<typeof FontLoader.prototype.parse> | null>(null);
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  
  const mergedConfig = useMemo(() => ({
    ...DEFAULT_TEXT_3D_CONFIG,
    ...config,
  }), [config]);

  // Load font on mount
  useEffect(() => {
    // Use Inter font from three.js examples or CDN
    loadFont('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json')
      .then(setFont);
  }, []);

  // Typewriter animation
  useEffect(() => {
    if (!visible || mergedConfig.animationStyle !== 'typewriter') {
      setDisplayedText(mergedConfig.content);
      setIsComplete(true);
      return;
    }

    setIsComplete(false);
    setDisplayedText('');
    
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < mergedConfig.content.length) {
        setDisplayedText(mergedConfig.content.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(interval);
        setIsComplete(true);
        onComplete?.();
      }
    }, mergedConfig.typingSpeed);

    return () => clearInterval(interval);
  }, [visible, mergedConfig.content, mergedConfig.animationStyle, mergedConfig.typingSpeed, onComplete]);

  // Fade animation for fade style
  useEffect(() => {
    if (mergedConfig.animationStyle === 'fade' && meshRef.current) {
      const material = meshRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0;
      material.transparent = true;
      
      let startTime: number | null = null;
      const duration = 500; // ms
      
      const fadeIn = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        material.opacity = progress;
        
        if (progress < 1) {
          requestAnimationFrame(fadeIn);
        } else {
          setIsComplete(true);
          onComplete?.();
        }
      };
      
      if (visible) {
        requestAnimationFrame(fadeIn);
      }
    }
  }, [visible, mergedConfig.animationStyle, onComplete]);

  // Billboard effect - always face camera
  useFrame(({ camera }) => {
    if (groupRef.current && mergedConfig.billboard) {
      groupRef.current.lookAt(camera.position);
    }
  });

  // Distance-based fade
  useFrame(({ camera }) => {
    if (!groupRef.current) return;
    
    const distance = groupRef.current.position.distanceTo(camera.position);
    if (distance > mergedConfig.fadeDistance && meshRef.current) {
      const material = meshRef.current.material as THREE.MeshBasicMaterial;
      const fade = Math.max(0, 1 - (distance - mergedConfig.fadeDistance) / 5);
      material.opacity = fade;
      material.transparent = fade < 1;
    }
  });

  if (!font) return null;

  const textOptions = {
    font: font,
    size: 0.3,
    height: 0.05,
    curveSegments: 12,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.01,
    bevelOffset: 0,
    bevelSegments: 3,
  };

  return (
    <group ref={groupRef} position={mergedConfig.position}>
      <mesh ref={meshRef} visible={visible}>
        <textGeometry args={[displayedText, textOptions]} />
        <meshBasicMaterial 
          color={mergedConfig.primaryColor} 
          transparent={mergedConfig.animationStyle === 'fade'}
        />
      </mesh>
    </group>
  );
};

// ============================================================================
// Floating Text Component (for simple labels)
// ============================================================================

interface FloatingTextProps {
  text: string;
  position: THREE.Vector3;
  color?: string;
  fontSize?: number;
  billboard?: boolean;
  visible?: boolean;
}

export const FloatingText: React.FC<FloatingTextProps> = ({
  text,
  position,
  color = '#F5F0E8',
  fontSize = 0.2,
  billboard = true,
  visible = true,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [font, setFont] = useState<ReturnType<typeof FontLoader.prototype.parse> | null>(null);

  useEffect(() => {
    loadFont('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json')
      .then(setFont);
  }, []);

  useFrame(({ camera }) => {
    if (groupRef.current && billboard) {
      groupRef.current.lookAt(camera.position);
    }
  });

  if (!font || !visible) return null;

  return (
    <group ref={groupRef} position={position}>
      <mesh>
        <textGeometry args={[text, {
          font,
          size: fontSize,
          height: 0.02,
          curveSegments: 8,
          bevelEnabled: false,
        }]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} />
      </mesh>
    </group>
  );
};

// ============================================================================
// Typewriter Text Hook
// ============================================================================

export function useTypewriter(text: string, speed: number = 40, enabled: boolean = true): string {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    if (!enabled) {
      setDisplayed(text);
      return;
    }

    setDisplayed('');
    let index = 0;
    
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayed(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, enabled]);

  return displayed;
}
