import { describe, it, expect } from 'vitest';
import { Vector2 } from './Vector2';

describe('Vector2', () => {
  describe('constructor', () => {
    it('should create a vector with x, y coordinates', () => {
      const v = new Vector2(1, 2);
      expect(v.x).toBe(1);
      expect(v.y).toBe(2);
    });

    it('should create a zero vector when no arguments provided', () => {
      const v = new Vector2();
      expect(v.x).toBe(0);
      expect(v.y).toBe(0);
    });
  });

  describe('basic operations', () => {
    it('should add two vectors', () => {
      const v1 = new Vector2(1, 2);
      const v2 = new Vector2(4, 5);
      const result = v1.add(v2);

      expect(result.x).toBe(5);
      expect(result.y).toBe(7);
    });

    it('should subtract two vectors', () => {
      const v1 = new Vector2(4, 5);
      const v2 = new Vector2(1, 2);
      const result = v1.subtract(v2);

      expect(result.x).toBe(3);
      expect(result.y).toBe(3);
    });

    it('should multiply vector by scalar', () => {
      const v = new Vector2(1, 2);
      const result = v.multiply(2);

      expect(result.x).toBe(2);
      expect(result.y).toBe(4);
    });
  });

  describe('length and normalization', () => {
    it('should calculate vector magnitude', () => {
      const v = new Vector2(3, 4);
      expect(v.magnitude()).toBe(5);
    });

    it('should normalize vector', () => {
      const v = new Vector2(3, 4);
      const normalized = v.normalize();

      expect(normalized.x).toBeCloseTo(0.6);
      expect(normalized.y).toBeCloseTo(0.8);
      expect(normalized.magnitude()).toBeCloseTo(1);
    });

    it('should handle zero vector normalization', () => {
      const v = new Vector2(0, 0);
      const normalized = v.normalize();

      expect(normalized.x).toBe(0);
      expect(normalized.y).toBe(0);
    });
  });

  describe('dot and angle', () => {
    it('should calculate dot product', () => {
      const v1 = new Vector2(1, 2);
      const v2 = new Vector2(4, 5);
      const result = v1.dot(v2);

      expect(result).toBe(14);
    });

    it('should calculate angle between vectors', () => {
      const v1 = new Vector2(1, 0);
      const v2 = new Vector2(0, 1);
      const angle = v1.angleTo(v2);

      expect(angle).toBeCloseTo(Math.PI / 2);
    });

    it('should handle angle with zero vector', () => {
      const v1 = new Vector2(0, 0);
      const v2 = new Vector2(1, 0);
      const angle = v1.angleTo(v2);

      expect(angle).toBe(0);
    });
  });

  describe('rotation', () => {
    it('should rotate vector by angle in radians', () => {
      const v = new Vector2(1, 0);
      const rotated = v.rotate(Math.PI / 2);

      expect(rotated.x).toBeCloseTo(0, 6);
      expect(rotated.y).toBeCloseTo(1, 6);
    });

    it('should rotate by 0 and 2π returning same direction', () => {
      const v = new Vector2(2, -3);
      expect(v.rotate(0).equals(v)).toBe(true);
      const v2 = v.rotate(Math.PI * 2);
      expect(v2.equals(v2.rotate(Math.PI * 2), 1e-12)).toBe(true);
    });
  });

  describe('utility methods', () => {
    it('should create copy of vector', () => {
      const v = new Vector2(1, 2);
      const copy = v.copy();

      expect(copy.x).toBe(1);
      expect(copy.y).toBe(2);
      expect(copy).not.toBe(v);
    });

    it('should convert to string', () => {
      const v = new Vector2(1, 2);
      expect(v.toString()).toBe('Vector2(1, 2)');
    });

    it('should check equality', () => {
      const v1 = new Vector2(1, 2);
      const v2 = new Vector2(1, 2);
      const v3 = new Vector2(1, 3);

      expect(v1.equals(v2)).toBe(true);
      expect(v1.equals(v3)).toBe(false);
    });

    it('should check equality with tolerance', () => {
      const v1 = new Vector2(1, 2);
      const v2 = new Vector2(1.001, 2.001);

      expect(v1.equals(v2, 0.01)).toBe(true);
      expect(v1.equals(v2, 0.0001)).toBe(false);
    });
  });

  describe('screen transform helpers', () => {
    it('should convert from polar to cartesian', () => {
      const v = Vector2.fromAngle(Math.PI / 2, 10);
      expect(v.x).toBeCloseTo(0, 6);
      expect(v.y).toBeCloseTo(10, 6);
    });

    it('should compute angle of vector', () => {
      const v = new Vector2(0, 1);
      expect(v.angle()).toBeCloseTo(Math.PI / 2, 6);
    });
  });
});
