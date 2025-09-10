/**
 * TargetTracker - Target tracking and lock-on system for T022
 * Handles automatic target detection, tracking, and lock-on mechanics
 */

import { Vector3 } from '../math/Vector3';
import { Target, TargetType } from '../game/entities/Target';
import { Radar } from '../game/entities/Radar';

export interface TrackingState {
  isTracking: boolean;
  isLocked: boolean;
  lockedTarget: Target | null;
  lockStartTime: number | null;
  lockDuration: number; // milliseconds to achieve full lock
  lockStrength: number; // 0-1, how strong the lock is
  lastUpdateTime: number;
}

export interface DetectedTarget {
  target: Target;
  distance: number;
  bearing: number; // degrees from north
  elevation: number; // degrees above horizon
  velocity: Vector3;
  signalStrength: number; // 0-1
  detectionTime: number;
  lastSeenTime: number;
  trackingHistory: Vector3[]; // Position history for prediction
}

export interface TargetTrackingEvents {
  onTargetDetected: (target: DetectedTarget) => void;
  onTargetLost: (target: Target) => void;
  onLockAcquired: (target: DetectedTarget) => void;
  onLockLost: () => void;
  onTrackingUpdate: (target: DetectedTarget) => void;
}

export interface TrackingOptions {
  maxDetectionRange: number; // meters
  minSignalStrength: number; // 0-1
  lockRequiredTime: number; // milliseconds
  trackingHistoryLength: number; // number of position samples
  maxTrackingTargets: number;
  lostTargetTimeout: number; // milliseconds before target is considered lost
  minLockDistance: number; // minimum distance for lock-on
  maxLockDistance: number; // maximum distance for lock-on
}

/**
 * Manages target detection, tracking, and lock-on functionality
 */
export class TargetTracker {
  private _state: TrackingState;
  private _events: TargetTrackingEvents;
  private _options: TrackingOptions;
  private _radar: Radar;

  // Target management
  private _detectedTargets: Map<Target, DetectedTarget> = new Map();

  constructor(
    radar: Radar,
    events: TargetTrackingEvents,
    options?: Partial<TrackingOptions>
  ) {
    this._radar = radar;
    this._events = events;
    this._state = this.createInitialState();

    this._options = {
      maxDetectionRange: 15000, // 15km
      minSignalStrength: 0.1,
      lockRequiredTime: 2000, // 2 seconds
      trackingHistoryLength: 10,
      maxTrackingTargets: 8,
      lostTargetTimeout: 3000, // 3 seconds
      minLockDistance: 1000, // 1km
      maxLockDistance: 12000, // 12km
      ...options,
    };
  }

  /**
   * Create initial tracking state
   */
  private createInitialState(): TrackingState {
    return {
      isTracking: false,
      isLocked: false,
      lockedTarget: null,
      lockStartTime: null,
      lockDuration: 0,
      lockStrength: 0,
      lastUpdateTime: Date.now(),
    };
  }

  /**
   * Update target tracking system
   */
  update(targets: Target[]): void {
    const currentTime = Date.now();
    this._state.lastUpdateTime = currentTime;

    // Scan for targets within radar coverage
    this.scanForTargets(targets, currentTime);

    // Update existing tracked targets
    this.updateTrackedTargets(targets, currentTime);

    // Clean up lost targets
    this.cleanupLostTargets(currentTime);

    // Update lock-on state
    this.updateLockState(currentTime);
  }

  /**
   * Scan for new targets within radar detection range
   */
  private scanForTargets(targets: Target[], currentTime: number): void {
    for (const target of targets) {
      if (target.isDestroyed) continue;

      const distance = this.calculateDistance(target.position);

      // Check if target is within detection range
      if (distance > this._options.maxDetectionRange) continue;

      // For now, assume 360-degree coverage (omnidirectional radar)
      // TODO: Add directional radar support when radar entity is enhanced
      const radarPosition = this._radar.position;
      const bearing = this.calculateBearing(radarPosition, target.position);

      // Calculate signal strength based on distance and target characteristics
      const signalStrength = this.calculateSignalStrength(target, distance);
      if (signalStrength < this._options.minSignalStrength) continue;

      // Add or update detected target
      this.processDetectedTarget(
        target,
        distance,
        bearing,
        signalStrength,
        currentTime
      );
    }
  }

