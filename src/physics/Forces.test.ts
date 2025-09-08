import { describe, it, expect } from 'vitest';
import { Forces } from './Forces';
import { Vector3 } from '../math/Vector3';

describe('Forces', () => {
  describe('gravity', () => {
    it('computes gravity force F = m g downward (negative Y)', () => {
      const mass = 10; // kg
      const g = 9.81; // m/s^2
      const Fg = Forces.gravity(mass, g);
      expect(Fg.x).toBe(0);
      expect(Fg.y).toBeCloseTo(-mass * g);
      expect(Fg.z).toBe(0);
    });

    it('supports custom direction unit vector', () => {
      const mass = 2;
      const g = 9.81;
      const down = new Vector3(0, 0, -1); // negative Z
      const Fg = Forces.gravity(mass, g, down);
      expect(Fg.x).toBe(0);
      expect(Fg.y).toBe(0);
      expect(Fg.z).toBeCloseTo(-mass * g);
    });
  });

  describe('drag', () => {
    it('computes drag F = -0.5 ρ C_d A v |v| opposite to velocity', () => {
      const v = new Vector3(10, 0, 0); // m/s
      const rho = 1.225; // kg/m^3 (air)
      const Cd = 0.47; // sphere-like
      const A = 0.1; // m^2
      const Fd = Forces.drag(v, rho, Cd, A);

      const expectedMagnitude = 0.5 * rho * Cd * A * 10 * 10;
      expect(Fd.x).toBeCloseTo(-expectedMagnitude);
      expect(Fd.y).toBeCloseTo(0, 10);
      expect(Fd.z).toBeCloseTo(0, 10);
    });

    it('returns zero vector for zero velocity', () => {
      const Fd = Forces.drag(new Vector3(0, 0, 0), 1.225, 0.5, 0.1);
      expect(Fd.x).toBe(0);
      expect(Fd.y).toBe(0);
      expect(Fd.z).toBe(0);
    });
  });

  describe('coriolis', () => {
    it('computes F = -2 m (Ω × v)', () => {
      const mass = 2;
      const omega = new Vector3(0, 0, 1);
      const v = new Vector3(1, 0, 0);
      const Fc = Forces.coriolis(mass, omega, v);
      // Ω × v = (0,1,0) => F = -2m*(0,1,0) = (0,-4,0)
      expect(Fc.x).toBeCloseTo(0);
      expect(Fc.y).toBeCloseTo(-4);
      expect(Fc.z).toBeCloseTo(0);
    });
  });

  describe('sum', () => {
    it('sums multiple force vectors', () => {
      const F1 = new Vector3(1, -2, 3);
      const F2 = new Vector3(-4, 5, -6);
      const F3 = new Vector3(0.5, 0.5, 0.5);
      const total = Forces.sum(F1, F2, F3);
      expect(total.x).toBeCloseTo(-2.5);
      expect(total.y).toBeCloseTo(3.5);
      expect(total.z).toBeCloseTo(-2.5);
    });
  });
});
