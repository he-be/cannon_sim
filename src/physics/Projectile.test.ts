import { describe, it, expect, beforeEach } from 'vitest';
import { Projectile, ProjectileState } from './Projectile';
import { Vector3 } from '../math/Vector3';

describe('Projectile', () => {
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

    it('should initialize with empty trajectory history', () => {
      expect(projectile.trajectory).toHaveLength(1); // Should contain initial position
      expect(projectile.trajectory[0].equals(initialPosition)).toBe(true);
    });

    it('should have default properties', () => {
      expect(projectile.flightTime).toBe(0);
      expect(projectile.mass).toBe(10); // Default mass
      expect(projectile.dragCoefficient).toBe(0.47); // Default drag coefficient
      expect(projectile.radius).toBe(0.1); // Default radius
    });
  });

  describe('state management', () => {
    it('should update position and velocity', () => {
      const newPosition = new Vector3(10, 20, 95);
      const newVelocity = new Vector3(95, 180, 45);

      projectile.updateState(newPosition, newVelocity, 0.016);

      expect(projectile.position.equals(newPosition)).toBe(true);
      expect(projectile.velocity.equals(newVelocity)).toBe(true);
      expect(projectile.flightTime).toBeCloseTo(0.016);
    });

    it('should add positions to trajectory history', () => {
      const pos1 = new Vector3(10, 20, 95);
      const pos2 = new Vector3(20, 40, 85);
      const vel = new Vector3(95, 180, 45);

      projectile.updateState(pos1, vel, 0.016);
      projectile.updateState(pos2, vel, 0.032);

      expect(projectile.trajectory).toHaveLength(3);
      expect(projectile.trajectory[0].equals(initialPosition)).toBe(true);
      expect(projectile.trajectory[1].equals(pos1)).toBe(true);
      expect(projectile.trajectory[2].equals(pos2)).toBe(true);
    });

    it('should limit trajectory history to prevent memory issues', () => {
      const vel = new Vector3(95, 180, 45);

      // Add more points than the maximum
      for (let i = 0; i < 1200; i++) {
        const pos = new Vector3(i, i * 2, 100 - i * 0.1);
        projectile.updateState(pos, vel, i * 0.016);
      }

      // Should be limited to maximum trajectory length
      expect(projectile.trajectory.length).toBeLessThanOrEqual(1000);

      // Should keep the most recent positions
      const lastPos = projectile.trajectory[projectile.trajectory.length - 1];
      expect(lastPos.x).toBeCloseTo(1199);
    });
  });

  describe('boundary conditions', () => {
    it('should detect ground impact', () => {
      const groundPosition = new Vector3(100, 200, 0);
      const velocity = new Vector3(50, 100, -10);

      projectile.updateState(groundPosition, velocity, 1.0);
      projectile.checkBoundaryConditions();

      expect(projectile.state).toBe(ProjectileState.GROUND_HIT);
      expect(projectile.isActive).toBe(false);
    });

    it('should detect underground projectile', () => {
      const undergroundPosition = new Vector3(100, 200, -5);
      const velocity = new Vector3(50, 100, -10);

      projectile.updateState(undergroundPosition, velocity, 1.0);
      projectile.checkBoundaryConditions();

      expect(projectile.state).toBe(ProjectileState.GROUND_HIT);
      expect(projectile.isActive).toBe(false);
    });

    it('should detect out of bounds projectile', () => {
      const farPosition = new Vector3(50000, 200, 100);
      const velocity = new Vector3(500, 100, 10);

      projectile.updateState(farPosition, velocity, 1.0);
      projectile.checkBoundaryConditions();

      expect(projectile.state).toBe(ProjectileState.OUT_OF_BOUNDS);
      expect(projectile.isActive).toBe(false);
    });

    it('should remain active within normal bounds', () => {
      const normalPosition = new Vector3(1000, 500, 200);
      const velocity = new Vector3(100, 50, 5);

      projectile.updateState(normalPosition, velocity, 1.0);
      projectile.checkBoundaryConditions();

      expect(projectile.state).toBe(ProjectileState.ACTIVE);
      expect(projectile.isActive).toBe(true);
    });
  });

  describe('physical properties', () => {
    it('should allow custom mass and drag properties', () => {
      const customProjectile = new Projectile(
        initialPosition,
        initialVelocity,
        {
          mass: 15,
          dragCoefficient: 0.3,
          radius: 0.05,
        }
      );

      expect(customProjectile.mass).toBe(15);
      expect(customProjectile.dragCoefficient).toBe(0.3);
      expect(customProjectile.radius).toBe(0.05);
    });

    it('should calculate cross-sectional area from radius', () => {
      expect(projectile.crossSectionalArea).toBeCloseTo(Math.PI * 0.1 * 0.1);

      const bigProjectile = new Projectile(initialPosition, initialVelocity, {
        radius: 0.2,
      });
      expect(bigProjectile.crossSectionalArea).toBeCloseTo(Math.PI * 0.2 * 0.2);
    });
  });

  describe('trajectory analysis', () => {
    it('should calculate current speed', () => {
      const velocity = new Vector3(100, 0, 0);
      projectile.updateState(initialPosition, velocity, 0.1);

      expect(projectile.currentSpeed).toBeCloseTo(100);
    });

    it('should calculate maximum altitude reached', () => {
      // Simulate ascending trajectory
      projectile.updateState(new Vector3(0, 0, 150), initialVelocity, 0.1);
      projectile.updateState(new Vector3(0, 0, 180), initialVelocity, 0.2);
      projectile.updateState(new Vector3(0, 0, 175), initialVelocity, 0.3); // Descending

      expect(projectile.maxAltitudeReached).toBeCloseTo(180);
    });

    it('should track total distance traveled', () => {
      const pos1 = new Vector3(10, 0, 100);
      const pos2 = new Vector3(20, 0, 100);

      projectile.updateState(pos1, initialVelocity, 0.1);
      projectile.updateState(pos2, initialVelocity, 0.2);

      expect(projectile.totalDistanceTraveled).toBeCloseTo(20); // 10 + 10
    });
  });

  describe('collision detection support', () => {
    it('should provide bounding sphere for collision detection', () => {
      const sphere = projectile.getBoundingSphere();

      expect(sphere.center.equals(projectile.position)).toBe(true);
      expect(sphere.radius).toBe(projectile.radius);
    });

    it('should support manual target hit', () => {
      projectile.markAsTargetHit();

      expect(projectile.state).toBe(ProjectileState.TARGET_HIT);
      expect(projectile.isActive).toBe(false);
    });

    it('should provide predicted position for collision checking', () => {
      const currentPos = new Vector3(100, 200, 50);
      const currentVel = new Vector3(10, 20, 5);

      projectile.updateState(currentPos, currentVel, 1.0);

      const predicted = projectile.getPredictedPosition(0.1);
      const expected = currentPos.add(currentVel.multiply(0.1));

      expect(predicted.equals(expected, 0.001)).toBe(true);
    });
  });

  describe('serialization support', () => {
    it('should provide state snapshot for debugging', () => {
      projectile.updateState(
        new Vector3(100, 200, 50),
        new Vector3(10, 20, 5),
        2.5
      );

      const snapshot = projectile.getStateSnapshot();

      expect(snapshot.position.equals(new Vector3(100, 200, 50))).toBe(true);
      expect(snapshot.velocity.equals(new Vector3(10, 20, 5))).toBe(true);
      expect(snapshot.flightTime).toBe(2.5);
      expect(snapshot.state).toBe(ProjectileState.ACTIVE);
      expect(snapshot.trajectoryLength).toBe(2); // Initial + updated
    });
  });
});
