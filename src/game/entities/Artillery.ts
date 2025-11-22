/**
 * Artillery - Spec-compliant artillery entity for Browser Artillery
 * Implements only features specified in design.md and requirements.md
 */

import { Vector3 } from '../../math/Vector3';
import { LeadAngleCalculator, LeadAngle } from '../LeadAngleCalculator';
import { ArtilleryConfiguration } from '../../targeting/TargetTracker';

export enum ArtilleryState {
  READY = 'ready',
  FIRED = 'fired',
}

export interface FiringAngle {
  elevation: number;
  azimuth: number;
}

export interface ProjectileData {
  position: Vector3;
  velocity: Vector3;
}

/**
 * Artillery entity representing the player's cannon
 * Implements targeting and firing as per GS-03, UI-01, UI-17
 */
export class Artillery {
  private _position: Vector3;
  private _targetPosition: Vector3 | null = null;
  private _targetVelocity: Vector3 | null = null;
  private _state: ArtilleryState = ArtilleryState.READY;
  private _leadCalculator: LeadAngleCalculator;

  // Heavy cannon mechanics
  private _currentAzimuth: number = 0;
  private _currentElevation: number = 45;
  private _commandedAzimuth: number = 0;
  private _commandedElevation: number = 45;

  private readonly ROTATION_SPEED_AZIMUTH = 10; // degrees per second
  private readonly ROTATION_SPEED_ELEVATION = 5; // degrees per second

  // Reload mechanics
  private _reloadTime: number = 0; // seconds since firing
  private readonly RELOAD_COOLDOWN = 2.0; // 2 seconds reload time

  constructor(position: Vector3) {
    this._position = position.copy();
    this._leadCalculator = new LeadAngleCalculator();
  }

  get position(): Vector3 {
    return this._position.copy();
  }

  get targetPosition(): Vector3 | null {
    return this._targetPosition?.copy() || null;
  }

  get state(): ArtilleryState {
    return this._state;
  }

  get currentAzimuth(): number {
    return this._currentAzimuth;
  }

  get currentElevation(): number {
    return this._currentElevation;
  }

  get commandedAzimuth(): number {
    return this._commandedAzimuth;
  }

  get commandedElevation(): number {
    return this._commandedElevation;
  }

  canFire(): boolean {
    return this._state === ArtilleryState.READY;
  }

  /**
   * Set commanded angles for the artillery to rotate towards
   */
  setCommandedAngles(azimuth: number, elevation: number): void {
    this._commandedAzimuth = azimuth;
    this._commandedElevation = elevation;
  }

  /**
   * Update artillery state (rotation)
   */
  update(deltaTime: number): void {
    // Update Azimuth
    if (this._currentAzimuth !== this._commandedAzimuth) {
      let diff = this._commandedAzimuth - this._currentAzimuth;

      // Handle wrap-around (shortest path)
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;

      const maxRotation = this.ROTATION_SPEED_AZIMUTH * deltaTime;

      if (Math.abs(diff) <= maxRotation) {
        this._currentAzimuth = this._commandedAzimuth;
      } else {
        this._currentAzimuth += Math.sign(diff) * maxRotation;
      }

      // Normalize current azimuth
      this._currentAzimuth = this._currentAzimuth % 360;
      if (this._currentAzimuth < 0) this._currentAzimuth += 360;
    }

    // Update Elevation
    if (this._currentElevation !== this._commandedElevation) {
      const diff = this._commandedElevation - this._currentElevation;
      const maxRotation = this.ROTATION_SPEED_ELEVATION * deltaTime;

      if (Math.abs(diff) <= maxRotation) {
        this._currentElevation = this._commandedElevation;
      } else {
        this._currentElevation += Math.sign(diff) * maxRotation;
      }
    }

    // Update reload timer
    if (this._state === ArtilleryState.FIRED) {
      this._reloadTime += deltaTime;
      if (this._reloadTime >= this.RELOAD_COOLDOWN) {
        this.reload();
      }
    }
  }

  /**
   * Set target position for aiming (UI-01)
   */
  setTargetPosition(target: Vector3, velocity?: Vector3): void {
    this._targetPosition = target.copy();
    this._targetVelocity = velocity ? velocity.copy() : null;
  }

