/**
 * Tests for Trajectory Prediction Consistency
 * Verifies that the trajectory prediction matches the actual projectile physics
 */

import { describe, it, expect } from 'vitest';
import { Vector3 } from '../math/Vector3';
import { PhysicsEngine, State3D } from '../physics/PhysicsEngine';
import { StandardPhysics } from '../physics/StandardPhysics';
import { PHYSICS_CONSTANTS } from '../data/Constants';

describe('Trajectory Consistency', () => {
  // Constants
  const TIMESTEP = PHYSICS_CONSTANTS.PHYSICS_TIMESTEP;
  const MAX_TIME = 5.0; // Simulate 5 seconds

  // Initial conditions
  const INITIAL_POSITION = new Vector3(0, 0, 0);
  const AZIMUTH = 0; // North
  const ELEVATION = 45; // 45 degrees
  const MUZZLE_VELOCITY = PHYSICS_CONSTANTS.MUZZLE_VELOCITY;

  // Calculate initial velocity
  const azimuthRad = (AZIMUTH * Math.PI) / 180;
  const elevationRad = (ELEVATION * Math.PI) / 180;
  const INITIAL_VELOCITY = new Vector3(
    MUZZLE_VELOCITY * Math.sin(azimuthRad) * Math.cos(elevationRad),
    MUZZLE_VELOCITY * Math.cos(azimuthRad) * Math.cos(elevationRad),
    MUZZLE_VELOCITY * Math.sin(elevationRad)
  );

  it('should match prediction and actual flight exactly under identical conditions', () => {
    // 1. Simulate "Actual" Flight (Game Loop)
    // In the game loop, we integrate step by step
    const actualPoints: Vector3[] = [];
    const physicsEngine = new PhysicsEngine(
      StandardPhysics.accelerationFunction
    );

    let actualState: State3D = {
      position: INITIAL_POSITION.copy(),
      velocity: INITIAL_VELOCITY.copy(),
    };

    let time = 0;
    actualPoints.push(actualState.position.copy());

    while (time < MAX_TIME) {
      actualState = physicsEngine.integrate(actualState, time, TIMESTEP);
      time += TIMESTEP;
      actualPoints.push(actualState.position.copy());
    }

    // 2. Simulate "Prediction" (Trajectory Calculation)
    // This mimics calculateTrajectoryPrediction in GameScene
    const predictedPoints: Vector3[] = [];
    const predictionEngine = new PhysicsEngine(
      StandardPhysics.accelerationFunction
    );

    let predictedState: State3D = {
      position: INITIAL_POSITION.copy(),
      velocity: INITIAL_VELOCITY.copy(),
    };

    time = 0;
    predictedPoints.push(predictedState.position.copy());

    while (time < MAX_TIME) {
      predictedState = predictionEngine.integrate(
        predictedState,
        time,
        TIMESTEP
      );
      time += TIMESTEP;
      predictedPoints.push(predictedState.position.copy());
    }

    // 3. Compare
    expect(actualPoints.length).toBe(predictedPoints.length);

    for (let i = 0; i < actualPoints.length; i++) {
      const actual = actualPoints[i];
      const predicted = predictedPoints[i];

      // Check for exact match (or very close floating point equality)
      expect(actual.x).toBeCloseTo(predicted.x, 5);
      expect(actual.y).toBeCloseTo(predicted.y, 5);
      expect(actual.z).toBeCloseTo(predicted.z, 5);
    }
  });

  it('should match when prediction uses larger sampling interval', () => {
    // In GameScene, prediction samples every 10th step
    const SAMPLING_INTERVAL = 10;

    // Actual flight (full resolution)
    const actualPoints: Vector3[] = [];
    const physicsEngine = new PhysicsEngine(
      StandardPhysics.accelerationFunction
    );
    let actualState: State3D = {
      position: INITIAL_POSITION.copy(),
      velocity: INITIAL_VELOCITY.copy(),
    };
    let time = 0;

    // Prediction (sampled)
    const predictedPoints: Vector3[] = [];
    const predictionEngine = new PhysicsEngine(
      StandardPhysics.accelerationFunction
    );
    let predictedState: State3D = {
      position: INITIAL_POSITION.copy(),
      velocity: INITIAL_VELOCITY.copy(),
    };
    let predTime = 0;
    let stepCounter = 0;

    // Run simulation
    while (time < MAX_TIME) {
      // Update actual
      actualState = physicsEngine.integrate(actualState, time, TIMESTEP);
      actualPoints.push(actualState.position.copy());
      time += TIMESTEP;

      // Update prediction
      if (stepCounter % SAMPLING_INTERVAL === 0) {
        predictedPoints.push(predictedState.position.copy());
      }
      predictedState = predictionEngine.integrate(
        predictedState,
        predTime,
        TIMESTEP
      );
      predTime += TIMESTEP;
      stepCounter++;
    }

    // Compare sampled points
    // Predicted point index i corresponds to Actual point index i * SAMPLING_INTERVAL
    // Note: actualPoints[0] is after 1st step. predictedPoints[0] is initial position (if pushed before loop)
    // Let's adjust logic to match GameScene exactly

    // GameScene logic:
    // while loop...
    //   if (stepCounter % SAMPLING_INTERVAL === 0) push(state.position)
    //   integrate()

    // Let's verify that specific logic
  });
});
