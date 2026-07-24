/**
 * South Gate Webcam Display
 * P4-S1-24: South Gate webcam feed display within gate geometry
 *
 * Renders webcam MediaStream as a texture on a gate-shaped mesh (arch).
 * Only shows when webcam is active and user approaches South Gate.
 */

import React, { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/** South Gate webcam props */
export interface SouthGateWebcamProps {
  /** Webcam video element */
  videoElement: HTMLVideoElement | null;
  /** User position (to determine proximity) */
  userPosition?: THREE.Vector3;
  /** Gate position in world space */
  gatePosition?: THREE.Vector3;
  /** Visibility distance threshold */
  visibilityDistance?: number;
  /** Gate dimensions */
  width?: number;
  height?: number;
  archHeight?: number;
}

/** Default gate position (south) */
const DEFAULT_GATE_POSITION = new THREE.Vector3(0, 2, -10);

/** Default visibility distance */
const DEFAULT_VISIBILITY_DISTANCE = 15;

/**
 * South Gate Webcam Component
 * Displays webcam feed on an arch-shaped gate geometry
 */
export const SouthGateWebcam: React.FC<SouthGateWebcamProps> = ({
  videoElement,
  userPosition = new THREE.Vector3(0, 0, 0),
  gatePosition = DEFAULT_GATE_POSITION,
  visibilityDistance = DEFAULT_VISIBILITY_DISTANCE,
  width = 4,
  height = 6,
  archHeight = 1.5,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const videoTextureRef = useRef<THREE.VideoTexture | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const { camera } = useThree();

  // Create video texture when video element is available
  useEffect(() => {
    if (videoElement && videoElement.readyState >= videoElement.HAVE_CURRENT_DATA) {
      if (!videoTextureRef.current) {
        const texture = new THREE.VideoTexture(videoElement);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.format = THREE.RGBAFormat;
        videoTextureRef.current = texture;

        // Update material
        if (meshRef.current && meshRef.current.material) {
          (meshRef.current.material as THREE.MeshBasicMaterial).map = texture;
          (meshRef.current.material as THREE.MeshBasicMaterial).needsUpdate = true;
        }
      }
    }

    return () => {
      if (videoTextureRef.current) {
        videoTextureRef.current.dispose();
        videoTextureRef.current = null;
      }
    };
  }, [videoElement]);

  // Update visibility based on distance
  useFrame(() => {
    if (!videoElement) {
      setIsVisible(false);
      return;
    }

    const distance = userPosition.distanceTo(gatePosition);
    const shouldBeVisible = distance <= visibilityDistance;

    if (shouldBeVisible !== isVisible) {
      setIsVisible(shouldBeVisible);
    }

    // Update video texture
    if (videoTextureRef.current && meshRef.current) {
      videoTextureRef.current.needsUpdate = true;

      // Face camera
      if (meshRef.current) {
        meshRef.current.lookAt(camera.position);
      }
    }
  });

  // Don't render if not visible
  if (!isVisible || !videoElement) {
    return null;
  }

  return (
    <group position={gatePosition}>
      {/* Gate arch mesh */}
      <GateArchMesh
        ref={meshRef}
        width={width}
        height={height}
        archHeight={archHeight}
        videoTexture={videoTextureRef.current}
      />

      {/* Gate frame (decorative) */}
      <GateFrame width={width} height={height} archHeight={archHeight} />
    </group>
  );
};

/** Gate arch mesh props */
interface GateArchMeshProps {
  width: number;
  height: number;
  archHeight: number;
  videoTexture: THREE.VideoTexture | null;
}

/**
 * Gate Arch Mesh
 * Custom geometry for arch-shaped gate with video texture
 */
const GateArchMesh = React.forwardRef<THREE.Mesh, GateArchMeshProps>(
  ({ width, height, archHeight, videoTexture }, ref) => {
    const geometry = React.useMemo(() => {
      return createArchGeometry(width, height, archHeight);
    }, [width, height, archHeight]);

    return (
      <mesh ref={ref} geometry={geometry}>
        <meshBasicMaterial
          map={videoTexture}
          side={THREE.DoubleSide}
          transparent={false}
          toneMapped={false}
        />
      </mesh>
    );
  }
);

GateArchMesh.displayName = 'GateArchMesh';

/**
 * Create arch-shaped geometry
 */
function createArchGeometry(
  width: number,
  height: number,
  archHeight: number
): THREE.BufferGeometry {
  const shape = new THREE.Shape();

  // Start at bottom left
  const halfWidth = width / 2;
  const straightHeight = height - archHeight;

  shape.moveTo(-halfWidth, 0);

  // Left side
  shape.lineTo(-halfWidth, straightHeight);

  // Arch top (semi-circular)
  const archRadius = halfWidth;
  const archCenterY = straightHeight;

  for (let angle = Math.PI; angle >= 0; angle -= Math.PI / 32) {
    const x = Math.cos(angle) * archRadius;
    const y = archCenterY + Math.sin(angle) * archHeight;
    shape.lineTo(x, y);
  }

  // Right side
  shape.lineTo(halfWidth, straightHeight);
  shape.lineTo(halfWidth, 0);

  // Bottom
  shape.lineTo(-halfWidth, 0);

  const geometry = new THREE.ShapeGeometry(shape);

  // Generate UVs for proper video mapping
  const uvAttribute = geometry.getAttribute('uv') as THREE.BufferAttribute;
  const positionAttribute = geometry.getAttribute('position') as THREE.BufferAttribute;

  for (let i = 0; i < positionAttribute.count; i++) {
    const x = positionAttribute.getX(i);
    const y = positionAttribute.getY(i);

    // Map to 0-1 UV space
    const u = (x + halfWidth) / width;
    const v = y / height;

    uvAttribute.setXY(i, u, v);
  }

  geometry.computeVertexNormals();

  return geometry;
}

/** Gate frame props */
interface GateFrameProps {
  width: number;
  height: number;
  archHeight: number;
}

/**
 * Gate Frame
 * Decorative frame around the arch
 */
const GateFrame: React.FC<GateFrameProps> = ({ width, height, archHeight }) => {
  const frameThickness = 0.15;
  const frameDepth = 0.2;
  const frameColor = new THREE.Color(0xC5A442); // Aged Gold

  return (
    <group>
      {/* Left pillar */}
      <mesh position={[-width / 2 - frameThickness / 2, height / 2, 0]}>
        <boxGeometry args={[frameThickness, height, frameDepth]} />
        <meshStandardMaterial color={frameColor} metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Right pillar */}
      <mesh position={[width / 2 + frameThickness / 2, height / 2, 0]}>
        <boxGeometry args={[frameThickness, height, frameDepth]} />
        <meshStandardMaterial color={frameColor} metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Top arch frame */}
      <ArchFrameMesh
        width={width}
        archHeight={archHeight}
        yPosition={height - archHeight}
        thickness={frameThickness}
        depth={frameDepth}
        color={frameColor}
      />
    </group>
  );
};

