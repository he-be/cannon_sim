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

  canFire(): boolean {
    return this._state === ArtilleryState.READY;
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
    if (!this._targetPosition) {
      throw new Error('No target position set');
    }

    const delta = this._targetPosition.subtract(this._position);
    const horizontalDistance = Math.sqrt(delta.x * delta.x + delta.y * delta.y);

    const elevation = Math.atan2(delta.z, horizontalDistance) * (180 / Math.PI);

    // Convert from Math.atan2 (East=0, CCW) to Navigation (North=0, CW)
    // Math: East=0, North=90, West=180, South=-90
    // Nav: North=0, East=90, South=180, West=270
    // Formula: Nav = 90 - Math
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
    if (!this.canFire) {
      throw new Error('Artillery not ready to fire');
    }

    if (!this._targetPosition) {
      throw new Error('No target position set');
    }

    const delta = this._targetPosition.subtract(this._position);
    const distance = delta.magnitude();

    // Simple velocity calculation towards target
    // Physics engine will handle proper trajectory calculation
    const velocity = delta.normalize().multiply(distance * 0.1);

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
