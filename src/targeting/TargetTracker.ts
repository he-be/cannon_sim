/**
 * TargetTracker - Target tracking and lock-on system for T022
 * Handles automatic target detection, tracking, and lock-on mechanics
 */

import { Vector3 } from '../math/Vector3';
import { Target, TargetType } from '../game/entities/Target';
import { Radar } from '../game/entities/Radar';
import { PhysicsEngine } from '../physics/PhysicsEngine';
import { Forces } from '../physics/Forces';

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

export interface LeadSolution {
  azimuth: number; // 推奨方位角 (degrees)
  elevation: number; // 推奨仰角 (degrees)
  flightTime: number; // 弾道時間 (seconds)
  targetFuturePos: Vector3; // 目標未来位置
  impactPos: Vector3; // 着弾予測位置
  convergenceError: number; // 収束誤差 (meters)
  converged: boolean; // 収束成功フラグ
}

export interface BallisticsParameters {
  muzzleVelocity: number; // 初速 (m/s)
  mass: number; // 砲弾質量 (kg)
  dragCoefficient: number; // 抗力係数
  crossSectionalArea: number; // 断面積 (m²)
  airDensity: number; // 大気密度 (kg/m³)
  gravity: number; // 重力加速度 (m/s²)
  earthAngularVelocity: number; // 地球角速度 (rad/s)
  latitude: number; // 緯度 (degrees)
}

export interface ArtilleryConfiguration {
  muzzleVelocity: number;
  projectileMass: number;
  dragCoefficient: number;
  caliber: number; // mm
}

/**
 * Manages target detection, tracking, and lock-on functionality
 */
export class TargetTracker {
  private _state: TrackingState;
  private _events: TargetTrackingEvents;
  private _options: TrackingOptions;
  private _radar: Radar;
  // Ballistics calculation
  private _ballisticsParams: BallisticsParameters;
  private _physicsEngine: PhysicsEngine;

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

    // Initialize with default environmental parameters only
    // Artillery-specific parameters will be provided at calculation time
    this._ballisticsParams = {
      muzzleVelocity: 800, // Default, will be overridden
      mass: 45, // Default, will be overridden
      dragCoefficient: 0.47, // Default, will be overridden
      crossSectionalArea: 0.02, // Default, will be overridden
      airDensity: 1.225, // sea level air density
      gravity: 9.81,
      earthAngularVelocity: 7.292e-5, // rad/s
      latitude: 35.0, // degrees (default location)
    };

    // Initialize physics engine for ballistic calculations
    this._physicsEngine = new PhysicsEngine(
      this.createBallisticsAcceleration.bind(this)
    );
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

  /**
   * Update ballistics parameters from artillery configuration
   */
  private updateBallisticsFromArtillery(config: ArtilleryConfiguration): void {
    // Calculate cross-sectional area from caliber (mm to m²)
    const radius = config.caliber / 2 / 1000; // Convert mm to meters
    const crossSectionalArea = Math.PI * radius * radius;

    this._ballisticsParams = {
      ...this._ballisticsParams,
      muzzleVelocity: config.muzzleVelocity,
      mass: config.projectileMass,
      dragCoefficient: config.dragCoefficient,
      crossSectionalArea: crossSectionalArea,
    };
  }

  /**
   * Set environmental parameters for ballistic calculations
   */
  setEnvironmentalParameters(params: {
    airDensity?: number;
    gravity?: number;
    latitude?: number;
  }): void {
    this._ballisticsParams = {
      ...this._ballisticsParams,
      ...params,
    };
  }

  /**
   * Create acceleration function for ballistic calculations
   * Implements forces from ShootingMethod.txt: gravity, drag, Coriolis
   */
  private createBallisticsAcceleration(
    state: { position: Vector3; velocity: Vector3 },
    _time: number
  ): Vector3 {
    const {
      mass,
      dragCoefficient,
      crossSectionalArea,
      airDensity,
      gravity,
      earthAngularVelocity,
      latitude,
    } = this._ballisticsParams;

    // Gravity force (always downward in game coordinates)
    const gravityForce = Forces.gravity(mass, gravity, new Vector3(0, 0, -1));

    // Drag force (quadratic, opposite to velocity)
    const dragForce = Forces.drag(
      state.velocity,
      airDensity,
      dragCoefficient,
      crossSectionalArea
    );

    // Coriolis force (Earth rotation effect)
    // Convert latitude to radians and create angular velocity vector
    const latRad = (latitude * Math.PI) / 180;
    const earthOmega = new Vector3(
      0, // No x-component in our coordinate system
      earthAngularVelocity * Math.cos(latRad), // Y-component (north)
      earthAngularVelocity * Math.sin(latRad) // Z-component (up)
    );
    const coriolisForce = Forces.coriolis(mass, earthOmega, state.velocity);

    // Sum all forces and convert to acceleration
    const totalForce = Forces.sum(gravityForce, dragForce, coriolisForce);
    return totalForce.multiply(1 / mass);
  }

