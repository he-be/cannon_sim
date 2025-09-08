import { describe, it, expect } from 'vitest';
import { PhysicsEngine, State3D } from './PhysicsEngine';
import { Vector3 } from '../math/Vector3';
import { Forces } from './Forces';

function nearlyEqual(a: number, b: number, tol = 1e-6): void {
  expect(Math.abs(a - b) <= tol).toBe(true);
}

describe('PhysicsEngine (RK4)', () => {
  it('free fall matches analytical solution for small dt', () => {
    const mass = 1;
    const g = 9.81;
    const engine = new PhysicsEngine((_s, _t) => {
      const Fg = Forces.gravity(mass, g);
      return Fg.multiply(1 / mass);
    });

    // initial state: at rest at origin
    let state: State3D = {
      position: new Vector3(0, 0, 0),
      velocity: new Vector3(0, 0, 0),
    };

    const dt = 1 / 120; // small timestep
    const totalTime = 1; // 1 second
    const steps = Math.round(totalTime / dt);
    for (let i = 0; i < steps; i++) {
      const t = i * dt;
      state = engine.integrate(state, t, dt);
    }

    // Analytical: y = 0.5 * a * t^2 with a = -g
    const expectedY = -0.5 * g * totalTime * totalTime;
    nearlyEqual(state.position.x, 0);
    nearlyEqual(state.position.z, 0);
    expect(state.position.y).toBeCloseTo(expectedY, 3);
    expect(state.velocity.y).toBeCloseTo(-g * totalTime, 5);
  });

  it('zero acceleration keeps state unchanged', () => {
    const engine = new PhysicsEngine((_s, _t) => new Vector3(0, 0, 0));
    const initial: State3D = {
      position: new Vector3(1, 2, 3),
      velocity: new Vector3(4, 5, 6),
    };
    const result = engine.integrate(initial, 0, 1);
    // With zero acceleration, position integrates linearly by velocity, velocity stays same
    expect(result.velocity.equals(initial.velocity)).toBe(true);
    expect(result.position.equals(initial.position.add(initial.velocity))).toBe(
      true
    );
  });

  it('drag slows the object over time', () => {
    const mass = 2;
    const rho = 1.225;
    const Cd = 0.47;
    const A = 0.1;
    const engine = new PhysicsEngine((s, _t) => {
      const Fd = Forces.drag(s.velocity, rho, Cd, A);
      return Fd.multiply(1 / mass);
    });

    let state: State3D = {
      position: new Vector3(0, 0, 0),
      velocity: new Vector3(100, 0, 0),
    };

    const dt = 1 / 60;
    for (let i = 0; i < 60; i++) {
      state = engine.integrate(state, i * dt, dt);
    }

    expect(state.velocity.x).toBeLessThan(100);
    expect(Math.abs(state.velocity.y)).toBeLessThan(1e-6);
  });
});
