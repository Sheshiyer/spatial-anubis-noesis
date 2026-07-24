/**
 * Head tilt calculation module
 * P1-S1-12: Calculate head-tilt vector from Face Mesh
 * - Use nose tip vs ear/chin plane normal
 * - Output: 3D tilt vector (left/right/forward/back)
 * - Precision: within 5 degrees
 */

import { type FaceMeshResult, type HeadTiltResult, type HeadTiltVector, MEDIAPIPE_CONSTANTS } from './types';
import { FACE_LANDMARK_INDICES } from './faceMesh';

export interface HeadTiltOptions {
  deadzoneDegrees?: number; // P1-S1-39: Small movements below threshold ignored
}

export function calculateHeadTilt(
  faceMesh: FaceMeshResult,
  options: HeadTiltOptions = {}
): HeadTiltResult {
  const { deadzoneDegrees = MEDIAPIPE_CONSTANTS.HEAD_TILT_DEADZONE_DEGREES } = options;
  const { landmarks } = faceMesh;

  // Get key landmarks with null checks
  const noseTip = landmarks[FACE_LANDMARK_INDICES.NOSE_TIP];
  const leftEar = landmarks[FACE_LANDMARK_INDICES.LEFT_EAR];
  const rightEar = landmarks[FACE_LANDMARK_INDICES.RIGHT_EAR];
  const chin = landmarks[FACE_LANDMARK_INDICES.CHIN];
  const forehead = landmarks[FACE_LANDMARK_INDICES.FOREHEAD_GLABELLA];

  // Validate landmarks exist
  if (!noseTip || !leftEar || !rightEar || !chin || !forehead) {
    return {
      vector: { pitch: 0, yaw: 0, roll: 0 },
      magnitude: 0,
      direction: 'neutral',
      confidence: 0,
    };
  }

  // Calculate head center
  const headCenter = {
    x: (leftEar.x + rightEar.x) / 2,
    y: (leftEar.y + rightEar.y + chin.y + forehead.y) / 4,
    z: (leftEar.z + rightEar.z + chin.z + forehead.z) / 4,
  };

  // Vector from center to nose tip (indicates facing direction)
  const noseVector = {
    x: noseTip.x - headCenter.x,
    y: noseTip.y - headCenter.y,
    z: noseTip.z - headCenter.z,
  };

  // Normalize nose vector
  const noseMagnitude = Math.sqrt(
    noseVector.x * noseVector.x +
    noseVector.y * noseVector.y +
    noseVector.z * noseVector.z
  );

  const normalizedNose = {
    x: noseVector.x / (noseMagnitude + 0.0001),
    y: noseVector.y / (noseMagnitude + 0.0001),
    z: noseVector.z / (noseMagnitude + 0.0001),
  };

  // Calculate tilt angles
  // Pitch: forward/backward tilt (nose y position relative to plane)
  // Yaw: left/right rotation (nose x position)
  // Roll: head tilt (ear height difference)

  const pitch = Math.asin(clamp(-normalizedNose.y, -1, 1)) * (180 / Math.PI);
  const yaw = Math.asin(clamp(normalizedNose.x, -1, 1)) * (180 / Math.PI);

  // Roll calculation from ear heights
  const earHeightDiff = leftEar.y - rightEar.y;
  const earDistance = Math.sqrt(
    Math.pow(leftEar.x - rightEar.x, 2) +
    Math.pow(leftEar.y - rightEar.y, 2)
  );
  const roll = Math.atan2(earHeightDiff, earDistance + 0.0001) * (180 / Math.PI);

  // Apply deadzone filtering
  const applyDeadzone = (value: number): number => {
    if (Math.abs(value) < deadzoneDegrees) {
      return 0;
    }
    return value > 0 ? value - deadzoneDegrees : value + deadzoneDegrees;
  };

  const tiltVector: HeadTiltVector = {
    pitch: applyDeadzone(pitch),
    yaw: applyDeadzone(yaw),
    roll: applyDeadzone(roll),
  };

  // Calculate magnitude and direction
  const magnitude = Math.sqrt(
    tiltVector.pitch * tiltVector.pitch +
    tiltVector.yaw * tiltVector.yaw +
    tiltVector.roll * tiltVector.roll
  );

  const direction = determineDirection(tiltVector);

  // Confidence based on face detection confidence and landmark visibility
  const confidence = faceMesh.confidence;

  return {
    vector: tiltVector,
    magnitude,
    direction,
    confidence,
  };
}

