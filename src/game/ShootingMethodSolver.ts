/**
 * ShootingMethodSolver - Mathematically rigorous ballistic calculation
 * Implements requirements from docs/ShootingMethod.txt using Newton-Raphson method
 *
 * Based on Japanese mathematical specification:
 * - Target future position: PT(tf) = PT(0) + vT * tf
 * - Hit condition: PP(tf) = PT(tf)
 * - Error vector: E = PP(tf) - PT(tf) → 0
 * - Newton-Raphson convergence with Jacobian matrix
 */

import { Vector3 } from '../math/Vector3';
import { PhysicsEngine, State3D } from '../physics/PhysicsEngine';
import { Forces } from '../physics/Forces';
import { PHYSICS_CONSTANTS } from '../data/Constants';

export interface ShootingResult {
  azimuth: number; // Final azimuth in degrees
  elevation: number; // Final elevation in degrees
  converged: boolean; // Whether solution converged
  iterations: number; // Number of iterations used
  finalError: number; // Final error magnitude in meters
  flightTime: number; // Projectile flight time in seconds
}

export interface BallisticParameters {
  initialVelocity: number; // m/s
  projectileMass: number; // kg
  dragCoefficient: number; // dimensionless
  crossSectionalArea: number; // m²
}

/**
 * Create default ballistic parameters from physics constants
 */
export function createDefaultBallisticParameters(): BallisticParameters {
  return {
    initialVelocity: PHYSICS_CONSTANTS.MUZZLE_VELOCITY,
    projectileMass: PHYSICS_CONSTANTS.PROJECTILE_MASS,
    dragCoefficient: PHYSICS_CONSTANTS.PROJECTILE_DRAG_COEFFICIENT,
    crossSectionalArea: PHYSICS_CONSTANTS.PROJECTILE_CROSS_SECTIONAL_AREA,
  };
}

/**
 * Core Shooting Method implementation with iterative convergence
 * Uses Newton-Raphson method for angle corrections as specified in ShootingMethod.txt
 */
export class ShootingMethodSolver {
  private readonly MAX_ITERATIONS = 15; // As per ShootingMethod.txt
  private readonly CONVERGENCE_TOLERANCE = 10.0; // 10 meters tolerance
  private readonly ANGLE_PERTURBATION = 0.5; // Degrees for Jacobian calculation (increased for long-range sensitivity)
  private readonly PHYSICS_TIMESTEP = PHYSICS_CONSTANTS.PHYSICS_TIMESTEP; // Use standard timestep
  private readonly MAX_FLIGHT_TIME = 120.0; // Maximum 2 minutes flight time

  private physicsEngine: PhysicsEngine;
  private ballisticParams: BallisticParameters;

  // Oscillation detection
  private errorHistory: number[] = [];
  private angleHistory: { azimuth: number; elevation: number }[] = [];

  constructor(ballisticParams: BallisticParameters) {
    this.ballisticParams = ballisticParams;

    // Initialize physics engine with proper ballistic forces
    this.physicsEngine = new PhysicsEngine((state: State3D) => {
      const velocity = state.velocity;

      // Calculate gravity
      const gravity = Forces.gravity(
        this.ballisticParams.projectileMass,
        PHYSICS_CONSTANTS.GRAVITY_ACCELERATION,
        new Vector3(0, 0, -1)
      );

      // Calculate air drag (essential for realistic ballistics)
      const drag = Forces.drag(
        velocity,
        PHYSICS_CONSTANTS.AIR_DENSITY_SEA_LEVEL,
        this.ballisticParams.dragCoefficient,
        this.ballisticParams.crossSectionalArea
      );

      const totalForce = Forces.sum(gravity, drag);

      // Return acceleration: F = ma → a = F/m
      return new Vector3(
        totalForce.x / this.ballisticParams.projectileMass,
        totalForce.y / this.ballisticParams.projectileMass,
        totalForce.z / this.ballisticParams.projectileMass
      );
    });
  }

