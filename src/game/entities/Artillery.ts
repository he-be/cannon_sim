/**
 * Artillery - Spec-compliant artillery entity for Browser Artillery
 * Implements only features specified in design.md and requirements.md
 */

import { Vector3 } from '../../math/Vector3';

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
  private _state: ArtilleryState = ArtilleryState.READY;

  constructor(position: Vector3) {
    this._position = position.copy();
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
  setTargetPosition(target: Vector3): void {
    this._targetPosition = target.copy();
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
    const azimuth = Math.atan2(delta.y, delta.x) * (180 / Math.PI);

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
    const bearing = Math.atan2(delta.y, delta.x) * (180 / Math.PI);

    // Convert to 0-360 degrees
    return bearing < 0 ? bearing + 360 : bearing;
  }
}
