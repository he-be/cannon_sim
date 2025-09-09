import { describe, it, expect, beforeEach } from 'vitest';
import { TrajectoryCalculator } from './TrajectoryCalculator';
import { Vector3 } from '../math/Vector3';

describe('TrajectoryCalculator (spec-compliant)', () => {
  let calculator: TrajectoryCalculator;

  beforeEach(() => {
    calculator = new TrajectoryCalculator();
  });

  describe('trajectory calculation (GS-01)', () => {
    it('should calculate trajectory for target position', () => {
      const artilleryPos = new Vector3(0, 0, 0);
      const targetPos = new Vector3(1000, 500, 10);

      const trajectory = calculator.calculateTrajectory(
        artilleryPos,
        targetPos
      );

      expect(trajectory).toBeDefined();
      expect(trajectory.initialVelocity).toBeDefined();
      expect(trajectory.flightTime).toBeGreaterThan(0);
      expect(trajectory.maxHeight).toBeGreaterThan(0);
    });

    it('should provide initial velocity for projectile launch', () => {
      const artilleryPos = new Vector3(0, 0, 0);
      const targetPos = new Vector3(1000, 0, 0);

      const trajectory = calculator.calculateTrajectory(
        artilleryPos,
        targetPos
      );

      expect(trajectory.initialVelocity.magnitude()).toBeGreaterThan(0);
      expect(trajectory.initialVelocity.z).toBeGreaterThan(0); // Should have upward component
    });
  });

  describe('firing angle calculation (UI-01)', () => {
    it('should calculate optimal firing angle', () => {
      const artilleryPos = new Vector3(0, 0, 0);
      const targetPos = new Vector3(1000, 0, 10);

      const angle = calculator.calculateFiringAngle(artilleryPos, targetPos);

      expect(angle.elevation).toBeGreaterThan(0);
      expect(angle.elevation).toBeLessThan(90);
      expect(angle.azimuth).toBeDefined();
    });

    it('should handle different target positions', () => {
      const artilleryPos = new Vector3(0, 0, 0);
      const targetPos1 = new Vector3(1000, 1000, 10); // 45 degrees
      const targetPos2 = new Vector3(0, 1000, 10); // 90 degrees

      const angle1 = calculator.calculateFiringAngle(artilleryPos, targetPos1);
      const angle2 = calculator.calculateFiringAngle(artilleryPos, targetPos2);

      expect(Math.abs(angle1.azimuth - 45)).toBeLessThan(1);
      expect(Math.abs(angle2.azimuth - 90)).toBeLessThan(1);
    });
  });

  describe('trajectory display data (UI-13-2)', () => {
    it('should provide trajectory points for visualization', () => {
      const artilleryPos = new Vector3(0, 0, 0);
      const targetPos = new Vector3(1000, 500, 10);

      const trajectory = calculator.calculateTrajectory(
        artilleryPos,
        targetPos
      );
      const displayPoints = calculator.getTrajectoryDisplayPoints(
        trajectory,
        20
      );

      expect(displayPoints).toHaveLength(20);
      expect(displayPoints[0].equals(artilleryPos)).toBe(true);
      expect(
        displayPoints[displayPoints.length - 1].subtract(targetPos).magnitude()
      ).toBeLessThan(50);
    });
  });

  describe('physics validation (GS-02)', () => {
    it('should respect physics constraints', () => {
      const artilleryPos = new Vector3(0, 0, 0);
      const targetPos = new Vector3(1000, 0, 0);

      const trajectory = calculator.calculateTrajectory(
        artilleryPos,
        targetPos
      );

      // Check that trajectory respects gravity
      expect(trajectory.maxHeight).toBeGreaterThan(targetPos.z);
      expect(trajectory.flightTime).toBeGreaterThan(0);

      // Initial velocity should be reasonable
      const speed = trajectory.initialVelocity.magnitude();
      expect(speed).toBeGreaterThan(10);
      expect(speed).toBeLessThan(500); // Reasonable for artillery
    });
  });
});
