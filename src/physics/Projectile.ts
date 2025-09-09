/**
 * Projectile - Spec-compliant projectile entity for Browser Artillery
 * Implements only features specified in design.md and requirements.md
 */

import { Vector3 } from '../math/Vector3';

export enum ProjectileState {
  ACTIVE = 'active',
  GROUND_HIT = 'ground_hit',
  TARGET_HIT = 'target_hit',
}

/**
 * Projectile entity representing a flying projectile
 * Implements physics simulation as per GS-01, GS-02
 */
export class Projectile {
  private _position: Vector3;
  private _velocity: Vector3;
  private _state: ProjectileState = ProjectileState.ACTIVE;
  private _trajectory: Vector3[] = [];

  constructor(initialPosition: Vector3, initialVelocity: Vector3) {
    this._position = initialPosition.copy();
    this._velocity = initialVelocity.copy();

    // Initialize trajectory for display (UI-13-2, UI-16-2)
    this._trajectory.push(initialPosition.copy());
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

  /**
   * Update projectile state with physics integration results
   * Called by PhysicsEngine after calculating new position/velocity
   */
  updateState(position: Vector3, velocity: Vector3): void {
    this._position = position.copy();
    this._velocity = velocity.copy();

    // Add to trajectory for visualization (UI-13-2, UI-16-2)
    this._trajectory.push(position.copy());
  }

  /**
   * Check boundary conditions as per specification
   */
  checkBoundaryConditions(): void {
    // Ground impact detection (boundary condition from GS-01)
    if (this._position.z <= 0) {
      this._state = ProjectileState.GROUND_HIT;
    }
  }

  /**
   * Mark projectile as having hit a target (GS-08)
   */
  markAsTargetHit(): void {
    this._state = ProjectileState.TARGET_HIT;
  }
}
