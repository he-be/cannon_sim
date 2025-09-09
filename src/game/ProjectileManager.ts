/**
 * ProjectileManager - Spec-compliant projectile management for Browser Artillery
 * Implements only features specified in design.md and requirements.md
 */

import { Projectile } from '../physics/Projectile';
import { Target } from './entities/Target';
import { Vector3 } from '../math/Vector3';

export interface CollisionResult {
  projectile: Projectile;
  target: Target;
}

/**
 * Manages projectile lifecycle, collision detection, and trajectory tracking
 * Implements projectile management as per GS-08, UI-13-2, UI-16-2
 */
export class ProjectileManager {
  private _activeProjectiles: Projectile[] = [];
  private readonly COLLISION_DISTANCE = 5; // meters

  /**
   * Add new projectile to management
   */
  addProjectile(projectile: Projectile): void {
    this._activeProjectiles.push(projectile);
  }

  /**
   * Get all currently active projectiles
   */
  getActiveProjectiles(): Projectile[] {
    return [...this._activeProjectiles];
  }

  /**
   * Get number of active projectiles for UI display
   */
  getActiveProjectileCount(): number {
    return this._activeProjectiles.length;
  }

  /**
   * Update projectile manager - remove inactive projectiles
   */
  update(): void {
    // Remove inactive projectiles from active list
    this._activeProjectiles = this._activeProjectiles.filter(
      projectile => projectile.isActive
    );
  }

  /**
   * Check collisions between projectiles and targets (GS-08)
   */
  checkCollisions(targets: Target[]): CollisionResult[] {
    const collisions: CollisionResult[] = [];

    for (const projectile of this._activeProjectiles) {
      if (!projectile.isActive) continue;

      for (const target of targets) {
        if (target.isDestroyed) continue;

        const distance = projectile.position
          .subtract(target.position)
          .magnitude();

        if (distance <= this.COLLISION_DISTANCE) {
          // Mark projectile as hit
          projectile.markAsTargetHit();

          // Mark target as destroyed
          target.destroy();

          collisions.push({
            projectile,
            target,
          });
        }
      }
    }

    return collisions;
  }

  /**
   * Get all projectile trajectories for visualization (UI-13-2, UI-16-2)
   */
  getAllTrajectories(): Vector3[][] {
    return this._activeProjectiles.map(projectile => projectile.trajectory);
  }

  /**
   * Get trajectories of recently fired projectiles for display
   */
  getRecentTrajectories(maxCount: number = 5): Vector3[][] {
    const recentProjectiles = this._activeProjectiles.slice(-maxCount);
    return recentProjectiles.map(projectile => projectile.trajectory);
  }

  /**
   * Clear all projectiles (for game reset)
   */
  clearAll(): void {
    this._activeProjectiles = [];
  }

  /**
   * Get projectile at specific position (for debugging/analysis)
   */
  getProjectileAt(
    position: Vector3,
    tolerance: number = 10
  ): Projectile | null {
    for (const projectile of this._activeProjectiles) {
      const distance = projectile.position.subtract(position).magnitude();
      if (distance <= tolerance) {
        return projectile;
      }
    }
    return null;
  }
}
