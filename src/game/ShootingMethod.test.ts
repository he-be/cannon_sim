import { describe, it, expect } from 'vitest';
import {
  ShootingMethodSolver,
  createDefaultBallisticParameters,
} from './ShootingMethodSolver';
import { Vector3 } from '../math/Vector3';

describe('ShootingMethodSolver Trajectory Preference', () => {
  it('should prefer low trajectory (direct fire) over high trajectory (lobbing)', () => {
    const solver = new ShootingMethodSolver(createDefaultBallisticParameters());
    const artilleryPos = new Vector3(0, 0, 0);

    // Target at 5km distance, same height
    const targetPos = new Vector3(5000, 0, 0);
    const targetVel = new Vector3(0, 0, 0);

    const result = solver.solve(artilleryPos, targetPos, targetVel);

    expect(result.converged).toBe(true);
    console.log(`Solved Elevation (5km): ${result.elevation}°`);
    expect(result.elevation).toBeLessThan(45);
  });

  it('should prefer low trajectory for medium range targets', () => {
    const solver = new ShootingMethodSolver(createDefaultBallisticParameters());
    const artilleryPos = new Vector3(0, 0, 0);

    // Target at 15km
    const targetPos = new Vector3(15000, 0, 0);
    const targetVel = new Vector3(0, 0, 0);

    const result = solver.solve(artilleryPos, targetPos, targetVel);

    expect(result.converged).toBe(true);
    console.log(`Solved Elevation (15km): ${result.elevation}°`);
    expect(result.elevation).toBeLessThan(45);
  });

  it('should prefer low trajectory for very close range targets (1km)', () => {
    const solver = new ShootingMethodSolver(createDefaultBallisticParameters());
    const artilleryPos = new Vector3(0, 0, 0);
    const targetPos = new Vector3(1000, 0, 0);
    const targetVel = new Vector3(0, 0, 0);

    const result = solver.solve(artilleryPos, targetPos, targetVel);

    expect(result.converged).toBe(true);
    console.log(`Solved Elevation (1km): ${result.elevation}°`);
    expect(result.elevation).toBeLessThan(45);
  });

  it('should prefer low trajectory for moving targets', () => {
    const solver = new ShootingMethodSolver(createDefaultBallisticParameters());
    const artilleryPos = new Vector3(0, 0, 0);
    const targetPos = new Vector3(3000, 3000, 100); // 4.2km distance
    const targetVel = new Vector3(-10, 0, 0); // Moving towards artillery

    const result = solver.solve(artilleryPos, targetPos, targetVel);

    expect(result.converged).toBe(true);
    console.log(`Solved Elevation (Moving): ${result.elevation}°`);
    expect(result.elevation).toBeLessThan(45);
  });
});
