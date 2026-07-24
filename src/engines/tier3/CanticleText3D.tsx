/**
 * Canticle Text 3D Component
 * P4-S1-13: Render Somatic Canticle text in 3D world
 *
 * Floating, billboard-facing, typewriter-reveal effect.
 * Uses @react-three/drei Text component.
 * Text appears character by character. Fades in/out based on distance.
 */

import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
// Note: @react-three/drei Text import would go here in production
// import { Text } from '@react-three/drei';

/** Canticle text 3D props */
export interface CanticleText3DProps {
  /** Text content to display */
  text: string;
  /** Position in world space */
  position: THREE.Vector3;
  /** Font size */
  fontSize?: number;
  /** Text color */
  color?: THREE.Color;
  /** Maximum distance for visibility */
  maxDistance?: number;
  /** Fade distance range */
  fadeDistance?: number;
  /** Typewriter speed (characters per second) */
  typewriterSpeed?: number;
  /** Should auto-start typewriter effect */
  autoStart?: boolean;
  /** Callback when typing completes */
  onTypingComplete?: () => void;
}

/** Default constants */
const TEXT_CONSTANTS = {
  FONT_SIZE: 0.3,
  MAX_DISTANCE: 10,
  FADE_DISTANCE: 3,
  TYPEWRITER_SPEED: 15, // characters per second
  LINE_HEIGHT: 1.2,
} as const;

/**
 * Canticle Text 3D Component
 * Renders floating 3D text with typewriter effect and distance-based fading
 */
export const CanticleText3D: React.FC<CanticleText3DProps> = ({
  text,
  position,
  fontSize = TEXT_CONSTANTS.FONT_SIZE,
  color = new THREE.Color(0xC5A442), // Aged Gold
  maxDistance = TEXT_CONSTANTS.MAX_DISTANCE,
  fadeDistance = TEXT_CONSTANTS.FADE_DISTANCE,
  typewriterSpeed = TEXT_CONSTANTS.TYPEWRITER_SPEED,
  autoStart = true,
  onTypingComplete,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  const [visibleText, setVisibleText] = useState('');
  const [opacity, setOpacity] = useState(0);
  const [isTyping, setIsTyping] = useState(autoStart);
  const currentCharIndex = useRef(0);
  const lastUpdateTime = useRef(performance.now() / 1000);

  // Typewriter effect
  useEffect(() => {
    if (!isTyping || currentCharIndex.current >= text.length) {
      if (currentCharIndex.current >= text.length && isTyping) {
        setIsTyping(false);
        onTypingComplete?.();
      }
      return;
    }

    const interval = 1000 / typewriterSpeed;
    const timer = setInterval(() => {
      currentCharIndex.current += 1;
      setVisibleText(text.substring(0, currentCharIndex.current));

      if (currentCharIndex.current >= text.length) {
        setIsTyping(false);
        onTypingComplete?.();
      }
    }, interval);

    return () => clearInterval(timer);
  }, [text, typewriterSpeed, isTyping, onTypingComplete]);

  // Update opacity based on distance and billboard rotation
  useFrame(() => {
    if (!groupRef.current) return;

    // Calculate distance to camera
    const distance = camera.position.distanceTo(position);

    // Calculate opacity based on distance
    let newOpacity = 1.0;

    if (distance > maxDistance) {
      newOpacity = 0;
    } else if (distance > maxDistance - fadeDistance) {
      const fadeRange = distance - (maxDistance - fadeDistance);
      newOpacity = 1.0 - fadeRange / fadeDistance;
    }

    setOpacity(newOpacity);

    // Billboard effect - always face camera
    groupRef.current.lookAt(camera.position);

    // Update position
    groupRef.current.position.copy(position);
  });

  // Split text into lines
  const lines = splitTextIntoLines(visibleText, 30); // Max 30 chars per line

  return (
    <group ref={groupRef}>
      {lines.map((line, index) => (
        <TextLine
          key={index}
          text={line}
          yOffset={-index * fontSize * TEXT_CONSTANTS.LINE_HEIGHT}
          fontSize={fontSize}
          color={color}
          opacity={opacity}
        />
      ))}
    </group>
  );
};

/** Text line props */
interface TextLineProps {
  text: string;
  yOffset: number;
  fontSize: number;
  color: THREE.Color;
  opacity: number;
}

/**
 * Text Line Component
 * Renders a single line of text
 * In production, replace with @react-three/drei Text
 */
const TextLine: React.FC<TextLineProps> = ({ text, yOffset, fontSize, color, opacity }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Placeholder rendering using plane mesh
  // In production, replace with:
  // <Text
  //   position={[0, yOffset, 0]}
  //   fontSize={fontSize}
  //   color={color}
  //   anchorX="center"
  //   anchorY="middle"
  //   fillOpacity={opacity}
  // >
  //   {text}
  // </Text>

  return (
    <mesh ref={meshRef} position={[0, yOffset, 0]}>
      {/* Placeholder geometry - represents text area */}
      <planeGeometry args={[text.length * fontSize * 0.5, fontSize]} />
      <meshBasicMaterial
        color={color}
        transparent={true}
        opacity={opacity * 0.8}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

/**
 * Split text into lines of maximum width
 */
function splitTextIntoLines(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;

    if (testLine.length <= maxCharsPerLine) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Typewriter Text Controller
 * Manages typewriter effect state
 */
export class TypewriterController {
  private text: string;
  private speed: number;
  private currentIndex = 0;
  private isActive = false;
  private onComplete?: () => void;

  constructor(text: string, speed: number = TEXT_CONSTANTS.TYPEWRITER_SPEED) {
    this.text = text;
    this.speed = speed;
  }

  start(onComplete?: () => void): void {
    this.currentIndex = 0;
    this.isActive = true;
    this.onComplete = onComplete;
  }

  stop(): void {
    this.isActive = false;
  }

  reset(): void {
    this.currentIndex = 0;
    this.isActive = false;
  }

  update(deltaTime: number): string {
    if (!this.isActive) {
      return this.text.substring(0, this.currentIndex);
    }

    const charsToAdd = Math.floor(deltaTime * this.speed);
    this.currentIndex = Math.min(this.currentIndex + charsToAdd, this.text.length);

    if (this.currentIndex >= this.text.length) {
      this.isActive = false;
      this.onComplete?.();
    }

    return this.text.substring(0, this.currentIndex);
  }

  getVisibleText(): string {
    return this.text.substring(0, this.currentIndex);
  }

  isTyping(): boolean {
    return this.isActive;
  }

  getProgress(): number {
    return this.currentIndex / this.text.length;
  }
}

/**
 * Create typewriter controller
 */
export function createTypewriterController(
  text: string,
  speed?: number
): TypewriterController {
  return new TypewriterController(text, speed);
}

/**
 * Calculate text opacity based on distance
 */
export function calculateTextOpacity(
  distance: number,
  maxDistance: number,
  fadeDistance: number
): number {
  if (distance > maxDistance) {
    return 0;
  } else if (distance > maxDistance - fadeDistance) {
    const fadeRange = distance - (maxDistance - fadeDistance);
    return 1.0 - fadeRange / fadeDistance;
  }
  return 1.0;
}

export default CanticleText3D;
