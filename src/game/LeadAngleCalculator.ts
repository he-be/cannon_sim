/**
 * LeadAngleCalculator - Accurate lead angle calculation using Shooting Method
 * Implements requirements GS-07 with mathematically rigorous ballistic calculation
 * Based on docs/ShootingMethod.txt numerical analysis approach
 */

import { Vector3 } from '../math/Vector3';
import {
  ShootingMethodSolver,
  createDefaultBallisticParameters,
  ShootingResult,
} from './ShootingMethodSolver';

export interface LeadAngle {
  azimuth: number; // degrees from north (clockwise)
  elevation: number; // degrees above horizon
}

export interface RecommendedLeadResult {
  leadAngle: LeadAngle;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  flightTime?: number;
  converged?: boolean;
  iterations?: number;
  accuracy?: number; // Final error in meters
  leadDistance?: number; // meters ahead of current target position
}

export interface TargetTrackingState {
  targetId: string;
  lastPosition: Vector3;
  lastVelocity: Vector3;
  lastCalculatedAngle: LeadAngle;
  lastCalculationTime: number;
  calculationCount: number;
  lastConverged: boolean;
}

export interface IncrementalCalculationOptions {
  useIncrementalUpdate: boolean;
  maxIterationsMoving: number;
  maxIterationsStatic: number;
  quickConvergenceTolerance: number; // meters
  finalConvergenceTolerance: number; // meters
}

/**
 * High-precision lead angle calculator using Shooting Method
 * Replaces placeholder implementation with mathematically rigorous approach
 */
export class LeadAngleCalculator {
  private shootingMethodSolver: ShootingMethodSolver;

  // Target tracking state for incremental updates
  private currentTargetState: TargetTrackingState | null = null;
  private incrementalOptions: IncrementalCalculationOptions;

  constructor() {
    const ballisticParams = createDefaultBallisticParameters();
    this.shootingMethodSolver = new ShootingMethodSolver(ballisticParams);

    // Initialize incremental calculation options optimized for moving target tracking
    this.incrementalOptions = {
      useIncrementalUpdate: true,
      maxIterationsMoving: 8, // Increased iterations for better moving target accuracy
      maxIterationsStatic: 12, // Optimized for static targets
      quickConvergenceTolerance: 50.0, // Tighter quick convergence (50m vs 100m)
      finalConvergenceTolerance: 5.0, // Higher final accuracy (5m vs 10m)
    };
  }

  /**
   * Calculate lead angle for hitting a moving target (GS-07)
   * Uses Shooting Method for accurate ballistic calculation
   */
  calculateLeadAngle(
    artilleryPosition: Vector3,
    targetPosition: Vector3,
    targetVelocity: Vector3
  ): LeadAngle {
    // Use Shooting Method for accurate ballistic calculation
    const shootingResult = this.shootingMethodSolver.solve(
      artilleryPosition,
      targetPosition,
      targetVelocity
    );

    return {
      azimuth: this.normalizeAzimuth(shootingResult.azimuth),
      elevation: Math.max(5, Math.min(85, shootingResult.elevation)), // Artillery limits
    };
  }

  /**
   * Calculate recommended lead angle with detailed information (UI display)
   */
  calculateRecommendedLead(
    artilleryPosition: Vector3,
    targetPosition: Vector3,
    targetVelocity: Vector3
  ): RecommendedLeadResult {
    // Perform Shooting Method calculation
    const shootingResult = this.shootingMethodSolver.solve(
      artilleryPosition,
      targetPosition,
      targetVelocity
    );

    // Calculate confidence based on convergence performance
    const confidence = this.calculateConfidence(shootingResult);

    // Calculate lead distance for user feedback
    const leadDistance =
      targetVelocity.magnitude() * (shootingResult.flightTime || 0);

    return {
      leadAngle: {
        azimuth: this.normalizeAzimuth(shootingResult.azimuth),
        elevation: Math.max(5, Math.min(85, shootingResult.elevation)),
      },
      confidence,
      flightTime: shootingResult.flightTime,
      converged: shootingResult.converged,
      iterations: shootingResult.iterations,
      accuracy: shootingResult.finalError,
      leadDistance,
    };
  }

  /**
   * Calculate recommended lead angle with incremental updates for moving targets
   * Uses previous calculation results as starting point for faster convergence
   */
  calculateRecommendedLeadIncremental(
    artilleryPosition: Vector3,
    targetPosition: Vector3,
    targetVelocity: Vector3,
    targetId: string
  ): RecommendedLeadResult {
    const calculationStartTime = Date.now();

    // Check if this is the same target as last calculation
    const isContinuousTarget = this.isTargetContinuous(
      targetId,
      targetPosition,
      targetVelocity,
      calculationStartTime
    );

    const isMovingTarget = targetVelocity.magnitude() > 1.0; // > 1 m/s

    let result: RecommendedLeadResult;

    // For moving targets, use incremental updates if available
    if (
      isMovingTarget &&
      isContinuousTarget &&
      this.incrementalOptions.useIncrementalUpdate
    ) {
      result = this.performIncrementalCalculation(
        artilleryPosition,
        targetPosition,
        targetVelocity,
        targetId,
        calculationStartTime
      );
    } else {
      // For static targets or first-time calculations, use standard method
      result = this.calculateRecommendedLead(
        artilleryPosition,
        targetPosition,
        targetVelocity
      );
    }

    // Update target tracking state
    this.updateTargetTracking(
      targetId,
      targetPosition,
      targetVelocity,
      result.leadAngle,
      calculationStartTime,
      result.converged || false
    );

    return result;
  }

