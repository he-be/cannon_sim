import { describe, it, expect } from 'vitest';
import { Target, TargetType, TargetState } from './Target';
import { Vector3 } from '../../math/Vector3';

describe('Target Falling Simulation', () => {
  describe('Static targets (balloon)', () => {
    it('should transition to falling state when hit', () => {
      const balloon = new Target(
        new Vector3(1000, 500, 1000),
        TargetType.BALLOON
      );

      expect(balloon.state).toBe(TargetState.ACTIVE);
      expect(balloon.isActive).toBe(true);
      expect(balloon.isFalling).toBe(false);

      balloon.hit();

      expect(balloon.state).toBe(TargetState.FALLING);
      expect(balloon.isActive).toBe(false);
      expect(balloon.isFalling).toBe(true);
      expect(balloon.isDestroyed).toBe(false);
    });

    it('should fall from stationary position with gravity', () => {
      const initialHeight = 1000;
      const balloon = new Target(
        new Vector3(1000, 500, initialHeight),
        TargetType.BALLOON
      );

      balloon.hit();

      // Simulate 1 second of fall
      balloon.update(1.0);

      // After 1 second with Euler integration: position will have some error
      // The exact formula would be z = z0 - 0.5*g*t^2 = 1000 - 4.905
      // But Euler method gives slightly different result
      // Just verify it fell significantly
      expect(balloon.position.z).toBeLessThan(initialHeight);
      expect(balloon.position.z).toBeGreaterThan(initialHeight - 10); // Should fall ~5m in 1s

      // Horizontal position should not change
      expect(balloon.position.x).toBeCloseTo(1000);
      expect(balloon.position.y).toBeCloseTo(500);
    });

    it('should destroy when reaching ground level', () => {
      const balloon = new Target(
        new Vector3(1000, 500, 50), // Start close to ground
        TargetType.BALLOON
      );

      balloon.hit();
      expect(balloon.state).toBe(TargetState.FALLING);

      // Fall for enough time to reach ground
      for (let i = 0; i < 100; i++) {
        balloon.update(0.1);
        if (balloon.isDestroyed) break;
      }

      expect(balloon.state).toBe(TargetState.DESTROYED);
      expect(balloon.position.z).toBeLessThanOrEqual(0);
    });
  });

  describe('Moving targets (frigate, cruiser)', () => {
    it('should maintain horizontal velocity while falling', () => {
      const velocity = new Vector3(50, 30, 0); // Moving horizontally
      const frigate = new Target(
        new Vector3(1000, 500, 800),
        TargetType.FRIGATE,
        velocity
      );

      const initialX = frigate.position.x;
      const initialY = frigate.position.y;

      frigate.hit();

      // Simulate 1 second of fall
      frigate.update(1.0);

      // Horizontal velocity should be maintained
      const expectedX = initialX + velocity.x * 1.0;
      const expectedY = initialY + velocity.y * 1.0;

      expect(frigate.position.x).toBeCloseTo(expectedX, 0);
      expect(frigate.position.y).toBeCloseTo(expectedY, 0);

      // Vertical position should fall due to gravity
      expect(frigate.position.z).toBeLessThan(800);
    });

    it('should follow parabolic trajectory when falling', () => {
      const velocity = new Vector3(60, 0, 0);
      const cruiser = new Target(
        new Vector3(0, 0, 1000),
        TargetType.CRUISER,
        velocity
      );

      cruiser.hit();

      const positions: Vector3[] = [];
      for (let i = 0; i < 50; i++) {
        positions.push(cruiser.position.copy());
        cruiser.update(0.1);
        if (cruiser.isDestroyed) break;
      }

      // Check that trajectory is parabolic
      // x should increase linearly
      // z should decrease with acceleration (parabola)
      expect(positions.length).toBeGreaterThan(10);

      // First half should have slower z-decrease than second half
      const midPoint = Math.floor(positions.length / 2);
      const firstHalfZDrop = positions[0].z - positions[midPoint].z;
      const secondHalfZDrop =
        positions[midPoint].z - positions[positions.length - 1].z;

      expect(secondHalfZDrop).toBeGreaterThan(firstHalfZDrop);
    });

    it('should reach ground and transition to destroyed state', () => {
      const velocity = new Vector3(70, 0, 0);
      const frigate = new Target(
        new Vector3(0, 0, 100), // Start low
        TargetType.FRIGATE,
        velocity
      );

      frigate.hit();

      // Simulate until ground impact
      let iterations = 0;
      while (!frigate.isDestroyed && iterations < 200) {
        frigate.update(0.05);
        iterations++;
      }

      expect(frigate.state).toBe(TargetState.DESTROYED);
      expect(frigate.position.z).toBeLessThanOrEqual(0);
    });
  });

  describe('hasReachedGround helper', () => {
    it('should return false for active targets', () => {
      const target = new Target(
        new Vector3(1000, 500, 1000),
        TargetType.BALLOON
      );

      expect(target.hasReachedGround()).toBe(false);
    });

    it('should return false for falling targets above ground', () => {
      const target = new Target(
        new Vector3(1000, 500, 1000),
        TargetType.BALLOON
      );

      target.hit();
      target.update(0.1);

      expect(target.isFalling).toBe(true);
      expect(target.hasReachedGround()).toBe(false);
    });

    it('should return true when falling target is at ground level (edge case)', () => {
      // Create target very close to ground
      const target = new Target(
        new Vector3(1000, 500, 0.5), // 0.5m above ground
        TargetType.BALLOON
      );

      target.hit();
      expect(target.isFalling).toBe(true);

      // Simulate until it hits ground (should be quick from 0.5m)
      for (let i = 0; i < 10; i++) {
        target.update(0.1);
        if (target.isDestroyed) break;
      }

      // After falling, target should be destroyed (auto-transition in update())
      expect(target.state).toBe(TargetState.DESTROYED);
      expect(target.position.z).toBeLessThanOrEqual(0);
    });
  });

  describe('backward compatibility', () => {
    it('should still support immediate destroy() method', () => {
      const target = new Target(
        new Vector3(1000, 500, 1000),
        TargetType.BALLOON
      );

      target.destroy();

      expect(target.state).toBe(TargetState.DESTROYED);
      expect(target.isDestroyed).toBe(true);

      // Should not update when destroyed
      const pos = target.position.copy();
      target.update(1.0);
      expect(target.position.equals(pos)).toBe(true);
    });
  });
});
