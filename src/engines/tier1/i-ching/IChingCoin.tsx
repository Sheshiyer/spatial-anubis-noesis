/**
 * I-Ching Coin (P3-S1-02, P3-S1-07)
 * 3 coin RigidBodies with Gold material and Chinese characters
 */

import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { DEFAULT_COIN_CONFIG } from './types';

// ============================================================================
// Props
// ============================================================================

interface IChingCoinProps {
  id: string;
  rigidBody: { 
    translation: () => { x: number; y: number; z: number };
    rotation: () => { x: number; y: number; z: number; w: number };
    linvel: () => { x: number; y: number; z: number };
    angvel: () => { x: number; y: number; z: number };
  } | null;
  onSettle?: (coinId: string, face: 'yang' | 'yin') => void;
}

// ============================================================================
// Component
// ============================================================================

export const IChingCoin: React.FC<IChingCoinProps> = ({
  id,
  rigidBody,
  onSettle,
}) => {
  const meshRef = useRef<THREE.Group>(null);
  const [isSettled, setIsSettled] = useState(false);
  const [faceUp, setFaceUp] = useState<'yang' | 'yin' | null>(null);
  const settleTimerRef = useRef(0);
  const SETTLE_TIMEOUT = 500; // ms

  // Update settle detection
  useFrame(() => {
    if (!rigidBody || isSettled) return;

    const velocity = rigidBody.linvel();
    const angularVelocity = rigidBody.angvel();
    
    const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2);
    const angularSpeed = Math.sqrt(
      angularVelocity.x ** 2 + angularVelocity.y ** 2 + angularVelocity.z ** 2
    );

    // Check if settled (low velocity and angular velocity)
    if (speed < 0.01 && angularSpeed < 0.05) {
      settleTimerRef.current += 16; // Approximate ms per frame at 60fps
      
      if (settleTimerRef.current >= SETTLE_TIMEOUT) {
        // Determine face up
        const rotation = rigidBody.rotation();
        const localUp = new THREE.Vector3(0, 1, 0).applyQuaternion(
          new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w)
        );
        
        // If local Y is pointing up (positive dot with world up), yang (character) is up
        const isYangUp = localUp.y > 0;
        const determinedFace = isYangUp ? 'yang' : 'yin';
        
        setFaceUp(determinedFace);
        setIsSettled(true);
        onSettle?.(id, determinedFace);
      }
    } else {
      settleTimerRef.current = 0;
    }
    
    // Sync mesh position with physics body
    if (meshRef.current) {
      const translation = rigidBody.translation();
      const rotation = rigidBody.rotation();
      meshRef.current.position.set(translation.x, translation.y, translation.z);
      meshRef.current.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    }
  });

  // Coin geometry
  const coinGeometry = new THREE.CylinderGeometry(
    DEFAULT_COIN_CONFIG.radius,
    DEFAULT_COIN_CONFIG.radius,
    DEFAULT_COIN_CONFIG.thickness,
    32
  );

  // Gold material
  const goldMaterial = new THREE.MeshStandardMaterial({
    color: 0xB8860B, // Aged Gold
    metalness: 0.9,
    roughness: 0.4,
    envMapIntensity: 1,
  });

  // Character texture for yang side (P3-S1-07)
  const characterTexture = React.useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Background - transparent
    ctx.fillStyle = '#B8860B';
    ctx.fillRect(0, 0, 256, 256);

    // Chinese character (simplified representation - would use actual glyph)
    ctx.fillStyle = '#1A1A2E'; // Deep Ink for contrast
    ctx.font = 'bold 120px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('陽', 128, 128); // Yang character

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }, []);

  const yangFaceMaterial = new THREE.MeshStandardMaterial({
    color: 0xB8860B,
    metalness: 0.9,
    roughness: 0.4,
    map: characterTexture,
  });

  const yinFaceMaterial = new THREE.MeshStandardMaterial({
    color: 0xB8860B,
    metalness: 0.9,
    roughness: 0.4,
  });

  // Materials array for cylinder (side, top, bottom)
  const materials = [goldMaterial, yangFaceMaterial, yinFaceMaterial];

  return (
    <group ref={meshRef}>
      {/* Coin mesh - rotated to lay flat */}
      <mesh geometry={coinGeometry} material={materials} rotation={[Math.PI / 2, 0, 0]}>
      </mesh>
      
      {/* Glow effect when settled */}
      {isSettled && (
        <mesh position={[0, 0.05, 0]}>
          <ringGeometry args={[DEFAULT_COIN_CONFIG.radius + 0.02, DEFAULT_COIN_CONFIG.radius + 0.05, 32]} />
          <meshBasicMaterial 
            color={faceUp === 'yang' ? '#FFD700' : '#6B6B6B'} 
            transparent 
            opacity={0.5}
          />
        </mesh>
      )}
    </group>
  );
};
