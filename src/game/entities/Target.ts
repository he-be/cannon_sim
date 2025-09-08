/**
 * Target - Target entity for artillery simulation
 * Uses TDD methodology for reliable behavior
 */

import { Vector3 } from '../../math/Vector3';

export enum TargetType {
  STATIC = 'static',
  MOVING_SLOW = 'moving_slow',
  MOVING_FAST = 'moving_fast',
}

export enum TargetState {
  ACTIVE = 'active',
  DESTROYED = 'destroyed',
}

export enum MovementPattern {
  LINEAR = 'linear',
  CIRCULAR = 'circular',
  ZIGZAG = 'zigzag',
}

export interface TargetOptions {
  velocity?: Vector3;
  hitRadius?: number;
  pointValue?: number;
  movementPattern?: MovementPattern;
  patternRadius?: number;
  patternAmplitude?: number;
  patternFrequency?: number;
  evasiveBehavior?: boolean;
}

export interface CollisionSphere {
  center: Vector3;
  radius: number;
}

export interface TargetSnapshot {
  position: Vector3;
  velocity: Vector3;
  type: TargetType;
  state: TargetState;
  timeAlive: number;
}

/**
 * Target entity representing destructible targets with various movement patterns
 */
export class Target {
  private _position: Vector3;
  private _velocity: Vector3;
  private _type: TargetType;
  private _state: TargetState = TargetState.ACTIVE;
  private _hitRadius: number;
  private _pointValue: number;
  private _timeAlive = 0;
  private _destructionTime = 0;
  private _movementPattern: MovementPattern;
  private _patternRadius: number;
  private _patternAmplitude: number;
  private _patternFrequency: number;
  private _evasiveBehavior: boolean;
  private _isEvading = false;
  private _threatDetectionTime = 0;
  private _evasionDuration = 5; // seconds

  // Movement pattern state
  private _patternTime = 0;
  private _basePosition: Vector3;
  private _baseVelocity: Vector3;

  constructor(
    initialPosition: Vector3,
    type: TargetType,
    options?: TargetOptions
  ) {
    this._position = initialPosition.copy();
    this._basePosition = initialPosition.copy();
    this._type = type;

    // Set velocity with defaults
    this._velocity = options?.velocity?.copy() ?? new Vector3();
    this._baseVelocity = this._velocity.copy();

    // Set hit radius with defaults
    this._hitRadius = options?.hitRadius ?? 5;

    // Set point values based on target type
    if (options?.pointValue !== undefined) {
      this._pointValue = options.pointValue;
    } else {
      switch (type) {
        case TargetType.STATIC:
          this._pointValue = 100;
          break;
        case TargetType.MOVING_SLOW:
          this._pointValue = 200;
          break;
        case TargetType.MOVING_FAST:
          this._pointValue = 300;
          break;
      }
    }

    // Movement pattern settings
    this._movementPattern = options?.movementPattern ?? MovementPattern.LINEAR;
    this._patternRadius = options?.patternRadius ?? 100;
    this._patternAmplitude = options?.patternAmplitude ?? 50;
    this._patternFrequency = options?.patternFrequency ?? 1;
    this._evasiveBehavior = options?.evasiveBehavior ?? false;
  }

  get position(): Vector3 {
    return this._position.copy();
  }

  get velocity(): Vector3 {
    return this._velocity.copy();
  }

  get type(): TargetType {
    return this._type;
  }

  get state(): TargetState {
    return this._state;
  }

  get isActive(): boolean {
    return this._state === TargetState.ACTIVE;
  }

  get isDestroyed(): boolean {
    return this._state === TargetState.DESTROYED;
  }

  get hitRadius(): number {
    return this._hitRadius;
  }

  get timeAlive(): number {
    return this._timeAlive;
  }

  get pointValue(): number {
    return this._pointValue;
  }

  get speed(): number {
    return this._velocity.magnitude();
  }

