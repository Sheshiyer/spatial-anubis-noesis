/**
 * Hand tracking skeleton debug visualization
 * P1-S1-31: Create hand tracking skeleton debug visualization
 * - 21 landmarks visible in debug overlay
 * - Bone connections matching MediaPipe topology
 */

import React, { useRef, useEffect } from 'react';
import { type HandTrackingResult, BRAND_PALETTE } from './types';
import { HAND_CONNECTIONS } from './handTracking';

export interface HandSkeletonDebugProps {
  handTracking: HandTrackingResult | null;
  width?: number;
  height?: number;
  showConnections?: boolean;
  showLandmarks?: boolean;
  mirror?: boolean;
  style?: React.CSSProperties;
}

export const HandSkeletonDebug: React.FC<HandSkeletonDebugProps> = ({
  handTracking,
  width = 640,
  height = 480,
  showConnections = true,
  showLandmarks = true,
  mirror = true,
  style = {},
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (!handTracking || handTracking.hands.length === 0) {
      // Draw "no hands detected" indicator
      ctx.fillStyle = BRAND_PALETTE.stoneGrey;
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No hands detected', width / 2, height / 2);
      return;
    }

    // Draw each hand
    handTracking.hands.forEach((hand) => {
      const { landmarks } = hand;
      
      // Color based on handedness
      const color = hand.handedness === 'Left' ? BRAND_PALETTE.terracotta : BRAND_PALETTE.agedGold;
      const highlightColor: string = hand.handedness === 'Left' ? '#E07050' : '#D4A020';

      // Apply mirror transform if needed
      ctx.save();
      if (mirror) {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
      }

      // Draw connections (bones)
      if (showConnections) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        HAND_CONNECTIONS.forEach(([start, end]) => {
          const startLandmark = landmarks[start];
          const endLandmark = landmarks[end];

          if (startLandmark && endLandmark) {
            ctx.beginPath();
            ctx.moveTo(startLandmark.x * width, startLandmark.y * height);
            ctx.lineTo(endLandmark.x * width, endLandmark.y * height);
            ctx.stroke();
          }
        });
      }

      // Draw landmarks (joints)
      if (showLandmarks) {
        landmarks.forEach((landmark, index) => {
          const x = landmark.x * width;
          const y = landmark.y * height;

          // Different sizes for different landmark types
          let radius = 4;
          let fillColor = color;

          // Wrist is larger
          if (index === 0) {
            radius = 6;
            fillColor = highlightColor;
          }
          // Finger tips are highlighted
          if ([4, 8, 12, 16, 20].includes(index)) {
            radius = 5;
            fillColor = highlightColor;
          }

          // Draw landmark
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fillStyle = fillColor;
          ctx.fill();

          // Draw border
          ctx.strokeStyle = BRAND_PALETTE.bone;
          ctx.lineWidth = 1;
          ctx.stroke();

          // Draw landmark index for debugging
          ctx.fillStyle = BRAND_PALETTE.bone;
          ctx.font = '10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(index.toString(), x, y - 8);
        });
      }

      // Draw handedness label
      ctx.fillStyle = color;
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      const wrist = landmarks[0];
      if (wrist) {
        ctx.fillText(
          `${hand.handedness} (${(hand.score * 100).toFixed(0)}%)`,
          wrist.x * width + 10,
          wrist.y * height
        );
      }

      ctx.restore();
    });

    // Draw summary
    ctx.fillStyle = BRAND_PALETTE.bone;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Hands: ${handTracking.hands.length}`, 10, 20);
    ctx.fillText(`Timestamp: ${handTracking.timestamp.toFixed(0)}`, 10, 35);

  }, [handTracking, width, height, showConnections, showLandmarks, mirror]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        border: `1px solid ${BRAND_PALETTE.stoneGrey}`,
        borderRadius: '4px',
        backgroundColor: BRAND_PALETTE.deepInk + '80', // 50% opacity
        ...style,
      }}
    />
  );
};

// Debug overlay component with all bio data
export interface BioDebugOverlayProps {
  handTracking: HandTrackingResult | null;
  faceMesh?: import('./types').FaceMeshResult | null;
  segmentation?: import('./types').SegmentationResult | null;
  performance?: {
    totalTime: number;
    segmentationTime: number;
    faceMeshTime: number;
    handTrackingTime: number;
  };
  width?: number;
  height?: number;
}

export const BioDebugOverlay: React.FC<BioDebugOverlayProps> = ({
  handTracking,
  faceMesh,
  segmentation,
  performance,
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: BRAND_PALETTE.deepInk + 'E6', // 90% opacity
        border: `1px solid ${BRAND_PALETTE.stoneGrey}`,
        borderRadius: '8px',
        padding: '16px',
        color: BRAND_PALETTE.bone,
        fontFamily: 'monospace',
        fontSize: '12px',
        maxWidth: 320,
        zIndex: 1000,
      }}
    >
      <h3 style={{ margin: '0 0 12px 0', color: BRAND_PALETTE.agedGold, fontSize: '14px' }}>
        Bio-Tracking Debug
      </h3>

      {/* Performance */}
      {performance && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: BRAND_PALETTE.agedGold, marginBottom: 4 }}>Performance</div>
          <div>Total: {performance.totalTime.toFixed(2)}ms</div>
          <div>Segmentation: {performance.segmentationTime.toFixed(2)}ms</div>
          <div>Face Mesh: {performance.faceMeshTime.toFixed(2)}ms</div>
          <div>Hand Tracking: {performance.handTrackingTime.toFixed(2)}ms</div>
        </div>
      )}

      {/* Hand Tracking */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ color: BRAND_PALETTE.agedGold, marginBottom: 4 }}>Hand Tracking</div>
        {handTracking && handTracking.hands.length > 0 ? (
          <div>
            <div>Hands detected: {handTracking.hands.length}</div>
            {handTracking.hands.map((hand, i) => (
              <div key={i} style={{ marginLeft: 8, fontSize: '11px' }}>
                {hand.handedness}: {(hand.score * 100).toFixed(0)}% confidence
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: BRAND_PALETTE.stoneGrey }}>No hands detected</div>
        )}
      </div>

      {/* Face Mesh */}
      {faceMesh && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: BRAND_PALETTE.agedGold, marginBottom: 4 }}>Face Mesh</div>
          <div>Landmarks: {faceMesh.landmarks.length}</div>
          <div>Confidence: {(faceMesh.confidence * 100).toFixed(1)}%</div>
          <div>Box: {faceMesh.boundingBox.width.toFixed(0)}x{faceMesh.boundingBox.height.toFixed(0)}</div>
        </div>
      )}

      {/* Segmentation */}
      {segmentation && (
        <div>
          <div style={{ color: BRAND_PALETTE.agedGold, marginBottom: 4 }}>Segmentation</div>
          <div>Size: {segmentation.width}x{segmentation.height}</div>
          <div>Has mask: {segmentation.mask ? 'Yes' : 'No'}</div>
        </div>
      )}

      {/* Hand Skeleton Visualization */}
      <div style={{ marginTop: 16 }}>
        <div style={{ color: BRAND_PALETTE.agedGold, marginBottom: 8 }}>Hand Skeleton</div>
        <HandSkeletonDebug
          handTracking={handTracking}
          width={280}
          height={210}
          mirror={true}
        />
      </div>
    </div>
  );
};

export default HandSkeletonDebug;
