import { describe, test, expect, beforeEach } from 'vitest';
import { TargetingSystem, TargetingState } from './TargetingSystem';
import { Target, TargetType } from './entities/Target';
import { Vector3 } from '../math/Vector3';

describe('TargetingSystem', () => {
  let targetingSystem: TargetingSystem;

  beforeEach(() => {
    targetingSystem = new TargetingSystem();
  });

  describe('initialization', () => {
    test('should start with NO_TARGET state', () => {
      const state = targetingSystem.getState();
      expect(state.state).toBe(TargetingState.NO_TARGET);
      expect(state.trackedTarget).toBeNull();
      expect(state.lockedTarget).toBeNull();
    });
  });

  describe('target tracking', () => {
    test('should track active target', () => {
      const target = new Target(
        new Vector3(100, 100, 0),
        TargetType.STATIC,
        undefined,
        0
      );
      const targets = [target];
      const artilleryPosition = new Vector3(0, 0, 0);

      const result = targetingSystem.update(
        targets,
        45,
        141,
        artilleryPosition,
        1000
      );

      expect(result.state).toBe(TargetingState.TRACKING);
      expect(result.trackedTarget).toBe(target);
    });

    test('should not track destroyed targets', () => {
      const target = new Target(
        new Vector3(100, 100, 0),
        TargetType.STATIC,
        undefined,
        0
      );
      target.hit(); // Destroy target
      const targets = [target];
      const artilleryPosition = new Vector3(0, 0, 0);

      const result = targetingSystem.update(
        targets,
        45,
        141,
        artilleryPosition,
        1000
      );

      expect(result.state).toBe(TargetingState.NO_TARGET);
      expect(result.trackedTarget).toBeNull();
    });

    test('should not track targets that have not spawned yet', () => {
      const target = new Target(
        new Vector3(100, 100, 0),
        TargetType.STATIC,
        undefined,
        2000 // Spawn time in future
      );
      const targets = [target];
      const artilleryPosition = new Vector3(0, 0, 0);

      const result = targetingSystem.update(
        targets,
        45,
        141,
        artilleryPosition,
        1000 // Current time < spawn time
      );

      expect(result.state).toBe(TargetingState.NO_TARGET);
      expect(result.trackedTarget).toBeNull();
    });
  });

  describe('update', () => {
    test('should find target within radar beam and range', () => {
      const target = new Target(
        new Vector3(100, 100, 0), // Azimuth ~45 deg, Range ~141m
        TargetType.STATIC,
        undefined,
        0
      );
      const targets = [target];
      const radarAzimuth = 45;
      const radarRange = 141;
      const artilleryPosition = new Vector3(0, 0, 0);

      const result = targetingSystem.update(
        targets,
        radarAzimuth,
        radarRange,
        artilleryPosition,
        1000
      );

      expect(result.state).toBe(TargetingState.TRACKING);
      expect(result.trackedTarget).toBe(target);
    });

    test('should NOT find target outside beam width', () => {
      const target = new Target(
        new Vector3(100, 100, 0), // Azimuth ~45 deg
        TargetType.STATIC,
        undefined,
        0
      );
      const targets = [target];
      const radarAzimuth = 60; // Outside 5 degree beam
      const radarRange = 141;
      const artilleryPosition = new Vector3(0, 0, 0);

      const result = targetingSystem.update(
        targets,
        radarAzimuth,
        radarRange,
        artilleryPosition,
        1000
      );

      expect(result.state).toBe(TargetingState.NO_TARGET);
      expect(result.trackedTarget).toBeNull();
    });

    test('should NOT find target outside range tolerance', () => {
      const target = new Target(
        new Vector3(100, 100, 0), // Range ~141m
        TargetType.STATIC,
        undefined,
        0
      );
      const targets = [target];
      const radarAzimuth = 45;
      const radarRange = 500; // Outside 200m tolerance
      const artilleryPosition = new Vector3(0, 0, 0);

      const result = targetingSystem.update(
        targets,
        radarAzimuth,
        radarRange,
        artilleryPosition,
        1000
      );

      expect(result.state).toBe(TargetingState.NO_TARGET);
      expect(result.trackedTarget).toBeNull();
    });

    test('should keep tracking locked target even if outside beam', () => {
      const target = new Target(
        new Vector3(100, 100, 0),
        TargetType.STATIC,
        undefined,
        0
      );
      const targets = [target];
      const artilleryPosition = new Vector3(0, 0, 0);

      // First track and lock
      targetingSystem.update(targets, 45, 141, artilleryPosition, 1000);
      targetingSystem.handleLockToggle();

      // Move radar away
      const result = targetingSystem.update(
        targets,
        180, // Totally different azimuth
        500, // Totally different range
        artilleryPosition,
        2000
      );

      expect(result.state).toBe(TargetingState.LOCKED_ON);
      expect(result.lockedTarget).toBe(target);
    });
  });

  describe('target locking', () => {
    test('should lock tracked target', () => {
      const target = new Target(
        new Vector3(100, 100, 0),
        TargetType.STATIC,
        undefined,
        0
      );
      const targets = [target];
      const artilleryPosition = new Vector3(0, 0, 0);

      // Track a target
      targetingSystem.update(targets, 45, 141, artilleryPosition, 1000);

      // Toggle lock
      const result = targetingSystem.handleLockToggle();

      expect(result.state).toBe(TargetingState.LOCKED_ON);
      expect(result.lockedTarget).toBe(target);
    });

    test('should unlock locked target', () => {
      const target = new Target(
        new Vector3(100, 100, 0),
        TargetType.STATIC,
        undefined,
        0
      );
      const targets = [target];
      const artilleryPosition = new Vector3(0, 0, 0);

      // Track and lock
      targetingSystem.update(targets, 45, 141, artilleryPosition, 1000);
      targetingSystem.handleLockToggle();

      // Toggle lock again to unlock
      const result = targetingSystem.handleLockToggle();

      expect(result.state).toBe(TargetingState.NO_TARGET);
      expect(result.lockedTarget).toBeNull();
    });

    test('should keep tracking locked target', () => {
      const target = new Target(
        new Vector3(100, 100, 0),
        TargetType.STATIC,
        undefined,
        0
      );
      const targets = [target];
      const artilleryPosition = new Vector3(0, 0, 0);

      // Track and lock
      targetingSystem.update(targets, 45, 141, artilleryPosition, 1000);
      targetingSystem.handleLockToggle();

      // Update again (should stay locked)
      const result = targetingSystem.update(
        targets,
        45,
        141,
        artilleryPosition,
        2000
      );

      expect(result.state).toBe(TargetingState.LOCKED_ON);
      expect(result.lockedTarget).toBe(target);
    });
  });

  describe('clearing', () => {
    test('should clear all targeting', () => {
      const target = new Target(
        new Vector3(100, 100, 0),
        TargetType.STATIC,
        undefined,
        0
      );
      const targets = [target];
      const artilleryPosition = new Vector3(0, 0, 0);

      // Lock a target
      targetingSystem.update(targets, 45, 141, artilleryPosition, 1000);
      targetingSystem.handleLockToggle();

      // Clear targeting
      targetingSystem.clearTargeting();

      const state = targetingSystem.getState();
      expect(state.state).toBe(TargetingState.NO_TARGET);
      expect(state.trackedTarget).toBeNull();
      expect(state.lockedTarget).toBeNull();
    });

    test('should clear lock only', () => {
      const target = new Target(
        new Vector3(100, 100, 0),
        TargetType.STATIC,
        undefined,
        0
      );
      const targets = [target];
      const artilleryPosition = new Vector3(0, 0, 0);

      // Lock a target
      targetingSystem.update(targets, 45, 141, artilleryPosition, 1000);
      targetingSystem.handleLockToggle();

      // Clear lock
      targetingSystem.clearLock();

      const state = targetingSystem.getState();
      // Should revert to tracking if target is still valid
      // In this test setup, update hasn't run again, so it might just clear lock
      // But based on implementation: targetingState = trackedTarget ? TRACKING : NO_TARGET
      // Since we haven't cleared trackedTarget, it should go back to TRACKING
      expect(state.state).toBe(TargetingState.TRACKING);
      expect(state.lockedTarget).toBeNull();
      expect(state.trackedTarget).toBe(target);
    });
  });

  describe('reset', () => {
    test('should reset to initial state', () => {
      const target = new Target(
        new Vector3(100, 100, 0),
        TargetType.STATIC,
        undefined,
        0
      );
      const targets = [target];
      const artilleryPosition = new Vector3(0, 0, 0);

      // Set state
      targetingSystem.update(targets, 45, 141, artilleryPosition, 1000);
      targetingSystem.handleLockToggle();

      expect(targetingSystem.getTargetingState()).toBe(
        TargetingState.LOCKED_ON
      );

      // Reset
      targetingSystem.reset();

      expect(targetingSystem.getTargetingState()).toBe(
        TargetingState.NO_TARGET
      );
      expect(targetingSystem.getTrackedTarget()).toBeNull();
      expect(targetingSystem.getLockedTarget()).toBeNull();
    });
  });

  describe('getters', () => {
    test('should return locked target', () => {
      const target = new Target(
        new Vector3(100, 100, 0),
        TargetType.STATIC,
        undefined,
        0
      );
      const targets = [target];
      const artilleryPosition = new Vector3(0, 0, 0);

      targetingSystem.update(targets, 45, 141, artilleryPosition, 1000);
      targetingSystem.handleLockToggle();

      expect(targetingSystem.getLockedTarget()).toBe(target);
    });

    test('should return tracked target', () => {
      const target = new Target(
        new Vector3(100, 100, 0),
        TargetType.STATIC,
        undefined,
        0
      );
      const targets = [target];
      const artilleryPosition = new Vector3(0, 0, 0);

      targetingSystem.update(targets, 45, 141, artilleryPosition, 1000);

      expect(targetingSystem.getTrackedTarget()).toBe(target);
    });
    test('should return targeting state', () => {
      expect(targetingSystem.getTargetingState()).toBe(
        TargetingState.NO_TARGET
      );
    });
  });
});
