import { describe, it, expect } from 'vitest';
import {
  degToRad,
  radToDeg,
  sinDeg,
  cosDeg,
  clamp,
  clamp01,
  lerp,
  slerpAngle,
  normalizeAngleRad,
} from './MathUtils';

describe('MathUtils', () => {
  describe('degree/radian conversion', () => {
    it('degToRad converts degrees to radians', () => {
      expect(degToRad(180)).toBeCloseTo(Math.PI);
      expect(degToRad(90)).toBeCloseTo(Math.PI / 2);
    });

    it('radToDeg converts radians to degrees', () => {
      expect(radToDeg(Math.PI)).toBeCloseTo(180);
      expect(radToDeg(Math.PI / 2)).toBeCloseTo(90);
    });
  });

  describe('trigonometric helpers', () => {
    it('sinDeg and cosDeg compute trig using degrees', () => {
      expect(sinDeg(30)).toBeCloseTo(0.5, 6);
      expect(cosDeg(60)).toBeCloseTo(0.5, 6);
      expect(sinDeg(0)).toBeCloseTo(0);
      expect(cosDeg(0)).toBeCloseTo(1);
    });
  });

  describe('clamp utilities', () => {
    it('clamp limits value within min and max', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-1, 0, 10)).toBe(0);
      expect(clamp(99, 0, 10)).toBe(10);
    });

    it('clamp handles inverted min/max by swapping', () => {
      expect(clamp(5, 10, 0)).toBe(5);
      expect(clamp(-1, 10, 0)).toBe(0);
      expect(clamp(99, 10, 0)).toBe(10);
    });

    it('clamp01 limits value to [0,1]', () => {
      expect(clamp01(0.3)).toBeCloseTo(0.3);
      expect(clamp01(-1)).toBe(0);
      expect(clamp01(2)).toBe(1);
    });
  });

  describe('interpolation', () => {
    it('lerp performs linear interpolation, allowing t outside [0,1]', () => {
      expect(lerp(0, 10, 0.25)).toBeCloseTo(2.5);
      expect(lerp(10, 20, 0.5)).toBeCloseTo(15);
      expect(lerp(0, 10, -0.5)).toBeCloseTo(-5);
    });

    it('slerpAngle interpolates the shortest angular path (radians)', () => {
      const a = degToRad(350);
      const b = degToRad(10);
      const mid = slerpAngle(a, b, 0.5);
      const normalizedMid = normalizeAngleRad(mid);
      // halfway between 350° and 10° (shortest path) is 0°
      expect(normalizedMid).toBeCloseTo(0, 10);
    });

    it('slerpAngle handles exact wrap and identity', () => {
      const a = degToRad(0);
      const b = degToRad(360);
      // same direction
      expect(normalizeAngleRad(slerpAngle(a, b, 0.25))).toBeCloseTo(0, 10);
      expect(normalizeAngleRad(slerpAngle(a, b, 0.75))).toBeCloseTo(0, 10);
    });
  });
});
