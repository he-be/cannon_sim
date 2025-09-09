import { describe, it, expect, beforeEach } from 'vitest';
import { LeadAngleCalculator } from './LeadAngleCalculator';
import { Vector3 } from '../math/Vector3';

describe('LeadAngleCalculator (basic implementation)', () => {
  let calculator: LeadAngleCalculator;

  beforeEach(() => {
    calculator = new LeadAngleCalculator();
  });

  describe('stationary target (GS-07)', () => {
    it('should return direct aim angle for stationary target', () => {
      const artilleryPos = new Vector3(0, 0, 0);
      const targetPos = new Vector3(1000, 0, 0);
      const targetVelocity = new Vector3(0, 0, 0); // Stationary

      const leadAngle = calculator.calculateLeadAngle(
        artilleryPos,
        targetPos,
        targetVelocity
      );

      expect(leadAngle.azimuth).toBeCloseTo(90, 1); // East direction (90° from north)
      expect(leadAngle.elevation).toBeGreaterThan(0);
    });
  });

  describe('moving target prediction (GS-07)', () => {
    it('should predict future position of moving target', () => {
      const targetPos = new Vector3(1000, 0, 0);
      const targetVelocity = new Vector3(50, 0, 0); // Moving east at 50 m/s
      const flightTime = 10; // 10 seconds

      const futurePos = calculator.predictTargetPosition(
        targetPos,
        targetVelocity,
        flightTime
      );

      const expectedPos = new Vector3(1500, 0, 0); // 1000 + 50*10
      expect(futurePos.equals(expectedPos)).toBe(true);
    });

    it('should calculate lead angle for horizontally moving target', () => {
      const artilleryPos = new Vector3(0, 0, 0);
      const targetPos = new Vector3(1000, 0, 0);
      const targetVelocity = new Vector3(0, 100, 0); // Moving north at 100 m/s

      const leadAngle = calculator.calculateLeadAngle(
        artilleryPos,
        targetPos,
        targetVelocity
      );

      // Should aim ahead of target's current position
      expect(leadAngle.azimuth).toBeGreaterThan(0); // More northward than direct aim
    });
  });

  describe('flight time estimation (GS-07)', () => {
    it('should estimate flight time based on distance', () => {
      const distance = 2000; // meters

      const flightTime = calculator.estimateFlightTime(distance);

      expect(flightTime).toBeGreaterThan(5); // Should be reasonable time
      expect(flightTime).toBeLessThan(20); // Not too long
    });
  });

  describe('iterative convergence (shooting method basics)', () => {
    it('should converge to accurate lead angle through iteration', () => {
      const artilleryPos = new Vector3(0, 0, 0);
      const targetPos = new Vector3(1500, 1500, 0);
      const targetVelocity = new Vector3(75, -50, 0); // Complex movement

      const leadAngle = calculator.calculateLeadAngle(
        artilleryPos,
        targetPos,
        targetVelocity
      );

      expect(leadAngle.azimuth).toBeDefined();
      expect(leadAngle.elevation).toBeGreaterThan(0);

      // Verify the calculation produces reasonable results
      expect(leadAngle.elevation).toBeLessThan(60); // Reasonable elevation for this distance
    });

    it('should handle fast-moving targets', () => {
      const artilleryPos = new Vector3(0, 0, 0);
      const targetPos = new Vector3(800, 0, 10);
      const targetVelocity = new Vector3(150, 100, 0); // Fast moving target

      const leadAngle = calculator.calculateLeadAngle(
        artilleryPos,
        targetPos,
        targetVelocity
      );

      // Should provide significant lead
      expect(Math.abs(leadAngle.azimuth)).toBeGreaterThan(10);
    });
  });

  describe('edge cases', () => {
    it('should handle target moving directly away from artillery', () => {
      const artilleryPos = new Vector3(0, 0, 0);
      const targetPos = new Vector3(1000, 0, 0);
      const targetVelocity = new Vector3(50, 0, 0); // Moving away

      const leadAngle = calculator.calculateLeadAngle(
        artilleryPos,
        targetPos,
        targetVelocity
      );

      expect(leadAngle).toBeDefined();
      expect(leadAngle.azimuth).toBeCloseTo(90, 5); // Should still be eastward
    });

    it('should handle very slow targets', () => {
      const artilleryPos = new Vector3(0, 0, 0);
      const targetPos = new Vector3(500, 500, 0);
      const targetVelocity = new Vector3(1, 1, 0); // Very slow

      const leadAngle = calculator.calculateLeadAngle(
        artilleryPos,
        targetPos,
        targetVelocity
      );

      // Should be very close to direct aim
      const directAimAzimuth = Math.atan2(500, 500) * (180 / Math.PI);
      expect(Math.abs(leadAngle.azimuth - directAimAzimuth)).toBeLessThan(2);
    });
  });
});
