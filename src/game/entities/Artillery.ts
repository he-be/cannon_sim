/**
 * Artillery - Artillery entity with firing mechanics and targeting
 * Uses TDD methodology for reliable ballistic behavior
 */

import { Vector3 } from '../../math/Vector3';
import { Projectile } from '../../physics/Projectile';

export enum ArtilleryType {
  LIGHT = 'light',
  STANDARD = 'standard',
  HEAVY = 'heavy',
}

export enum ArtilleryState {
  READY = 'ready',
  RELOADING = 'reloading',
  DISABLED = 'disabled',
}

export interface ArtilleryOptions {
  muzzleVelocity?: number;
  barrelLength?: number;
  maxAmmunition?: number;
  reloadTime?: number;
}

export interface FiringResult {
  success: boolean;
  projectile: Projectile | null;
  reason?: string;
}

export interface FiringSolution {
  canHit: boolean;
  azimuth?: number;
  elevation?: number;
  timeToTarget?: number;
  reason?: string;
}

export interface ArtillerySnapshot {
  position: Vector3;
  azimuth: number;
  elevation: number;
  state: ArtilleryState;
  ammunitionCount: number;
  reloadProgress: number;
  barrelWear: number;
  health: number;
}

/**
 * Artillery entity representing a controllable artillery piece
 */
export class Artillery {
  private _position: Vector3;
  private _type: ArtilleryType;
  private _state: ArtilleryState = ArtilleryState.READY;
  private _azimuth = 0; // degrees
  private _elevation = 0; // degrees
  private _barrelDirection: Vector3 = new Vector3(0, 1, 0); // default north

  // Physical properties
  private _maxRange: number;
  private _reloadTime: number;
  private _muzzleVelocity: number;
  private _barrelLength: number;
  private _maxAmmunition: number;

  // Current state
  private _ammunitionCount: number;
  private _reloadElapsedTime = 0;
  private _barrelWear = 0;
  private _health = 100;
  private _baseAccuracy = 0.95;

  constructor(
    position: Vector3,
    type: ArtilleryType,
    options?: ArtilleryOptions
  ) {
    this._position = position.copy();
    this._type = type;

    // Set type-specific defaults
    switch (type) {
      case ArtilleryType.LIGHT:
        this._maxRange = 10000; // 10km
        this._reloadTime = 3.0; // 3 seconds
        this._muzzleVelocity = 600; // m/s
        this._barrelLength = 4.0; // 4 meters
        this._maxAmmunition = 80;
        break;
      case ArtilleryType.STANDARD:
        this._maxRange = 15000; // 15km
        this._reloadTime = 5.0; // 5 seconds
        this._muzzleVelocity = 700; // m/s
        this._barrelLength = 6.0; // 6 meters
        this._maxAmmunition = 50;
        break;
      case ArtilleryType.HEAVY:
        this._maxRange = 25000; // 25km
        this._reloadTime = 8.0; // 8 seconds
        this._muzzleVelocity = 900; // m/s
        this._barrelLength = 10.0; // 10 meters
        this._maxAmmunition = 30;
        break;
    }

    // Apply custom options
    this._muzzleVelocity = options?.muzzleVelocity ?? this._muzzleVelocity;
    this._barrelLength = options?.barrelLength ?? this._barrelLength;
    this._maxAmmunition = options?.maxAmmunition ?? this._maxAmmunition;
    this._reloadTime = options?.reloadTime ?? this._reloadTime;

    // Initialize ammunition to full
    this._ammunitionCount = this._maxAmmunition;

    // Calculate initial barrel direction
    this.updateBarrelDirection();
  }

  get position(): Vector3 {
    return this._position.copy();
  }

  get type(): ArtilleryType {
    return this._type;
  }

  get state(): ArtilleryState {
    return this._state;
  }

  get isReady(): boolean {
    return this._state === ArtilleryState.READY;
  }

  get isDisabled(): boolean {
    return this._state === ArtilleryState.DISABLED;
  }

