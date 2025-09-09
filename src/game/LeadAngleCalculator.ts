/**
 * LeadAngleCalculator - Basic lead angle calculation for moving targets
 * Implements requirements GS-07 and UI-06 with simplified shooting method
 */

import { Vector3 } from '../math/Vector3';

export interface LeadAngle {
  azimuth: number; // degrees from north (clockwise)
  elevation: number; // degrees above horizon
}

/**
 * Calculates lead angles for moving targets using iterative approach
 * Based on simplified shooting method from ShootingMethod.txt
 */
export class LeadAngleCalculator {
  private readonly GRAVITY = 9.81; // m/s²
  private readonly AVERAGE_PROJECTILE_SPEED = 200; // m/s (simplified)
  private readonly MAX_ITERATIONS = 10;
  private readonly CONVERGENCE_TOLERANCE = 1.0; // meters

  /**
   * Calculate lead angle for hitting a moving target (GS-07)
   */
  calculateLeadAngle(
    artilleryPosition: Vector3,
    targetPosition: Vector3,
    targetVelocity: Vector3
  ): LeadAngle {
    // For stationary targets, use direct aim
    if (targetVelocity.magnitude() < 0.1) {
      return this.calculateDirectAim(artilleryPosition, targetPosition);
    }

    // Iterative calculation for moving targets
    let flightTime = this.estimateFlightTime(
      targetPosition.subtract(artilleryPosition).magnitude()
    );

    let bestAngle = this.calculateDirectAim(artilleryPosition, targetPosition);

    for (let i = 0; i < this.MAX_ITERATIONS; i++) {
      // Predict target's future position
      const futureTargetPos = this.predictTargetPosition(
        targetPosition,
        targetVelocity,
        flightTime
      );

      // Calculate angle to intercept point
      const interceptAngle = this.calculateDirectAim(
        artilleryPosition,
        futureTargetPos
      );

      // Estimate new flight time based on intercept distance
      const interceptDistance = futureTargetPos
        .subtract(artilleryPosition)
        .magnitude();
      const newFlightTime = this.estimateFlightTime(interceptDistance);

      // Check for convergence
      const timeDifference = Math.abs(newFlightTime - flightTime);
      if (timeDifference < 0.1) {
        // Converged within 0.1 seconds
        bestAngle = interceptAngle;
        break;
      }

      flightTime = newFlightTime;
      bestAngle = interceptAngle;
    }

    return bestAngle;
  }

  /**
   * Predict target position after given flight time
   */
  predictTargetPosition(
    currentPosition: Vector3,
    velocity: Vector3,
    flightTime: number
  ): Vector3 {
    // Simple linear prediction (constant velocity assumption)
    return currentPosition.add(velocity.multiply(flightTime));
  }

  /**
   * Estimate flight time based on distance (simplified ballistics)
   */
  estimateFlightTime(distance: number): number {
    // Simplified calculation assuming average speed over trajectory
    // In reality, this would need to account for gravity and air resistance
    const estimatedSpeed = this.AVERAGE_PROJECTILE_SPEED * 0.7; // Account for gravity
    return distance / estimatedSpeed;
  }

  /**
   * Calculate direct aim angle (for stationary targets)
   */
  private calculateDirectAim(
    artilleryPosition: Vector3,
    targetPosition: Vector3
  ): LeadAngle {
    const delta = targetPosition.subtract(artilleryPosition);

    // Azimuth: angle from north (Y-axis), clockwise positive
    const azimuth = Math.atan2(delta.x, delta.y) * (180 / Math.PI);

    // Elevation: angle above horizon (simplified for demonstration)
    // Using 45 degrees as optimal angle for maximum range
    const elevation = 45;

    return {
      azimuth: azimuth < 0 ? azimuth + 360 : azimuth,
      elevation,
    };
  }

  /**
   * Calculate recommended lead angle with convergence info (for UI display)
   */
  calculateRecommendedLead(
    artilleryPosition: Vector3,
    targetPosition: Vector3,
    targetVelocity: Vector3
  ): {
    leadAngle: LeadAngle;
    confidence: number; // 0-1, higher means more accurate
    leadDistance: number; // meters ahead of current target position
  } {
    const leadAngle = this.calculateLeadAngle(
      artilleryPosition,
      targetPosition,
      targetVelocity
    );

    // Calculate lead distance for user feedback
    const estimatedFlightTime = this.estimateFlightTime(
      targetPosition.subtract(artilleryPosition).magnitude()
    );
    const leadDistance = targetVelocity.magnitude() * estimatedFlightTime;

    // Confidence based on target speed and distance
    const targetSpeed = targetVelocity.magnitude();
    const distance = targetPosition.subtract(artilleryPosition).magnitude();
    const confidence = Math.max(
      0.1,
      Math.min(1.0, 1.0 - (targetSpeed * distance) / 100000)
    );

    return {
      leadAngle,
      confidence,
      leadDistance,
    };
  }
}
