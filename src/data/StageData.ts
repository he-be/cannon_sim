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

    const targets = [
      new Target(new Vector3(0, 500, 0), TargetType.STATIC),
      new Target(new Vector3(100, 600, 0), TargetType.STATIC),
      new Target(new Vector3(-100, 600, 0), TargetType.STATIC),
      new Target(new Vector3(200, 700, 0), TargetType.STATIC),
      new Target(new Vector3(-200, 700, 0), TargetType.STATIC),
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

    const targets = [
      new Target(
        new Vector3(0, 500, 0),
        TargetType.MOVING_SLOW,
        new Vector3(0, -10, 0)
      ),
      new Target(
        new Vector3(100, 600, 0),
        TargetType.MOVING_SLOW,
        new Vector3(5, -10, 0)
      ),
      new Target(
        new Vector3(-100, 600, 0),
        TargetType.MOVING_SLOW,
        new Vector3(-5, -10, 0)
      ),
      new Target(
        new Vector3(200, 700, 0),
        TargetType.MOVING_SLOW,
        new Vector3(10, -10, 0)
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

    const targets = [
      new Target(
        new Vector3(0, 500, 0),
        TargetType.MOVING_FAST,
        new Vector3(0, -20, 0)
      ),
      new Target(
        new Vector3(100, 600, 0),
        TargetType.MOVING_FAST,
        new Vector3(10, -20, 0)
      ),
      new Target(
        new Vector3(-100, 600, 0),
        TargetType.MOVING_FAST,
        new Vector3(-10, -20, 0)
      ),
      new Target(
        new Vector3(200, 700, 0),
        TargetType.MOVING_FAST,
        new Vector3(15, -20, 0)
      ),
      new Target(
        new Vector3(-200, 700, 0),
        TargetType.MOVING_FAST,
        new Vector3(-15, -20, 0)
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