  /**
   * Calculate recommended lead angles using Shooting Method
   * Implements the iterative solution from ShootingMethod.txt Section 5
   */
  calculateLeadAngles(
    target: DetectedTarget,
    artilleryPosition: Vector3,
    artilleryConfig?: ArtilleryConfiguration
  ): LeadSolution | null {
    if (!target) return null;

    // Update ballistics parameters from artillery configuration if provided
    if (artilleryConfig) {
      this.updateBallisticsFromArtillery(artilleryConfig);
    }

    const maxIterations = 15;
    const convergenceThreshold = 10.0; // 10 meter accuracy (realistic for artillery)
    let iteration = 0;

    // Step 1: Initial guess (simple ballistic approximation)
    const initialGuess = this.calculateSimpleBallisticAngles(
      target,
      artilleryPosition
    );
    let currentAzimuth = initialGuess.azimuth;
    let currentElevation = initialGuess.elevation;
    let currentFlightTime = initialGuess.flightTime;

    while (iteration < maxIterations) {
      // Step 2: Predict target future position
      const targetFuturePos = this.predictTargetPosition(
        target,
        currentFlightTime
      );

      // Step 3: Calculate projectile trajectory with current angles
      const impactPos = this.simulateTrajectory(
        currentAzimuth,
        currentElevation,
        artilleryPosition,
        currentFlightTime
      );

      // Step 4: Calculate error
      const error = targetFuturePos.subtract(impactPos);
      const errorMagnitude = error.magnitude();

      // Check convergence
      if (errorMagnitude < convergenceThreshold) {
        return {
          azimuth: currentAzimuth,
          elevation: currentElevation,
          flightTime: currentFlightTime,
          targetFuturePos,
          impactPos,
          convergenceError: errorMagnitude,
          converged: true,
        };
      }

      // Step 5: Update angles using Newton-Raphson method
      const angleUpdate = this.calculateAngleCorrection(
        error,
        currentAzimuth,
        currentElevation,
        artilleryPosition,
        currentFlightTime
      );

      currentAzimuth += angleUpdate.deltaAzimuth;
      currentElevation += angleUpdate.deltaElevation;

      // Update flight time estimate
      const distance = targetFuturePos.subtract(artilleryPosition).magnitude();
      currentFlightTime =
        distance / (this._ballisticsParams.muzzleVelocity * 0.8); // Account for drag

      iteration++;
    }

    // Return non-converged result
    const finalTargetPos = this.predictTargetPosition(
      target,
      currentFlightTime
    );
    const finalImpactPos = this.simulateTrajectory(
      currentAzimuth,
      currentElevation,
      artilleryPosition,
      currentFlightTime
    );

    return {
      azimuth: currentAzimuth,
      elevation: currentElevation,
      flightTime: currentFlightTime,
      targetFuturePos: finalTargetPos,
      impactPos: finalImpactPos,
      convergenceError: finalTargetPos.subtract(finalImpactPos).magnitude(),
      converged: false,
    };
  }

  /**
   * Calculate simple ballistic angles as initial guess
   */
  private calculateSimpleBallisticAngles(
    target: DetectedTarget,
    artilleryPos: Vector3
  ): {
    azimuth: number;
    elevation: number;
    flightTime: number;
  } {
    const delta = target.target.position.subtract(artilleryPos);
    const horizontalDistance = Math.sqrt(delta.x * delta.x + delta.y * delta.y);
    const verticalDistance = delta.z;

    // Simple ballistic calculation (ignore drag and Coriolis for initial guess)
    const v0 = this._ballisticsParams.muzzleVelocity;
    const g = this._ballisticsParams.gravity;

    // Simple elevation calculation (avoid complex square root that might be imaginary)
    let elevation: number;
    const discriminant =
      v0 * v0 * v0 * v0 -
      g *
        (g * horizontalDistance * horizontalDistance +
          2 * verticalDistance * v0 * v0);

    if (discriminant >= 0 && horizontalDistance > 0) {
      elevation =
        Math.atan2(v0 * v0 + Math.sqrt(discriminant), g * horizontalDistance) *
        (180 / Math.PI);
    } else {
      // Fallback: simple angle based on distance and height
      elevation =
        Math.atan2(
          verticalDistance + horizontalDistance * 0.1,
          horizontalDistance
        ) *
        (180 / Math.PI);
      elevation = Math.max(5, Math.min(45, elevation)); // Clamp between 5-45 degrees
    }

    // Azimuth to target current position
    const azimuth = Math.atan2(delta.x, delta.y) * (180 / Math.PI);

    // Flight time estimate (more robust)
    const elevationRad = (elevation * Math.PI) / 180;
    const horizontalVelocity = v0 * Math.cos(elevationRad);
    const flightTime =
      horizontalVelocity > 0
        ? horizontalDistance / horizontalVelocity
        : horizontalDistance / v0;

    return { azimuth, elevation, flightTime };
  }

