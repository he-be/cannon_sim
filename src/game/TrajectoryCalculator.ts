/**
 * TrajectoryCalculator - Spec-compliant trajectory calculation for Browser Artillery
 * Implements only features specified in design.md and requirements.md
 */

import { Vector3 } from '../math/Vector3';

export interface FiringAngle {
  elevation: number; // degrees
  azimuth: number; // degrees
}

export interface TrajectoryData {
  initialVelocity: Vector3;
  flightTime: number;
  maxHeight: number;
}

/**
 * Calculates projectile trajectories for artillery targeting
 * Implements trajectory calculation as per GS-01, GS-02, UI-01, UI-13-2
 */
export class TrajectoryCalculator {
  private readonly GRAVITY = 9.81; // m/s²

  /**
   * Calculate trajectory to hit target position (GS-01)
   */
  calculateTrajectory(
    artilleryPos: Vector3,
    targetPos: Vector3
  ): TrajectoryData {
    const delta = targetPos.subtract(artilleryPos);
    const horizontalDistance = Math.sqrt(delta.x * delta.x + delta.y * delta.y);
    const heightDifference = delta.z;

    // Use 45-degree launch angle for optimal range (simplified ballistics)
    const launchAngle = Math.PI / 4; // 45 degrees in radians

    // Calculate required initial speed
    const numerator = this.GRAVITY * horizontalDistance * horizontalDistance;
    const denominator =
      horizontalDistance * Math.sin(2 * launchAngle) -
      2 * heightDifference * Math.cos(launchAngle) * Math.cos(launchAngle);

    const initialSpeed = Math.sqrt(numerator / denominator);

    // Calculate velocity components
    const horizontalSpeed = initialSpeed * Math.cos(launchAngle);
    const verticalSpeed = initialSpeed * Math.sin(launchAngle);

    // Direction vector in horizontal plane
    const horizontalDirection = new Vector3(delta.x, delta.y, 0).normalize();

    // Initial velocity vector
    const initialVelocity = new Vector3(
      horizontalDirection.x * horizontalSpeed,
      horizontalDirection.y * horizontalSpeed,
      verticalSpeed
    );

    // Flight time calculation
    const flightTime = horizontalDistance / horizontalSpeed;

    // Maximum height calculation
    const maxHeight =
      artilleryPos.z + (verticalSpeed * verticalSpeed) / (2 * this.GRAVITY);

    return {
      initialVelocity,
      flightTime,
      maxHeight,
    };
  }

  /**
   * Calculate firing angle for artillery aiming (UI-01)
   */
  calculateFiringAngle(artilleryPos: Vector3, targetPos: Vector3): FiringAngle {
    const delta = targetPos.subtract(artilleryPos);

    // Elevation angle (simplified to 45 degrees for optimal range)
    const elevation = 45;

    // Azimuth angle (horizontal direction)
    const azimuth = Math.atan2(delta.y, delta.x) * (180 / Math.PI);

    return {
      elevation,
      azimuth: azimuth < 0 ? azimuth + 360 : azimuth,
    };
  }

  /**
   * Generate trajectory points for visualization (UI-13-2)
   */
  getTrajectoryDisplayPoints(
    trajectory: TrajectoryData,
    numPoints: number
  ): Vector3[] {
    const points: Vector3[] = [];
    const timeStep = trajectory.flightTime / (numPoints - 1);

    for (let i = 0; i < numPoints; i++) {
      const t = i * timeStep;

      // Position at time t using kinematic equations
      const x = trajectory.initialVelocity.x * t;
      const y = trajectory.initialVelocity.y * t;
      const z = trajectory.initialVelocity.z * t - 0.5 * this.GRAVITY * t * t;

      points.push(new Vector3(x, y, z));
    }

    return points;
  }

  /**
   * Validate if target is reachable (physics constraint check)
   */
  isTargetReachable(artilleryPos: Vector3, targetPos: Vector3): boolean {
    const delta = targetPos.subtract(artilleryPos);
    const horizontalDistance = Math.sqrt(delta.x * delta.x + delta.y * delta.y);
    const heightDifference = delta.z;

    // Maximum theoretical range at 45 degrees on flat ground
    const maxRange = (400 * 400) / this.GRAVITY; // Assuming max initial speed of 400 m/s

    // Simple reachability check
    return horizontalDistance <= maxRange && heightDifference <= 1000; // Max height difference
  }
}
