/**
 * P1-S1 MediaPipe Integration Tests
 * Basic integration tests for bio module
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createWebcamCapture,
  createSegmentation,
  createFaceMesh,
  createHandTracking,
  createMockPIPGenerator,
  createPermissionFlow,
  createErrorHandler,
  createWarmupController,
  createFPSMonitor,
  createMirrorController,
  createModelLoadingController,
  createPerformanceCounter,
  BRAND_PALETTE,
  MEDIAPIPE_CONSTANTS,
  PIP_PRESETS,
  SEGMENTATION_QUALITY_PRESETS,
} from '../index';

describe('P1-S1 MediaPipe Integration', () => {
  describe('Webcam Capture (P1-S1-04)', () => {
    it('should create webcam capture with default config', () => {
      const webcam = createWebcamCapture();
      expect(webcam).toBeDefined();
      expect(webcam.isRunning()).toBe(false);
    });

    it('should support custom config', () => {
      const webcam = createWebcamCapture({
        width: 320,
        height: 240,
        frameRate: 15,
        mirrored: false,
      });
      expect(webcam).toBeDefined();
    });
  });

  describe('Mock PIP Generator (P1-S1-16)', () => {
    it('should create mock PIP generator', () => {
      const pip = createMockPIPGenerator();
      expect(pip).toBeDefined();
      expect(pip.isRunning()).toBe(false);
    });

    it('should generate PIP data', () => {
      const pip = createMockPIPGenerator();
      const data = pip.generateData();
      expect(data).toHaveProperty('coherence');
      expect(data).toHaveProperty('lqd');
      expect(data).toHaveProperty('entropy');
      expect(data).toHaveProperty('breathPhase');
      expect(data.coherence).toBeGreaterThanOrEqual(0);
      expect(data.coherence).toBeLessThanOrEqual(1);
    });
  });

  describe('Warmup Controller (P1-S1-32)', () => {
    it('should create warmup controller', () => {
      const warmup = createWarmupController();
      expect(warmup).toBeDefined();
      expect(warmup.hasFinished()).toBe(false);
    });

    it('should use correct warmup frame count constant', () => {
      expect(MEDIAPIPE_CONSTANTS.WARMUP_FRAMES).toBe(10);
    });
  });

  describe('FPS Monitor (P1-S1-34)', () => {
    it('should create FPS monitor', () => {
      const monitor = createFPSMonitor();
      expect(monitor).toBeDefined();
    });
  });

  describe('Mirror Controller (P1-S1-35)', () => {
    it('should create mirror controller', () => {
      const mirror = createMirrorController();
      expect(mirror).toBeDefined();
      expect(mirror.isEnabled()).toBe(true);
    });
  });

  describe('Model Loading Controller (P1-S1-45)', () => {
    it('should create model loading controller', () => {
      const controller = createModelLoadingController();
      expect(controller).toBeDefined();
    });
  });

  describe('Performance Counter (P1-S1-48)', () => {
    it('should create performance counter', () => {
      const counter = createPerformanceCounter();
      expect(counter).toBeDefined();
    });
  });

  describe('Brand Palette', () => {
    it('should have correct brand colors', () => {
      expect(BRAND_PALETTE.deepInk).toBe('#1A1A2E');
      expect(BRAND_PALETTE.bone).toBe('#F5F0E8');
      expect(BRAND_PALETTE.agedGold).toBe('#B8860B');
    });
  });

  describe('Segmentation Quality Presets (P1-S1-41)', () => {
    it('should have correct target latencies', () => {
      expect(SEGMENTATION_QUALITY_PRESETS.fast.targetLatencyMs).toBe(15);
      expect(SEGMENTATION_QUALITY_PRESETS.balanced.targetLatencyMs).toBe(25);
      expect(SEGMENTATION_QUALITY_PRESETS.quality.targetLatencyMs).toBe(40);
    });
  });
});