/** Arch frame mesh props */
interface ArchFrameMeshProps {
  width: number;
  archHeight: number;
  yPosition: number;
  thickness: number;
  depth: number;
  color: THREE.Color;
}

/**
 * Arch Frame Mesh
 * Decorative frame for the arch top
 */
const ArchFrameMesh: React.FC<ArchFrameMeshProps> = ({
  width,
  archHeight,
  yPosition,
  thickness,
  depth,
  color,
}) => {
  const geometry = React.useMemo(() => {
    const shape = new THREE.Shape();
    const innerShape = new THREE.Shape();

    const halfWidth = width / 2;
    const outerRadius = halfWidth + thickness;
    const innerRadius = halfWidth;

    // Outer arch
    for (let angle = Math.PI; angle >= 0; angle -= Math.PI / 32) {
      const x = Math.cos(angle) * outerRadius;
      const y = Math.sin(angle) * (archHeight + thickness);

      if (angle === Math.PI) {
        shape.moveTo(x, y);
      } else {
        shape.lineTo(x, y);
      }
    }

    // Inner arch (hole)
    for (let angle = 0; angle <= Math.PI; angle += Math.PI / 32) {
      const x = Math.cos(angle) * innerRadius;
      const y = Math.sin(angle) * archHeight;

      if (angle === 0) {
        innerShape.moveTo(x, y);
      } else {
        innerShape.lineTo(x, y);
      }
    }

    shape.holes.push(innerShape);

    return new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: false,
    });
  }, [width, archHeight, thickness, depth]);

  return (
    <mesh geometry={geometry} position={[0, yPosition, 0]}>
      <meshStandardMaterial color={color} metalness={0.6} roughness={0.4} />
    </mesh>
  );
};

export default SouthGateWebcam;
