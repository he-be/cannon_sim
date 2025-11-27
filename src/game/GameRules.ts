import { EntityManager } from './EntityManager';
import { Vector3 } from '../math/Vector3';
import { GameState } from './GameState';

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class GameRules {
  static checkCollisions(
    entityManager: EntityManager,
    gameTime: number,
    artilleryPosition: Vector3,
    maxRadarRange: number,
    onExplosion: (position: Vector3) => void
  ): void {
    const collisions = entityManager.checkCollisions(gameTime);

    collisions.forEach(collision => {
      const distance = artilleryPosition
        .subtract(collision.collisionPoint)
        .magnitude();
      if (distance <= maxRadarRange) {
        onExplosion(collision.collisionPoint);
      }
    });
  }

  static checkWinCondition(
    entityManager: EntityManager,
    gameTime: number
  ): GameState | null {
    const activeTargets = entityManager.getActiveTargets(gameTime);
    const allTargets = entityManager.getTargets();

    if (
      activeTargets.length === 0 &&
      allTargets.length > 0 &&
      entityManager.areAllTargetsDestroyed()
    ) {
      return GameState.STAGE_CLEAR;
    }
    return null;
  }
}