  /**
   * Predict target position at given time
   */
  private predictTargetPosition(
    target: DetectedTarget,
    flightTime: number
  ): Vector3 {
    // Simple linear motion prediction: P(t) = P(0) + v*t
    return target.target.position.add(target.velocity.multiply(flightTime));
  }

  /**
   * Simulate projectile trajectory using physics engine
   */
  private simulateTrajectory(
    azimuth: number,
    elevation: number,
    startPos: Vector3,
    flightTime: number
  ): Vector3 {
    const azimuthRad = (azimuth * Math.PI) / 180;
    const elevationRad = (elevation * Math.PI) / 180;
    const v0 = this._ballisticsParams.muzzleVelocity;

    // Convert angles to initial velocity vector (game coordinate system)
    const initialVelocity = new Vector3(
      v0 * Math.cos(elevationRad) * Math.sin(azimuthRad), // X: east
      v0 * Math.cos(elevationRad) * Math.cos(azimuthRad), // Y: north
      v0 * Math.sin(elevationRad) // Z: up
    );

    let state = { position: startPos.copy(), velocity: initialVelocity };
    const dt = 0.01; // 10ms time step
    let currentTime = 0;

    // Simulate trajectory until specified flight time
    while (currentTime < flightTime && state.position.z >= 0) {
      state = this._physicsEngine.integrate(state, currentTime, dt);
      currentTime += dt;

      // Ground impact check
      if (state.position.z <= 0) {
        break;
      }
    }

    return state.position;
  }

  /**
   * Calculate angle correction using numerical differentiation
   */
  private calculateAngleCorrection(
    error: Vector3,
    currentAzimuth: number,
    currentElevation: number,
    artilleryPos: Vector3,
    flightTime: number
  ): { deltaAzimuth: number; deltaElevation: number } {
    const deltaAngle = 0.1; // Small angle change for numerical differentiation

    // Calculate partial derivatives
    const baseImpact = this.simulateTrajectory(
      currentAzimuth,
      currentElevation,
      artilleryPos,
      flightTime
    );

    const azimuthPlusImpact = this.simulateTrajectory(
      currentAzimuth + deltaAngle,
      currentElevation,
      artilleryPos,
      flightTime
    );
    const azimuthPartial = azimuthPlusImpact
      .subtract(baseImpact)
      .multiply(1 / deltaAngle);

    const elevationPlusImpact = this.simulateTrajectory(
      currentAzimuth,
      currentElevation + deltaAngle,
      artilleryPos,
      flightTime
    );
    const elevationPartial = elevationPlusImpact
      .subtract(baseImpact)
      .multiply(1 / deltaAngle);

    // Simple correction (not full Newton-Raphson, but effective)
    const correctionFactor = 0.1;
    const deltaAzimuth =
      -(error.dot(azimuthPartial) / azimuthPartial.dot(azimuthPartial)) *
      correctionFactor;
    const deltaElevation =
      -(error.dot(elevationPartial) / elevationPartial.dot(elevationPartial)) *
      correctionFactor;

    return { deltaAzimuth, deltaElevation };
  }

  /**
   * Get lead solution for currently locked target
   */
  getLeadSolution(
    artilleryConfig?: ArtilleryConfiguration
  ): LeadSolution | null {
    if (!this._state.lockedTarget || !this._state.isLocked) {
      return null;
    }

    const detectedTarget = this._detectedTargets.get(this._state.lockedTarget);
    if (!detectedTarget) {
      return null;
    }

    return this.calculateLeadAngles(
      detectedTarget,
      this._radar.position,
      artilleryConfig
    );
  }
}
