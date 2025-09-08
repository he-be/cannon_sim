/**
 * Projectile - Projectile entity with physics state management
 * Uses TDD methodology for reliable trajectory tracking
 */

import { Vector3 } from '../math/Vector3';

export enum ProjectileState {
  ACTIVE = 'active',
  GROUND_HIT = 'ground_hit',
  TARGET_HIT = 'target_hit',
  OUT_OF_BOUNDS = 'out_of_bounds',
}

export interface ProjectileProperties {
  mass?: number;
  dragCoefficient?: number;
  radius?: number;
}

export interface BoundingSphere {
  center: Vector3;
  radius: number;
}

export interface ProjectileSnapshot {
  position: Vector3;
  velocity: Vector3;
  flightTime: number;
  state: ProjectileState;
  trajectoryLength: number;
}

/**
 * Projectile entity representing a flying projectile with physics simulation
 */
export class Projectile {
  private _position: Vector3;
  private _velocity: Vector3;
  private _state: ProjectileState = ProjectileState.ACTIVE;
  private _flightTime = 0;
  private _trajectory: Vector3[] = [];
  private _mass: number;
  private _dragCoefficient: number;
  private _radius: number;
  private _maxAltitude = 0;
  private _totalDistance = 0;
  private _lastPosition: Vector3;

  // Constants
  private readonly MAX_TRAJECTORY_LENGTH = 1000;
  private readonly MAX_RANGE = 30000; // 30km

  constructor(
    initialPosition: Vector3,
    initialVelocity: Vector3,
    properties?: ProjectileProperties
  ) {
    this._position = initialPosition.copy();
    this._velocity = initialVelocity.copy();
    this._lastPosition = initialPosition.copy();

    // Set physical properties with defaults
    this._mass = properties?.mass ?? 10; // kg
    this._dragCoefficient = properties?.dragCoefficient ?? 0.47; // sphere
    this._radius = properties?.radius ?? 0.1; // meters

    // Initialize trajectory with starting position
    this._trajectory.push(initialPosition.copy());
    this._maxAltitude = initialPosition.z;
  }

  get position(): Vector3 {
    return this._position.copy();
  }

  get velocity(): Vector3 {
    return this._velocity.copy();
  }

  get state(): ProjectileState {
    return this._state;
  }

  get isActive(): boolean {
    return this._state === ProjectileState.ACTIVE;
  }

  get trajectory(): Vector3[] {
    return this._trajectory.map(pos => pos.copy());
  }

  get flightTime(): number {
    return this._flightTime;
  }

  get mass(): number {
    return this._mass;
  }

  get dragCoefficient(): number {
    return this._dragCoefficient;
  }

  get radius(): number {
    return this._radius;
  }

  get crossSectionalArea(): number {
    return Math.PI * this._radius * this._radius;
  }

  get currentSpeed(): number {
    return this._velocity.magnitude();
  }

  get maxAltitudeReached(): number {
    return this._maxAltitude;
  }

  get totalDistanceTraveled(): number {
    return this._totalDistance;
  }

  updateState(position: Vector3, velocity: Vector3, deltaTime: number): void {
    // Update flight time
    this._flightTime += deltaTime;

    // Calculate distance traveled since last update
    const distance = this._position.subtract(position).magnitude();
    this._totalDistance += distance;

    // Update position and velocity
    this._lastPosition = this._position.copy();
    this._position = position.copy();
    this._velocity = velocity.copy();

    // Track maximum altitude
    if (position.z > this._maxAltitude) {
      this._maxAltitude = position.z;
    }

    // Add to trajectory history
    this._trajectory.push(position.copy());

    // Limit trajectory length to prevent memory issues
    if (this._trajectory.length > this.MAX_TRAJECTORY_LENGTH) {
      this._trajectory.shift(); // Remove oldest point
    }
  }

  checkBoundaryConditions(): void {
    // Check ground impact
    if (this._position.z <= 0) {
      this._state = ProjectileState.GROUND_HIT;
      return;
    }

    // Check out of bounds (maximum range)
    const range = Math.sqrt(
      this._position.x * this._position.x + this._position.y * this._position.y
    );
    if (range > this.MAX_RANGE) {
      this._state = ProjectileState.OUT_OF_BOUNDS;
      return;
    }

    // Still active if within bounds
    this._state = ProjectileState.ACTIVE;
  }

  getBoundingSphere(): BoundingSphere {
    return {
      center: this._position.copy(),
      radius: this._radius,
    };
  }

  markAsTargetHit(): void {
    this._state = ProjectileState.TARGET_HIT;
  }

  getPredictedPosition(deltaTime: number): Vector3 {
    return this._position.add(this._velocity.multiply(deltaTime));
  }

  getStateSnapshot(): ProjectileSnapshot {
    return {
      position: this._position.copy(),
      velocity: this._velocity.copy(),
      flightTime: this._flightTime,
      state: this._state,
      trajectoryLength: this._trajectory.length,
    };
  }
}