  get destructionTime(): number {
    return this._destructionTime;
  }

  get isEvading(): boolean {
    return this._isEvading;
  }

  update(deltaTime: number): void {
    if (this._state !== TargetState.ACTIVE) return;

    this._timeAlive += deltaTime;
    this._patternTime += deltaTime;

    // Handle evasive behavior timeout
    if (this._isEvading) {
      if (this._timeAlive - this._threatDetectionTime > this._evasionDuration) {
        this._isEvading = false;
        this._velocity = this._baseVelocity.copy();
      }
    }

    // Apply movement based on pattern and type
    if (this._type !== TargetType.STATIC) {
      this.updateMovement(deltaTime);
    }
  }

  private updateMovement(deltaTime: number): void {
    let newVelocity = this._baseVelocity.copy();

    // Apply movement pattern modifications
    switch (this._movementPattern) {
      case MovementPattern.LINEAR:
        // No modification needed
        break;

      case MovementPattern.CIRCULAR: {
        // Circular movement around base position
        const angularVel = this._baseVelocity.magnitude() / this._patternRadius;
        const angle = this._patternTime * angularVel;
        const circularOffset = new Vector3(
          Math.cos(angle) * this._patternRadius,
          Math.sin(angle) * this._patternRadius,
          0
        );
        this._position = this._basePosition.add(circularOffset);
        return; // Skip linear movement for circular
      }

      case MovementPattern.ZIGZAG: {
        // Add sinusoidal Y component
        const zigzagOffset =
          Math.sin(this._patternTime * this._patternFrequency * Math.PI * 2) *
          this._patternAmplitude;
        newVelocity = new Vector3(
          this._baseVelocity.x,
          this._baseVelocity.y + (zigzagOffset / deltaTime) * 0.1, // Scale for smooth movement
          this._baseVelocity.z
        );
        break;
      }
    }

    // Apply evasive behavior modifications
    if (this._isEvading) {
      // Add evasive maneuvers (random direction changes)
      const evasionFactor = 1.5;
      newVelocity = newVelocity.multiply(evasionFactor);
    }

    this._velocity = newVelocity;

    // Update position based on velocity
    this._position = this._position.add(this._velocity.multiply(deltaTime));
  }

  getCollisionSphere(): CollisionSphere {
    return {
      center: this._position.copy(),
      radius: this._hitRadius,
    };
  }

  isPointInside(point: Vector3): boolean {
    const distance = this._position.subtract(point).magnitude();
    return distance <= this._hitRadius;
  }

  destroy(): void {
    this._state = TargetState.DESTROYED;
    this._destructionTime = this._timeAlive;
  }

  distanceFrom(point: Vector3): number {
    return this._position.subtract(point).magnitude();
  }

  distanceFromArtillery(artilleryPosition: Vector3): number {
    return this.distanceFrom(artilleryPosition);
  }

  detectThreat(threatPosition: Vector3, threatVelocity: Vector3): void {
    if (!this._evasiveBehavior) return;

    // Calculate direction from threat to target
    const threatToTarget = this._position.subtract(threatPosition).normalize();
    const threatVelNormalized = threatVelocity.normalize();

    // If threat velocity is pointing towards target (dot product > 0.5)
    if (threatToTarget.dot(threatVelNormalized) > 0.5) {
      this._isEvading = true;
      this._threatDetectionTime = this._timeAlive;
    }
  }

  getStateSnapshot(): TargetSnapshot {
    return {
      position: this._position.copy(),
      velocity: this._velocity.copy(),
      type: this._type,
      state: this._state,
      timeAlive: this._timeAlive,
    };
  }

  reset(position: Vector3): void {
    this._position = position.copy();
    this._basePosition = position.copy();
    this._state = TargetState.ACTIVE;
    this._timeAlive = 0;
    this._destructionTime = 0;
    this._isEvading = false;
    this._patternTime = 0;
    this._velocity = this._baseVelocity.copy();
  }
}
