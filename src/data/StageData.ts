/**
 * StageData - Stage configuration for Browser Artillery
 * Clean implementation with proper type safety and component integration
 */

import { Vector3 } from '../math/Vector3';
import { TargetType } from '../game/entities/Target';

export interface TargetConfig {
  position: Vector3;
  type: TargetType;
  velocity?: Vector3;
  spawnDelay: number;
}

export interface StageConfig {
  id: number;
  name: string;
  description: string;
  artilleryPosition: Vector3;
  targets: TargetConfig[];
  timeLimit?: number; // seconds
  winCondition: 'destroy_all' | 'survive_time' | 'score_target';
  difficultyLevel: 1 | 2 | 3;
}

/**
 * Stage configuration constants
 */
const STAGE_CONSTANTS = {
  ARTILLERY_POSITION: new Vector3(0, -8000, 0), // 8km south of origin
  TARGET_DISTANCES: {
    CLOSE: 3000, // 3km
    MEDIUM: 6000, // 6km
    FAR: 10000, // 10km
  },
  TARGET_SPEEDS: {
    SLOW: 50, // 50 m/s
    MEDIUM: 100, // 100 m/s
    FAST: 200, // 200 m/s
  },
  SPAWN_DELAYS: {
    IMMEDIATE: 0,
    SHORT: 5, // 5 seconds
    MEDIUM: 10, // 10 seconds
    LONG: 20, // 20 seconds
  },
} as const;

/**
 * Stage 1: Static targets - Basic training
 */
const STAGE_1_CONFIG: StageConfig = {
  id: 1,
  name: 'Training Range',
  description: 'Static targets for basic artillery training',
  artilleryPosition: STAGE_CONSTANTS.ARTILLERY_POSITION,
  targets: [
    {
      position: new Vector3(0, -5000, 0), // 3km north of artillery
      type: TargetType.STATIC,
      spawnDelay: STAGE_CONSTANTS.SPAWN_DELAYS.IMMEDIATE,
    },
    {
      position: new Vector3(-2000, -2000, 0), // Northwest
      type: TargetType.STATIC,
      spawnDelay: STAGE_CONSTANTS.SPAWN_DELAYS.SHORT,
    },
    {
      position: new Vector3(2000, -2000, 0), // Northeast
      type: TargetType.STATIC,
      spawnDelay: STAGE_CONSTANTS.SPAWN_DELAYS.MEDIUM,
    },
    {
      position: new Vector3(0, 2000, 0), // 10km north of artillery
      type: TargetType.STATIC,
      spawnDelay: STAGE_CONSTANTS.SPAWN_DELAYS.LONG,
    },
  ],
  winCondition: 'destroy_all',
  difficultyLevel: 1,
};

/**
 * Stage 2: Slow moving targets - Intermediate training
 */
const STAGE_2_CONFIG: StageConfig = {
  id: 2,
  name: 'Moving Targets',
  description: 'Slow moving targets for lead calculation practice',
  artilleryPosition: STAGE_CONSTANTS.ARTILLERY_POSITION,
  targets: [
    {
      position: new Vector3(-3000, -2000, 0),
      type: TargetType.MOVING_SLOW,
      velocity: new Vector3(STAGE_CONSTANTS.TARGET_SPEEDS.SLOW, 0, 0), // Moving east
      spawnDelay: STAGE_CONSTANTS.SPAWN_DELAYS.IMMEDIATE,
    },
    {
      position: new Vector3(3000, -2000, 0),
      type: TargetType.MOVING_SLOW,
      velocity: new Vector3(-STAGE_CONSTANTS.TARGET_SPEEDS.SLOW, 0, 0), // Moving west
      spawnDelay: STAGE_CONSTANTS.SPAWN_DELAYS.SHORT,
    },
    {
      position: new Vector3(0, 2000, 0),
      type: TargetType.MOVING_SLOW,
      velocity: new Vector3(0, -STAGE_CONSTANTS.TARGET_SPEEDS.SLOW, 0), // Moving south
      spawnDelay: STAGE_CONSTANTS.SPAWN_DELAYS.MEDIUM,
    },
    {
      position: new Vector3(-1500, 0, 0),
      type: TargetType.MOVING_SLOW,
      velocity: new Vector3(
        STAGE_CONSTANTS.TARGET_SPEEDS.SLOW,
        STAGE_CONSTANTS.TARGET_SPEEDS.SLOW,
        0
      ), // Moving northeast
      spawnDelay: STAGE_CONSTANTS.SPAWN_DELAYS.LONG,
    },
  ],
  winCondition: 'destroy_all',
  difficultyLevel: 2,
};

