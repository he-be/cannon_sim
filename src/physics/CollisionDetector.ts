/**
 * CollisionDetector - Collision detection system for T024
 * Handles sphere-to-sphere collision detection with continuous detection support
 */

import { Vector3 } from '../math/Vector3';
import { Projectile } from './Projectile';
import { Target } from '../game/entities/Target';

export enum CollisionType {
  NONE = 'none',
  DIRECT_HIT = 'direct_hit',
  TRAJECTORY_HIT = 'trajectory_hit',
}

export interface CollisionParameters {
  projectileRadius: number; // meters
  targetRadius: number; // meters
  minCollisionDistance: number; // combined radius threshold
  continuousDetectionEnabled: boolean;
}

export interface CollisionResult {
  hasCollision: boolean;
  collisionType: CollisionType;
  distance: number;
  collisionPoint: Vector3 | null;
  collisionTime: number; // -1 if no collision, otherwise time in seconds
  projectile?: Projectile;
  target?: Target;
}

/**
 * Manages collision detection between projectiles and targets
 */
export class CollisionDetector {
  private _parameters: CollisionParameters;

  constructor(parameters?: Partial<CollisionParameters>) {
    this._parameters = {
      projectileRadius: 1.0, // 1 meter
      targetRadius: 10.0, // 10 meters
      minCollisionDistance: 11.0, // sum of radii
      continuousDetectionEnabled: true,
      ...parameters,
    };

    // Auto-calculate min collision distance if not provided
    if (!parameters?.minCollisionDistance) {
      this._parameters.minCollisionDistance =
        this._parameters.projectileRadius + this._parameters.targetRadius;
    }
  }

  /**
   * Check collision between a projectile and target
   */
  checkCollision(projectile: Projectile, target: Target): CollisionResult {
    // Skip collision check if entities are inactive
    if (!projectile.isActive || target.isDestroyed) {
      return this.createNoCollisionResult();
    }

    const projectilePos = projectile.position;
    const targetPos = target.position;

    // Handle invalid positions
    if (
      this.hasInvalidPosition(projectilePos) ||
      this.hasInvalidPosition(targetPos)
    ) {
      return this.createNoCollisionResult();
    }

    const distance = this.calculateDistance(projectilePos, targetPos);

    if (distance <= this._parameters.minCollisionDistance) {
      return {
        hasCollision: true,
        collisionType: CollisionType.DIRECT_HIT,
        distance,
        collisionPoint: this.calculateCollisionPoint(projectilePos, targetPos),
        collisionTime: 0,
        projectile,
        target,
      };
    }

    return {
      hasCollision: false,
      collisionType: CollisionType.NONE,
      distance,
      collisionPoint: null,
      collisionTime: -1,
    };
  }

  /**
   * Check collision with continuous detection along trajectory
   */
  checkCollisionContinuous(
    projectile: Projectile,
    target: Target,
    deltaTime: number
  ): CollisionResult {
    if (!this._parameters.continuousDetectionEnabled) {
      return this.checkCollision(projectile, target);
    }

    // Skip collision check if entities are inactive or deltaTime is invalid
    if (!projectile.isActive || target.isDestroyed || deltaTime <= 0) {
      return this.createNoCollisionResult();
    }

    const projectilePos = projectile.position;
    const projectileVel = projectile.velocity;
    const targetPos = target.position;
    const targetVel = target.velocity;

    // Handle invalid positions or velocities
    if (
      this.hasInvalidPosition(projectilePos) ||
      this.hasInvalidPosition(targetPos) ||
      this.hasInvalidVector(projectileVel) ||
      this.hasInvalidVector(targetVel)
    ) {
      return this.createNoCollisionResult();
    }

    // Calculate relative motion
    const relativeVel = projectileVel.subtract(targetVel);
    const relativePos = projectilePos.subtract(targetPos);

    // Solve quadratic equation for collision time
    const collisionTime = this.solveCollisionTime(
      relativePos,
      relativeVel,
      this._parameters.minCollisionDistance
    );

    if (collisionTime >= 0 && collisionTime <= deltaTime) {
      // Calculate collision point
      const collisionPoint = projectilePos.add(
        projectileVel.multiply(collisionTime)
      );

      return {
        hasCollision: true,
        collisionType: CollisionType.TRAJECTORY_HIT,
        distance: this.calculateDistance(projectilePos, targetPos),
        collisionPoint,
        collisionTime,
        projectile,
        target,
      };
    }

    return this.createNoCollisionResult();
  }

