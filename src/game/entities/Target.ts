/**
 * Target - Spec-compliant target entity for Browser Artillery
 * Implements only features specified in design.md and requirements.md
 */

import { Vector3 } from '../../math/Vector3';

export enum TargetType {
  STATIC = 'static', // Stage 1: Static targets
  MOVING_SLOW = 'moving_slow', // Stage 2: Slow moving targets
  MOVING_FAST = 'moving_fast', // Stage 3: Fast moving targets
}

export enum TargetState {
  ACTIVE = 'active',
  DESTROYED = 'destroyed',
}

/**
 * Target entity representing destructible targets with movement
 * Implements target types as per UI-02 specification
 */
export class Target {
  private _position: Vector3;
  private _velocity: Vector3;
  private _type: TargetType;
  private _state: TargetState = TargetState.ACTIVE;

  constructor(position: Vector3, type: TargetType, velocity?: Vector3) {
    this._position = position.copy();
    this._type = type;

    // Set velocity based on type (UI-02)
    if (velocity) {
      this._velocity = velocity.copy();
    } else {
      this._velocity = new Vector3(0, 0, 0); // Static by default
    }
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

  get isDestroyed(): boolean {
    return this._state === TargetState.DESTROYED;
  }

  /**
   * Target information for UI display (UI-18)
   */
  get speed(): number {
    return this._velocity.magnitude();
  }

  get altitude(): number {
    return this._position.z;
  }

  /**
   * Calculate distance from point (UI-18: Range display)
   */
  distanceFrom(point: Vector3): number {
    return this._position.subtract(point).magnitude();
  }

  /**
   * Update target position based on movement
   */
  update(deltaTime: number): void {
    if (this._state !== TargetState.ACTIVE) return;

    // Simple linear movement for moving targets
    if (this._type !== TargetType.STATIC) {
      this._position = this._position.add(this._velocity.multiply(deltaTime));
    }
  }

  /**
   * Destroy target when hit (GS-08, GS-09)
   */
  destroy(): void {
    this._state = TargetState.DESTROYED;
  }
}