  /**
   * Calculate firing angle for targeting (UI-01)
   */
  getFiringAngle(): FiringAngle {
    // Return current actual angles
    return {
      elevation: this._currentElevation,
      azimuth: this._currentAzimuth,
    };
  }

  /**
   * Calculate required firing angle to hit target
   */
  calculateFiringSolution(): FiringAngle {
    if (!this._targetPosition) {
      throw new Error('No target position set');
    }

    const delta = this._targetPosition.subtract(this._position);
    const horizontalDistance = Math.sqrt(delta.x * delta.x + delta.y * delta.y);

    const elevation = Math.atan2(delta.z, horizontalDistance) * (180 / Math.PI);

    // Convert from Math.atan2 (East=0, CCW) to Navigation (North=0, CW)
    const mathAzimuth = Math.atan2(delta.y, delta.x) * (180 / Math.PI);
    let azimuth = 90 - mathAzimuth;

    // Normalize to 0-360
    azimuth = azimuth % 360;
    if (azimuth < 0) azimuth += 360;

    return { elevation, azimuth };
  }

  /**
   * Fire projectile towards target (GS-03)
   */
  fire(): ProjectileData {
    if (!this.canFire()) {
      throw new Error('Artillery not ready to fire');
    }

    // Use current actual angles for firing
    // Calculate velocity vector based on current azimuth and elevation
    const muzzleVelocity = 800; // Using value from getConfiguration
    const azimuthRad = this._currentAzimuth * (Math.PI / 180);
    const elevationRad = this._currentElevation * (Math.PI / 180);

    const velocity = new Vector3(
      muzzleVelocity * Math.sin(azimuthRad) * Math.cos(elevationRad),
      muzzleVelocity * Math.cos(azimuthRad) * Math.cos(elevationRad),
      muzzleVelocity * Math.sin(elevationRad)
    );

    this._state = ArtilleryState.FIRED;

    return {
      position: this._position.copy(),
      velocity: velocity,
    };
  }

  /**
   * Reload artillery after firing (GS-03)
   */
  reload(): void {
    this._state = ArtilleryState.READY;
    this._reloadTime = 0;
  }

  /**
   * Get range to target for UI display (UI-17)
   */
  getRangeToTarget(): number {
    if (!this._targetPosition) {
      return 0;
    }
    return this._targetPosition.subtract(this._position).magnitude();
  }

  /**
   * Get bearing to target for UI display (UI-17)
   */
  getBearingToTarget(): number {
    if (!this._targetPosition) {
      return 0;
    }

    const delta = this._targetPosition.subtract(this._position);
    const mathAzimuth = Math.atan2(delta.y, delta.x) * (180 / Math.PI);

    // Convert to Navigation (North=0, CW)
    let bearing = 90 - mathAzimuth;

    // Normalize to 0-360
    bearing = bearing % 360;
    if (bearing < 0) bearing += 360;

    return bearing;
  }

  /**
   * Get recommended lead angle for moving targets (GS-07, UI-06)
   */
  getRecommendedLeadAngle(): LeadAngle | null {
    if (!this._targetPosition) {
      return null;
    }

    const targetVelocity = this._targetVelocity || new Vector3(0, 0, 0);

    return this._leadCalculator.calculateLeadAngle(
      this._position,
      this._targetPosition,
      targetVelocity
    );
  }

  /**
   * Get detailed lead calculation info for UI display (UI-06)
   */
  getLeadCalculationInfo(): {
    leadAngle: LeadAngle;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    leadDistance?: number;
  } | null {
    if (!this._targetPosition) {
      return null;
    }

    const targetVelocity = this._targetVelocity || new Vector3(0, 0, 0);

    return this._leadCalculator.calculateRecommendedLead(
      this._position,
      this._targetPosition,
      targetVelocity
    );
  }

  /**
   * Check if target is moving (affects lead calculation)
   */
  isTargetMoving(): boolean {
    return this._targetVelocity
      ? this._targetVelocity.magnitude() > 0.1
      : false;
  }

  /**
   * Get artillery configuration for ballistic calculations
   */
  getConfiguration(): ArtilleryConfiguration {
    return {
      muzzleVelocity: 800, // 800 m/s (typical 155mm artillery)
      projectileMass: 45, // 45 kg standard HE shell
      dragCoefficient: 0.47, // Sphere approximation
      caliber: 155, // 155mm caliber
    };
  }
}