  /**
   * Process a detected target (new or updated)
   */
  private processDetectedTarget(
    target: Target,
    distance: number,
    bearing: number,
    signalStrength: number,
    currentTime: number
  ): void {
    const elevation = this.calculateElevation(target.position);

    if (this._detectedTargets.has(target)) {
      // Update existing target
      const detected = this._detectedTargets.get(target)!;

      // Update position history for velocity prediction
      detected.trackingHistory.push(target.position);
      if (
        detected.trackingHistory.length > this._options.trackingHistoryLength
      ) {
        detected.trackingHistory.shift();
      }

      // Calculate updated velocity
      detected.velocity = this.calculateVelocity(detected.trackingHistory);

      // Update other properties
      detected.distance = distance;
      detected.bearing = bearing;
      detected.elevation = elevation;
      detected.signalStrength = signalStrength;
      detected.lastSeenTime = currentTime;

      this._events.onTrackingUpdate(detected);
    } else {
      // New target detected
      if (this._detectedTargets.size >= this._options.maxTrackingTargets) {
        // Remove weakest signal target to make room
        this.removeWeakestTarget();
      }

      const detectedTarget: DetectedTarget = {
        target,
        distance,
        bearing,
        elevation,
        velocity: target.velocity,
        signalStrength,
        detectionTime: currentTime,
        lastSeenTime: currentTime,
        trackingHistory: [target.position],
      };

      this._detectedTargets.set(target, detectedTarget);
      this._events.onTargetDetected(detectedTarget);
    }
  }

  /**
   * Update tracking state for existing targets
   */
  private updateTrackedTargets(targets: Target[], currentTime: number): void {
    const activeTargets = new Set(targets.filter(t => !t.isDestroyed));

    for (const [target, detected] of this._detectedTargets) {
      // Check if target still exists and is active
      if (!activeTargets.has(target)) {
        detected.lastSeenTime =
          currentTime - this._options.lostTargetTimeout - 1;
      }
    }
  }

  /**
   * Clean up targets that haven't been seen recently
   */
  private cleanupLostTargets(currentTime: number): void {
    const toRemove: Target[] = [];

    for (const [target, detected] of this._detectedTargets) {
      const timeSinceLastSeen = currentTime - detected.lastSeenTime;

      if (timeSinceLastSeen > this._options.lostTargetTimeout) {
        toRemove.push(target);
        this._events.onTargetLost(target);

        // If this was the locked target, lose lock
        if (this._state.lockedTarget && this._state.lockedTarget === target) {
          this.releaseLock();
        }
      }
    }

    toRemove.forEach(target => this._detectedTargets.delete(target));
  }

  /**
   * Update lock-on state
   */
  private updateLockState(currentTime: number): void {
    if (this._state.isTracking && this._state.lockStartTime) {
      const lockDuration = currentTime - this._state.lockStartTime;
      this._state.lockDuration = lockDuration;

      // Calculate lock strength (0-1)
      this._state.lockStrength = Math.min(
        lockDuration / this._options.lockRequiredTime,
        1.0
      );

      // Check if full lock is achieved
      if (!this._state.isLocked && this._state.lockStrength >= 1.0) {
        this._state.isLocked = true;
        if (this._state.lockedTarget) {
          const detected = this._detectedTargets.get(this._state.lockedTarget);
          if (detected) {
            this._events.onLockAcquired(detected);
          }
        }
      }
    }
  }

  /**
   * Start tracking a specific target for lock-on
   */
  startTracking(target: Target): boolean {
    const detected = this._detectedTargets.get(target);
    if (!detected) return false;

    // Check if target is within lock range
    if (
      detected.distance < this._options.minLockDistance ||
      detected.distance > this._options.maxLockDistance
    ) {
      return false;
    }

    // Start tracking process
    const currentTime = Date.now();
    this._state.isTracking = true;
    this._state.isLocked = false;
    this._state.lockedTarget = target;
    this._state.lockStartTime = currentTime;
    this._state.lockDuration = 0;
    this._state.lockStrength = 0;

    return true;
  }

  /**
   * Release current lock-on
   */
  releaseLock(): void {
    this._state.isTracking = false;
    this._state.isLocked = false;
    this._state.lockedTarget = null;
    this._state.lockStartTime = null;
    this._state.lockDuration = 0;
    this._state.lockStrength = 0;

    this._events.onLockLost();
  }