/**
 * Stage 3: Fast moving targets - Advanced combat
 */
const STAGE_3_CONFIG: StageConfig = {
  id: 3,
  name: 'Combat Scenario',
  description: 'Fast moving targets simulating combat conditions',
  artilleryPosition: STAGE_CONSTANTS.ARTILLERY_POSITION,
  targets: [
    {
      position: new Vector3(-4000, 2000, 0),
      type: TargetType.MOVING_FAST,
      velocity: new Vector3(
        STAGE_CONSTANTS.TARGET_SPEEDS.FAST,
        -STAGE_CONSTANTS.TARGET_SPEEDS.FAST * 0.5,
        0
      ),
      spawnDelay: STAGE_CONSTANTS.SPAWN_DELAYS.IMMEDIATE,
    },
    {
      position: new Vector3(4000, 2000, 0),
      type: TargetType.MOVING_FAST,
      velocity: new Vector3(
        -STAGE_CONSTANTS.TARGET_SPEEDS.FAST,
        -STAGE_CONSTANTS.TARGET_SPEEDS.FAST * 0.5,
        0
      ),
      spawnDelay: STAGE_CONSTANTS.SPAWN_DELAYS.SHORT,
    },
    {
      position: new Vector3(-2000, -1000, 0),
      type: TargetType.MOVING_FAST,
      velocity: new Vector3(
        STAGE_CONSTANTS.TARGET_SPEEDS.FAST * 0.7,
        STAGE_CONSTANTS.TARGET_SPEEDS.FAST * 0.3,
        0
      ),
      spawnDelay: STAGE_CONSTANTS.SPAWN_DELAYS.MEDIUM,
    },
    {
      position: new Vector3(2000, -1000, 0),
      type: TargetType.MOVING_FAST,
      velocity: new Vector3(
        -STAGE_CONSTANTS.TARGET_SPEEDS.FAST * 0.7,
        STAGE_CONSTANTS.TARGET_SPEEDS.FAST * 0.3,
        0
      ),
      spawnDelay: STAGE_CONSTANTS.SPAWN_DELAYS.MEDIUM,
    },
    {
      position: new Vector3(0, 6000, 0),
      type: TargetType.MOVING_FAST,
      velocity: new Vector3(
        STAGE_CONSTANTS.TARGET_SPEEDS.FAST * 0.5,
        -STAGE_CONSTANTS.TARGET_SPEEDS.FAST,
        0
      ),
      spawnDelay: STAGE_CONSTANTS.SPAWN_DELAYS.LONG,
    },
  ],
  timeLimit: 300, // 5 minutes time limit
  winCondition: 'destroy_all',
  difficultyLevel: 3,
};

/**
 * All available stages
 */
export const STAGES: StageConfig[] = [
  STAGE_1_CONFIG,
  STAGE_2_CONFIG,
  STAGE_3_CONFIG,
];

/**
 * Get stage configuration by ID
 */
export function getStageById(id: number): StageConfig | null {
  return STAGES.find(stage => stage.id === id) || null;
}

/**
 * Get all available stages
 */
export function getAllStages(): StageConfig[] {
  return [...STAGES]; // Return copy to prevent mutation
}

/**
 * Validate stage configuration
 */
export function validateStageConfig(stage: StageConfig): boolean {
  if (!stage.id || stage.id < 1) return false;
  if (!stage.name || stage.name.trim() === '') return false;
  if (!stage.targets || stage.targets.length === 0) return false;
  if (!stage.artilleryPosition) return false;
  if (stage.difficultyLevel < 1 || stage.difficultyLevel > 3) return false;

  // Validate each target
  return stage.targets.every(target => {
    if (!target.position) return false;
    if (!Object.values(TargetType).includes(target.type)) return false;
    if (target.spawnDelay < 0) return false;

    // Moving targets must have velocity
    if (
      (target.type === TargetType.MOVING_SLOW ||
        target.type === TargetType.MOVING_FAST) &&
      !target.velocity
    ) {
      return false;
    }

    return true;
  });
}

/**
 * Get stages by difficulty level
 */
export function getStagesByDifficulty(level: 1 | 2 | 3): StageConfig[] {
  return STAGES.filter(stage => stage.difficultyLevel === level);
}

/**
 * Stage data constants for external reference
 */
export const StageDataConstants = {
  TOTAL_STAGES: STAGES.length,
  MAX_DIFFICULTY: 3,
  MIN_DIFFICULTY: 1,
  ...STAGE_CONSTANTS,
} as const;
