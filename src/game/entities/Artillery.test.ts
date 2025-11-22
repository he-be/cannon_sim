import { describe, it, expect, beforeEach } from 'vitest';
import { Artillery, ArtilleryState } from './Artillery';
import { Vector3 } from '../../math/Vector3';

describe('Artillery (spec-compliant)', () => {
  let artillery: Artillery;
  const artilleryPosition = new Vector3(0, 0, 0);

  beforeEach(() => {
    artillery = new Artillery(artilleryPosition);
  });

  describe('constructor', () => {
    it('should create artillery with position', () => {
      expect(artillery.position.equals(artilleryPosition)).toBe(true);
      expect(artillery.state).toBe(ArtilleryState.READY);
    });
  });

  describe('targeting and aiming (UI-01)', () => {
    it('should allow setting target position', () => {
      const targetPos = new Vector3(1000, 500, 10);
      artillery.setTargetPosition(targetPos);

      expect(artillery.targetPosition?.equals(targetPos)).toBe(true);
    });

    it('should calculate firing angle from target position', () => {
      const targetPos = new Vector3(1000, 0, 10);
      artillery.setTargetPosition(targetPos);

      const angle = artillery.getFiringAngle();
      expect(angle).toBeDefined();
      expect(angle.elevation).toBeGreaterThan(0);
    });
  });

  describe('firing mechanism (GS-03)', () => {
    it('should be ready to fire initially', () => {
      expect(artillery.canFire()).toBe(true);
    });

    it('should fire projectile when target is set', () => {
      const targetPos = new Vector3(1000, 500, 10);
      artillery.setTargetPosition(targetPos);

      const projectileData = artillery.fire();

      expect(projectileData).toBeDefined();
      expect(projectileData.position.equals(artilleryPosition)).toBe(true);
      expect(projectileData.velocity).toBeDefined();
      expect(artillery.state).toBe(ArtilleryState.FIRED);
    });

    it('should not fire without target', () => {
      expect(() => artillery.fire()).toThrow();
    });

    it('should enter reload state after firing', () => {
      const targetPos = new Vector3(1000, 500, 10);
      artillery.setTargetPosition(targetPos);
      artillery.fire();

      expect(artillery.canFire()).toBe(false);
      expect(artillery.state).toBe(ArtilleryState.FIRED);
    });
  });

  describe('reload mechanism (GS-03)', () => {
    it('should reload after firing', () => {
      const targetPos = new Vector3(1000, 500, 10);
      artillery.setTargetPosition(targetPos);
      artillery.fire();

      artillery.reload();

      expect(artillery.state).toBe(ArtilleryState.READY);
      expect(artillery.canFire()).toBe(true);
    });
  });

  describe('artillery information (UI-17)', () => {
    it('should provide range to target', () => {
      const targetPos = new Vector3(1000, 500, 10);
      artillery.setTargetPosition(targetPos);

      const range = artillery.getRangeToTarget();
      expect(range).toBeCloseTo(targetPos.magnitude());
    });

    it('should provide bearing to target', () => {
      const targetPos = new Vector3(1000, 1000, 10);
      artillery.setTargetPosition(targetPos);

      const bearing = artillery.getBearingToTarget();
      expect(bearing).toBeCloseTo(45); // 45 degrees for equal x,y
    });
  });

  describe('lead angle calculation (GS-07, UI-06)', () => {
    it('should calculate lead angle for stationary target', () => {
      const targetPos = new Vector3(1000, 0, 10);
      artillery.setTargetPosition(targetPos);

      const leadAngle = artillery.getRecommendedLeadAngle();

      expect(leadAngle).toBeDefined();
      expect(leadAngle!.azimuth).toBeCloseTo(90); // East direction
      expect(leadAngle!.elevation).toBeGreaterThan(0);
    });

    it('should calculate lead angle for moving target', () => {
      const targetPos = new Vector3(1000, 0, 10);
      const targetVelocity = new Vector3(0, 50, 0); // Moving north
      artillery.setTargetPosition(targetPos, targetVelocity);

      const movingTargetAngle = artillery.getRecommendedLeadAngle();

      expect(movingTargetAngle).toBeDefined();
      expect(movingTargetAngle!.azimuth).toBeDefined();
      expect(movingTargetAngle!.elevation).toBeGreaterThan(0);

      // For moving target, the calculation should be different from stationary
      artillery.setTargetPosition(targetPos); // Set as stationary
      const stationaryAngle = artillery.getRecommendedLeadAngle();
      expect(movingTargetAngle!.azimuth).not.toBeCloseTo(
        stationaryAngle!.azimuth,
        5
      );
    });

    it('should provide detailed lead calculation info (UI-06)', () => {
      const targetPos = new Vector3(800, 600, 0);
      const targetVelocity = new Vector3(30, 40, 0);
      artillery.setTargetPosition(targetPos, targetVelocity);

      const leadInfo = artillery.getLeadCalculationInfo();

      expect(leadInfo).toBeDefined();
      expect(leadInfo!.leadAngle).toBeDefined();
      expect(['HIGH', 'MEDIUM', 'LOW']).toContain(leadInfo!.confidence);
      expect(leadInfo!.leadDistance).toBeGreaterThan(0);
    });

    it('should detect moving targets', () => {
      const targetPos = new Vector3(1000, 500, 10);

      // Stationary target
      artillery.setTargetPosition(targetPos);
      expect(artillery.isTargetMoving()).toBe(false);

      // Moving target
      const targetVelocity = new Vector3(25, 15, 0);
      artillery.setTargetPosition(targetPos, targetVelocity);
      expect(artillery.isTargetMoving()).toBe(true);
    });

    it('should return null for lead angle when no target is set', () => {
      expect(artillery.getRecommendedLeadAngle()).toBeNull();
      expect(artillery.getLeadCalculationInfo()).toBeNull();
    });
  });
});
