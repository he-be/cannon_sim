import { describe, it, expect } from 'vitest';
import { RadarCoordinateConverter } from './RadarCoordinateConverter.js';
import { Vector3 } from './Vector3.js';

describe('RadarCoordinateConverter', () => {
  describe('mouseToAzimuthDelta', () => {
    it('should convert mouse movement to azimuth delta with default sensitivity', () => {
      const deltaX = 100; // 100 pixels right
      const result = RadarCoordinateConverter.mouseToAzimuthDelta(deltaX);
      expect(result).toBe(10); // 100 * 0.1 = 10 degrees
    });

    it('should convert mouse movement to azimuth delta with custom sensitivity', () => {
      const deltaX = 50;
      const sensitivity = 0.2;
      const result = RadarCoordinateConverter.mouseToAzimuthDelta(
        deltaX,
        sensitivity
      );
      expect(result).toBe(10); // 50 * 0.2 = 10 degrees
    });

    it('should handle negative mouse movement', () => {
      const deltaX = -100;
      const result = RadarCoordinateConverter.mouseToAzimuthDelta(deltaX);
      expect(result).toBe(-10);
    });
  });

  describe('mouseToRangeDelta', () => {
    it('should convert mouse movement to range delta', () => {
      const deltaY = 100; // 100 pixels down
      const maxRange = 20000; // 20km
      const canvasHeight = 800;

      const result = RadarCoordinateConverter.mouseToRangeDelta(
        deltaY,
        maxRange,
        canvasHeight
      );

      // Expected: 100 / ((800-40) / 20000) = 100 / (760/20000) = 100 / 0.038 ≈ 2631.57
      expect(result).toBeCloseTo(2631.57, 1);
    });

    it('should handle negative mouse movement', () => {
      const deltaY = -50;
      const maxRange = 10000;
      const canvasHeight = 600;

      const result = RadarCoordinateConverter.mouseToRangeDelta(
        deltaY,
        maxRange,
        canvasHeight
      );
      expect(result).toBeLessThan(0);
    });
  });

  describe('worldToHorizontalRadarScreen', () => {
    it('should convert world position to horizontal radar screen coordinates', () => {
      const worldPos = new Vector3(1000, 1000, 0);
      const radarCenter = new Vector3(0, 0, 0);
      const radarAzimuth = 0; // North
      const canvasSize = { width: 800, height: 600 };
      const maxRange = 20000;

      const result = RadarCoordinateConverter.worldToHorizontalRadarScreen(
        worldPos,
        radarCenter,
        radarAzimuth,
        canvasSize,
        maxRange
      );

      // Object at 45 degrees northeast, should appear on radar
      expect(result.x).toBeGreaterThan(400); // Right of center
      expect(result.y).toBeGreaterThan(0); // Within canvas bounds
    });

    it('should handle radar azimuth rotation', () => {
      const worldPos = new Vector3(1000, 0, 0); // East of radar
      const radarCenter = new Vector3(0, 0, 0);
      const radarAzimuth = 90; // Radar pointing East
      const canvasSize = { width: 800, height: 600 };
      const maxRange = 20000;

      const result = RadarCoordinateConverter.worldToHorizontalRadarScreen(
        worldPos,
        radarCenter,
        radarAzimuth,
        canvasSize,
        maxRange
      );

      // Object should appear directly ahead on radar (center X, above gun)
      expect(result.x).toBeCloseTo(400, 5); // Center of radar (allow some tolerance)
      expect(result.y).toBeGreaterThan(0); // Within canvas bounds
    });
  });

  describe('screenToHorizontalRadarCoordinates', () => {
    it('should convert screen coordinates to radar coordinates', () => {
      const screenPos = { x: 500, y: 400 }; // Right and up from center
      const canvasSize = { width: 800, height: 600 };
      const maxRange = 20000;

      const result =
        RadarCoordinateConverter.screenToHorizontalRadarCoordinates(
          screenPos,
          canvasSize,
          maxRange
        );

      expect(result.azimuth).toBeGreaterThan(0);
      expect(result.azimuth).toBeLessThan(90);
      expect(result.range).toBeGreaterThan(0);
      expect(result.range).toBeLessThan(maxRange);
    });

    it('should handle center position', () => {
      const screenPos = { x: 400, y: 580 }; // Gun position
      const canvasSize = { width: 800, height: 600 };
      const maxRange = 20000;

      const result =
        RadarCoordinateConverter.screenToHorizontalRadarCoordinates(
          screenPos,
          canvasSize,
          maxRange
        );

      expect(result.range).toBeCloseTo(0, 1);
    });
  });

  describe('isTargetUnderCursor', () => {
    it('should return true when target is within tolerance', () => {
      const targetPos = { x: 100, y: 100 };
      const cursorPos = { x: 105, y: 95 };
      const tolerance = 10;

      const result = RadarCoordinateConverter.isTargetUnderCursor(
        targetPos,
        cursorPos,
        tolerance
      );

      expect(result).toBe(true);
    });

    it('should return false when target is outside tolerance', () => {
      const targetPos = { x: 100, y: 100 };
      const cursorPos = { x: 120, y: 100 };
      const tolerance = 10;

      const result = RadarCoordinateConverter.isTargetUnderCursor(
        targetPos,
        cursorPos,
        tolerance
      );

      expect(result).toBe(false);
    });

    it('should use default tolerance', () => {
      const targetPos = { x: 100, y: 100 };
      const cursorPos = { x: 108, y: 106 };

      const result = RadarCoordinateConverter.isTargetUnderCursor(
        targetPos,
        cursorPos
      );

      expect(result).toBe(true);
    });
  });

  describe('normalizeAzimuth', () => {
    it('should normalize positive angles', () => {
      expect(RadarCoordinateConverter.normalizeAzimuth(450)).toBe(90);
      expect(RadarCoordinateConverter.normalizeAzimuth(720)).toBe(0);
    });

    it('should normalize negative angles', () => {
      expect(RadarCoordinateConverter.normalizeAzimuth(-90)).toBe(270);
      expect(RadarCoordinateConverter.normalizeAzimuth(-45)).toBe(315);
    });

    it('should keep angles in range unchanged', () => {
      expect(RadarCoordinateConverter.normalizeAzimuth(0)).toBe(0);
      expect(RadarCoordinateConverter.normalizeAzimuth(180)).toBe(180);
      expect(RadarCoordinateConverter.normalizeAzimuth(359)).toBe(359);
    });
  });

  describe('calculateAzimuth', () => {
    it('should calculate azimuth between two positions', () => {
      const from = new Vector3(0, 0, 0);
      const to = new Vector3(1, 0, 0); // East

      const result = RadarCoordinateConverter.calculateAzimuth(from, to);
      expect(result).toBe(0); // East is 0 degrees in our coordinate system
    });

    it('should calculate azimuth for north direction', () => {
      const from = new Vector3(0, 0, 0);
      const to = new Vector3(0, 1, 0); // North

      const result = RadarCoordinateConverter.calculateAzimuth(from, to);
      expect(result).toBe(90); // North is 90 degrees
    });

    it('should calculate azimuth for diagonal directions', () => {
      const from = new Vector3(0, 0, 0);
      const to = new Vector3(1, 1, 0); // Northeast

      const result = RadarCoordinateConverter.calculateAzimuth(from, to);
      expect(result).toBeCloseTo(45, 1);
    });
  });
});
