/**
 * EntityManager - Manages game entities (targets and projectiles)
 * Extracted from GameScene for better modularity and testability
 */

import { Target } from './entities/Target';
import { Vector3 } from '../math/Vector3';

export interface ProjectileState {
  id: string;
  position: Vector3;
  velocity: Vector3;
  isActive: boolean;
  spawnTime: number;
}

export interface CollisionResult {
  projectile: ProjectileState;
  target: Target;
  collisionPoint: Vector3;
}

export class EntityManager {
  private targets: Target[] = [];
  private projectiles: ProjectileState[] = [];

  /**
   * Initialize targets from configuration
   */
  initializeTargets(targets: Target[]): void {
    this.targets = targets;
  }

  /**
   * Add a projectile to the scene
   */
  addProjectile(projectile: ProjectileState): void {
    this.projectiles.push(projectile);
  }

  /**
   * Add a target to the scene (for dynamic spawning)
   */
  addTarget(target: Target): void {
    this.targets.push(target);
  }

  /**
   * Get all targets
   */
  getTargets(): Target[] {
    return this.targets;
  }

  /**
   * Get all projectiles
   */
  getProjectiles(): ProjectileState[] {
    return this.projectiles;
  }

  /**
   * Get active targets (spawned and not destroyed)
   */
  getActiveTargets(currentTime: number): Target[] {
    return this.targets.filter(
      t => !t.isDestroyed && currentTime >= t.spawnTime
    );
  }

  /**
   * Update all targets
   */
  updateTargets(deltaTime: number, currentTime: number): void {
    this.targets.forEach(target => {
      if (currentTime >= target.spawnTime) {
        target.update(deltaTime, currentTime);
      }
    });
  }

  /**
   * Update all projectiles
   */
  updateProjectiles(
    deltaTime: number,
    currentTime: number,
    physicsEngine: {
      integrate: (
        state: { position: Vector3; velocity: Vector3 },
        time: number,
        deltaTime: number
      ) => { position: Vector3; velocity: Vector3 };
    },
    onImpact: (projectile: ProjectileState) => void,
    onUpdate?: (projectile: ProjectileState) => void
  ): void {
    this.projectiles.forEach(projectile => {
      if (!projectile.isActive) return;

      // Update physics
      const state: { position: Vector3; velocity: Vector3 } = {
        position: projectile.position,
        velocity: projectile.velocity,
      };

      const newState = physicsEngine.integrate(state, currentTime, deltaTime);
      projectile.position = newState.position;
      projectile.velocity = newState.velocity;

      if (onUpdate) {
        onUpdate(projectile);
      }

      // Check for ground impact or timeout
      if (
        projectile.position.z <= 0 || // Ground level
        currentTime - projectile.spawnTime > 30 // 30s timeout
      ) {
        projectile.isActive = false;
        onImpact(projectile);
      }
    });
  }

  /**
   * Check collisions between projectiles and targets
   * Returns array of collision results
   */
  checkCollisions(
    currentTime: number,
    collisionRadius: number = 50
  ): CollisionResult[] {
    const collisions: CollisionResult[] = [];

    this.projectiles.forEach(projectile => {
      if (!projectile.isActive) return;

      this.targets.forEach(target => {
        // Only check collision with active targets
        if (!target.isActive || currentTime < target.spawnTime) return;

        const distance = projectile.position
          .subtract(target.position)
          .magnitude();

        if (distance < collisionRadius) {
          // Calculate collision point (midpoint between projectile and target)
          const collisionPoint = projectile.position
            .add(target.position)
            .multiply(0.5);

          collisions.push({
            projectile,
            target,
            collisionPoint,
          });

          // Mark as hit
          target.hit();
          projectile.isActive = false;
        }
      });
    });

    return collisions;
  }

  /**
   * Clear inactive projectiles
   */
  clearInactiveProjectiles(): void {
    this.projectiles = this.projectiles.filter(p => p.isActive);
  }

  /**
   * Reset all entities
   */
  reset(): void {
    this.targets = [];
    this.projectiles = [];
  }

  /**
   * Get count of active targets
   */
  getActiveTargetCount(currentTime: number): number {
    return this.getActiveTargets(currentTime).length;
  }

  /**
   * Check if any active target has reached the game over distance
   */
  checkGameOverCondition(
    artilleryPosition: Vector3,
    threshold: number,
    currentTime: number
  ): boolean {
    return this.targets.some(target => {
      if (
        target.isDestroyed ||
        currentTime < target.spawnTime ||
        !target.isActive ||
        target.isFalling
      ) {
        return false;
      }

      const distance = target.position.subtract(artilleryPosition).magnitude();
      return distance < threshold;
    });
  }

  /**
   * Check if all targets are destroyed
   */
  areAllTargetsDestroyed(): boolean {
    return this.targets.every(t => t.isDestroyed);
  }
}
