/**
 * Engine 10: Decision Mirror Component
 * P3-S2-16: Obsidian tablet with reflective surface shader
 * P3-S2-17: Multi-engine convergence display (overlay layers)
 * P3-S2-18: Convergence score visualization
 * P3-S2-19: Layer separation for comparison
 */

import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { DecisionMirrorState, MirrorLayer } from '../tier3/types';

interface DecisionMirrorProps {
  state: DecisionMirrorState | null;
  position?: [number, number, number];
  onLayerSelect?: (layer: MirrorLayer) => void;
  onLayerDrag?: (layer: MirrorLayer, distance: number) => void;
}

const LAYER_ICONS: Record<MirrorLayer, string> = {
  biorhythm: '🌊',
  geneKeys: '🧬',
  humanDesign: '✦',
  chronobiology: '⏰',
  transit: '🌙',
  vimshottari: '⭐',
  nadi: '🫁',
};

export function DecisionMirror({
  state,
  position = [0, 0, 0],
  onLayerSelect,
  onLayerDrag,
}: DecisionMirrorProps) {
  const groupRef = useRef<THREE.Group>(null);
  const surfaceRef = useRef<THREE.Mesh>(null);
  const [draggedLayer, setDraggedLayer] = useState<MirrorLayer | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  // Animate surface turbulence
  useFrame((state) => {
    if (surfaceRef.current) {
      const material = surfaceRef.current.material as THREE.ShaderMaterial;
      if (material.uniforms.time) {
        material.uniforms.time.value = state.clock.elapsedTime;
      }
    }
  });

  // Create obsidian material
  const obsidianMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: '#0A0A0A',
      metalness: 0.9,
      roughness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      transmission: 0,
      reflectivity: 0.9,
    });
  }, []);

  // Get convergence color based on score
  const convergenceColor = useMemo(() => {
    const score = state?.convergence?.score ?? 0;
    if (score >= 80) return '#5A8F5A'; // Green - high convergence
    if (score >= 60) return '#D4AF37'; // Gold - good convergence
    if (score >= 40) return '#C65D3B'; // Terracotta - moderate
    return '#6B6B6B'; // Grey - low
  }, [state?.convergence?.score]);

  // Visible layers
  const visibleLayers = useMemo(() => 
    state?.layers.filter((l) => l.visible) ?? [],
    [state?.layers]
  );

  return (
    <group ref={groupRef} position={position}>
      {/* Obsidian tablet base */}
      <mesh ref={surfaceRef} rotation={[-Math.PI / 6, 0, 0]}>
        <boxGeometry args={[4, 3, 0.2]} />
        <primitive object={obsidianMaterial} attach="material" />
      </mesh>

      {/* Reflective surface layer */}
      <mesh position={[0, 0, 0.15]} rotation={[-Math.PI / 6, 0, 0]}>
        <planeGeometry args={[3.8, 2.8]} />
        <meshStandardMaterial
          color="#1A1A1A"
          metalness={1}
          roughness={0.2}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Overlay layers */}
      {visibleLayers.map((layer, i) => {
        const isDragged = draggedLayer === layer.type;
        const offsetY = isDragged ? dragOffset : 0;
        const offsetZ = isDragged ? dragOffset : 0;
        
        return (
          <group
            key={layer.type}
            position={[
              (i - visibleLayers.length / 2) * 0.8,
              offsetY + 0.5,
              0.3 + offsetZ
            ]}
          >
            {/* Layer card */}
            <mesh
              onClick={() => onLayerSelect?.(layer.type)}
              onPointerDown={() => setDraggedLayer(layer.type)}
              onPointerMove={(e) => {
                if (isDragged) {
                  const newOffset = Math.max(0, Math.min(2, e.point.y - position[1]));
                  setDragOffset(newOffset);
                  onLayerDrag?.(layer.type, newOffset);
                }
              }}
              onPointerUp={() => setDraggedLayer(null)}
            >
              <boxGeometry args={[0.7, 0.5, 0.05]} />
              <meshStandardMaterial
                color="#1A1A2E"
                transparent
                opacity={layer.opacity}
                emissive={LAYER_ICONS[layer.type] ? '#B8860B' : '#000000'}
                emissiveIntensity={0.2}
              />
            </mesh>

            {/* Layer indicator */}
            <mesh position={[0, 0, 0.03]}>
              <circleGeometry args={[0.15, 16]} />
              <meshBasicMaterial
                color={convergenceColor}
                transparent
                opacity={0.8}
              />
            </mesh>
          </group>
        );
      })}

      {/* Convergence score indicator */}
      {state?.convergence && (
        <group position={[0, -1.8, 0.3]}>
          {/* Score ring */}
          <mesh>
            <ringGeometry args={[0.5, 0.6, 32]} />
            <meshBasicMaterial color={convergenceColor} transparent opacity={0.5} />
          </mesh>
          
          {/* Score fill */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <ringGeometry
              args={[0.5, 0.6, 32, 0, (state.convergence.score / 100) * Math.PI * 2]}
            />
            <meshBasicMaterial color={convergenceColor} transparent opacity={0.8} />
          </mesh>
        </group>
      )}

      {/* Separation guide lines */}
      {state?.separationMode && (
        <>
          <mesh position={[0, 1, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.01, 0.01, 4, 4]} />
            <meshBasicMaterial color="#D4AF37" transparent opacity={0.3} />
          </mesh>
          <mesh position={[0, 2, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.01, 0.01, 4, 4]} />
            <meshBasicMaterial color="#D4AF37" transparent opacity={0.2} />
          </mesh>
        </>
      )}
    </group>
  );
}