  /**
   * Get best target candidate for automatic lock-on
   */
  getBestTarget(): DetectedTarget | null {
    if (this._detectedTargets.size === 0) return null;

    let bestTarget: DetectedTarget | null = null;
    let bestScore = 0;

    for (const detected of this._detectedTargets.values()) {
      // Skip targets outside lock range
      if (
        detected.distance < this._options.minLockDistance ||
        detected.distance > this._options.maxLockDistance
      ) {
        continue;
      }

      // Calculate targeting score (closer + stronger signal = better)
      const distanceScore =
        1 - detected.distance / this._options.maxLockDistance;
      const signalScore = detected.signalStrength;
      const velocityScore = Math.min(detected.velocity.magnitude() / 100, 1); // Moving targets prioritized

      const totalScore =
        distanceScore * 0.4 + signalScore * 0.4 + velocityScore * 0.2;

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestTarget = detected;
      }
    }

    return bestTarget;
  }

  /**
   * Calculate distance from radar to target
   */
  private calculateDistance(targetPosition: Vector3): number {
    const radarPosition = this._radar.position;
    return targetPosition.subtract(radarPosition).magnitude();
  }

  /**
   * Calculate bearing from radar to target (degrees from north)
   */
  private calculateBearing(
    radarPosition: Vector3,
    targetPosition: Vector3
  ): number {
    const delta = targetPosition.subtract(radarPosition);
    const bearing =
      ((Math.atan2(delta.x, delta.y) * 180) / Math.PI + 360) % 360;
    return bearing;
  }

  /**
   * Calculate elevation angle to target
   */
  private calculateElevation(targetPosition: Vector3): number {
    const radarPosition = this._radar.position;
    const delta = targetPosition.subtract(radarPosition);
    const horizontalDistance = Math.sqrt(delta.x * delta.x + delta.y * delta.y);
    const elevation = (Math.atan2(delta.z, horizontalDistance) * 180) / Math.PI;
    return elevation;
  }

  /**
   * Calculate signal strength based on target characteristics
   */
  private calculateSignalStrength(target: Target, distance: number): number {
    // Base signal strength decreases with distance
    const distanceFactor = Math.max(
      0,
      1 - distance / this._options.maxDetectionRange
    );

    // Target type affects signal strength (larger targets are easier to detect)
    let typeFactor = 0.5; // Base factor
    switch (target.type) {
      case TargetType.STATIC:
        typeFactor = 0.3; // Harder to detect when not moving
        break;
      case TargetType.MOVING_SLOW:
        typeFactor = 0.7; // Moderate detection
        break;
      case TargetType.MOVING_FAST:
        typeFactor = 1.0; // Easiest to detect due to Doppler effect
        break;
    }

    // Moving targets are easier to detect (Doppler effect)
    const velocityFactor = 1 + Math.min(target.velocity.magnitude() / 200, 0.5);

    return Math.min(distanceFactor * typeFactor * velocityFactor, 1.0);
  }

  /**
   * Calculate target velocity from position history
   */
  private calculateVelocity(history: Vector3[]): Vector3 {
    if (history.length < 2) return new Vector3(0, 0, 0);

    const latest = history[history.length - 1];
    const previous = history[history.length - 2];
    const deltaTime = 1 / 60; // Assume 60Hz updates

    return latest.subtract(previous).multiply(1 / deltaTime);
  }

  /**
   * Remove target with weakest signal to make room for new targets
   */
  private removeWeakestTarget(): void {
    let weakestTarget: Target | null = null;
    let weakestStrength = 1.0;

    for (const [target, detected] of this._detectedTargets) {
      if (detected.signalStrength < weakestStrength) {
        weakestStrength = detected.signalStrength;
        weakestTarget = target;
      }
    }

    if (weakestTarget) {
      this._events.onTargetLost(weakestTarget);
      this._detectedTargets.delete(weakestTarget);
    }
  }

  /**
   * Get current tracking state
   */
  getState(): TrackingState {
    return { ...this._state };
  }

  /**
   * Get all detected targets
   */
  getDetectedTargets(): DetectedTarget[] {
    return Array.from(this._detectedTargets.values());
  }

  /**
   * Get target by reference if tracked
   */
  getTrackedTarget(target: Target): DetectedTarget | null {
    return this._detectedTargets.get(target) || null;
  }

  /**
   * Get tracking options
   */
  getOptions(): TrackingOptions {
    return { ...this._options };
  }

  /**
   * Update tracking options
   */
  setOptions(options: Partial<TrackingOptions>): void {
    this._options = { ...this._options, ...options };
  }

  /**
   * Get number of detected targets
   */
  getDetectedTargetCount(): number {
    return this._detectedTargets.size;
  }
}
