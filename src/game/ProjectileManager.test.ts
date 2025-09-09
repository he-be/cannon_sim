import { describe, it, expect, beforeEach } from 'vitest';
import { ProjectileManager } from './ProjectileManager';
import { Projectile, ProjectileState } from '../physics/Projectile';
import { Target, TargetType } from './entities/Target';
import { Vector3 } from '../math/Vector3';

describe('ProjectileManager (spec-compliant)', () => {
  let manager: ProjectileManager;

  beforeEach(() => {
    manager = new ProjectileManager();
  });

  describe('projectile lifecycle management', () => {
    it('should add projectile to active list', () => {
      const projectile = new Projectile(
        new Vector3(0, 0, 0),
        new Vector3(100, 200, 50)
      );

      manager.addProjectile(projectile);
      const activeProjectiles = manager.getActiveProjectiles();

      expect(activeProjectiles).toHaveLength(1);
      expect(activeProjectiles[0]).toBe(projectile);
    });

    it('should remove inactive projectiles from active list', () => {
      const projectile = new Projectile(
        new Vector3(0, 0, 0),
        new Vector3(100, 200, 50)
      );
      manager.addProjectile(projectile);

      // Simulate ground hit
      projectile.updateState(
        new Vector3(100, 200, 0),
        new Vector3(90, 180, -10)
      );
      projectile.checkBoundaryConditions();

      manager.update();

      expect(manager.getActiveProjectiles()).toHaveLength(0);
    });
  });

  describe('collision detection (GS-08)', () => {
    it('should detect projectile-target collisions', () => {
      const projectile = new Projectile(
        new Vector3(0, 0, 10),
        new Vector3(100, 0, 0)
      );
      const target = new Target(new Vector3(100, 0, 10), TargetType.STATIC);

      manager.addProjectile(projectile);
      projectile.updateState(new Vector3(95, 0, 10), new Vector3(100, 0, 0));

      const hits = manager.checkCollisions([target]);

      expect(hits).toHaveLength(1);
      expect(hits[0].projectile).toBe(projectile);
      expect(hits[0].target).toBe(target);
    });

    it('should not detect collisions with destroyed targets', () => {
      const projectile = new Projectile(
        new Vector3(0, 0, 10),
        new Vector3(100, 0, 0)
      );
      const target = new Target(new Vector3(100, 0, 10), TargetType.STATIC);
      target.destroy();

      manager.addProjectile(projectile);
      projectile.updateState(new Vector3(95, 0, 10), new Vector3(100, 0, 0));

      const hits = manager.checkCollisions([target]);

      expect(hits).toHaveLength(0);
    });

    it('should mark projectile as target hit on collision', () => {
      const projectile = new Projectile(
        new Vector3(0, 0, 10),
        new Vector3(100, 0, 0)
      );
      const target = new Target(new Vector3(100, 0, 10), TargetType.STATIC);

      manager.addProjectile(projectile);
      projectile.updateState(new Vector3(95, 0, 10), new Vector3(100, 0, 0));

      manager.checkCollisions([target]);

      expect(projectile.state).toBe(ProjectileState.TARGET_HIT);
    });
  });

  describe('trajectory tracking (UI-13-2, UI-16-2)', () => {
    it('should provide all projectile trajectories', () => {
      const projectile1 = new Projectile(
        new Vector3(0, 0, 10),
        new Vector3(100, 0, 0)
      );
      const projectile2 = new Projectile(
        new Vector3(0, 0, 10),
        new Vector3(150, 0, 0)
      );

      manager.addProjectile(projectile1);
      manager.addProjectile(projectile2);

      projectile1.updateState(new Vector3(10, 0, 10), new Vector3(100, 0, 0));
      projectile2.updateState(new Vector3(15, 0, 10), new Vector3(150, 0, 0));

      const trajectories = manager.getAllTrajectories();

      expect(trajectories).toHaveLength(2);
      expect(trajectories[0]).toHaveLength(2); // Initial + 1 update
      expect(trajectories[1]).toHaveLength(2); // Initial + 1 update
    });
  });

  describe('cleanup and performance', () => {
    it('should clean up inactive projectiles', () => {
      const projectile1 = new Projectile(
        new Vector3(0, 0, 10),
        new Vector3(100, 0, 0)
      );
      const projectile2 = new Projectile(
        new Vector3(0, 0, 10),
        new Vector3(100, 0, 0)
      );

      manager.addProjectile(projectile1);
      manager.addProjectile(projectile2);

      // Make one projectile inactive
      projectile1.markAsTargetHit();

      manager.update();

      expect(manager.getActiveProjectiles()).toHaveLength(1);
      expect(manager.getActiveProjectiles()[0]).toBe(projectile2);
    });

    it('should provide projectile count for display', () => {
      const projectile1 = new Projectile(
        new Vector3(0, 0, 10),
        new Vector3(100, 0, 0)
      );
      const projectile2 = new Projectile(
        new Vector3(0, 0, 10),
        new Vector3(100, 0, 0)
      );

      manager.addProjectile(projectile1);
      manager.addProjectile(projectile2);

      expect(manager.getActiveProjectileCount()).toBe(2);
    });
  });
});
