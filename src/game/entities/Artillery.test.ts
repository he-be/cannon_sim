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
});
