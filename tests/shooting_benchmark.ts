import { Vector3 } from '../src/math/Vector3';
import {
  ShootingMethodSolver,
  createDefaultBallisticParameters,
} from '../src/game/ShootingMethodSolver';

const solver = new ShootingMethodSolver(createDefaultBallisticParameters());

const artilleryPos = new Vector3(0, 0, 0);
const targetPos = new Vector3(10000, 10000, 800); // 14km away, 800m up
const targetVel = new Vector3(10, 0, 0); // Moving target

console.log('Starting benchmark...');
const startTime = performance.now();
const iterations = 10;

for (let i = 0; i < iterations; i++) {
  solver.solve(artilleryPos, targetPos, targetVel);
}

const endTime = performance.now();
const duration = endTime - startTime;
console.log(`Benchmark complete.`);
console.log(`Total time for ${iterations} runs: ${duration.toFixed(2)}ms`);
console.log(`Average time per run: ${(duration / iterations).toFixed(2)}ms`);
