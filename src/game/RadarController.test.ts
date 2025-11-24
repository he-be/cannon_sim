import { describe, test, expect, beforeEach } from 'vitest';
import { RadarController } from './RadarController';

describe('RadarController', () => {
  let controller: RadarController;

  beforeEach(() => {
    controller = new RadarController();
  });

  describe('initialization', () => {
    test('should initialize with default values', () => {
      const state = controller.getState();
      expect(state.azimuth).toBe(0);
      expect(state.elevation).toBe(0);
      expect(controller.isRotating()).toBe(false);
    });

    test('should reset to initial state', () => {
      controller.setAzimuth(180);
      controller.setElevation(45);
      controller.setAutoRotating(true);

      controller.reset();

      const state = controller.getState();
      expect(state.azimuth).toBe(0);
      expect(state.elevation).toBe(45);
      expect(controller.isRotating()).toBe(false);
    });
  });

  describe('manual updates', () => {
    test('should update azimuth manually', () => {
      const result = controller.updateManual(45, 0);

      expect(result).not.toBeNull();
      expect(result?.azimuth).toBe(45);
    });

    test('should update elevation manually', () => {
      const result = controller.updateManual(0, 30);

      expect(result).not.toBeNull();
      expect(result?.elevation).toBe(30);
    });

    test('should wrap azimuth at 360 degrees', () => {
      controller.setAzimuth(350);
      const result = controller.updateManual(20, 0);

      expect(result?.azimuth).toBe(10);
    });

    test('should handle negative azimuth', () => {
      controller.setAzimuth(10);
      const result = controller.updateManual(-20, 0);

      expect(result?.azimuth).toBe(350);
    });

    test('should clamp elevation to 0-90 range', () => {
      controller.setElevation(85);
      controller.updateManual(0, 10);
      expect(controller.getState().elevation).toBe(90);

      controller.setElevation(5);
      controller.updateManual(0, -10);
      expect(controller.getState().elevation).toBe(0);
    });

    test('should cancel auto-rotation when azimuth is changed manually', () => {
      controller.setAutoRotating(true);
      controller.updateManual(10, 0);

      expect(controller.isRotating()).toBe(false);
    });

    test('should NOT cancel auto-rotation when only elevation is changed', () => {
      controller.setAutoRotating(true);
      controller.updateManual(0, 10);

      expect(controller.isRotating()).toBe(true);
    });

    test('should return null when no change occurs', () => {
      const result = controller.updateManual(0, 0);
      expect(result).toBeNull();
    });
  });

  describe('auto-rotation', () => {
    test('should toggle auto-rotation', () => {
      expect(controller.isRotating()).toBe(false);

      controller.toggleAutoRotation();
      expect(controller.isRotating()).toBe(true);

      controller.toggleAutoRotation();
      expect(controller.isRotating()).toBe(false);
    });

    test('should update azimuth during auto-rotation', () => {
      controller.setAutoRotating(true);

      const result = controller.updateAutoRotation(1.0); // 1 second

      expect(result).not.toBeNull();
      expect(result?.azimuth).toBe(30); // 30 deg/s * 1s
    });

    test('should wrap azimuth at 360 during auto-rotation', () => {
      controller.setAzimuth(350);
      controller.setAutoRotating(true);

      const result = controller.updateAutoRotation(1.0);

      expect(result?.azimuth).toBe(20); // (350 + 30) % 360
    });

    test('should not update when auto-rotation is off', () => {
      controller.setAutoRotating(false);

      const result = controller.updateAutoRotation(1.0);

      expect(result).toBeNull();
      expect(controller.getState().azimuth).toBe(0);
    });
  });

  describe('track position', () => {
    test('should set radar to track specific position', () => {
      const result = controller.trackPosition(120, 45);

      expect(result.azimuth).toBe(120);
      expect(result.elevation).toBe(45);
    });
  });

  describe('setters', () => {
    test('should set azimuth directly', () => {
      controller.setAzimuth(270);
      expect(controller.getState().azimuth).toBe(270);
    });

    test('should normalize azimuth when setting', () => {
      controller.setAzimuth(400);
      expect(controller.getState().azimuth).toBe(40);

      controller.setAzimuth(-30);
      expect(controller.getState().azimuth).toBe(330);
    });

    test('should set elevation directly', () => {
      controller.setElevation(60);
      expect(controller.getState().elevation).toBe(60);
    });

    test('should clamp elevation when setting', () => {
      controller.setElevation(100);
      expect(controller.getState().elevation).toBe(90);

      controller.setElevation(-10);
      expect(controller.getState().elevation).toBe(0);
    });
  });
});
