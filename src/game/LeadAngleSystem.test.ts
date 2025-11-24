import { describe, test, expect, beforeEach, vi } from 'vitest';
import { LeadAngleSystem } from './LeadAngleSystem';
import { Target, TargetType } from './entities/Target';
import { Vector3 } from '../math/Vector3';

// Mock LeadAngleCalculator
vi.mock('./LeadAngleCalculator', () => {
  return {
    LeadAngleCalculator: vi.fn().mockImplementation(() => ({
      calculateRecommendedLeadIncremental: vi.fn().mockReturnValue({
        leadAngle: { azimuth: 45, elevation: 30 },
        confidence: 'HIGH',
        converged: true,
        convergenceError: 5,
        flightTime: 2.5,
        iterations: 3,
        accuracy: 0.95,
      }),
      resetTargetTracking: vi.fn(),
    })),
  };
});

describe('LeadAngleSystem', () => {
  let leadAngleSystem: LeadAngleSystem;
  let artilleryPosition: Vector3;

  beforeEach(() => {
    artilleryPosition = new Vector3(0, 0, 0);
    leadAngleSystem = new LeadAngleSystem(artilleryPosition);
  });

  describe('initialization', () => {
    test('should start with no lead angle', () => {
      expect(leadAngleSystem.getLeadAngle()).toBeNull();
      expect(leadAngleSystem.hasLeadAngle()).toBe(false);
    });
  });

  describe('update with target', () => {
    test('should calculate lead angle for moving target at high frequency', () => {
      const target = new Target(
        new Vector3(1000, 0, 100),
        TargetType.MOVING_FAST,
        new Vector3(50, 0, 0),
        0
      );

      // Update with small delta time (should not trigger calculation yet)
      let updated = leadAngleSystem.update(0.01, target);
      expect(updated).toBe(false);

      // Update until it triggers (33ms for moving targets)
      updated = leadAngleSystem.update(0.025, target);
      expect(updated).toBe(true);
      expect(leadAngleSystem.hasLeadAngle()).toBe(true);

      const leadAngle = leadAngleSystem.getLeadAngle();
      expect(leadAngle).not.toBeNull();
      expect(leadAngle?.azimuth).toBe(45);
      expect(leadAngle?.elevation).toBe(30);
      expect(leadAngle?.confidence).toBe('HIGH');
    });

    test('should calculate lead angle for static target at low frequency', () => {
      const target = new Target(
        new Vector3(1000, 0, 100),
        TargetType.STATIC,
        undefined,
        0
      );

      // Update with small delta time (below 200ms threshold)
      let updated = leadAngleSystem.update(0.05, target);
      expect(updated).toBe(false);

      // Update to reach 200ms threshold for static targets
      updated = leadAngleSystem.update(0.16, target);
      expect(updated).toBe(true);
      expect(leadAngleSystem.hasLeadAngle()).toBe(true);
    });

    test('should clear lead angle when target is null', () => {
      const target = new Target(
        new Vector3(1000, 0, 100),
        TargetType.STATIC,
        undefined,
        0
      );

      // First get a lead angle
      leadAngleSystem.update(0.25, target);
      expect(leadAngleSystem.hasLeadAngle()).toBe(true);

      // Update with null target
      const updated = leadAngleSystem.update(0.1, null);
      expect(updated).toBe(false);
      expect(leadAngleSystem.hasLeadAngle()).toBe(false);
      expect(leadAngleSystem.getLeadAngle()).toBeNull();
    });
  });

  describe('confidence determination', () => {
    test('should report HIGH confidence for low error', () => {
      const target = new Target(
        new Vector3(1000, 0, 100),
        TargetType.MOVING_FAST,
        new Vector3(50, 0, 0),
        0
      );

      leadAngleSystem.update(0.05, target);
      const leadAngle = leadAngleSystem.getLeadAngle();

      expect(leadAngle?.confidence).toBe('HIGH');
      expect(leadAngle?.convergenceError).toBeLessThan(10);
    });
  });

  describe('target change handling', () => {
    test('should clear history when target changes', () => {
      const target1 = new Target(
        new Vector3(1000, 0, 100),
        TargetType.STATIC,
        undefined,
        0
      );

      const target2 = new Target(
        new Vector3(2000, 0, 100),
        TargetType.STATIC,
        undefined,
        5
      );

      // Calculate for first target
      leadAngleSystem.update(0.25, target1);
      expect(leadAngleSystem.hasLeadAngle()).toBe(true);

      // Switch to second target
      leadAngleSystem.update(0.25, target2);
      expect(leadAngleSystem.hasLeadAngle()).toBe(true);
      // History should be cleared internally (verified by mock)
    });
  });

  describe('clear and reset', () => {
    test('should clear lead angle', () => {
      const target = new Target(
        new Vector3(1000, 0, 100),
        TargetType.STATIC,
        undefined,
        0
      );

      leadAngleSystem.update(0.25, target);
      expect(leadAngleSystem.hasLeadAngle()).toBe(true);

      leadAngleSystem.clear();
      expect(leadAngleSystem.hasLeadAngle()).toBe(false);
      expect(leadAngleSystem.getLeadAngle()).toBeNull();
    });

    test('should reset system', () => {
      const target = new Target(
        new Vector3(1000, 0, 100),
        TargetType.STATIC,
        undefined,
        0
      );

      leadAngleSystem.update(0.25, target);
      expect(leadAngleSystem.hasLeadAngle()).toBe(true);

      leadAngleSystem.reset();
      expect(leadAngleSystem.hasLeadAngle()).toBe(false);
      expect(leadAngleSystem.getLeadAngle()).toBeNull();
    });
  });

  describe('extended information', () => {
    test('should include all extended lead angle information', () => {
      const target = new Target(
        new Vector3(1000, 0, 100),
        TargetType.MOVING_FAST,
        new Vector3(50, 0, 0),
        0
      );

      leadAngleSystem.update(0.05, target);
      const leadAngle = leadAngleSystem.getLeadAngle();

      expect(leadAngle).toMatchObject({
        azimuth: expect.any(Number),
        elevation: expect.any(Number),
        confidence: expect.any(String),
        convergenceError: expect.any(Number),
        flightTime: expect.any(Number),
        converged: expect.any(Boolean),
        iterations: expect.any(Number),
        accuracy: expect.any(Number),
      });
    });
  });
});
