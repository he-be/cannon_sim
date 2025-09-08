import { describe, it, expect, beforeEach } from 'vitest';
import { Target, TargetType, TargetState, MovementPattern } from './Target';
import { Vector3 } from '../../math/Vector3';

describe('Target', () => {
  let target: Target;
  const initialPosition = new Vector3(1000, 500, 10);

  beforeEach(() => {
    target = new Target(initialPosition, TargetType.STATIC);
  });

  describe('constructor', () => {
    it('should create static target with initial position', () => {
      expect(target.position.equals(initialPosition)).toBe(true);
      expect(target.type).toBe(TargetType.STATIC);
      expect(target.state).toBe(TargetState.ACTIVE);
      expect(target.isActive).toBe(true);
      expect(target.isDestroyed).toBe(false);
    });

    it('should create moving target with velocity', () => {
      const velocity = new Vector3(10, 5, 0);
      const movingTarget = new Target(initialPosition, TargetType.MOVING_SLOW, {
        velocity: velocity,
      });

      expect(movingTarget.velocity.equals(velocity)).toBe(true);
      expect(movingTarget.type).toBe(TargetType.MOVING_SLOW);
    });

    it('should have default hit radius', () => {
      expect(target.hitRadius).toBe(5); // Default hit radius
    });

    it('should allow custom hit radius', () => {
      const customTarget = new Target(initialPosition, TargetType.STATIC, {
        hitRadius: 10,
      });
      expect(customTarget.hitRadius).toBe(10);
    });
  });

  describe('static targets', () => {
    it('should remain stationary when updated', () => {
      const originalPosition = target.position.copy();

      target.update(1.0); // 1 second update

      expect(target.position.equals(originalPosition)).toBe(true);
      expect(target.velocity.magnitude()).toBe(0);
    });

    it('should track time alive', () => {
      target.update(0.5);
      target.update(1.0);

      expect(target.timeAlive).toBeCloseTo(1.5);
    });
  });

  describe('moving targets', () => {
    it('should move with constant velocity', () => {
      const velocity = new Vector3(10, 0, 0);
      const movingTarget = new Target(initialPosition, TargetType.MOVING_SLOW, {
        velocity: velocity,
      });

      movingTarget.update(2.0); // 2 seconds

      const expectedPosition = initialPosition.add(velocity.multiply(2.0));
      expect(movingTarget.position.equals(expectedPosition, 0.001)).toBe(true);
    });

    it('should handle different movement patterns', () => {
      const circularTarget = new Target(
        initialPosition,
        TargetType.MOVING_FAST,
        {
          velocity: new Vector3(20, 0, 0),
          movementPattern: MovementPattern.CIRCULAR,
          patternRadius: 100,
        }
      );

      // Update for a quarter circle (assuming appropriate angular velocity)
      circularTarget.update(Math.PI / 2); // This is simplified for testing

      // Position should have changed in a circular pattern
      expect(circularTarget.position.equals(initialPosition)).toBe(false);
    });

    it('should support zigzag movement pattern', () => {
      const zigzagTarget = new Target(initialPosition, TargetType.MOVING_SLOW, {
        velocity: new Vector3(10, 10, 0),
        movementPattern: MovementPattern.ZIGZAG,
        patternAmplitude: 50,
        patternFrequency: 1,
      });

      const positions: Vector3[] = [];
      for (let i = 0; i < 10; i++) {
        zigzagTarget.update(0.1);
        positions.push(zigzagTarget.position.copy());
      }

      // Should show zigzag pattern in Y direction
      const yPositions = positions.map(p => p.y);
      const maxY = Math.max(...yPositions);
      const minY = Math.min(...yPositions);

      expect(maxY - minY).toBeGreaterThan(10); // Should vary significantly
    });
  });

  describe('hit detection and destruction', () => {
    it('should provide collision sphere for hit detection', () => {
      const sphere = target.getCollisionSphere();

      expect(sphere.center.equals(target.position)).toBe(true);
      expect(sphere.radius).toBe(target.hitRadius);
    });

    it('should detect point collision', () => {
      const hitPoint = target.position.add(new Vector3(2, 0, 0)); // Within radius
      const missPoint = target.position.add(new Vector3(10, 0, 0)); // Outside radius

      expect(target.isPointInside(hitPoint)).toBe(true);
      expect(target.isPointInside(missPoint)).toBe(false);
    });

    it('should be destroyable when hit', () => {
      target.destroy();

      expect(target.state).toBe(TargetState.DESTROYED);
      expect(target.isDestroyed).toBe(true);
      expect(target.isActive).toBe(false);
    });

    it('should track destruction time', () => {
      target.update(2.0);
      target.destroy();

      expect(target.destructionTime).toBeCloseTo(2.0);
    });
  });

  describe('target scoring and value', () => {
    it('should have different point values by type', () => {
      const staticTarget = new Target(initialPosition, TargetType.STATIC);
      const slowTarget = new Target(initialPosition, TargetType.MOVING_SLOW);
      const fastTarget = new Target(initialPosition, TargetType.MOVING_FAST);

      expect(staticTarget.pointValue).toBe(100);
      expect(slowTarget.pointValue).toBeGreaterThan(staticTarget.pointValue);
      expect(fastTarget.pointValue).toBeGreaterThan(slowTarget.pointValue);
    });

    it('should support custom point values', () => {
      const customTarget = new Target(initialPosition, TargetType.STATIC, {
        pointValue: 500,
      });

      expect(customTarget.pointValue).toBe(500);
    });
  });

  describe('distance and relative motion', () => {
    it('should calculate distance from point', () => {
      const point = new Vector3(1010, 500, 10); // 10 units away

      expect(target.distanceFrom(point)).toBeCloseTo(10);
    });

    it('should calculate distance from artillery position', () => {
      const artilleryPos = new Vector3(0, 0, 0);

      const distance = target.distanceFromArtillery(artilleryPos);
      expect(distance).toBeCloseTo(initialPosition.magnitude());
    });

    it('should provide velocity for lead calculation', () => {
      const velocity = new Vector3(15, 10, 0);
      const movingTarget = new Target(initialPosition, TargetType.MOVING_FAST, {
        velocity: velocity,
      });

      expect(movingTarget.velocity.equals(velocity)).toBe(true);
      expect(movingTarget.speed).toBeCloseTo(velocity.magnitude());
    });
  });

  describe('target behavior and AI', () => {
    it('should support evasive behavior when under threat', () => {
      const evasiveTarget = new Target(
        initialPosition,
        TargetType.MOVING_FAST,
        {
          velocity: new Vector3(20, 0, 0),
          evasiveBehavior: true,
        }
      );

      // Simulate threat detection (incoming projectile)
      const threatPosition = initialPosition.add(new Vector3(-100, 0, 0));
      const threatVelocity = new Vector3(50, 0, 0);

      evasiveTarget.detectThreat(threatPosition, threatVelocity);

      expect(evasiveTarget.isEvading).toBe(true);
    });

    it('should return to normal behavior after threat passes', () => {
      const evasiveTarget = new Target(
        initialPosition,
        TargetType.MOVING_FAST,
        {
          velocity: new Vector3(20, 0, 0),
          evasiveBehavior: true,
        }
      );

      evasiveTarget.detectThreat(
        new Vector3(-100, 0, 0),
        new Vector3(50, 0, 0)
      );
      expect(evasiveTarget.isEvading).toBe(true);

      // Update for long enough that threat should pass
      for (let i = 0; i < 100; i++) {
        evasiveTarget.update(0.1);
      }

      expect(evasiveTarget.isEvading).toBe(false);
    });
  });

  describe('serialization and state', () => {
    it('should provide state snapshot', () => {
      const movingTarget = new Target(initialPosition, TargetType.MOVING_SLOW, {
        velocity: new Vector3(5, 3, 0),
      });

      movingTarget.update(2.0);
      const snapshot = movingTarget.getStateSnapshot();

      expect(snapshot.position.equals(movingTarget.position)).toBe(true);
      expect(snapshot.velocity.equals(movingTarget.velocity)).toBe(true);
      expect(snapshot.type).toBe(TargetType.MOVING_SLOW);
      expect(snapshot.state).toBe(TargetState.ACTIVE);
      expect(snapshot.timeAlive).toBeCloseTo(2.0);
    });

    it('should support state restoration for replay/debugging', () => {
      const originalPos = initialPosition.copy();

      target.update(5.0);
      target.destroy();

      // Reset to original state (simplified)
      target.reset(originalPos);

      expect(target.position.equals(originalPos)).toBe(true);
      expect(target.state).toBe(TargetState.ACTIVE);
      expect(target.timeAlive).toBe(0);
      expect(target.isActive).toBe(true);
    });
  });
});
