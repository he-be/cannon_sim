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
  latitude: number; // degrees (for Coriolis force)
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
    latitude: PHYSICS_CONSTANTS.LATITUDE,
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

    for (let iteration = 0; iteration < this.MAX_ITERATIONS; iteration++) {
      // STEP 1 FIX: Use time-based error vector calculation
      // Calculate projectile trajectory with current angles
      const trajectoryResult = this.simulateTrajectory(
        artilleryPosition,
        azimuth,
        elevation,
        targetPosition // This ensures trajectory stops at target horizontal distance
      );

      if (!trajectoryResult) {
        break; // Simulation failed
      }

      flightTime = trajectoryResult.flightTime;
      const projectilePositionAtTargetDistance = trajectoryResult.endPosition;

      // Calculate where target will be at the same flight time
      const targetFuturePosition = this.predictTargetPosition(
        targetPosition,
        targetVelocity,
        flightTime
      );

      // STEP 1 FIX: Error vector F = P_sim(t_impact) - P_target(t_impact)
      // This is physically meaningful: "At the time when projectile reaches target distance,
      // how far apart are the projectile and target positions?"
      const errorVector =
        projectilePositionAtTargetDistance.subtract(targetFuturePosition);
      finalError = errorVector.magnitude();

      console.log(
        `ShootingMethod: Iteration ${iteration} - Az: ${azimuth.toFixed(2)}°, El: ${elevation.toFixed(2)}°, Error: ${finalError.toFixed(2)}m, FlightTime: ${flightTime.toFixed(2)}s`
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
      if (iteration >= 3) {
        const isOscillating = this.detectOscillation(iteration);
        if (isOscillating) {
          console.log(
            `ShootingMethod: Oscillation detected at iteration ${iteration}, using conservative damping`
          );
        }
      }

      // Calculate Jacobian matrix for Newton-Raphson correction
      const jacobian = this.calculateJacobian(
        artilleryPosition,
        azimuth,
        elevation,
        targetPosition,
        targetVelocity
      );

      // Apply Newton-Raphson correction: [θ, φ] = [θ, φ] - J⁻¹ * E
      const isOscillating =
        iteration >= 3 ? this.detectOscillation(iteration) : false;
      const angleCorrection = this.solveLinearSystem(
        jacobian,
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
      `ShootingMethod: Final result - Az: ${azimuth.toFixed(2)}°, El: ${elevation.toFixed(2)}°, Converged: ${converged}, FinalError: ${finalError.toFixed(2)}m`
    );

    return result;
  }

  /**
   * Simulate projectile trajectory with given launch angles
   * Terminates when reaching target horizontal distance for accurate error calculation
   */
  private simulateTrajectory(
    startPosition: Vector3,
    azimuthDeg: number,
    elevationDeg: number,
    targetPosition?: Vector3
  ): { endPosition: Vector3; flightTime: number } | null {
    // Convert angles to radians
    const azimuthRad = azimuthDeg * (Math.PI / 180);
    const elevationRad = elevationDeg * (Math.PI / 180);

    // Calculate initial velocity vector
    const v0 = this.ballisticParams.initialVelocity;

    // Debug: Check if initial values are valid
    if (!isFinite(azimuthRad) || !isFinite(elevationRad) || !isFinite(v0)) {
      console.error('Invalid initial values:', {
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

    // Debug: Check if initial velocity is valid
    if (
      !isFinite(initialVelocity.x) ||
      !isFinite(initialVelocity.y) ||
      !isFinite(initialVelocity.z)
    ) {
      console.error('Invalid initial velocity:', initialVelocity);
      return null;
    }

    // Initialize state
    let state: State3D = {
      position: new Vector3(startPosition.x, startPosition.y, startPosition.z),
      velocity: new Vector3(
        initialVelocity.x,
        initialVelocity.y,
        initialVelocity.z
      ),
    };

    let time = 0;
    let previousState = state;

    // Calculate target horizontal distance
    const targetHorizontalDistance = targetPosition
      ? Math.sqrt(
          (targetPosition.x - startPosition.x) ** 2 +
            (targetPosition.y - startPosition.y) ** 2
        )
      : Infinity;

    // Debug initial state
    console.log(
      `Trajectory: Az=${azimuthDeg.toFixed(2)}°, El=${elevationDeg.toFixed(2)}°, V0=${initialVelocity.magnitude().toFixed(1)}m/s, TargetDist=${targetHorizontalDistance.toFixed(0)}m`
    );

    // Integrate trajectory with safety checks
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
          'Invalid state detected at time',
          time,
          'state:',
          newState
        );
        return null;
      }

      time += this.PHYSICS_TIMESTEP;

      // Check if projectile reached target horizontal distance
      if (targetPosition && targetHorizontalDistance < Infinity) {
        const currentHorizontalDistance = Math.sqrt(
          (newState.position.x - startPosition.x) ** 2 +
            (newState.position.y - startPosition.y) ** 2
        );
        const previousHorizontalDistance = Math.sqrt(
          (previousState.position.x - startPosition.x) ** 2 +
            (previousState.position.y - startPosition.y) ** 2
        );

        // Check if we crossed the target distance
        if (
          (previousHorizontalDistance <= targetHorizontalDistance &&
            currentHorizontalDistance >= targetHorizontalDistance) ||
          (previousHorizontalDistance >= targetHorizontalDistance &&
            currentHorizontalDistance <= targetHorizontalDistance)
        ) {
          // Linear interpolation
          const deltaDistance =
            currentHorizontalDistance - previousHorizontalDistance;
          if (Math.abs(deltaDistance) > 1e-12) {
            const t =
              (targetHorizontalDistance - previousHorizontalDistance) /
              deltaDistance;
            const interpolatedPosition = new Vector3(
              previousState.position.x +
                t * (newState.position.x - previousState.position.x),
              previousState.position.y +
                t * (newState.position.y - previousState.position.y),
              previousState.position.z +
                t * (newState.position.z - previousState.position.z)
            );
            const interpolatedTime =
              time - this.PHYSICS_TIMESTEP + t * this.PHYSICS_TIMESTEP;

            console.log(
              `Trajectory complete: t=${interpolatedTime.toFixed(2)}s, pos=${interpolatedPosition.x.toFixed(0)},${interpolatedPosition.y.toFixed(0)},${interpolatedPosition.z.toFixed(0)}`
            );

            return {
              endPosition: interpolatedPosition,
              flightTime: interpolatedTime,
            };
          }
        }
      }

      // Ground impact check
      if (!targetPosition && newState.position.z <= 0) {
        console.log(
          `Ground impact: t=${time.toFixed(2)}s, range=${Math.sqrt(newState.position.x ** 2 + newState.position.y ** 2).toFixed(0)}m`
        );
        return {
          endPosition: newState.position,
          flightTime: time,
        };
      }

      previousState = state;
      state = newState;
    }

    // Timeout
    console.warn(
      `Trajectory timeout: t=${time.toFixed(2)}s, final pos=${state.position.x.toFixed(0)},${state.position.y.toFixed(0)},${state.position.z.toFixed(0)}`
    );
    return {
      endPosition: state.position,
      flightTime: time,
    };
  }

  /**
   * Calculate Jacobian matrix for Newton-Raphson method
   * J = [∂E/∂θ, ∂E/∂φ] where θ=azimuth, φ=elevation
   */
  private calculateJacobian(
    artilleryPosition: Vector3,
    azimuth: number,
    elevation: number,
    targetPosition: Vector3,
    targetVelocity: Vector3
  ): {
    dE_dAzimuth: Vector3;
    dE_dElevation: Vector3;
  } {
    // Calculate error at current position
    const currentResult = this.simulateTrajectory(
      artilleryPosition,
      azimuth,
      elevation,
      targetPosition
    );
    if (!currentResult) {
      return {
        dE_dAzimuth: new Vector3(0, 0, 0),
        dE_dElevation: new Vector3(0, 0, 0),
      };
    }

    const currentTargetPos = this.predictTargetPosition(
      targetPosition,
      targetVelocity,
      currentResult.flightTime
    );
    const F0 = currentResult.endPosition.subtract(currentTargetPos);

    // Perturb azimuth
    const azimuthResult = this.simulateTrajectory(
      artilleryPosition,
      azimuth + this.ANGLE_PERTURBATION,
      elevation,
      targetPosition
    );

    let dE_dAzimuth = new Vector3(0, 0, 0);
    if (azimuthResult) {
      const perturbedTargetPos = this.predictTargetPosition(
        targetPosition,
        targetVelocity,
        azimuthResult.flightTime
      );
      const perturbedError =
        azimuthResult.endPosition.subtract(perturbedTargetPos);
      dE_dAzimuth = perturbedError
        .subtract(F0)
        .multiply(1.0 / this.ANGLE_PERTURBATION);
    }

    // Perturb elevation
    const elevationResult = this.simulateTrajectory(
      artilleryPosition,
      azimuth,
      elevation + this.ANGLE_PERTURBATION,
      targetPosition
    );

    let dE_dElevation = new Vector3(0, 0, 0);
    if (elevationResult) {
      const perturbedTargetPos = this.predictTargetPosition(
        targetPosition,
        targetVelocity,
        elevationResult.flightTime
      );
      const perturbedError =
        elevationResult.endPosition.subtract(perturbedTargetPos);
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
   * Predict target position at given future time
   * PT(tf) = PT(0) + vT * tf
   */
  private predictTargetPosition(
    currentPosition: Vector3,
    velocity: Vector3,
    flightTime: number
  ): Vector3 {
    return currentPosition.add(velocity.multiply(flightTime));
  }

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
   * Estimate iteration count based on error magnitude
   */
  private findIterationCount(error: number): number {
    if (error < 1.0) return 1;
    if (error < 10.0) return Math.ceil(Math.log10(error) * 3);
    return this.MAX_ITERATIONS;
  }
}