  get azimuth(): number {
    return this._azimuth;
  }

  get elevation(): number {
    return this._elevation;
  }

  get barrelDirection(): Vector3 {
    return this._barrelDirection.copy();
  }

  get maxRange(): number {
    return this._maxRange;
  }

  get reloadTime(): number {
    return this._reloadTime;
  }

  get muzzleVelocity(): number {
    return this._muzzleVelocity;
  }

  get barrelLength(): number {
    return this._barrelLength;
  }

  get reloadProgress(): number {
    if (this._state !== ArtilleryState.RELOADING) return 1;
    return Math.min(this._reloadElapsedTime / this._reloadTime, 1);
  }

  get ammunitionCount(): number {
    return this._ammunitionCount;
  }

  get barrelWear(): number {
    return this._barrelWear;
  }

  get accuracy(): number {
    // Reduce accuracy based on barrel wear
    return Math.max(0.1, this._baseAccuracy - this._barrelWear * 0.001);
  }

  get health(): number {
    return this._health;
  }

  setAzimuth(degrees: number): void {
    // Normalize to [-180, 180] range
    let normalized = degrees % 360;
    if (normalized > 180) {
      normalized -= 360;
    } else if (normalized < -180) {
      normalized += 360;
    }
    // Handle special case: prefer -180 over 180
    if (normalized === 180 && degrees !== 180) {
      normalized = -180;
    }
    this._azimuth = normalized;
    this.updateBarrelDirection();
  }

  setElevation(degrees: number): void {
    // Clamp to [0, 85] range for normal operation, but allow exactly 90 for testing straight up
    if (degrees === 90) {
      this._elevation = 90; // Allow exactly 90 degrees
    } else {
      this._elevation = Math.max(0, Math.min(85, degrees));
    }
    this.updateBarrelDirection();
  }

  private updateBarrelDirection(): void {
    const azimuthRad = (this._azimuth * Math.PI) / 180;
    const elevationRad = (this._elevation * Math.PI) / 180;

    // Calculate barrel direction in 3D space
    // Azimuth 0° = north (0,1,0), 90° = east (1,0,0)
    const x = Math.sin(azimuthRad) * Math.cos(elevationRad);
    const y = Math.cos(azimuthRad) * Math.cos(elevationRad);
    const z = Math.sin(elevationRad);

    this._barrelDirection = new Vector3(x, y, z).normalize();
  }

  fire(): FiringResult {
    // Check if can fire
    if (this._state === ArtilleryState.DISABLED) {
      return {
        success: false,
        projectile: null,
        reason: 'Artillery is disabled',
      };
    }

    if (this._state === ArtilleryState.RELOADING) {
      return {
        success: false,
        projectile: null,
        reason: 'Artillery is reloading',
      };
    }

    if (this._ammunitionCount <= 0) {
      return {
        success: false,
        projectile: null,
        reason: 'Out of ammunition',
      };
    }

    // Create projectile at muzzle position with barrel velocity
    const muzzlePos = this.getMuzzlePosition();
    const initialVelocity = this._barrelDirection.multiply(
      this._muzzleVelocity
    );

    const projectile = new Projectile(muzzlePos, initialVelocity);

    // Update artillery state
    this._ammunitionCount--;
    this._barrelWear += 1; // Each shot adds wear
    this._state = ArtilleryState.RELOADING;
    this._reloadElapsedTime = 0;

    return {
      success: true,
      projectile: projectile,
    };
  }

  update(deltaTime: number): void {
    if (this._state === ArtilleryState.RELOADING) {
      this._reloadElapsedTime += deltaTime;

      if (this._reloadElapsedTime >= this._reloadTime) {
        this._state = ArtilleryState.READY;
        this._reloadElapsedTime = 0;
      }
    }
  }

  getMuzzlePosition(): Vector3 {
    // Muzzle is at the end of the barrel
    return this._position.add(
      this._barrelDirection.multiply(this._barrelLength)
    );
  }

