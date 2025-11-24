/**
 * TargetingSystem - Manages target tracking and locking
 * Extracted from GameScene for better modularity
 */

import { Target } from './entities/Target';
import { Vector2 } from '../math/Vector2';
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
   * - Otherwise, find target near cursor
   */
  update(
    targets: Target[],
    cursorPosition: Vector2,
    radarPosition: Vector3,
    maxRange: number,
    currentTime: number
  ): TargetingResult {
    // If we have a locked target, keep tracking it
    if (this.lockedTarget && !this.lockedTarget.isDestroyed) {
      this.targetingState = TargetingState.LOCKED_ON;
      this.trackedTarget = this.lockedTarget;
    } else {
      // Find target near cursor for tracking
      const nearestTarget = this.findTargetNearCursor(
        targets,
        cursorPosition,
        radarPosition,
        maxRange,
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
   * Find the target nearest to the cursor position
   */
  private findTargetNearCursor(
    targets: Target[],
    cursorPosition: Vector2,
    radarPosition: Vector3,
    maxRange: number,
    currentTime: number
  ): Target | null {
    const CURSOR_THRESHOLD = 50; // pixels

    let nearestTarget: Target | null = null;
    let minDistance = CURSOR_THRESHOLD;

    targets.forEach(target => {
      // Only consider active targets that have spawned
      if (!target.isActive || currentTime < target.spawnTime) return;

      // Check if target is within radar range
      const distanceFromRadar = target.position
        .subtract(radarPosition)
        .magnitude();
      if (distanceFromRadar > maxRange) return;

      // Calculate screen position (simplified 2D projection)
      // This would typically use RadarCoordinateConverter in full implementation
      const relativePos = target.position.subtract(radarPosition);
      const azimuth = Math.atan2(relativePos.y, relativePos.x);
      const range = Math.sqrt(
        relativePos.x * relativePos.x + relativePos.y * relativePos.y
      );

      // Convert to screen coordinates (for cursor comparison)
      // This is a simplified version - real implementation uses canvas coordinates
      const screenX = range * Math.cos(azimuth);
      const screenY = range * Math.sin(azimuth);
      const screenPos = new Vector2(screenX, screenY);

      const distanceToCursor = screenPos.subtract(cursorPosition).magnitude();

      if (distanceToCursor < minDistance) {
        minDistance = distanceToCursor;
        nearestTarget = target;
      }
    });

    return nearestTarget;
  }

  /**
   * Reset targeting system
   */
  reset(): void {
    this.clearTargeting();
  }
}
