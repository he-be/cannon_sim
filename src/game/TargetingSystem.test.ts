import { describe, test, expect, beforeEach } from 'vitest';
import { TargetingSystem, TargetingState } from './TargetingSystem';
import { Target, TargetType } from './entities/Target';
import { Vector2 } from '../math/Vector2';
import { Vector3 } from '../math/Vector3';

describe('TargetingSystem', () => {
  let targetingSystem: TargetingSystem;
  let radarPosition: Vector3;
  let maxRange: number;

  beforeEach(() => {
    targetingSystem = new TargetingSystem();
    radarPosition = new Vector3(0, 0, 0);
    maxRange = 10000;
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
    test('should track target near cursor', () => {
      const target = new Target(
        new Vector3(1000, 0, 100),
        TargetType.STATIC,
        undefined,
        0
      );
      const targets = [target];
      const cursorPosition = new Vector2(1000, 0); // Near target

      const result = targetingSystem.update(
        targets,
        cursorPosition,
        radarPosition,
        maxRange,
        1 // Current time after spawn
      );

      expect(result.state).toBe(TargetingState.TRACKING);
      expect(result.trackedTarget).toBe(target);
      expect(result.lockedTarget).toBeNull();
    });

    test('should not track destroyed targets', () => {
      const target = new Target(
        new Vector3(1000, 0, 100),
        TargetType.STATIC,
        undefined,
        0
      );
      target.hit(); // Destroy target
      const targets = [target];
      const cursorPosition = new Vector2(1000, 0);

      const result = targetingSystem.update(
        targets,
        cursorPosition,
        radarPosition,
        maxRange,
        1
      );

      expect(result.state).toBe(TargetingState.NO_TARGET);
      expect(result.trackedTarget).toBeNull();
    });

    test('should not track targets that have not spawned yet', () => {
      const target = new Target(
        new Vector3(1000, 0, 100),
        TargetType.STATIC,
        undefined,
        10 // Spawns at t=10
      );
      const targets = [target];
      const cursorPosition = new Vector2(1000, 0);

      const result = targetingSystem.update(
        targets,
        cursorPosition,
        radarPosition,
        maxRange,
        5 // Current time before spawn
      );

      expect(result.state).toBe(TargetingState.NO_TARGET);
      expect(result.trackedTarget).toBeNull();
    });
  });

  describe('target locking', () => {
    test('should lock tracked target', () => {
      const target = new Target(
        new Vector3(1000, 0, 100),
        TargetType.STATIC,
        undefined,
        0
      );
      const targets = [target];
      const cursorPosition = new Vector2(1000, 0);

      // First track the target
      targetingSystem.update(
        targets,
        cursorPosition,
        radarPosition,
        maxRange,
        1
      );

      // Then lock it
      const result = targetingSystem.handleLockToggle();

      expect(result.state).toBe(TargetingState.LOCKED_ON);
      expect(result.lockedTarget).toBe(target);
      expect(result.trackedTarget).toBe(target);
    });

    test('should unlock locked target', () => {
      const target = new Target(
        new Vector3(1000, 0, 100),
        TargetType.STATIC,
        undefined,
        0
      );
      const targets = [target];
      const cursorPosition = new Vector2(1000, 0);

      // Track and lock
      targetingSystem.update(
        targets,
        cursorPosition,
        radarPosition,
        maxRange,
        1
      );
      targetingSystem.handleLockToggle();

      // Unlock
      const result = targetingSystem.handleLockToggle();

      expect(result.state).toBe(TargetingState.NO_TARGET);
      expect(result.lockedTarget).toBeNull();
      expect(result.trackedTarget).toBeNull();
    });

    test('should keep tracking locked target', () => {
      const target = new Target(
        new Vector3(1000, 0, 100),
        TargetType.STATIC,
        undefined,
        0
      );
      const targets = [target];
      const cursorPosition = new Vector2(1000, 0);

      // Track and lock
      targetingSystem.update(
        targets,
        cursorPosition,
        radarPosition,
        maxRange,
        1
      );
      targetingSystem.handleLockToggle();

      // Update with different cursor position
      const result = targetingSystem.update(
        targets,
        new Vector2(5000, 5000), // Far from target
        radarPosition,
        maxRange,
        2
      );

      // Should still be locked
      expect(result.state).toBe(TargetingState.LOCKED_ON);
      expect(result.lockedTarget).toBe(target);
    });
  });

  describe('clearing', () => {
    test('should clear all targeting', () => {
      const target = new Target(
        new Vector3(1000, 0, 100),
        TargetType.STATIC,
        undefined,
        0
      );
      const targets = [target];

      // Lock a target
      targetingSystem.update(
        targets,
        new Vector2(1000, 0),
        radarPosition,
        maxRange,
        1
      );
      targetingSystem.handleLockToggle();

      // Clear
      targetingSystem.clearTargeting();

      const state = targetingSystem.getState();
      expect(state.state).toBe(TargetingState.NO_TARGET);
      expect(state.trackedTarget).toBeNull();
      expect(state.lockedTarget).toBeNull();
    });

    test('should clear lock only', () => {
      const target = new Target(
        new Vector3(1000, 0, 100),
        TargetType.STATIC,
        undefined,
        0
      );
      const targets = [target];

      // Track and lock
      targetingSystem.update(
        targets,
        new Vector2(1000, 0),
        radarPosition,
        maxRange,
        1
      );
      targetingSystem.handleLockToggle();

      // Clear lock
      targetingSystem.clearLock();

      const state = targetingSystem.getState();
      // After clearing lock, if we still have tracked target, state becomes TRACKING
      // Otherwise NO_TARGET
      expect(state.state).toBe(TargetingState.TRACKING);
      expect(state.lockedTarget).toBeNull();
      expect(state.trackedTarget).toBe(target); // Still tracked
    });
  });

  describe('reset', () => {
    test('should reset to initial state', () => {
      const target = new Target(
        new Vector3(1000, 0, 100),
        TargetType.STATIC,
        undefined,
        0
      );
      const targets = [target];

      // Lock a target
      targetingSystem.update(
        targets,
        new Vector2(1000, 0),
        radarPosition,
        maxRange,
        1
      );
      targetingSystem.handleLockToggle();

      // Reset
      targetingSystem.reset();

      const state = targetingSystem.getState();
      expect(state.state).toBe(TargetingState.NO_TARGET);
      expect(state.trackedTarget).toBeNull();
      expect(state.lockedTarget).toBeNull();
    });
  });

  describe('getters', () => {
    test('should return locked target', () => {
      const target = new Target(
        new Vector3(1000, 0, 100),
        TargetType.STATIC,
        undefined,
        0
      );
      const targets = [target];

      targetingSystem.update(
        targets,
        new Vector2(1000, 0),
        radarPosition,
        maxRange,
        1
      );
      targetingSystem.handleLockToggle();

      expect(targetingSystem.getLockedTarget()).toBe(target);
    });

    test('should return tracked target', () => {
      const target = new Target(
        new Vector3(1000, 0, 100),
        TargetType.STATIC,
        undefined,
        0
      );
      const targets = [target];

      targetingSystem.update(
        targets,
        new Vector2(1000, 0),
        radarPosition,
        maxRange,
        1
      );

      expect(targetingSystem.getTrackedTarget()).toBe(target);
    });

    test('should return targeting state', () => {
      expect(targetingSystem.getTargetingState()).toBe(
        TargetingState.NO_TARGET
      );
    });
  });
});