  /**
   * Perform incremental calculation starting from previous angle
   */
  private performIncrementalCalculation(
    artilleryPosition: Vector3,
    targetPosition: Vector3,
    targetVelocity: Vector3,
    targetId: string,
    timestamp: number
  ): RecommendedLeadResult {
    if (!this.currentTargetState) {
      // Fallback to regular calculation
      return this.calculateRecommendedLead(
        artilleryPosition,
        targetPosition,
        targetVelocity
      );
    }

    // Use previous angle as starting point
    const startingAngle = this.currentTargetState.lastCalculatedAngle;

    console.log(
      `Incremental calculation: Starting from Az=${startingAngle.azimuth.toFixed(2)}°, El=${startingAngle.elevation.toFixed(2)}°`
    );

    // First phase: quick convergence with relaxed tolerance
    const quickResult = this.shootingMethodSolver.solveFromInitialGuess(
      artilleryPosition,
      targetPosition,
      targetVelocity,
      startingAngle.azimuth,
      startingAngle.elevation,
      this.incrementalOptions.maxIterationsMoving,
      this.incrementalOptions.quickConvergenceTolerance
    );

    // Calculate confidence based on convergence performance
    const confidence = this.calculateConfidence(quickResult);

    // Calculate lead distance for user feedback
    const leadDistance =
      targetVelocity.magnitude() * (quickResult.flightTime || 0);

    const result: RecommendedLeadResult = {
      leadAngle: {
        azimuth: this.normalizeAzimuth(quickResult.azimuth),
        elevation: Math.max(5, Math.min(85, quickResult.elevation)),
      },
      confidence,
      flightTime: quickResult.flightTime,
      converged: quickResult.converged,
      iterations: quickResult.iterations,
      accuracy: quickResult.finalError,
      leadDistance,
    };

    // Update target tracking state
    this.updateTargetTracking(
      targetId,
      targetPosition,
      targetVelocity,
      result.leadAngle,
      timestamp,
      result.converged || false
    );

    console.log(
      `Incremental result: Az=${result.leadAngle.azimuth.toFixed(2)}°, El=${result.leadAngle.elevation.toFixed(2)}°, Error=${result.accuracy?.toFixed(1) || 'N/A'}m, Converged=${result.converged}`
    );

    return result;
  }

  /**
   * Check if target is continuous with previous calculation
   */
  private isTargetContinuous(
    targetId: string,
    targetPosition: Vector3,
    targetVelocity: Vector3,
    currentTime: number
  ): boolean {
    if (
      !this.currentTargetState ||
      this.currentTargetState.targetId !== targetId
    ) {
      return false;
    }

    // Check if too much time has passed (more than 2 seconds indicates discontinuity)
    const timeDelta = currentTime - this.currentTargetState.lastCalculationTime;
    if (timeDelta > 2000) {
      return false;
    }

    // Check if target has moved too far from expected position
    const expectedPosition = this.currentTargetState.lastPosition.add(
      this.currentTargetState.lastVelocity.multiply(timeDelta / 1000.0)
    );
    const positionError = targetPosition.subtract(expectedPosition).magnitude();
    if (positionError > 500) {
      // 500m tolerance for position prediction
      return false;
    }

    // Check if velocity has changed significantly
    const velocityChange = targetVelocity
      .subtract(this.currentTargetState.lastVelocity)
      .magnitude();
    if (velocityChange > 50) {
      // 50 m/s velocity change tolerance
      return false;
    }

    return true;
  }

  /**
   * Update target tracking state
   */
  private updateTargetTracking(
    targetId: string,
    targetPosition: Vector3,
    targetVelocity: Vector3,
    calculatedAngle: LeadAngle,
    timestamp: number,
    converged: boolean
  ): void {
    this.currentTargetState = {
      targetId,
      lastPosition: new Vector3(
        targetPosition.x,
        targetPosition.y,
        targetPosition.z
      ),
      lastVelocity: new Vector3(
        targetVelocity.x,
        targetVelocity.y,
        targetVelocity.z
      ),
      lastCalculatedAngle: {
        azimuth: calculatedAngle.azimuth,
        elevation: calculatedAngle.elevation,
      },
      lastCalculationTime: timestamp,
      calculationCount: (this.currentTargetState?.calculationCount || 0) + 1,
      lastConverged: converged,
    };
  }

  /**
   * Reset target tracking (useful when switching targets)
   */
  public resetTargetTracking(): void {
    this.currentTargetState = null;
    console.log('Target tracking reset');
  }

  /**
   * Get current target tracking info for debugging
   */
  public getTargetTrackingInfo(): TargetTrackingState | null {
    return this.currentTargetState;
  }

  /**
   * Estimate flight time based on distance (simple ballistic approximation)
   */
  estimateFlightTime(distance: number): number {
    // Simple approximation: use typical artillery shell velocity (~850 m/s)
    // and account for ballistic trajectory overhead (factor of ~1.1)
    const typicalMuzzleVelocity = 850; // m/s
    const trajectoryFactor = 1.1; // Account for arc trajectory

    return (distance * trajectoryFactor) / typicalMuzzleVelocity;
  }

  private calculateConfidence(
    result: ShootingResult
  ): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (!result.converged) {
      return 'LOW';
    }

    if (result.finalError < 5 && result.iterations < 8) {
      return 'HIGH'; // High precision, fast convergence
    } else if (result.finalError < 15 && result.iterations < 12) {
      return 'MEDIUM'; // Acceptable precision and convergence
    } else {
      return 'LOW'; // Poor precision or slow convergence
    }
  }

  /**
   * Normalize azimuth to 0-360 degree range
   */
  private normalizeAzimuth(azimuth: number): number {
    while (azimuth < 0) azimuth += 360;
    while (azimuth >= 360) azimuth -= 360;
    return azimuth;
  }
}
