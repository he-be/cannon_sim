/**
 * LeadAngleSystem - Manages lead angle calculation for moving targets
 * Extracted from GameScene for better modularity
 */

import { Target, TargetType } from './entities/Target';
import { LeadAngleCalculator } from './LeadAngleCalculator';
import { Vector3 } from '../math/Vector3';

// Extended lead angle interface with display information
export interface ExtendedLeadAngle {
  azimuth: number;
  elevation: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  convergenceError?: number;
  flightTime?: number;
  converged?: boolean;
  iterations?: number;
  accuracy?: number;
}

export class LeadAngleSystem {
  private calculator: LeadAngleCalculator;
  private currentLeadAngle: ExtendedLeadAngle | null = null;
  private updateTimer: number = 0;
  private lastTrackedTargetId: string | null = null;
  private artilleryPosition: Vector3;

  // Update intervals
  private readonly UPDATE_INTERVAL_MOVING = 0.033; // ~30Hz for moving targets
  private readonly UPDATE_INTERVAL_STATIC = 0.2; // 5Hz for static targets

  constructor(artilleryPosition: Vector3) {
    this.artilleryPosition = artilleryPosition;
    this.calculator = new LeadAngleCalculator();
  }

  /**
   * Update lead angle calculation
   * @param deltaTime Time since last update
   * @param target Current target (locked or tracked)
   * @returns True if lead angle was updated
   */
  update(deltaTime: number, target: Target | null): boolean {
    if (!target) {
      this.currentLeadAngle = null;
      this.updateTimer = 0;
      this.lastTrackedTargetId = null;
      return false;
    }

    this.updateTimer += deltaTime;

    // Determine update interval based on target type
    const isMovingTarget = target.type !== TargetType.STATIC;
    const updateInterval = isMovingTarget
      ? this.UPDATE_INTERVAL_MOVING
      : this.UPDATE_INTERVAL_STATIC;

    // Check if we need to update
    if (this.updateTimer >= updateInterval) {
      // Reset target history if target changed
      if (this.lastTrackedTargetId !== target.id) {
        this.calculator.resetTargetTracking();
        this.lastTrackedTargetId = target.id;
      }

      // Calculate lead angle with extended info
      // Use incremental calculation if available for better performance
      const leadResult = this.calculator.calculateRecommendedLeadIncremental(
        this.artilleryPosition, // Artillery position (should be passed in or stored)
        target.position,
        target.velocity || new Vector3(0, 0, 0),
        target.id
      );

      if (leadResult && leadResult.leadAngle) {
        // Store with extended information
        this.currentLeadAngle = {
          azimuth: leadResult.leadAngle.azimuth,
          elevation: leadResult.leadAngle.elevation,
          confidence: leadResult.confidence,
          convergenceError: leadResult.accuracy, // Map accuracy to convergenceError
          flightTime: leadResult.flightTime,
          converged: leadResult.converged,
          iterations: leadResult.iterations,
          accuracy: leadResult.accuracy,
        };
      } else {
        this.currentLeadAngle = null;
      }

      this.updateTimer = 0;
      return true;
    }

    return false;
  }

  /**
   * Get current lead angle
   */
  getLeadAngle(): ExtendedLeadAngle | null {
    return this.currentLeadAngle;
  }

  /**
   * Check if lead angle is available
   */
  hasLeadAngle(): boolean {
    return this.currentLeadAngle !== null;
  }

  /**
   * Clear lead angle (e.g., when target is lost)
   */
  clear(): void {
    this.currentLeadAngle = null;
    this.updateTimer = 0;
    this.lastTrackedTargetId = null;
    this.calculator.resetTargetTracking();
  }

  /**
   * Reset system
   */
  reset(): void {
    this.clear();
  }
}