function calculatePlaneNormal(
  p1: { x: number; y: number; z: number },
  p2: { x: number; y: number; z: number },
  p3: { x: number; y: number; z: number }
): { x: number; y: number; z: number } {
  // Two vectors in the plane
  const v1 = {
    x: p2.x - p1.x,
    y: p2.y - p1.y,
    z: p2.z - p1.z,
  };
  const v2 = {
    x: p3.x - p1.x,
    y: p3.y - p1.y,
    z: p3.z - p1.z,
  };

  // Cross product gives normal
  const normal = {
    x: v1.y * v2.z - v1.z * v2.y,
    y: v1.z * v2.x - v1.x * v2.z,
    z: v1.x * v2.y - v1.y * v2.x,
  };

  // Normalize
  const magnitude = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
  return {
    x: normal.x / (magnitude + 0.0001),
    y: normal.y / (magnitude + 0.0001),
    z: normal.z / (magnitude + 0.0001),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function determineDirection(vector: HeadTiltVector): HeadTiltResult['direction'] {
  const { pitch, yaw, roll } = vector;
  const threshold = 5; // degrees

  // Check if essentially neutral
  if (Math.abs(pitch) < threshold && Math.abs(yaw) < threshold && Math.abs(roll) < threshold) {
    return 'neutral';
  }

  // Determine primary direction based on dominant component
  const absPitch = Math.abs(pitch);
  const absYaw = Math.abs(yaw);

  if (absPitch > absYaw) {
    return pitch > 0 ? 'forward' : 'backward';
  } else {
    return yaw > 0 ? 'right' : 'left';
  }
}

// Smooth head tilt over time
export class HeadTiltSmoother {
  private lastResult: HeadTiltResult | null = null;
  private smoothingFactor = 0.3;

  smooth(current: HeadTiltResult): HeadTiltResult {
    if (!this.lastResult) {
      this.lastResult = current;
      return current;
    }

    const alpha = this.smoothingFactor;
    const beta = 1 - alpha;

    const smoothed: HeadTiltResult = {
      vector: {
        pitch: this.lastResult.vector.pitch * alpha + current.vector.pitch * beta,
        yaw: this.lastResult.vector.yaw * alpha + current.vector.yaw * beta,
        roll: this.lastResult.vector.roll * alpha + current.vector.roll * beta,
      },
      magnitude: this.lastResult.magnitude * alpha + current.magnitude * beta,
      direction: current.direction, // Use current direction
      confidence: current.confidence,
    };

    this.lastResult = smoothed;
    return smoothed;
  }

  reset(): void {
    this.lastResult = null;
  }

  setSmoothingFactor(factor: number): void {
    this.smoothingFactor = clamp(factor, 0, 1);
  }
}

// Convert head tilt to navigation forces
export interface NavigationForces {
  steering: number; // -1 to 1 (left to right)
  forward: number;  // 0 to 1 (move speed)
  braking: number;  // 0 to 1 (brake amount)
}

export function headTiltToNavigation(tilt: HeadTiltResult): NavigationForces {
  const { vector } = tilt;
  const maxTiltDegrees = 30; // Maximum expected tilt

  // Normalize steering from yaw
  const steering = clamp(vector.yaw / maxTiltDegrees, -1, 1);

  // Forward movement from forward tilt
  let forward = 0;
  if (vector.pitch > 0) {
    forward = clamp(vector.pitch / maxTiltDegrees, 0, 1);
  }

  // Braking from backward tilt
  let braking = 0;
  if (vector.pitch < 0) {
    braking = clamp(Math.abs(vector.pitch) / maxTiltDegrees, 0, 1);
  }

  return {
    steering,
    forward,
    braking,
  };
}
