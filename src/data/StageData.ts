/**
 * StageData - Stage configuration data for Browser Artillery
 * Implements stage definitions as per UI-02 specification
 */

import { Vector3 } from '../math/Vector3';
import { Target, TargetType } from '../game/entities/Target';

export interface StageConfig {
  id: number;
  name: string;
  description: string;
  targets: Target[];
  artilleryPosition: Vector3;
}

/**
 * StageData provides predefined stage configurations
 * Implements 3 stage types as per UI-02: Static, Slow Moving, Fast Moving targets
 */
export const StageData = {
  getStage(stageId: number): StageConfig | null {
    switch (stageId) {
      case 1:
        return this.createStage1();
      case 2:
        return this.createStage2();
      case 3:
        return this.createStage3();
      default:
        return null;
    }
  },

  /**
   * Stage 1: Static targets
   * Difficulty: Easy - No movement, focus on aiming and physics
   */
  createStage1(): StageConfig {
    const artilleryPosition = new Vector3(0, 0, 0);

    // Stage 1 target positions (static)
    const targets = [
      new Target(new Vector3(0, 0, 500), TargetType.STATIC),
      new Target(new Vector3(100, 0, 600), TargetType.STATIC),
      new Target(new Vector3(-100, 0, 600), TargetType.STATIC),
      new Target(new Vector3(200, 0, 700), TargetType.STATIC),
      new Target(new Vector3(-200, 0, 700), TargetType.STATIC),
    ];

    return {
      id: 1,
      name: 'Stage 1: Static Targets',
      description: 'Defeat static targets approaching from the front',
      targets,
      artilleryPosition,
    };
  },

  /**
   * Stage 2: Slow moving targets
   * Difficulty: Medium - Slow movement, requires lead angle calculation
   */
  createStage2(): StageConfig {
    const artilleryPosition = new Vector3(0, 0, 0);

    // Stage 2 target positions and velocities (slow moving)
    const slowSpeed = 10; // m/s - should be externalized to Constants
    const targets = [
      new Target(
        new Vector3(0, 0, 500),
        TargetType.MOVING_SLOW,
        new Vector3(0, 0, -slowSpeed)
      ),
      new Target(
        new Vector3(100, 0, 600),
        TargetType.MOVING_SLOW,
        new Vector3(5, 0, -slowSpeed)
      ),
      new Target(
        new Vector3(-100, 0, 600),
        TargetType.MOVING_SLOW,
        new Vector3(-5, 0, -slowSpeed)
      ),
      new Target(
        new Vector3(200, 0, 700),
        TargetType.MOVING_SLOW,
        new Vector3(10, 0, -slowSpeed)
      ),
    ];

    return {
      id: 2,
      name: 'Stage 2: Slow Moving Targets',
      description: 'Defeat slow moving targets',
      targets,
      artilleryPosition,
    };
  },

  /**
   * Stage 3: Fast moving targets
   * Difficulty: Hard - Fast movement, requires precise lead angle calculation
   */
  createStage3(): StageConfig {
    const artilleryPosition = new Vector3(0, 0, 0);

    // Stage 3 target positions and velocities (fast moving)
    const fastSpeed = 20; // m/s - should be externalized to Constants
    const targets = [
      new Target(
        new Vector3(0, 0, 500),
        TargetType.MOVING_FAST,
        new Vector3(0, 0, -fastSpeed)
      ),
      new Target(
        new Vector3(100, 0, 600),
        TargetType.MOVING_FAST,
        new Vector3(10, 0, -fastSpeed)
      ),
      new Target(
        new Vector3(-100, 0, 600),
        TargetType.MOVING_FAST,
        new Vector3(-10, 0, -fastSpeed)
      ),
      new Target(
        new Vector3(200, 0, 700),
        TargetType.MOVING_FAST,
        new Vector3(15, 0, -fastSpeed)
      ),
      new Target(
        new Vector3(-200, 0, 700),
        TargetType.MOVING_FAST,
        new Vector3(-15, 0, -fastSpeed)
      ),
    ];

    return {
      id: 3,
      name: 'Stage 3: Fast Moving Targets',
      description: 'Defeat fast moving targets',
      targets,
      artilleryPosition,
    };
  },
};
