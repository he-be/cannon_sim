import { describe, test, expect, beforeEach } from 'vitest';
import { EntityManager, ProjectileState } from './EntityManager';
import { Target, TargetType } from './entities/Target';
import { Vector3 } from '../math/Vector3';

describe('EntityManager', () => {
  let entityManager: EntityManager;

  beforeEach(() => {
    entityManager = new EntityManager();
  });

  describe('initialization', () => {
    test('should start with empty targets and projectiles', () => {
      expect(entityManager.getTargets()).toEqual([]);
      expect(entityManager.getProjectiles()).toEqual([]);
    });

    test('should initialize targets', () => {
      const targets = [
        new Target(new Vector3(1000, 0, 100), TargetType.STATIC, undefined, 0),
      ];
      entityManager.initializeTargets(targets);
      expect(entityManager.getTargets()).toEqual(targets);
    });
  });

  describe('projectile management', () => {
    test('should add projectiles', () => {
      const projectile: ProjectileState = {
        id: 'p1',
        position: new Vector3(0, 0, 0),
        velocity: new Vector3(100, 0, 100),
        isActive: true,
        spawnTime: 0,
      };

      entityManager.addProjectile(projectile);
      expect(entityManager.getProjectiles()).toHaveLength(1);
      expect(entityManager.getProjectiles()[0]).toBe(projectile);
    });

    test('should clear inactive projectiles', () => {
      const active: ProjectileState = {
        id: 'p1',
        position: new Vector3(0, 0, 100),
        velocity: new Vector3(100, 0, 100),
        isActive: true,
        spawnTime: 0,
      };

      const inactive: ProjectileState = {
        id: 'p2',
        position: new Vector3(0, 0, 0),
        velocity: new Vector3(0, 0, 0),
        isActive: false,
        spawnTime: 0,
      };

      entityManager.addProjectile(active);
      entityManager.addProjectile(inactive);

      entityManager.clearInactiveProjectiles();
      expect(entityManager.getProjectiles()).toHaveLength(1);
      expect(entityManager.getProjectiles()[0].id).toBe('p1');
    });
  });

  describe('target filtering', () => {
    beforeEach(() => {
      const targets = [
        new Target(new Vector3(1000, 0, 100), TargetType.STATIC, undefined, 0), // Spawns at t=0
        new Target(new Vector3(2000, 0, 100), TargetType.STATIC, undefined, 5), // Spawns at t=5
      ];
      entityManager.initializeTargets(targets);
    });

    test('should filter active targets by spawn time', () => {
      const activeAt2s = entityManager.getActiveTargets(2);
      expect(activeAt2s).toHaveLength(1);

      const activeAt6s = entityManager.getActiveTargets(6);
      expect(activeAt6s).toHaveLength(2);
    });

    test('should count active targets', () => {
      expect(entityManager.getActiveTargetCount(2)).toBe(1);
      expect(entityManager.getActiveTargetCount(6)).toBe(2);
    });

    test('should check if all targets destroyed', () => {
      expect(entityManager.areAllTargetsDestroyed()).toBe(false);

      // Destroy all targets
      entityManager.getTargets().forEach(t => {
        t.hit();
        // Simulate falling and landing
        t.update(10); // Enough time to fall
      });

      expect(entityManager.areAllTargetsDestroyed()).toBe(true);
    });
  });

  describe('game over condition', () => {
    test('should return true if active target is within threshold', () => {
      const artilleryPos = new Vector3(0, 0, 0);
      const target = new Target(
        new Vector3(10, 0, 0), // 10m away
        TargetType.STATIC,
        undefined,
        0
      );
      entityManager.initializeTargets([target]);

      const isGameOver = entityManager.checkGameOverCondition(
        artilleryPos,
        50, // 50m threshold
        10 // current time
      );
      expect(isGameOver).toBe(true);
    });

    test('should return false if target is outside threshold', () => {
      const artilleryPos = new Vector3(0, 0, 0);
      const target = new Target(
        new Vector3(100, 0, 0), // 100m away
        TargetType.STATIC,
        undefined,
        0
      );
      entityManager.initializeTargets([target]);

      const isGameOver = entityManager.checkGameOverCondition(
        artilleryPos,
        50, // 50m threshold
        10
      );
      expect(isGameOver).toBe(false);
    });

    test('should return false if target is destroyed or inactive', () => {
      const artilleryPos = new Vector3(0, 0, 0);
      const target = new Target(
        new Vector3(10, 0, 0),
        TargetType.STATIC,
        undefined,
        0
      );
      target.hit(); // Destroyed

      entityManager.initializeTargets([target]);

      const isGameOver = entityManager.checkGameOverCondition(
        artilleryPos,
        50,
        10
      );
      expect(isGameOver).toBe(false);
    });

    test('should return false if target has not spawned yet', () => {
      const artilleryPos = new Vector3(0, 0, 0);
      const target = new Target(
        new Vector3(10, 0, 0),
        TargetType.STATIC,
        undefined,
        20 // Spawns at t=20
      );
      entityManager.initializeTargets([target]);

      const isGameOver = entityManager.checkGameOverCondition(
        artilleryPos,
        50,
        10 // Current time t=10
      );
      expect(isGameOver).toBe(false);
    });
  });

  describe('collision detection', () => {
    test('should detect collision when projectile is near target', () => {
      const target = new Target(
        new Vector3(1000, 0, 100),
        TargetType.STATIC,
        undefined,
        0
      );
      entityManager.initializeTargets([target]);

      const projectile: ProjectileState = {
        id: 'p1',
        position: new Vector3(1020, 0, 100), // 20m away
        velocity: new Vector3(100, 0, 0),
        isActive: true,
        spawnTime: 0,
      };
      entityManager.addProjectile(projectile);

      const collisions = entityManager.checkCollisions(1, 50); // 50m radius
      expect(collisions).toHaveLength(1);
      expect(collisions[0].target).toBe(target);
      expect(collisions[0].projectile).toBe(projectile);
      expect(projectile.isActive).toBe(false);
      expect(target.isActive).toBe(false); // Hit marks as falling
    });

    test('should not detect collision when projectile is far from target', () => {
      const target = new Target(
        new Vector3(1000, 0, 100),
        TargetType.STATIC,
        undefined,
        0
      );
      entityManager.initializeTargets([target]);

      const projectile: ProjectileState = {
        id: 'p1',
        position: new Vector3(2000, 0, 100), // 1000m away
        velocity: new Vector3(100, 0, 0),
        isActive: true,
        spawnTime: 0,
      };
      entityManager.addProjectile(projectile);

      const collisions = entityManager.checkCollisions(1, 50);
      expect(collisions).toHaveLength(0);
      expect(projectile.isActive).toBe(true);
      expect(target.isActive).toBe(true);
    });

    test('should not check collision with inactive targets', () => {
      const target = new Target(
        new Vector3(1000, 0, 100),
        TargetType.STATIC,
        undefined,
        10 // Spawns at t=10
      );
      entityManager.initializeTargets([target]);

      const projectile: ProjectileState = {
        id: 'p1',
        position: new Vector3(1010, 0, 100), // Near target
        velocity: new Vector3(100, 0, 0),
        isActive: true,
        spawnTime: 0,
      };
      entityManager.addProjectile(projectile);

      // Check at t=5 (before target spawns)
      const collisions = entityManager.checkCollisions(5, 50);
      expect(collisions).toHaveLength(0);
    });
  });

  describe('reset', () => {
    test('should clear all entities', () => {
      const target = new Target(
        new Vector3(1000, 0, 100),
        TargetType.STATIC,
        undefined,
        0
      );
      entityManager.initializeTargets([target]);

      const projectile: ProjectileState = {
        id: 'p1',
        position: new Vector3(0, 0, 0),
        velocity: new Vector3(100, 0, 100),
        isActive: true,
        spawnTime: 0,
      };
      entityManager.addProjectile(projectile);

      entityManager.reset();
      expect(entityManager.getTargets()).toEqual([]);
      expect(entityManager.getProjectiles()).toEqual([]);
    });
  });
});
