import { describe, it, expect, beforeEach } from 'vitest';
import { Projectile, ProjectileState } from './Projectile';
import { Vector3 } from '../math/Vector3';

describe('Projectile (spec-compliant)', () => {
  let projectile: Projectile;
  const initialPosition = new Vector3(0, 0, 100);
  const initialVelocity = new Vector3(100, 200, 50);

  beforeEach(() => {
    projectile = new Projectile(initialPosition, initialVelocity);
  });

  describe('constructor', () => {
    it('should create projectile with initial position and velocity', () => {
      expect(projectile.position.equals(initialPosition)).toBe(true);
      expect(projectile.velocity.equals(initialVelocity)).toBe(true);
      expect(projectile.state).toBe(ProjectileState.ACTIVE);
      expect(projectile.isActive).toBe(true);
    });
  });

  describe('physics simulation (GS-01, GS-02)', () => {
    it('should update position based on physics integration', () => {
      const newPosition = new Vector3(10, 20, 95);
      const newVelocity = new Vector3(95, 190, 40);

      projectile.updateState(newPosition, newVelocity);

      expect(projectile.position.equals(newPosition)).toBe(true);
      expect(projectile.velocity.equals(newVelocity)).toBe(true);
    });

    it('should detect ground impact', () => {
      const groundPosition = new Vector3(100, 200, 0);
      const velocity = new Vector3(50, 100, -10);

      projectile.updateState(groundPosition, velocity);
      projectile.checkBoundaryConditions();

      expect(projectile.state).toBe(ProjectileState.GROUND_HIT);
      expect(projectile.isActive).toBe(false);
    });
  });

  describe('hit detection (GS-08)', () => {
    it('should provide position for collision detection', () => {
      const currentPos = projectile.position;
      expect(currentPos).toBeDefined();
      expect(currentPos instanceof Vector3).toBe(true);
    });

    it('should mark as target hit when requested', () => {
      projectile.markAsTargetHit();

      expect(projectile.state).toBe(ProjectileState.TARGET_HIT);
      expect(projectile.isActive).toBe(false);
    });
  });

  describe('trajectory display (UI-13-2, UI-16-2)', () => {
    it('should track flight path for visualization', () => {
      const pos1 = new Vector3(10, 20, 95);
      const pos2 = new Vector3(20, 40, 90);

      projectile.updateState(pos1, initialVelocity);
      projectile.updateState(pos2, initialVelocity);

      const trajectory = projectile.trajectory;
      expect(trajectory).toHaveLength(3); // initial + 2 updates
      expect(trajectory[0].equals(initialPosition)).toBe(true);
      expect(trajectory[1].equals(pos1)).toBe(true);
      expect(trajectory[2].equals(pos2)).toBe(true);
    });
  });
});
