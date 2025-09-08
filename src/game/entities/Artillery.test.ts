import { describe, it, expect, beforeEach } from 'vitest';
import { Artillery, ArtilleryState, ArtilleryType } from './Artillery';
import { Vector3 } from '../../math/Vector3';

describe('Artillery', () => {
  let artillery: Artillery;
  const initialPosition = new Vector3(0, 0, 0);

  beforeEach(() => {
    artillery = new Artillery(initialPosition, ArtilleryType.STANDARD);
  });

  describe('constructor', () => {
    it('should create artillery with initial position and type', () => {
      expect(artillery.position.equals(initialPosition)).toBe(true);
      expect(artillery.type).toBe(ArtilleryType.STANDARD);
      expect(artillery.state).toBe(ArtilleryState.READY);
      expect(artillery.isReady).toBe(true);
    });

    it('should initialize with default barrel orientation', () => {
      expect(artillery.azimuth).toBe(0); // Facing north
      expect(artillery.elevation).toBe(0); // Horizontal
      expect(
        artillery.barrelDirection.equals(new Vector3(0, 1, 0), 0.001)
      ).toBe(true);
    });

    it('should have appropriate range and reload time for type', () => {
      const standardArtillery = new Artillery(
        initialPosition,
        ArtilleryType.STANDARD
      );
      const lightArtillery = new Artillery(
        initialPosition,
        ArtilleryType.LIGHT
      );
      const heavyArtillery = new Artillery(
        initialPosition,
        ArtilleryType.HEAVY
      );

      expect(standardArtillery.maxRange).toBe(15000); // 15km
      expect(lightArtillery.maxRange).toBeLessThan(standardArtillery.maxRange);
      expect(heavyArtillery.maxRange).toBeGreaterThan(
        standardArtillery.maxRange
      );

      expect(lightArtillery.reloadTime).toBeLessThan(
        standardArtillery.reloadTime
      );
      expect(heavyArtillery.reloadTime).toBeGreaterThan(
        standardArtillery.reloadTime
      );
    });

    it('should allow custom muzzle velocity and barrel length', () => {
      const customArtillery = new Artillery(
        initialPosition,
        ArtilleryType.STANDARD,
        {
          muzzleVelocity: 800,
          barrelLength: 10,
        }
      );

      expect(customArtillery.muzzleVelocity).toBe(800);
      expect(customArtillery.barrelLength).toBe(10);
    });
  });

  describe('barrel orientation', () => {
    it('should set azimuth within valid range', () => {
      artillery.setAzimuth(45);
      expect(artillery.azimuth).toBe(45);

      artillery.setAzimuth(-180);
      expect(artillery.azimuth).toBe(-180);

      artillery.setAzimuth(180);
      expect(artillery.azimuth).toBe(180);
    });

    it('should normalize azimuth to [-180, 180] range', () => {
      artillery.setAzimuth(270);
      expect(artillery.azimuth).toBe(-90); // 270° = -90°

      artillery.setAzimuth(-270);
      expect(artillery.azimuth).toBe(90); // -270° = 90°

      artillery.setAzimuth(540);
      expect(artillery.azimuth).toBe(-180); // 540° = 180° (normalized to -180°)
    });

    it('should set elevation within valid range', () => {
      artillery.setElevation(30);
      expect(artillery.elevation).toBe(30);

      artillery.setElevation(0);
      expect(artillery.elevation).toBe(0);

      artillery.setElevation(85);
      expect(artillery.elevation).toBe(85);
    });

    it('should clamp elevation to [0, 85] degrees', () => {
      artillery.setElevation(-10);
      expect(artillery.elevation).toBe(0); // Clamped to minimum

      artillery.setElevation(95);
      expect(artillery.elevation).toBe(85); // Clamped to maximum
    });

    it('should calculate correct barrel direction from azimuth and elevation', () => {
      // Test cardinal directions
      artillery.setAzimuth(0);
      artillery.setElevation(0);
      expect(
        artillery.barrelDirection.equals(new Vector3(0, 1, 0), 0.001)
      ).toBe(true); // North

      artillery.setAzimuth(90);
      artillery.setElevation(0);
      expect(
        artillery.barrelDirection.equals(new Vector3(1, 0, 0), 0.001)
      ).toBe(true); // East

      artillery.setAzimuth(-90);
      artillery.setElevation(0);
      expect(
        artillery.barrelDirection.equals(new Vector3(-1, 0, 0), 0.001)
      ).toBe(true); // West

      // Test elevation
      artillery.setAzimuth(0);
      artillery.setElevation(90);
      expect(
        artillery.barrelDirection.equals(new Vector3(0, 0, 1), 0.001)
      ).toBe(true); // Straight up
    });
  });

  describe('firing mechanics', () => {
    it('should fire projectile when ready', () => {
      const result = artillery.fire();

      expect(result.success).toBe(true);
      expect(result.projectile).toBeDefined();
      expect(artillery.state).toBe(ArtilleryState.RELOADING);
      expect(artillery.isReady).toBe(false);
    });

    it('should not fire when reloading', () => {
      artillery.fire(); // First shot
      const result = artillery.fire(); // Second shot while reloading

      expect(result.success).toBe(false);
      expect(result.projectile).toBeNull();
      expect(result.reason).toBe('Artillery is reloading');
    });

    it('should not fire when disabled', () => {
      artillery.disable();
      const result = artillery.fire();

      expect(result.success).toBe(false);
      expect(result.projectile).toBeNull();
      expect(result.reason).toBe('Artillery is disabled');
    });

    it('should calculate muzzle position at barrel end', () => {
      artillery.setAzimuth(45);
      artillery.setElevation(30);

      artillery.fire();
      const muzzlePos = artillery.getMuzzlePosition();

      // Muzzle should be at barrel length distance from base position
      const expectedDistance = artillery.barrelLength;
      const actualDistance = muzzlePos.subtract(artillery.position).magnitude();
      expect(actualDistance).toBeCloseTo(expectedDistance, 0.1);
    });

    it('should generate projectile with correct initial velocity', () => {
      artillery.setAzimuth(0);
      artillery.setElevation(45);

      const result = artillery.fire();
      const projectile = result.projectile!;

      // Velocity magnitude should match muzzle velocity
      expect(projectile.velocity.magnitude()).toBeCloseTo(
        artillery.muzzleVelocity,
        0.1
      );

      // Velocity direction should match barrel direction
      const velDirection = projectile.velocity.normalize();
      const barrelDirection = artillery.barrelDirection;
      expect(velDirection.equals(barrelDirection, 0.001)).toBe(true);
    });
  });

  describe('reload system', () => {
    it('should track reload progress during reloading', () => {
      artillery.fire();
      expect(artillery.reloadProgress).toBe(0);

      artillery.update(1.0); // 1 second
      expect(artillery.reloadProgress).toBeGreaterThan(0);
      expect(artillery.reloadProgress).toBeLessThan(1);

      artillery.update(10.0); // Complete reload
      expect(artillery.reloadProgress).toBe(1);
      expect(artillery.state).toBe(ArtilleryState.READY);
    });

    it('should handle different reload times by type', () => {
      const lightArtillery = new Artillery(
        initialPosition,
        ArtilleryType.LIGHT
      );
      const heavyArtillery = new Artillery(
        initialPosition,
        ArtilleryType.HEAVY
      );

      lightArtillery.fire();
      heavyArtillery.fire();

      // After same time, light artillery should be further along
      lightArtillery.update(2.0);
      heavyArtillery.update(2.0);

      expect(lightArtillery.reloadProgress).toBeGreaterThan(
        heavyArtillery.reloadProgress
      );
    });

    it('should allow manual reload completion', () => {
      artillery.fire();
      expect(artillery.isReady).toBe(false);

      artillery.completeReload();
      expect(artillery.isReady).toBe(true);
      expect(artillery.state).toBe(ArtilleryState.READY);
    });
  });

  describe('targeting and range calculation', () => {
    it('should calculate range to target position', () => {
      const targetPos = new Vector3(1000, 1000, 0);
      const range = artillery.getRangeTo(targetPos);

      const expectedRange = Math.sqrt(1000 * 1000 + 1000 * 1000);
      expect(range).toBeCloseTo(expectedRange, 0.1);
    });

    it('should calculate bearing to target', () => {
      const targetPos = new Vector3(1000, 1000, 0); // 45° northeast
      const bearing = artillery.getBearingTo(targetPos);

      expect(bearing).toBeCloseTo(45, 0.1);
    });

    it('should detect targets within range', () => {
      const nearTarget = new Vector3(5000, 0, 0); // 5km away
      const farTarget = new Vector3(20000, 0, 0); // 20km away

      expect(artillery.canReach(nearTarget)).toBe(true);
      expect(artillery.canReach(farTarget)).toBe(false);
    });

    it('should suggest firing solutions for targets', () => {
      const target = new Vector3(5000, 5000, 100);
      const solution = artillery.calculateFiringSolution(target);

      expect(solution.canHit).toBe(true);
      expect(solution.azimuth).toBeDefined();
      expect(solution.elevation).toBeDefined();
      expect(solution.timeToTarget).toBeGreaterThan(0);
    });

    it('should handle unreachable targets', () => {
      const unreachableTarget = new Vector3(50000, 0, 0); // Too far
      const solution = artillery.calculateFiringSolution(unreachableTarget);

      expect(solution.canHit).toBe(false);
      expect(solution.reason).toBe('Target out of range');
    });
  });

  describe('ammunition management', () => {
    it('should track ammunition count', () => {
      expect(artillery.ammunitionCount).toBe(50); // Default count

      artillery.fire();
      expect(artillery.ammunitionCount).toBe(49);
    });

    it('should not fire when out of ammunition', () => {
      // Deplete ammunition
      for (let i = 0; i < 50; i++) {
        artillery.fire();
        artillery.completeReload();
      }

      const result = artillery.fire();
      expect(result.success).toBe(false);
      expect(result.reason).toBe('Out of ammunition');
    });

    it('should allow ammunition resupply', () => {
      artillery.fire();
      expect(artillery.ammunitionCount).toBe(49);

      artillery.resupplyAmmunition(10);
      expect(artillery.ammunitionCount).toBe(59);
    });

    it('should limit ammunition to maximum capacity', () => {
      artillery.resupplyAmmunition(100);
      expect(artillery.ammunitionCount).toBeLessThanOrEqual(100); // Max capacity
    });
  });

  describe('damage and maintenance', () => {
    it('should track barrel wear with each shot', () => {
      expect(artillery.barrelWear).toBe(0);

      artillery.fire();
      expect(artillery.barrelWear).toBeGreaterThan(0);

      // Multiple shots increase wear
      const initialWear = artillery.barrelWear;
      artillery.completeReload();
      artillery.fire();
      expect(artillery.barrelWear).toBeGreaterThan(initialWear);
    });

    it('should reduce accuracy when barrel is worn', () => {
      const initialAccuracy = artillery.accuracy;

      // Simulate many shots to wear barrel
      for (let i = 0; i < 100; i++) {
        artillery.fire();
        artillery.completeReload();
      }

      expect(artillery.accuracy).toBeLessThan(initialAccuracy);
    });

    it('should be disabled when critically damaged', () => {
      artillery.takeDamage(100); // Critical damage
      expect(artillery.state).toBe(ArtilleryState.DISABLED);
      expect(artillery.isDisabled).toBe(true);

      const result = artillery.fire();
      expect(result.success).toBe(false);
    });

    it('should support repair operations', () => {
      artillery.takeDamage(50);
      const initialHealth = artillery.health;

      artillery.repair(25);
      expect(artillery.health).toBeGreaterThan(initialHealth);
    });
  });

  describe('serialization and state', () => {
    it('should provide state snapshot', () => {
      artillery.setAzimuth(45);
      artillery.setElevation(30);
      artillery.fire();
      artillery.update(1.0);

      const snapshot = artillery.getStateSnapshot();

      expect(snapshot.position.equals(artillery.position)).toBe(true);
      expect(snapshot.azimuth).toBe(45);
      expect(snapshot.elevation).toBe(30);
      expect(snapshot.state).toBe(ArtilleryState.RELOADING);
      expect(snapshot.ammunitionCount).toBe(49);
    });

    it('should support state restoration', () => {
      const originalAzimuth = artillery.azimuth;
      const originalAmmo = artillery.ammunitionCount;

      artillery.setAzimuth(90);
      artillery.fire();

      artillery.reset();

      expect(artillery.azimuth).toBe(originalAzimuth);
      expect(artillery.ammunitionCount).toBe(originalAmmo);
      expect(artillery.state).toBe(ArtilleryState.READY);
      expect(artillery.barrelWear).toBe(0);
    });
  });
});