  /**
   * Solve shooting problem using Newton-Raphson method
   * Finds azimuth and elevation angles for hitting moving target
   */
  /**
   * Solve shooting problem using Newton-Raphson method
   * Finds azimuth and elevation angles for hitting moving target
   * Optimized with Broyden's method to reduce expensive Jacobian recalculations
   */
  solve(
    artilleryPosition: Vector3,
    targetPosition: Vector3,
    targetVelocity: Vector3
  ): ShootingResult {
    // Initial guess using simplified ballistics
    let azimuth = this.calculateInitialAzimuthGuess(
      artilleryPosition,
      targetPosition
    );
    let elevation = this.calculateInitialElevationGuess(
      artilleryPosition,
      targetPosition
    );

    console.log(
      `ShootingMethod: Initial guess - Az: ${azimuth.toFixed(2)}°, El: ${elevation.toFixed(2)}°`
    );
    console.log(
      `ShootingMethod: Target at (${targetPosition.x.toFixed(0)}, ${targetPosition.y.toFixed(0)}, ${targetPosition.z.toFixed(0)})`
    );
    console.log(
      `ShootingMethod: Target velocity (${targetVelocity.x.toFixed(1)}, ${targetVelocity.y.toFixed(1)}, ${targetVelocity.z.toFixed(1)}) m/s`
    );

    let converged = false;
    let finalError = Infinity;
    let flightTime = 0;

    // Reset oscillation detection
    this.errorHistory = [];
    this.angleHistory = [];

    // Variables for Broyden's update
    let currentJacobian: {
      dE_dAzimuth: Vector3;
      dE_dElevation: Vector3;
    } | null = null;
    let prevAzimuth = azimuth;
    let prevElevation = elevation;
    let prevErrorVector: Vector3 | null = null;

    for (let iteration = 0; iteration < this.MAX_ITERATIONS; iteration++) {
      // CORRECTED: Use CPA-based error calculation for accurate moving target handling
      const cpaResult = this.simulateTrajectoryWithCPA(
        artilleryPosition,
        azimuth,
        elevation,
        targetPosition,
        targetVelocity
      );

      if (!cpaResult) {
        break; // Simulation failed
      }

      flightTime = cpaResult.cpaTime;
      finalError = cpaResult.minDistance;

      // For error vector, use the spatial difference at CPA
      const errorVector = cpaResult.projectilePosition.subtract(
        cpaResult.targetPosition
      );

      console.log(
        `ShootingMethod: Iteration ${iteration} - Az: ${azimuth.toFixed(2)}°, El: ${elevation.toFixed(2)}°, MinDist: ${finalError.toFixed(2)}m, CPATime: ${flightTime.toFixed(2)}s`
      );

      // Store history for oscillation detection
      this.errorHistory.push(finalError);
      this.angleHistory.push({ azimuth, elevation });

      // Check convergence
      if (finalError < this.CONVERGENCE_TOLERANCE) {
        converged = true;
        console.log(`ShootingMethod: Converged at iteration ${iteration}`);
        break;
      }

      // Detect oscillation after 3 iterations
      let isOscillating = false;
      if (iteration >= 3) {
        isOscillating = this.detectOscillation(iteration);
        if (isOscillating) {
          console.log(
            `ShootingMethod: Oscillation detected at iteration ${iteration}, using conservative damping`
          );
          // If oscillating, force full Jacobian recalculation to get back on track
          currentJacobian = null;
        }
      }

      // Calculate or Update Jacobian
      if (iteration === 0 || currentJacobian === null || isOscillating) {
        // First iteration or reset: Calculate full Jacobian using finite differences (expensive: 2 extra simulations)
        currentJacobian = this.calculateJacobianCPA(
          artilleryPosition,
          azimuth,
          elevation,
          targetPosition,
          targetVelocity
        );
      } else {
        // Subsequent iterations: Update Jacobian using Broyden's method (cheap: 0 extra simulations)
        // J_{k+1} = J_k + ((ΔF - J_k * Δx) / ||Δx||^2) * Δx^T

        const deltaAz = azimuth - prevAzimuth;
        const deltaEl = elevation - prevElevation;

        // Avoid update if change is too small to be numerically stable
        if (Math.abs(deltaAz) > 1e-6 || Math.abs(deltaEl) > 1e-6) {
          const deltaF = errorVector.subtract(prevErrorVector!);

          // J_k * Δx
          // J * [dAz, dEl]^T = dE_dAz * dAz + dE_dEl * dEl
          const J_times_dx = currentJacobian.dE_dAzimuth
            .multiply(deltaAz)
            .add(currentJacobian.dE_dElevation.multiply(deltaEl));

          // Numerator: ΔF - J_k * Δx
          const numerator = deltaF.subtract(J_times_dx);

          // Denominator: ||Δx||^2 = dAz^2 + dEl^2
          const denominator = deltaAz * deltaAz + deltaEl * deltaEl;

          // Update columns
          // col1_new = col1_old + (numerator / denom) * dAz
          const updateVector = numerator.multiply(1.0 / denominator);

          currentJacobian.dE_dAzimuth = currentJacobian.dE_dAzimuth.add(
            updateVector.multiply(deltaAz)
          );
          currentJacobian.dE_dElevation = currentJacobian.dE_dElevation.add(
            updateVector.multiply(deltaEl)
          );

          console.log(
            `ShootingMethod: Jacobian updated using Broyden's method`
          );
        } else {
          // If step is too small, maybe we are stuck? Recalculate full Jacobian next time?
          // For now, keep old Jacobian
          console.log(
            `ShootingMethod: Step too small for Broyden update, keeping previous Jacobian`
          );
        }
      }

      // Store current state for next Broyden update
      prevAzimuth = azimuth;
      prevElevation = elevation;
      prevErrorVector = errorVector;

      // Apply Newton-Raphson correction: [θ, φ] = [θ, φ] - J⁻¹ * E
      const angleCorrection = this.solveLinearSystem(
        currentJacobian,
        errorVector,
        isOscillating
      );

      console.log(
        `ShootingMethod: Angle correction - ΔAz: ${angleCorrection.azimuth.toFixed(4)}°, ΔEl: ${angleCorrection.elevation.toFixed(4)}°`
      );

      // Apply angle updates
      azimuth -= angleCorrection.azimuth;
      elevation -= angleCorrection.elevation;

      // Clamp angles to reasonable ranges
      azimuth = this.normalizeAzimuth(azimuth);
      elevation = Math.max(1.0, Math.min(89.0, elevation));
    }

    const result = {
      azimuth,
      elevation,
      converged,
      iterations: converged
        ? this.findIterationCount(finalError)
        : this.MAX_ITERATIONS,
      finalError,
      flightTime,
    };

    console.log(
      `ShootingMethod: Final result - Az: ${azimuth.toFixed(2)}°, El: ${elevation.toFixed(2)}°, Converged: ${converged}, MinDistance: ${finalError.toFixed(2)}m`
    );

    return result;
  }

