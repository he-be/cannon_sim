import { describe, it, expect, beforeEach } from 'vitest';
import { CollisionDetector, CollisionType } from './CollisionDetector';
import { Projectile, ProjectileState } from './Projectile';
import { Target, TargetType, TargetState } from '../game/entities/Target';
import { Vector3 } from '../math/Vector3';

describe('CollisionDetector (T024 - Collision Detection System)', () => {
  let detector: CollisionDetector;
  let projectile: Projectile;
  let target: Target;

  beforeEach(() => {
    detector = new CollisionDetector();

    // Create a test projectile at origin
    projectile = new Projectile(
      new Vector3(0, 0, 0),
      new Vector3(100, 0, 0) // Moving in positive X direction
    );

    // Create a test target
    target = new Target(
      new Vector3(1000, 0, 0),
      TargetType.STATIC,
      new Vector3(0, 0, 0)
    );
  });

  describe('initialization', () => {
    it('should initialize with default collision parameters', () => {
      const params = detector.getCollisionParameters();

      expect(params.projectileRadius).toBeGreaterThan(0);
      expect(params.targetRadius).toBeGreaterThan(0);
      expect(params.minCollisionDistance).toBeGreaterThan(0);
      expect(params.continuousDetectionEnabled).toBe(true);
    });

    it('should accept custom collision parameters', () => {
      const customDetector = new CollisionDetector({
        projectileRadius: 2.5,
        targetRadius: 15.0,
        minCollisionDistance: 20.0,
        continuousDetectionEnabled: false,
      });

      const params = customDetector.getCollisionParameters();

      expect(params.projectileRadius).toBe(2.5);
      expect(params.targetRadius).toBe(15.0);
      expect(params.minCollisionDistance).toBe(20.0);
      expect(params.continuousDetectionEnabled).toBe(false);
    });
  });

  describe('sphere collision detection', () => {
    it('should detect collision when projectile overlaps with target', () => {
      // Place projectile very close to target
      projectile.updateState(new Vector3(995, 0, 0), new Vector3(100, 0, 0));

      const result = detector.checkCollision(projectile, target);

      expect(result.hasCollision).toBe(true);
      expect(result.collisionType).toBe(CollisionType.DIRECT_HIT);
      expect(result.distance).toBeLessThan(
        detector.getCollisionParameters().minCollisionDistance
      );
      expect(result.collisionPoint).toEqual(expect.any(Vector3));
      expect(result.collisionTime).toBeGreaterThanOrEqual(0);
    });

    it('should not detect collision when projectile is far from target', () => {
      // Keep projectile at origin, target at distance
      const result = detector.checkCollision(projectile, target);

      expect(result.hasCollision).toBe(false);
      expect(result.collisionType).toBe(CollisionType.NONE);
      expect(result.distance).toBeGreaterThan(
        detector.getCollisionParameters().minCollisionDistance
      );
      expect(result.collisionPoint).toBeNull();
      expect(result.collisionTime).toBe(-1);
    });

    it('should calculate correct distance between projectile and target', () => {
      // Projectile at (0,0,0), target at (1000,0,0)
      const result = detector.checkCollision(projectile, target);

      expect(result.distance).toBeCloseTo(1000, 1);
    });

    it('should handle collision detection with moving targets', () => {
      // Create moving target
      const movingTarget = new Target(
        new Vector3(100, 0, 0),
        TargetType.MOVING_FAST,
        new Vector3(-50, 0, 0) // Moving towards projectile
      );

      // Place projectile close to target's path
      projectile.updateState(new Vector3(90, 0, 0), new Vector3(50, 0, 0));

      const result = detector.checkCollision(projectile, movingTarget);

      expect(result.hasCollision).toBe(true);
      expect(result.collisionType).toBe(CollisionType.DIRECT_HIT);
    });
  });

  describe('continuous collision detection', () => {
    it('should detect collision along projectile trajectory', () => {
      const detectorWithContinuous = new CollisionDetector({
        continuousDetectionEnabled: true,
        projectileRadius: 1.0,
        targetRadius: 10.0,
        minCollisionDistance: 11.0,
      });

      // Projectile moving towards target, will cross collision boundary within timeframe
      projectile.updateState(new Vector3(985, 0, 0), new Vector3(50, 0, 0));

      const result = detectorWithContinuous.checkCollisionContinuous(
        projectile,
        target, // target at (1000, 0, 0)
        1.0 // deltaTime = 1.0 seconds
      );

      expect(result.hasCollision).toBe(true);
      expect(result.collisionType).toBe(CollisionType.TRAJECTORY_HIT);
      expect(result.collisionTime).toBeGreaterThan(0);
      expect(result.collisionTime).toBeLessThanOrEqual(1.0);
    });

    it('should calculate collision time accurately for fast-moving projectiles', () => {
      const detectorWithContinuous = new CollisionDetector({
        continuousDetectionEnabled: true,
        projectileRadius: 1.0,
        targetRadius: 5.0,
      });

      // Projectile 50 units away, moving at 100 units/second towards target
      projectile.updateState(new Vector3(950, 0, 0), new Vector3(100, 0, 0));

      const result = detectorWithContinuous.checkCollisionContinuous(
        projectile,
        target,
        1.0 // 1 second time step
      );

      expect(result.hasCollision).toBe(true);
      // Should collide at approximately t = (50 - collision_radius) / 100
      expect(result.collisionTime).toBeGreaterThan(0.4);
      expect(result.collisionTime).toBeLessThan(0.6);
    });

    it('should not detect collision when trajectory misses target', () => {
      const detectorWithContinuous = new CollisionDetector({
        continuousDetectionEnabled: true,
      });

      // Projectile moving parallel to target, will miss
      projectile.updateState(new Vector3(0, 100, 0), new Vector3(100, 0, 0));

      const result = detectorWithContinuous.checkCollisionContinuous(
        projectile,
        target,
        1.0
      );

      expect(result.hasCollision).toBe(false);
      expect(result.collisionType).toBe(CollisionType.NONE);
    });

    it('should handle high-speed projectiles without missing collisions', () => {
      const detectorWithContinuous = new CollisionDetector({
        continuousDetectionEnabled: true,
        projectileRadius: 1.0,
        targetRadius: 5.0,
        minCollisionDistance: 6.0,
      });

      // Very fast projectile that would tunnel through target without continuous detection
      projectile.updateState(new Vector3(980, 0, 0), new Vector3(1000, 0, 0)); // 1 km/s

      const result = detectorWithContinuous.checkCollisionContinuous(
        projectile,
        target, // target at (1000, 0, 0)
        0.1 // 100ms time step
      );

      expect(result.hasCollision).toBe(true);
      expect(result.collisionType).toBe(CollisionType.TRAJECTORY_HIT);
    });
  });

  describe('collision response', () => {
    it('should mark projectile as target hit when collision occurs', () => {
      // Place projectile very close to target
      projectile.updateState(new Vector3(995, 0, 0), new Vector3(100, 0, 0));

      const result = detector.checkCollision(projectile, target);
      expect(result.hasCollision).toBe(true);

      detector.processCollisionResponse(result, projectile, target);

      expect(projectile.state).toBe(ProjectileState.TARGET_HIT);
      expect(target.state).toBe(TargetState.DESTROYED);
    });

    it('should not modify states when no collision occurs', () => {
      const initialProjectileState = projectile.state;
      const initialTargetState = target.state;

      const result = detector.checkCollision(projectile, target);
      expect(result.hasCollision).toBe(false);

      detector.processCollisionResponse(result, projectile, target);

      expect(projectile.state).toBe(initialProjectileState);
      expect(target.state).toBe(initialTargetState);
    });

    it('should handle collision with already destroyed target', () => {
      target.destroy();
      projectile.updateState(new Vector3(995, 0, 0), new Vector3(100, 0, 0));

      const result = detector.checkCollision(projectile, target);

      // Should not detect collision with destroyed target
      expect(result.hasCollision).toBe(false);
    });

    it('should handle collision with inactive projectile', () => {
      projectile.updateState(new Vector3(995, 0, 0), new Vector3(100, 0, 0));
      projectile.markAsTargetHit(); // Mark as already hit

      const result = detector.checkCollision(projectile, target);

      // Should not detect collision with inactive projectile
      expect(result.hasCollision).toBe(false);
    });
  });

  describe('batch collision detection', () => {
    it('should detect collisions between multiple projectiles and targets', () => {
      const projectiles: Projectile[] = [
        new Projectile(new Vector3(995, 0, 0), new Vector3(100, 0, 0)),
        new Projectile(new Vector3(0, 0, 0), new Vector3(50, 0, 0)),
        new Projectile(new Vector3(2000, 1995, 0), new Vector3(0, 100, 0)),
      ];

      const targets: Target[] = [
        new Target(new Vector3(1000, 0, 0), TargetType.STATIC),
        new Target(new Vector3(2000, 2000, 0), TargetType.STATIC),
        new Target(new Vector3(5000, 5000, 0), TargetType.STATIC),
      ];

      const collisions = detector.checkMultipleCollisions(projectiles, targets);

      expect(collisions).toHaveLength(2); // Two collisions expected
      expect(collisions[0].hasCollision).toBe(true);
      expect(collisions[1].hasCollision).toBe(true);
    });

    it('should return empty array when no collisions occur', () => {
      const projectiles: Projectile[] = [
        new Projectile(new Vector3(0, 0, 0), new Vector3(100, 0, 0)),
      ];

      const targets: Target[] = [
        new Target(new Vector3(10000, 10000, 0), TargetType.STATIC),
      ];

      const collisions = detector.checkMultipleCollisions(projectiles, targets);

      expect(collisions).toHaveLength(0);
    });

    it('should process all collision responses correctly', () => {
      const projectiles: Projectile[] = [
        new Projectile(new Vector3(995, 0, 0), new Vector3(100, 0, 0)),
        new Projectile(new Vector3(1995, 2000, 0), new Vector3(100, 0, 0)),
      ];

      const targets: Target[] = [
        new Target(new Vector3(1000, 0, 0), TargetType.STATIC),
        new Target(new Vector3(2000, 2000, 0), TargetType.STATIC),
      ];

      const collisions = detector.checkMultipleCollisions(projectiles, targets);

      collisions.forEach(collision => {
        detector.processCollisionResponse(
          collision,
          collision.projectile!,
          collision.target!
        );
      });

      // Verify all projectiles hit targets
      projectiles.forEach(p => {
        expect(p.state).toBe(ProjectileState.TARGET_HIT);
      });

      // Verify all targets destroyed
      targets.forEach(t => {
        expect(t.state).toBe(TargetState.DESTROYED);
      });
    });
  });

  describe('performance optimization', () => {
    it('should handle large numbers of projectiles and targets efficiently', () => {
      const startTime = performance.now();

      // Create many projectiles and targets
      const projectiles: Projectile[] = [];
      const targets: Target[] = [];

      for (let i = 0; i < 100; i++) {
        projectiles.push(
          new Projectile(new Vector3(i * 10, 0, 0), new Vector3(100, 0, 0))
        );
        targets.push(
          new Target(new Vector3(i * 10 + 1000, i * 10, 0), TargetType.STATIC)
        );
      }

      const collisions = detector.checkMultipleCollisions(projectiles, targets);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (less than 100ms for 10,000 collision checks)
      expect(duration).toBeLessThan(100);
      expect(collisions.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('edge cases', () => {
    it('should handle projectile and target at same position', () => {
      projectile.updateState(new Vector3(1000, 0, 0), new Vector3(0, 0, 0));

      const result = detector.checkCollision(projectile, target);

      expect(result.hasCollision).toBe(true);
      expect(result.distance).toBeCloseTo(0, 1);
    });

    it('should handle zero radius collision parameters', () => {
      const zeroRadiusDetector = new CollisionDetector({
        projectileRadius: 0,
        targetRadius: 0,
        minCollisionDistance: 0,
      });

      projectile.updateState(new Vector3(1000, 0, 0), new Vector3(100, 0, 0));

      const result = zeroRadiusDetector.checkCollision(projectile, target);

      expect(result.hasCollision).toBe(true);
      expect(result.distance).toBeCloseTo(0, 1);
    });

    it('should handle negative time steps in continuous detection', () => {
      expect(() => {
        detector.checkCollisionContinuous(projectile, target, -0.1);
      }).not.toThrow();
    });

    it('should handle NaN and infinite positions gracefully', () => {
      const invalidProjectile = new Projectile(
        new Vector3(NaN, Infinity, 0),
        new Vector3(100, 0, 0)
      );

      expect(() => {
        detector.checkCollision(invalidProjectile, target);
      }).not.toThrow();
    });
  });

  describe('collision types', () => {
    it('should classify different types of collisions correctly', () => {
      // Direct hit (overlapping spheres)
      projectile.updateState(new Vector3(995, 0, 0), new Vector3(0, 0, 0));
      let result = detector.checkCollision(projectile, target);
      expect(result.collisionType).toBe(CollisionType.DIRECT_HIT);

      // Trajectory hit (continuous detection)
      const continuousDetector = new CollisionDetector({
        continuousDetectionEnabled: true,
      });
      projectile.updateState(new Vector3(900, 0, 0), new Vector3(200, 0, 0));
      result = continuousDetector.checkCollisionContinuous(
        projectile,
        target,
        1.0
      );
      expect(result.collisionType).toBe(CollisionType.TRAJECTORY_HIT);

      // No collision
      projectile.updateState(new Vector3(0, 0, 0), new Vector3(0, 100, 0));
      result = detector.checkCollision(projectile, target);
      expect(result.collisionType).toBe(CollisionType.NONE);
    });
  });
});
