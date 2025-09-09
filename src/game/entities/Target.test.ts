import { describe, it, expect, beforeEach } from 'vitest';
import { Target, TargetType, TargetState } from './Target';
import { Vector3 } from '../../math/Vector3';

describe('Target (spec-compliant)', () => {
  let target: Target;
  const initialPosition = new Vector3(1000, 500, 10);

  beforeEach(() => {
    target = new Target(initialPosition, TargetType.STATIC);
  });

  describe('constructor', () => {
    it('should create target with position and type', () => {
      expect(target.position.equals(initialPosition)).toBe(true);
      expect(target.type).toBe(TargetType.STATIC);
      expect(target.state).toBe(TargetState.ACTIVE);
      expect(target.isDestroyed).toBe(false);
    });
  });

  describe('target types (UI-02)', () => {
    it('should support static targets', () => {
      const staticTarget = new Target(initialPosition, TargetType.STATIC);
      expect(staticTarget.type).toBe(TargetType.STATIC);
      expect(staticTarget.velocity.magnitude()).toBe(0);
    });

    it('should support slow moving targets', () => {
      const velocity = new Vector3(5, 0, 0);
      const slowTarget = new Target(
        initialPosition,
        TargetType.MOVING_SLOW,
        velocity
      );

      expect(slowTarget.type).toBe(TargetType.MOVING_SLOW);
      expect(slowTarget.velocity.equals(velocity)).toBe(true);
    });

    it('should support fast moving targets', () => {
      const velocity = new Vector3(20, 10, 0);
      const fastTarget = new Target(
        initialPosition,
        TargetType.MOVING_FAST,
        velocity
      );

      expect(fastTarget.type).toBe(TargetType.MOVING_FAST);
      expect(fastTarget.velocity.equals(velocity)).toBe(true);
    });
  });

  describe('target information (UI-18)', () => {
    it('should provide distance from artillery position', () => {
      const artilleryPos = new Vector3(0, 0, 0);
      const distance = target.distanceFrom(artilleryPos);

      expect(distance).toBeCloseTo(initialPosition.magnitude());
    });

    it('should provide speed information', () => {
      const velocity = new Vector3(10, 5, 0);
      const movingTarget = new Target(
        initialPosition,
        TargetType.MOVING_SLOW,
        velocity
      );

      expect(movingTarget.speed).toBeCloseTo(velocity.magnitude());
    });

    it('should provide altitude information', () => {
      expect(target.altitude).toBe(initialPosition.z);
    });
  });

  describe('target destruction (GS-08, GS-09)', () => {
    it('should be destroyable when hit', () => {
      target.destroy();

      expect(target.state).toBe(TargetState.DESTROYED);
      expect(target.isDestroyed).toBe(true);
    });

    it('should stop updating when destroyed', () => {
      const velocity = new Vector3(10, 0, 0);
      const movingTarget = new Target(
        initialPosition,
        TargetType.MOVING_SLOW,
        velocity
      );
      const originalPosition = movingTarget.position.copy();

      movingTarget.destroy();
      movingTarget.update(1.0); // Should not move when destroyed

      expect(movingTarget.position.equals(originalPosition)).toBe(true);
    });
  });

  describe('movement simulation', () => {
    it('should update position for moving targets', () => {
      const velocity = new Vector3(10, 0, 0);
      const movingTarget = new Target(
        initialPosition,
        TargetType.MOVING_SLOW,
        velocity
      );

      movingTarget.update(2.0); // 2 seconds

      const expectedPosition = initialPosition.add(velocity.multiply(2.0));
      expect(movingTarget.position.equals(expectedPosition, 0.001)).toBe(true);
    });

    it('should not move static targets', () => {
      const originalPosition = target.position.copy();

      target.update(1.0);

      expect(target.position.equals(originalPosition)).toBe(true);
    });
  });
});