  /**
   * Check collisions between multiple projectiles and targets
   */
  checkMultipleCollisions(
    projectiles: Projectile[],
    targets: Target[]
  ): CollisionResult[] {
    const collisions: CollisionResult[] = [];

    for (const projectile of projectiles) {
      if (!projectile.isActive) continue;

      for (const target of targets) {
        if (target.isDestroyed) continue;

        const result = this.checkCollision(projectile, target);
        if (result.hasCollision) {
          collisions.push(result);
        }
      }
    }

    return collisions;
  }

  /**
   * Process collision response (modify entity states)
   */
  processCollisionResponse(
    collision: CollisionResult,
    projectile: Projectile,
    target: Target
  ): void {
    if (!collision.hasCollision) return;

    // Mark projectile as having hit target
    projectile.markAsTargetHit();

    // Destroy target
    target.destroy();
  }

  /**
   * Solve quadratic equation for collision time
   * Returns earliest positive collision time, or -1 if no collision
   */
  private solveCollisionTime(
    relativePos: Vector3,
    relativeVel: Vector3,
    collisionRadius: number
  ): number {
    const a = relativeVel.dot(relativeVel);
    const b = 2 * relativePos.dot(relativeVel);
    const c = relativePos.dot(relativePos) - collisionRadius * collisionRadius;

    // Check if velocities are essentially zero
    if (Math.abs(a) < 1e-10) {
      // No relative motion, check if already colliding
      return c <= 0 ? 0 : -1;
    }

    const discriminant = b * b - 4 * a * c;

    if (discriminant < 0) {
      // No collision
      return -1;
    }

    const sqrtDiscriminant = Math.sqrt(discriminant);
    const t1 = (-b - sqrtDiscriminant) / (2 * a);
    const t2 = (-b + sqrtDiscriminant) / (2 * a);

    // Return the earliest positive time
    if (t1 >= 0) return t1;
    if (t2 >= 0) return t2;
    return -1;
  }

  /**
   * Calculate distance between two positions
   */
  private calculateDistance(pos1: Vector3, pos2: Vector3): number {
    return pos1.subtract(pos2).magnitude();
  }

  /**
   * Calculate collision point between two positions
   */
  private calculateCollisionPoint(pos1: Vector3, pos2: Vector3): Vector3 {
    // Return midpoint between positions
    return pos1.add(pos2).multiply(0.5);
  }

  /**
   * Check if a vector has invalid (NaN or Infinite) components
   */
  private hasInvalidVector(vector: Vector3): boolean {
    return (
      !isFinite(vector.x) ||
      !isFinite(vector.y) ||
      !isFinite(vector.z) ||
      isNaN(vector.x) ||
      isNaN(vector.y) ||
      isNaN(vector.z)
    );
  }

  /**
   * Check if a position has invalid components
   */
  private hasInvalidPosition(position: Vector3): boolean {
    return this.hasInvalidVector(position);
  }

  /**
   * Create a standard no-collision result
   */
  private createNoCollisionResult(): CollisionResult {
    return {
      hasCollision: false,
      collisionType: CollisionType.NONE,
      distance: Infinity,
      collisionPoint: null,
      collisionTime: -1,
    };
  }

  /**
   * Get current collision parameters
   */
  getCollisionParameters(): CollisionParameters {
    return { ...this._parameters };
  }

  /**
   * Update collision parameters
   */
  setCollisionParameters(parameters: Partial<CollisionParameters>): void {
    this._parameters = { ...this._parameters, ...parameters };

    // Auto-recalculate min collision distance if radii changed
    if (parameters.projectileRadius || parameters.targetRadius) {
      if (!parameters.minCollisionDistance) {
        this._parameters.minCollisionDistance =
          this._parameters.projectileRadius + this._parameters.targetRadius;
      }
    }
  }
}
