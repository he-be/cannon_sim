import { describe, it, expect } from 'vitest';
import { Vector3 } from './Vector3';

describe('Vector3', () => {
  describe('constructor', () => {
    it('should create a vector with x, y, z coordinates', () => {
      const v = new Vector3(1, 2, 3);
      expect(v.x).toBe(1);
      expect(v.y).toBe(2);
      expect(v.z).toBe(3);
    });

    it('should create a zero vector when no arguments provided', () => {
      const v = new Vector3();
      expect(v.x).toBe(0);
      expect(v.y).toBe(0);
      expect(v.z).toBe(0);
    });
  });

  describe('basic operations', () => {
    it('should add two vectors', () => {
      const v1 = new Vector3(1, 2, 3);
      const v2 = new Vector3(4, 5, 6);
      const result = v1.add(v2);

      expect(result.x).toBe(5);
      expect(result.y).toBe(7);
      expect(result.z).toBe(9);
    });

    it('should subtract two vectors', () => {
      const v1 = new Vector3(4, 5, 6);
      const v2 = new Vector3(1, 2, 3);
      const result = v1.subtract(v2);

      expect(result.x).toBe(3);
      expect(result.y).toBe(3);
      expect(result.z).toBe(3);
    });

    it('should multiply vector by scalar', () => {
      const v = new Vector3(1, 2, 3);
      const result = v.multiply(2);

      expect(result.x).toBe(2);
      expect(result.y).toBe(4);
      expect(result.z).toBe(6);
    });
  });

  describe('length and normalization', () => {
    it('should calculate vector magnitude', () => {
      const v = new Vector3(3, 4, 0);
      expect(v.magnitude()).toBe(5);
    });

    it('should calculate vector magnitude for 3D case', () => {
      const v = new Vector3(1, 2, 2);
      expect(v.magnitude()).toBe(3);
    });

    it('should normalize vector', () => {
      const v = new Vector3(3, 4, 0);
      const normalized = v.normalize();

      expect(normalized.x).toBeCloseTo(0.6);
      expect(normalized.y).toBeCloseTo(0.8);
      expect(normalized.z).toBeCloseTo(0);
      expect(normalized.magnitude()).toBeCloseTo(1);
    });

    it('should handle zero vector normalization', () => {
      const v = new Vector3(0, 0, 0);
      const normalized = v.normalize();

      expect(normalized.x).toBe(0);
      expect(normalized.y).toBe(0);
      expect(normalized.z).toBe(0);
    });
  });

  describe('dot and cross product', () => {
    it('should calculate dot product', () => {
      const v1 = new Vector3(1, 2, 3);
      const v2 = new Vector3(4, 5, 6);
      const result = v1.dot(v2);

      expect(result).toBe(32); // 1*4 + 2*5 + 3*6 = 4 + 10 + 18 = 32
    });

    it('should calculate cross product', () => {
      const v1 = new Vector3(1, 0, 0);
      const v2 = new Vector3(0, 1, 0);
      const result = v1.cross(v2);

      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.z).toBe(1);
    });

    it('should calculate cross product for general case', () => {
      const v1 = new Vector3(2, 3, 4);
      const v2 = new Vector3(5, 6, 7);
      const result = v1.cross(v2);

      // Cross product: (3*7 - 4*6, 4*5 - 2*7, 2*6 - 3*5) = (-3, 6, -3)
      expect(result.x).toBe(-3);
      expect(result.y).toBe(6);
      expect(result.z).toBe(-3);
    });
  });

  describe('utility methods', () => {
    it('should create copy of vector', () => {
      const v = new Vector3(1, 2, 3);
      const copy = v.copy();

      expect(copy.x).toBe(1);
      expect(copy.y).toBe(2);
      expect(copy.z).toBe(3);
      expect(copy).not.toBe(v); // Different object instances
    });

    it('should convert to string', () => {
      const v = new Vector3(1, 2, 3);
      expect(v.toString()).toBe('Vector3(1, 2, 3)');
    });

    it('should check equality', () => {
      const v1 = new Vector3(1, 2, 3);
      const v2 = new Vector3(1, 2, 3);
      const v3 = new Vector3(1, 2, 4);

      expect(v1.equals(v2)).toBe(true);
      expect(v1.equals(v3)).toBe(false);
    });

    it('should check equality with tolerance', () => {
      const v1 = new Vector3(1, 2, 3);
      const v2 = new Vector3(1.001, 2.001, 3.001);

      expect(v1.equals(v2, 0.01)).toBe(true);
      expect(v1.equals(v2, 0.0001)).toBe(false);
    });
  });
});