  /**
   * Solve shooting problem starting from provided initial guess angles
   * Used for incremental calculations with previous results as starting point
   */
  /**
   * Solve shooting problem starting from provided initial guess angles
   * Used for incremental calculations with previous results as starting point
   * Optimized with Broyden's method
   */
  solveFromInitialGuess(
    artilleryPosition: Vector3,
    targetPosition: Vector3,
    targetVelocity: Vector3,
    initialAzimuth: number,
    initialElevation: number,
    maxIterations: number = this.MAX_ITERATIONS,
    convergenceTolerance: number = this.CONVERGENCE_TOLERANCE
  ): ShootingResult {
    let azimuth = initialAzimuth;
    let elevation = initialElevation;

    console.log(
      `ShootingMethod (Incremental): Starting from - Az: ${azimuth.toFixed(2)}°, El: ${elevation.toFixed(2)}°`
    );

    let converged = false;
    let finalError = Infinity;
    let flightTime = 0;

    // Reset oscillation detection for this calculation
    const errorHistory: number[] = [];
    const angleHistory: { azimuth: number; elevation: number }[] = [];

    // Variables for Broyden's update
    let currentJacobian: {
      dE_dAzimuth: Vector3;
      dE_dElevation: Vector3;
    } | null = null;
    let prevAzimuth = azimuth;
    let prevElevation = elevation;
    let prevErrorVector: Vector3 | null = null;

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      // CORRECTED: Use CPA-based error calculation for accurate moving target handling
      const cpaResult = this.simulateTrajectoryWithCPA(
        artilleryPosition,
        azimuth,
        elevation,
        targetPosition,
        targetVelocity
      );

      if (!cpaResult) {
        break; // Simulation failed
      }

      flightTime = cpaResult.cpaTime;
      finalError = cpaResult.minDistance;

      // For error vector, use the spatial difference at CPA
      const errorVector = cpaResult.projectilePosition.subtract(
        cpaResult.targetPosition
      );

      console.log(
        `ShootingMethod (Incremental): Iteration ${iteration} - Az: ${azimuth.toFixed(2)}°, El: ${elevation.toFixed(2)}°, MinDist: ${finalError.toFixed(2)}m`
      );

      // Store history for oscillation detection
      errorHistory.push(finalError);
      angleHistory.push({ azimuth, elevation });

      // Check convergence with custom tolerance
      if (finalError < convergenceTolerance) {
        converged = true;
        console.log(
          `ShootingMethod (Incremental): Converged at iteration ${iteration} with ${convergenceTolerance}m tolerance`
        );
        break;
      }

      // Detect oscillation after 3 iterations
      let isOscillating = false;
      if (iteration >= 3) {
        isOscillating = this.detectOscillationInHistory(
          errorHistory,
          angleHistory,
          iteration
        );
        if (isOscillating) {
          console.log(
            `ShootingMethod (Incremental): Oscillation detected at iteration ${iteration}`
          );
          currentJacobian = null; // Reset Jacobian on oscillation
        }
      }

      // Calculate or Update Jacobian
      if (iteration === 0 || currentJacobian === null || isOscillating) {
        currentJacobian = this.calculateJacobianCPA(
          artilleryPosition,
          azimuth,
          elevation,
          targetPosition,
          targetVelocity
        );
      } else {
        // Broyden's update
        const deltaAz = azimuth - prevAzimuth;
        const deltaEl = elevation - prevElevation;

        if (Math.abs(deltaAz) > 1e-6 || Math.abs(deltaEl) > 1e-6) {
          const deltaF = errorVector.subtract(prevErrorVector!);
          const J_times_dx = currentJacobian.dE_dAzimuth
            .multiply(deltaAz)
            .add(currentJacobian.dE_dElevation.multiply(deltaEl));
          const numerator = deltaF.subtract(J_times_dx);
          const denominator = deltaAz * deltaAz + deltaEl * deltaEl;
          const updateVector = numerator.multiply(1.0 / denominator);

          currentJacobian.dE_dAzimuth = currentJacobian.dE_dAzimuth.add(
            updateVector.multiply(deltaAz)
          );
          currentJacobian.dE_dElevation = currentJacobian.dE_dElevation.add(
            updateVector.multiply(deltaEl)
          );
        }
      }

      prevAzimuth = azimuth;
      prevElevation = elevation;
      prevErrorVector = errorVector;

      // Apply Newton-Raphson correction with incremental-specific damping
      const angleCorrection = this.solveLinearSystemIncremental(
        currentJacobian,
        errorVector,
        isOscillating,
        finalError
      );

      console.log(
        `ShootingMethod (Incremental): Angle correction - ΔAz: ${angleCorrection.azimuth.toFixed(4)}°, ΔEl: ${angleCorrection.elevation.toFixed(4)}°`
      );

      // Apply angle updates
      azimuth -= angleCorrection.azimuth;
      elevation -= angleCorrection.elevation;

      // Clamp angles to reasonable ranges
      azimuth = this.normalizeAzimuth(azimuth);
      elevation = Math.max(1.0, Math.min(89.0, elevation));
    }

