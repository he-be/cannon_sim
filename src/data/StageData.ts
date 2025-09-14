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
  // 新規追加（オプショナル）
  customAltitude?: number; // 個別高度設定
  patrolRoute?: Vector3[]; // 巡航ルート（将来拡張用）
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
 * Stage 1: 気球ステージ - 固定目標訓練
 */
const STAGE_1_CONFIG: StageConfig = {
  id: 1,
  name: '気球迎撃戦',
  description: '高高度に浮遊する気球を迎撃せよ',
  artilleryPosition: STAGE_CONSTANTS.ARTILLERY_POSITION,
  targets: [
    {
      position: new Vector3(0, -5000, 1000), // 5km北、高度1000mの気球
      type: TargetType.BALLOON,
      spawnDelay: STAGE_CONSTANTS.SPAWN_DELAYS.IMMEDIATE,
    },
    {
      position: new Vector3(-3000, -4000, 900), // 北西、高度900m
      type: TargetType.BALLOON,
      spawnDelay: STAGE_CONSTANTS.SPAWN_DELAYS.SHORT,
    },
    {
      position: new Vector3(3000, -4000, 1100), // 北東、高度1100m
      type: TargetType.BALLOON,
      spawnDelay: STAGE_CONSTANTS.SPAWN_DELAYS.MEDIUM,
    },
    {
      position: new Vector3(0, -8000, 1200), // 8km北、高度1200m
      type: TargetType.BALLOON,
      spawnDelay: STAGE_CONSTANTS.SPAWN_DELAYS.LONG,
    },
  ],
  winCondition: 'destroy_all',
  difficultyLevel: 1,
};

/**
 * Stage 2: フリゲートステージ - 低速移動目標
 */
const STAGE_2_CONFIG: StageConfig = {
  id: 2,
  name: 'フリゲート迎撃戦',
  description: '低速で移動するフリゲート艦を迎撃せよ',
  artilleryPosition: STAGE_CONSTANTS.ARTILLERY_POSITION,
  targets: [
    {
      position: new Vector3(-4000, -6000, 800), // 西から接近
      type: TargetType.FRIGATE,
      velocity: new Vector3(60, 0, 0), // 60m/s東進
      spawnDelay: STAGE_CONSTANTS.SPAWN_DELAYS.IMMEDIATE,
    },
    {
      position: new Vector3(4000, -6000, 700), // 東から接近
      type: TargetType.FRIGATE,
      velocity: new Vector3(-55, 0, 0), // 55m/s西進
      spawnDelay: STAGE_CONSTANTS.SPAWN_DELAYS.SHORT,
    },
    {
      position: new Vector3(0, -10000, 900), // 北方から南進
      type: TargetType.FRIGATE,
      velocity: new Vector3(0, 65, 0), // 65m/s南進
      spawnDelay: STAGE_CONSTANTS.SPAWN_DELAYS.MEDIUM,
    },
    {
      position: new Vector3(-2000, -8000, 750), // 北西から斜め移動
      type: TargetType.FRIGATE,
      velocity: new Vector3(40, 40, 0), // 斜め移動
      spawnDelay: STAGE_CONSTANTS.SPAWN_DELAYS.LONG,
    },
  ],
  winCondition: 'destroy_all',
  difficultyLevel: 2,
};

/**
 * Stage 3: 巡洋艦ステージ - 高速移動目標
 */
const STAGE_3_CONFIG: StageConfig = {
  id: 3,
  name: '巡洋艦迎撃戦',
  description: '高速で機動する巡洋艦を迎撃せよ',
  artilleryPosition: STAGE_CONSTANTS.ARTILLERY_POSITION,
  targets: [
    {
      position: new Vector3(-5000, -8000, 1200), // 遠距離から高速接近
      type: TargetType.CRUISER,
      velocity: new Vector3(110, 30, 0), // 110m/s東北東進
      spawnDelay: STAGE_CONSTANTS.SPAWN_DELAYS.IMMEDIATE,
    },
    {
      position: new Vector3(5000, -8000, 1100), // 東から高速接近
      type: TargetType.CRUISER,
      velocity: new Vector3(-120, 25, 0), // 120m/s西北西進
      spawnDelay: STAGE_CONSTANTS.SPAWN_DELAYS.SHORT,
    },
    {
      position: new Vector3(-3000, -12000, 1300), // 複雑な機動
      type: TargetType.CRUISER,
      velocity: new Vector3(85, 85, 0), // 斜め高速移動
      spawnDelay: STAGE_CONSTANTS.SPAWN_DELAYS.MEDIUM,
    },
    {
      position: new Vector3(0, -15000, 1000), // 超遠距離から直進
      type: TargetType.CRUISER,
      velocity: new Vector3(0, 130, 0), // 130m/s南進
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
