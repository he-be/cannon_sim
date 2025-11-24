/**
 * TargetingSystem - Manages target tracking and locking
 * Extracted from GameScene for better modularity
 */

import { Target } from './entities/Target';

import { Vector3 } from '../math/Vector3';

export enum TargetingState {
  NO_TARGET = 'NO_TARGET',
  TRACKING = 'TRACKING',
  LOCKED_ON = 'LOCKED_ON',
}

export interface TargetingResult {
  state: TargetingState;
  trackedTarget: Target | null;
  lockedTarget: Target | null;
}

export class TargetingSystem {
  private targetingState: TargetingState = TargetingState.NO_TARGET;
  private trackedTarget: Target | null = null;
  private lockedTarget: Target | null = null;

  /**
   * Get current targeting state
   */
  getState(): TargetingResult {
    return {
      state: this.targetingState,
      trackedTarget: this.trackedTarget,
      lockedTarget: this.lockedTarget,
    };
  }

  /**
   * Get locked target
   */
  getLockedTarget(): Target | null {
    return this.lockedTarget;
  }

  /**
   * Get tracked target
   */
  getTrackedTarget(): Target | null {
    return this.trackedTarget;
  }

  /**
   * Get targeting state enum
   */
  getTargetingState(): TargetingState {
    return this.targetingState;
  }

  /**
   * Update targeting system
   * - If locked, keep tracking locked target
   * - Otherwise, find target based on radar parameters
   */
  update(
    targets: Target[],
    radarAzimuth: number,
    radarRange: number,
    artilleryPosition: Vector3,
    currentTime: number
  ): TargetingResult {
    // If we have a locked target, keep tracking it
    if (this.lockedTarget && !this.lockedTarget.isDestroyed) {
      this.targetingState = TargetingState.LOCKED_ON;
      this.trackedTarget = this.lockedTarget;
    } else {
      // Find target based on radar parameters
      const nearestTarget = this.findTargetByRadar(
        targets,
        radarAzimuth,
        radarRange,
        artilleryPosition,
        currentTime
      );

      if (nearestTarget) {
        this.targetingState = TargetingState.TRACKING;
        this.trackedTarget = nearestTarget;
      } else {
        this.targetingState = TargetingState.NO_TARGET;
        this.trackedTarget = null;
      }
    }

    return this.getState();
  }

  /**
   * Handle target lock toggle
   * - If tracking, lock on
   * - If locked, unlock
   */
  handleLockToggle(): TargetingResult {
    if (this.targetingState === TargetingState.TRACKING && this.trackedTarget) {
      // Lock on to tracked target
      this.lockedTarget = this.trackedTarget;
      this.targetingState = TargetingState.LOCKED_ON;
    } else if (this.targetingState === TargetingState.LOCKED_ON) {
      // Unlock
      this.lockedTarget = null;
      this.targetingState = TargetingState.NO_TARGET;
      this.trackedTarget = null;
    }

    return this.getState();
  }

  /**
   * Clear targeting (e.g., when target is destroyed or out of range)
   */
  clearTargeting(): void {
    this.targetingState = TargetingState.NO_TARGET;
    this.trackedTarget = null;
    this.lockedTarget = null;
  }

  /**
   * Clear lock only (keep tracking if available)
   */
  clearLock(): void {
    if (this.targetingState === TargetingState.LOCKED_ON) {
      this.lockedTarget = null;
      this.targetingState = this.trackedTarget
        ? TargetingState.TRACKING
        : TargetingState.NO_TARGET;
    }
  }

  /**
   * Find target based on radar azimuth and range
   */
  private findTargetByRadar(
    targets: Target[],
    radarAzimuth: number,
    radarRange: number,
    artilleryPosition: Vector3,
    currentTime: number
  ): Target | null {
    const BEAM_WIDTH_DEGREES = 5; // 5 degree radar beam width
    const RANGE_TOLERANCE = 200; // 200m range tolerance

    return (
      targets.find(target => {
        if (!target.isActive || currentTime < target.spawnTime) return false;

        // Calculate target's bearing and distance from artillery position
        // Using XY plane for horizontal radar calculations
        const dx = target.position.x - artilleryPosition.x;
        const dy = target.position.y - artilleryPosition.y;
        const targetDistance = Math.sqrt(dx * dx + dy * dy);

        // Calculate target's azimuth angle (normalized to 0-360)
        let targetAzimuth = Math.atan2(dx, dy) * (180 / Math.PI);
        if (targetAzimuth < 0) targetAzimuth += 360;

        // Normalize radar azimuth to 0-360
        let radarAz = radarAzimuth;
        while (radarAz < 0) radarAz += 360;
        while (radarAz >= 360) radarAz -= 360;

        // Calculate angular difference (handling 360-degree boundary)
        let angleDiff = Math.abs(targetAzimuth - radarAz);
        if (angleDiff > 180) angleDiff = 360 - angleDiff;

        // Check if target is within radar beam width and range cursor tolerance
        const withinBeam = angleDiff <= BEAM_WIDTH_DEGREES / 2;
        const withinRange =
          Math.abs(targetDistance - radarRange) <= RANGE_TOLERANCE;

        return withinBeam && withinRange;
      }) || null
    );
  }

  /**
   * Reset targeting system
   */
  reset(): void {
    this.clearTargeting();
  }
}