    const result = {
      azimuth,
      elevation,
      converged,
      iterations: converged
        ? this.findIterationCount(finalError)
        : maxIterations,
      finalError,
      flightTime,
    };

    console.log(
      `ShootingMethod (Incremental): Final result - Az: ${azimuth.toFixed(2)}°, El: ${elevation.toFixed(2)}°, Converged: ${converged}, MinDistance: ${finalError.toFixed(2)}m`
    );

    return result;
  }

  /**
   * Simulate projectile trajectory and find CPA (Closest Point of Approach) to moving target
   * This is the correct approach for moving targets - find the minimum distance between
   * projectile trajectory and target's predicted path
   */
  private simulateTrajectoryWithCPA(
    startPosition: Vector3,
    azimuthDeg: number,
    elevationDeg: number,
    targetPosition: Vector3,
    targetVelocity: Vector3
  ): {
    minDistance: number;
    cpaTime: number;
    projectilePosition: Vector3;
    targetPosition: Vector3;
  } | null {
    // Convert angles to radians
    const azimuthRad = azimuthDeg * (Math.PI / 180);
    const elevationRad = elevationDeg * (Math.PI / 180);

    // Calculate initial velocity vector
    const v0 = this.ballisticParams.initialVelocity;

    if (!isFinite(azimuthRad) || !isFinite(elevationRad) || !isFinite(v0)) {
      console.error('Invalid initial values for CPA simulation:', {
        azimuthDeg,
        elevationDeg,
        v0,
      });
      return null;
    }

    const initialVelocity = new Vector3(
      v0 * Math.cos(elevationRad) * Math.sin(azimuthRad), // East
      v0 * Math.cos(elevationRad) * Math.cos(azimuthRad), // North
      v0 * Math.sin(elevationRad) // Up
    );

    if (
      !isFinite(initialVelocity.x) ||
      !isFinite(initialVelocity.y) ||
      !isFinite(initialVelocity.z)
    ) {
      console.error(
        'Invalid initial velocity for CPA simulation:',
        initialVelocity
      );
      return null;
    }

    // Initialize simulation state
    let state: State3D = {
      position: new Vector3(startPosition.x, startPosition.y, startPosition.z),
      velocity: new Vector3(
        initialVelocity.x,
        initialVelocity.y,
        initialVelocity.z
      ),
    };

    let time = 0;
    let minDistance = Infinity;
    let cpaTime = 0;
    let cpaProjectilePosition = state.position;
    let cpaTargetPosition = targetPosition;

    const isMovingTarget = targetVelocity.magnitude() > 0.1; // > 0.1 m/s

    console.log(
      `CPA Trajectory: Az=${azimuthDeg.toFixed(2)}°, El=${elevationDeg.toFixed(2)}°, V0=${initialVelocity.magnitude().toFixed(1)}m/s, MovingTarget=${isMovingTarget}`
    );

    // Optimization: Stop if we are clearly moving away from the target
    // We track if distance has been increasing for a while
    let distanceIncreasingCount = 0;
    const DISTANCE_INCREASE_THRESHOLD = 10; // Number of steps to confirm divergence

    // Simulate complete trajectory until ground impact (FIXED: allow simulation to start)
    while (time < this.MAX_FLIGHT_TIME) {
      // Advance physics simulation
      const newState = this.physicsEngine.integrate(
        state,
        time,
        this.PHYSICS_TIMESTEP
      );

      // Safety check for invalid state
      if (
        !isFinite(newState.position.x) ||
        !isFinite(newState.position.y) ||
        !isFinite(newState.position.z) ||
        !isFinite(newState.velocity.x) ||
        !isFinite(newState.velocity.y) ||
        !isFinite(newState.velocity.z)
      ) {
        console.error(
          'Invalid state detected in CPA simulation at time',
          time,
          'state:',
          newState
        );
        return null;
      }

      time += this.PHYSICS_TIMESTEP;

      // Calculate target position at this time
      let currentTargetPosition: Vector3;
      if (isMovingTarget) {
        // For moving targets: P_target(t) = P_target(0) + v_target * t
        currentTargetPosition = targetPosition.add(
          targetVelocity.multiply(time)
        );
      } else {
        // For static targets: position remains constant
        currentTargetPosition = targetPosition;
      }

      // Calculate distance between projectile and target at this time
      const distance = newState.position
        .subtract(currentTargetPosition)
        .magnitude();

      // Update minimum distance and CPA information
      if (distance < minDistance) {
        minDistance = distance;
        cpaTime = time;
        cpaProjectilePosition = new Vector3(
          newState.position.x,
          newState.position.y,
          newState.position.z
        );
        cpaTargetPosition = new Vector3(
          currentTargetPosition.x,
          currentTargetPosition.y,
          currentTargetPosition.z
        );
        distanceIncreasingCount = 0; // Reset counter
      } else {
        distanceIncreasingCount++;
      }

      // Optimization: Early exit if we have passed the CPA and are moving away
      // We wait for a few steps to be sure it's not a local fluctuation
      if (
        distanceIncreasingCount > DISTANCE_INCREASE_THRESHOLD &&
        minDistance < 10000
      ) {
        // Only exit if we found a "reasonable" CPA (e.g. < 10km) or if we simulated enough
        // This prevents exiting too early if the initial guess is very far off
        break;
      }

      // Exit when projectile hits ground (but allow simulation to run first)
      if (newState.position.z <= 0 && time > 0) {
        break;
      }

      state = newState;
    }

    console.log(
      `CPA Result: MinDist=${minDistance.toFixed(1)}m at t=${cpaTime.toFixed(2)}s, ProjectilePos=(${cpaProjectilePosition.x.toFixed(0)},${cpaProjectilePosition.y.toFixed(0)},${cpaProjectilePosition.z.toFixed(0)}), TargetPos=(${cpaTargetPosition.x.toFixed(0)},${cpaTargetPosition.y.toFixed(0)},${cpaTargetPosition.z.toFixed(0)})`
    );

    return {
      minDistance,
      cpaTime,
      projectilePosition: cpaProjectilePosition,
      targetPosition: cpaTargetPosition,
    };
  }

  /**
   * Calculate Jacobian matrix for Newton-Raphson method using CPA approach
   * J = [∂E/∂θ, ∂E/∂φ] where θ=azimuth, φ=elevation
   * Uses minimum distance error instead of time-synchronized position error
   */
  private calculateJacobianCPA(
    artilleryPosition: Vector3,
    azimuth: number,
    elevation: number,
    targetPosition: Vector3,
    targetVelocity: Vector3
  ): {
    dE_dAzimuth: Vector3;
    dE_dElevation: Vector3;
  } {
    // Calculate error at current position using CPA
    const currentResult = this.simulateTrajectoryWithCPA(
      artilleryPosition,
      azimuth,
      elevation,
      targetPosition,
      targetVelocity
    );

    if (!currentResult) {
      return {
        dE_dAzimuth: new Vector3(0, 0, 0),
        dE_dElevation: new Vector3(0, 0, 0),
      };
    }

    const F0 = currentResult.projectilePosition.subtract(
      currentResult.targetPosition
    );

    // Perturb azimuth and calculate CPA
    const azimuthResult = this.simulateTrajectoryWithCPA(
      artilleryPosition,
      azimuth + this.ANGLE_PERTURBATION,
      elevation,
      targetPosition,
      targetVelocity
    );

    let dE_dAzimuth = new Vector3(0, 0, 0);
    if (azimuthResult) {
      const perturbedError = azimuthResult.projectilePosition.subtract(
        azimuthResult.targetPosition
      );
      dE_dAzimuth = perturbedError
        .subtract(F0)
        .multiply(1.0 / this.ANGLE_PERTURBATION);
    }

    // Perturb elevation and calculate CPA
    const elevationResult = this.simulateTrajectoryWithCPA(
      artilleryPosition,
      azimuth,
      elevation + this.ANGLE_PERTURBATION,
      targetPosition,
      targetVelocity
    );

    let dE_dElevation = new Vector3(0, 0, 0);
    if (elevationResult) {
      const perturbedError = elevationResult.projectilePosition.subtract(
        elevationResult.targetPosition
      );
      dE_dElevation = perturbedError
        .subtract(F0)
        .multiply(1.0 / this.ANGLE_PERTURBATION);
    }

    return { dE_dAzimuth, dE_dElevation };
  }

  /**
   * Solve linear system J * Δ = E for angle corrections
   * Uses 3x2 overdetermined system with least squares solution for 3D ballistic accuracy
   */
  private solveLinearSystem(
    jacobian: { dE_dAzimuth: Vector3; dE_dElevation: Vector3 },
    errorVector: Vector3,
    isOscillating: boolean = false
  ): { azimuth: number; elevation: number } {
    // 3x2 overdetermined system: 3 spatial constraints (X,Y,Z) with 2 angle variables (θ,φ)
    // This is the correct formulation for 3D ballistic problems

    // Extract Jacobian elements
    const J11 = jacobian.dE_dAzimuth.x; // ∂Ex/∂θ
    const J12 = jacobian.dE_dElevation.x; // ∂Ex/∂φ
    const J21 = jacobian.dE_dAzimuth.y; // ∂Ey/∂θ
    const J22 = jacobian.dE_dElevation.y; // ∂Ey/∂φ
    const J31 = jacobian.dE_dAzimuth.z; // ∂Ez/∂θ
    const J32 = jacobian.dE_dElevation.z; // ∂Ez/∂φ

    // Error vector components (all 3D components are essential)
    const Ex = errorVector.x;
    const Ey = errorVector.y;
    const Ez = errorVector.z;

    // Solve normal equations: (J^T J) * Δ = J^T * E
    const JTJ11 = J11 * J11 + J21 * J21 + J31 * J31; // J^T J[0,0]
    const JTJ12 = J11 * J12 + J21 * J22 + J31 * J32; // J^T J[0,1]
    const JTJ21 = JTJ12; // J^T J[1,0] (symmetric)
    const JTJ22 = J12 * J12 + J22 * J22 + J32 * J32; // J^T J[1,1]

    const JTE1 = J11 * Ex + J21 * Ey + J31 * Ez; // J^T E[0]
    const JTE2 = J12 * Ex + J22 * Ey + J32 * Ez; // J^T E[1]

    // Calculate determinant of normal matrix
    const det = JTJ11 * JTJ22 - JTJ12 * JTJ21;

    if (Math.abs(det) < 1e-12) {
      // Nearly singular normal matrix, use regularized gradient descent
      const errorMag = errorVector.magnitude();
      if (errorMag < 1e-6) {
        return { azimuth: 0, elevation: 0 };
      }

      // Use gradient of error magnitude with regularization
      const regularization = 1e-8;
      const regJTJ11 = JTJ11 + regularization;
      const regJTJ22 = JTJ22 + regularization;
      const regDet = regJTJ11 * regJTJ22 - JTJ12 * JTJ21;

      if (Math.abs(regDet) > 1e-12) {
        const deltaAzimuth = (JTE1 * regJTJ22 - JTE2 * JTJ12) / regDet;
        const deltaElevation = (regJTJ11 * JTE2 - JTJ21 * JTE1) / regDet;

        const stepSize = Math.min(0.5, 10.0 / errorMag); // Conservative step
        return {
          azimuth: deltaAzimuth * stepSize,
          elevation: deltaElevation * stepSize,
        };
      }

      // Fallback to steepest descent
      const stepSize = Math.min(0.1, 5.0 / errorMag);
      return {
        azimuth: (stepSize * JTE1) / Math.sqrt(JTJ11 + 1e-12),
        elevation: (stepSize * JTE2) / Math.sqrt(JTJ22 + 1e-12),
      };
    }

    // Solve normal equations using Cramer's rule
    const deltaAzimuth = (JTE1 * JTJ22 - JTE2 * JTJ12) / det;
    const deltaElevation = (JTJ11 * JTE2 - JTJ21 * JTE1) / det;

    // Improved adaptive damping based on error magnitude and correction size
    const errorMagnitude = errorVector.magnitude();
    const correctionMagnitude = Math.sqrt(
      deltaAzimuth * deltaAzimuth + deltaElevation * deltaElevation
    );

    // Adaptive damping with oscillation consideration
    let dampingFactor = 1.0;

    if (isOscillating) {
      // Very conservative damping when oscillating
      dampingFactor = 0.1; // Extreme damping to break oscillation
      console.log(`Using anti-oscillation damping: ${dampingFactor}`);
    } else if (errorMagnitude > 5000.0) {
      dampingFactor = 0.7; // Reduced from 1.0 to prevent oscillation
    } else if (errorMagnitude > 1000.0) {
      dampingFactor = 0.8; // Reduced from 1.0
    } else if (errorMagnitude > 100.0) {
      dampingFactor = 0.9; // Light damping for medium errors
    } else {
      dampingFactor = 0.8; // Moderate damping for small errors
    }

    // More conservative maximum correction to prevent oscillation
    let maxCorrection = 5.0; // Start with conservative 5 degrees

    // Reduce further for very large corrections to prevent oscillation
    if (correctionMagnitude > 30.0) {
      maxCorrection = 2.0; // Very conservative for huge corrections
    } else if (correctionMagnitude > 15.0) {
      maxCorrection = 3.0; // Conservative for large corrections
    }

    const scalingFactor = Math.min(
      1.0,
      maxCorrection / (correctionMagnitude + 1e-12)
    );

    console.log(
      `Linear system: Error=${errorMagnitude.toFixed(0)}m, Correction=(${deltaAzimuth.toFixed(4)}°,${deltaElevation.toFixed(4)}°), Damping=${dampingFactor.toFixed(2)}, Scaling=${scalingFactor.toFixed(2)}`
    );

    return {
      azimuth: deltaAzimuth * dampingFactor * scalingFactor,
      elevation: deltaElevation * dampingFactor * scalingFactor,
    };
  }

  /**
   * Solve linear system with incremental-specific damping for smoother convergence
   */
  private solveLinearSystemIncremental(
    jacobian: { dE_dAzimuth: Vector3; dE_dElevation: Vector3 },
    errorVector: Vector3,
    isOscillating: boolean = false,
    errorMagnitude: number
  ): { azimuth: number; elevation: number } {
    // Use same core logic as solveLinearSystem but with different damping strategy

    // Extract Jacobian elements
    const J11 = jacobian.dE_dAzimuth.x;
    const J12 = jacobian.dE_dElevation.x;
    const J21 = jacobian.dE_dAzimuth.y;
    const J22 = jacobian.dE_dElevation.y;
    const J31 = jacobian.dE_dAzimuth.z;
    const J32 = jacobian.dE_dElevation.z;

    // Error vector components
    const Ex = errorVector.x;
    const Ey = errorVector.y;
    const Ez = errorVector.z;

    // Solve normal equations: (J^T J) * Δ = J^T * E
    const JTJ11 = J11 * J11 + J21 * J21 + J31 * J31;
    const JTJ12 = J11 * J12 + J21 * J22 + J31 * J32;
    const JTJ21 = JTJ12;
    const JTJ22 = J12 * J12 + J22 * J22 + J32 * J32;

    const JTE1 = J11 * Ex + J21 * Ey + J31 * Ez;
    const JTE2 = J12 * Ex + J22 * Ey + J32 * Ez;

    // Calculate determinant
    const det = JTJ11 * JTJ22 - JTJ12 * JTJ21;

    if (Math.abs(det) < 1e-12) {
      // Use regularized gradient descent
      const regularization = 1e-8;
      const regJTJ11 = JTJ11 + regularization;
      const regJTJ22 = JTJ22 + regularization;
      const regDet = regJTJ11 * regJTJ22 - JTJ12 * JTJ21;

      if (Math.abs(regDet) > 1e-12) {
        const deltaAzimuth = (JTE1 * regJTJ22 - JTE2 * JTJ12) / regDet;
        const deltaElevation = (regJTJ11 * JTE2 - JTJ21 * JTE1) / regDet;

        const stepSize = Math.min(0.3, 5.0 / errorMagnitude); // More conservative
        return {
          azimuth: deltaAzimuth * stepSize,
          elevation: deltaElevation * stepSize,
        };
      }

      // Fallback to steepest descent
      const stepSize = Math.min(0.1, 3.0 / errorMagnitude);
      return {
        azimuth: (stepSize * JTE1) / Math.sqrt(JTJ11 + 1e-12),
        elevation: (stepSize * JTE2) / Math.sqrt(JTJ22 + 1e-12),
      };
    }

    // Solve normal equations
    const deltaAzimuth = (JTE1 * JTJ22 - JTE2 * JTJ12) / det;
    const deltaElevation = (JTJ11 * JTE2 - JTJ21 * JTE1) / det;

    const correctionMagnitude = Math.sqrt(
      deltaAzimuth * deltaAzimuth + deltaElevation * deltaElevation
    );

    // Incremental-specific damping strategy (more aggressive damping for smoother updates)
    let dampingFactor = 1.0;

    if (isOscillating) {
      // Very conservative damping when oscillating
      dampingFactor = 0.05; // Even more conservative than standard mode
      console.log(`Incremental anti-oscillation damping: ${dampingFactor}`);
    } else if (errorMagnitude > 1000.0) {
      dampingFactor = 0.4; // More damping for large errors
    } else if (errorMagnitude > 200.0) {
      dampingFactor = 0.6; // Moderate damping for medium errors
    } else if (errorMagnitude > 50.0) {
      dampingFactor = 0.7; // Light damping for small errors
    } else {
      dampingFactor = 0.8; // Minimal damping for very small errors
    }

    // More conservative maximum correction for incremental mode
    let maxCorrection = 2.0; // Start with very conservative 2 degrees

    if (correctionMagnitude > 15.0) {
      maxCorrection = 1.0; // Extremely conservative for large corrections
    } else if (correctionMagnitude > 5.0) {
      maxCorrection = 1.5; // Very conservative for medium corrections
    }

    const scalingFactor = Math.min(
      1.0,
      maxCorrection / (correctionMagnitude + 1e-12)
    );

    console.log(
      `Incremental linear system: Error=${errorMagnitude.toFixed(0)}m, Correction=(${deltaAzimuth.toFixed(4)}°,${deltaElevation.toFixed(4)}°), Damping=${dampingFactor.toFixed(2)}, Scaling=${scalingFactor.toFixed(2)}`
    );

    return {
      azimuth: deltaAzimuth * dampingFactor * scalingFactor,
      elevation: deltaElevation * dampingFactor * scalingFactor,
    };
  }

  /**
   * Predict target position at given future time
   * PT(tf) = PT(0) + vT * tf
   */

  /**
   * Calculate initial azimuth guess using target bearing
   */
  private calculateInitialAzimuthGuess(
    artilleryPosition: Vector3,
    targetPosition: Vector3
  ): number {
    const delta = targetPosition.subtract(artilleryPosition);
    const azimuthRad = Math.atan2(delta.x, delta.y);
    return azimuthRad * (180 / Math.PI);
  }

  /**
   * Calculate initial elevation guess using improved ballistic formula
   */
  private calculateInitialElevationGuess(
    artilleryPosition: Vector3,
    targetPosition: Vector3
  ): number {
    const delta = targetPosition.subtract(artilleryPosition);
    const horizontalRange = Math.sqrt(delta.x * delta.x + delta.y * delta.y);
    const heightDifference = delta.z;

    const g = PHYSICS_CONSTANTS.GRAVITY_ACCELERATION;
    const v0 = this.ballisticParams.initialVelocity;

    if (horizontalRange < 100) {
      // Very close range: direct aim
      return Math.max(
        5.0,
        Math.atan2(heightDifference, horizontalRange) * (180 / Math.PI)
      );
    }

    // Use ballistic trajectory equation for better initial guess
    // For projectile motion: R = (v0²/g) * sin(2θ) * cos²(θ) - accounting for height
    // Approximate solution using iterative approach

    let bestElevation = 30; // Default
    let minTimeOfFlight = Infinity;

    // Test multiple elevation angles to find the one with reasonable flight time
    for (let testElevation = 10; testElevation <= 80; testElevation += 10) {
      const elevRad = testElevation * (Math.PI / 180);
      const v0x = v0 * Math.cos(elevRad);
      const v0z = v0 * Math.sin(elevRad);

      // Simple ballistic flight time calculation (ignoring air resistance for initial guess)
      // z = v0z*t - 0.5*g*t² + z0
      // When projectile hits target height: heightDifference = v0z*t - 0.5*g*t²
      // Solve quadratic: 0.5*g*t² - v0z*t + heightDifference = 0

      const a = 0.5 * g;
      const b = -v0z;
      const c = heightDifference;
      const discriminant = b * b - 4 * a * c;

      if (discriminant >= 0) {
        const t1 = (-b + Math.sqrt(discriminant)) / (2 * a);
        const t2 = (-b - Math.sqrt(discriminant)) / (2 * a);
        const flightTime = Math.max(t1, t2); // Use positive solution

        if (flightTime > 0) {
          const calculatedRange = v0x * flightTime;
          const rangeDifference = Math.abs(calculatedRange - horizontalRange);

          if (rangeDifference < minTimeOfFlight) {
            minTimeOfFlight = rangeDifference;
            bestElevation = testElevation;
          }
        }
      }
    }

    // Fine-tune around the best elevation
    const fineElevation =
      bestElevation +
      (heightDifference / horizontalRange) * (180 / Math.PI) * 0.3;

    return Math.max(5.0, Math.min(80.0, fineElevation));
  }

  /**
   * Normalize azimuth to 0-360 degree range
   */
  private normalizeAzimuth(azimuth: number): number {
    // Keep azimuth in -180 to +180 range to maintain direction consistency
    // This prevents Newton-Raphson corrections from jumping to opposite directions
    while (azimuth > 180) azimuth -= 360;
    while (azimuth <= -180) azimuth += 360;
    return azimuth;
  }

  /**
   * Detect oscillation patterns in error and angle history
   */
  private detectOscillation(_currentIteration: number): boolean {
    if (this.errorHistory.length < 4) return false;

    // Check for oscillating error pattern (A-B-A-B)
    const len = this.errorHistory.length;
    const e1 = this.errorHistory[len - 4];
    const e2 = this.errorHistory[len - 3];
    const e3 = this.errorHistory[len - 2];
    const e4 = this.errorHistory[len - 1];

    // Check if errors alternate between two ranges
    const errorOscillation =
      Math.abs(e1 - e3) < e1 * 0.1 && // e1 ≈ e3
      Math.abs(e2 - e4) < e2 * 0.1 && // e2 ≈ e4
      Math.abs(e1 - e2) > e1 * 0.5; // e1 and e2 are significantly different

    // Check for oscillating angles
    const a1 = this.angleHistory[len - 4];
    const a2 = this.angleHistory[len - 3];
    const a3 = this.angleHistory[len - 2];
    const a4 = this.angleHistory[len - 1];

    const angleOscillation =
      Math.abs(a1.elevation - a3.elevation) < 2.0 && // Similar elevations
      Math.abs(a2.elevation - a4.elevation) < 2.0 &&
      Math.abs(a1.elevation - a2.elevation) > 10.0; // Large elevation swings

    return errorOscillation || angleOscillation;
  }

  /**
   * Detect oscillation patterns in provided history arrays (for incremental calculations)
   */
  private detectOscillationInHistory(
    errorHistory: number[],
    angleHistory: { azimuth: number; elevation: number }[],
    _currentIteration: number
  ): boolean {
    if (errorHistory.length < 4) return false;

    // Check for oscillating error pattern (A-B-A-B)
    const len = errorHistory.length;
    const e1 = errorHistory[len - 4];
    const e2 = errorHistory[len - 3];
    const e3 = errorHistory[len - 2];
    const e4 = errorHistory[len - 1];

    // Check if errors alternate between two ranges (more sensitive for incremental mode)
    const errorOscillation =
      Math.abs(e1 - e3) < e1 * 0.15 && // e1 ≈ e3 (slightly more tolerant)
      Math.abs(e2 - e4) < e2 * 0.15 && // e2 ≈ e4 (slightly more tolerant)
      Math.abs(e1 - e2) > e1 * 0.3; // e1 and e2 are significantly different (less strict)

    // Check for oscillating angles (more sensitive for incremental mode)
    const a1 = angleHistory[len - 4];
    const a2 = angleHistory[len - 3];
    const a3 = angleHistory[len - 2];
    const a4 = angleHistory[len - 1];

    const angleOscillation =
      Math.abs(a1.elevation - a3.elevation) < 1.5 && // Similar elevations (tighter)
      Math.abs(a2.elevation - a4.elevation) < 1.5 &&
      Math.abs(a1.elevation - a2.elevation) > 5.0; // Large elevation swings (smaller threshold)

    return errorOscillation || angleOscillation;
  }

  /**
   * Estimate iteration count based on error magnitude
   */
  private findIterationCount(error: number): number {
    if (error < 1.0) return 1;
    if (error < 10.0) return Math.ceil(Math.log10(error) * 3);
    return this.MAX_ITERATIONS;
  }
}