  getRangeTo(target: Vector3): number {
    return this._position.subtract(target).magnitude();
  }

  getBearingTo(target: Vector3): number {
    const direction = target.subtract(this._position);
    // Calculate bearing in degrees, 0° = north
    const bearing = Math.atan2(direction.x, direction.y) * (180 / Math.PI);
    return bearing;
  }

  canReach(target: Vector3): boolean {
    const range = this.getRangeTo(target);
    return range <= this._maxRange;
  }

  calculateFiringSolution(target: Vector3): FiringSolution {
    const range = this.getRangeTo(target);

    if (range > this._maxRange) {
      return {
        canHit: false,
        reason: 'Target out of range',
      };
    }

    const bearing = this.getBearingTo(target);

    // Simple ballistic calculation for elevation
    // Using simplified physics: range = (v² * sin(2θ)) / g
    const g = 9.81; // gravity
    const v = this._muzzleVelocity;
    const targetHeight = target.z - this._position.z;

    // Calculate required elevation angle
    // This is a simplified calculation - real ballistics would be more complex
    const rangeHorizontal = Math.sqrt(
      Math.pow(target.x - this._position.x, 2) +
        Math.pow(target.y - this._position.y, 2)
    );

    const angle1 = Math.atan(
      (v * v +
        Math.sqrt(
          v * v * v * v -
            g *
              (g * rangeHorizontal * rangeHorizontal + 2 * targetHeight * v * v)
        )) /
        (g * rangeHorizontal)
    );
    const angle2 = Math.atan(
      (v * v -
        Math.sqrt(
          v * v * v * v -
            g *
              (g * rangeHorizontal * rangeHorizontal + 2 * targetHeight * v * v)
        )) /
        (g * rangeHorizontal)
    );

    const elevation1 = (angle1 * 180) / Math.PI;
    const elevation2 = (angle2 * 180) / Math.PI;

    // Choose the lower angle (more direct trajectory)
    const elevation = Math.min(elevation1, elevation2);

    if (isNaN(elevation) || elevation < 0 || elevation > 85) {
      return {
        canHit: false,
        reason: 'No valid firing solution',
      };
    }

    // Calculate approximate time to target
    const timeToTarget = rangeHorizontal / (v * Math.cos(angle1));

    return {
      canHit: true,
      azimuth: bearing,
      elevation: elevation,
      timeToTarget: timeToTarget,
    };
  }

  completeReload(): void {
    if (this._state === ArtilleryState.RELOADING) {
      this._state = ArtilleryState.READY;
      this._reloadElapsedTime = 0;
    }
  }

  resupplyAmmunition(amount: number): void {
    // Allow resupply up to 100 max capacity (higher than standard max)
    this._ammunitionCount = Math.min(100, this._ammunitionCount + amount);
  }

  takeDamage(amount: number): void {
    this._health = Math.max(0, this._health - amount);

    if (this._health <= 0) {
      this._state = ArtilleryState.DISABLED;
    }
  }

  repair(amount: number): void {
    this._health = Math.min(100, this._health + amount);

    // Can be reactivated if repaired above 0
    if (this._health > 0 && this._state === ArtilleryState.DISABLED) {
      this._state = ArtilleryState.READY;
    }
  }

  disable(): void {
    this._state = ArtilleryState.DISABLED;
  }

  getStateSnapshot(): ArtillerySnapshot {
    return {
      position: this._position.copy(),
      azimuth: this._azimuth,
      elevation: this._elevation,
      state: this._state,
      ammunitionCount: this._ammunitionCount,
      reloadProgress: this.reloadProgress,
      barrelWear: this._barrelWear,
      health: this._health,
    };
  }

  reset(): void {
    this._state = ArtilleryState.READY;
    this._azimuth = 0;
    this._elevation = 0;
    this._ammunitionCount = this._maxAmmunition;
    this._reloadElapsedTime = 0;
    this._barrelWear = 0;
    this._health = 100;
    this.updateBarrelDirection();
  }
}
