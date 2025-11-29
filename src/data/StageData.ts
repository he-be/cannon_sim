/**
 * StageData - Stage configuration for Browser Artillery
 * Clean implementation with proper type safety and component integration
 */

import { Vector3 } from '../math/Vector3';
import { TargetType } from '../game/entities/Target';
import {
  ScenarioEvent,
  ScenarioEventType,
} from '../game/scenario/ScenarioEvent';

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
  // targets: TargetConfig[]; // DEPRECATED: Replaced by scenario
  scenario: ScenarioEvent[];
  timeLimit?: number; // seconds
  winCondition: 'destroy_all' | 'survive_time' | 'score_target';
  difficultyLevel: 1 | 2 | 3;
}

/**
 * Stage configuration constants
 */
const STAGE_CONSTANTS = {
  ARTILLERY_POSITION: new Vector3(0, 0, 0), // Origin position - simplified coordinate system
  TARGET_DISTANCES: {
    CLOSE: 10000, // 10km
    MEDIUM: 16000, // 16km
    FAR: 20000, // 20km
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
const STAGE_1_SCENARIO: ScenarioEvent[] = [
  // Target 1: Immediate
  {
    type: ScenarioEventType.SPAWN,
    targetType: TargetType.BALLOON,
    position: new Vector3(1000, -10000, 1000),
  },
  // Wait 5s for Target 2
  {
    type: ScenarioEventType.WAIT,
    duration: 5,
  },
  // Target 2
  {
    type: ScenarioEventType.SPAWN,
    targetType: TargetType.BALLOON,
    position: new Vector3(-3000, -4000, 900),
  },
  // Wait 5s for Target 3 (Total 10s)
  {
    type: ScenarioEventType.WAIT,
    duration: 5,
  },
  // Target 3
  {
    type: ScenarioEventType.SPAWN,
    targetType: TargetType.BALLOON,
    position: new Vector3(5000, -7000, 1100),
  },
  // Wait 10s for Target 4 (Total 20s)
  {
    type: ScenarioEventType.WAIT,
    duration: 10,
  },
  // Target 4
  {
    type: ScenarioEventType.SPAWN,
    targetType: TargetType.BALLOON,
    position: new Vector3(0, -12000, 1200),
  },
];

const STAGE_1_CONFIG: StageConfig = {
  id: 1,
  name: '気球迎撃戦',
  description: '高高度に浮遊する気球を迎撃せよ',
  artilleryPosition: STAGE_CONSTANTS.ARTILLERY_POSITION,
  scenario: STAGE_1_SCENARIO,
  winCondition: 'destroy_all',
  difficultyLevel: 1,
};

/**
 * Stage 2: フリゲートステージ - 低速移動目標
 */
const STAGE_2_SCENARIO: ScenarioEvent[] = [
  // Target 1: Immediate
  {
    type: ScenarioEventType.SPAWN,
    targetType: TargetType.FRIGATE,
    position: new Vector3(-10000, -1000, 800),
    velocity: new Vector3(20, 0, 0),
  },
  // Wait 5s
  {
    type: ScenarioEventType.WAIT,
    duration: 5,
  },
  // Target 2
  {
    type: ScenarioEventType.SPAWN,
    targetType: TargetType.FRIGATE,
    position: new Vector3(2000, -9000, 700),
    velocity: new Vector3(-25, 0, 0),
  },
  // Wait 5s (Total 10s)
  {
    type: ScenarioEventType.WAIT,
    duration: 5,
  },
  // Target 3
  {
    type: ScenarioEventType.SPAWN,
    targetType: TargetType.FRIGATE,
    position: new Vector3(0, -8000, 900),
    velocity: new Vector3(0, 25, 0),
  },
  // Wait 10s (Total 20s)
  {
    type: ScenarioEventType.WAIT,
    duration: 10,
  },
  // Target 4
  {
    type: ScenarioEventType.SPAWN,
    targetType: TargetType.FRIGATE,
    position: new Vector3(5000, 8000, 750),
    velocity: new Vector3(10, 20, 0),
  },
];

const STAGE_2_CONFIG: StageConfig = {
  id: 2,
  name: 'フリゲート迎撃戦',
  description: '低速で移動するフリゲート艦を迎撃せよ',
  artilleryPosition: STAGE_CONSTANTS.ARTILLERY_POSITION,
  scenario: STAGE_2_SCENARIO,
  winCondition: 'destroy_all',
  difficultyLevel: 2,
};

/**
 * Stage 3: 巡洋艦ステージ - 高速移動目標
 */
const STAGE_3_SCENARIO: ScenarioEvent[] = [
  // Target 1: Immediate
  {
    type: ScenarioEventType.SPAWN,
    targetType: TargetType.CRUISER,
    position: new Vector3(-5000, -8000, 1200),
    velocity: new Vector3(110, 30, 0),
  },
  // Wait 5s
  {
    type: ScenarioEventType.WAIT,
    duration: 5,
  },
  // Target 2
  {
    type: ScenarioEventType.SPAWN,
    targetType: TargetType.CRUISER,
    position: new Vector3(5000, -8000, 1100),
    velocity: new Vector3(-120, 25, 0),
  },
  // Wait 5s (Total 10s)
  {
    type: ScenarioEventType.WAIT,
    duration: 5,
  },
  // Target 3
  {
    type: ScenarioEventType.SPAWN,
    targetType: TargetType.CRUISER,
    position: new Vector3(-3000, -12000, 1300),
    velocity: new Vector3(85, 85, 0),
  },
  // Wait 10s (Total 20s)
  {
    type: ScenarioEventType.WAIT,
    duration: 10,
  },
  // Target 4
  {
    type: ScenarioEventType.SPAWN,
    targetType: TargetType.CRUISER,
    position: new Vector3(0, -15000, 1000),
    velocity: new Vector3(0, 130, 0),
  },
];

const STAGE_3_CONFIG: StageConfig = {
  id: 3,
  name: '巡洋艦迎撃戦',
  description: '高速で機動する巡洋艦を迎撃せよ',
  artilleryPosition: STAGE_CONSTANTS.ARTILLERY_POSITION,
  scenario: STAGE_3_SCENARIO,
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
  if (!stage.scenario || stage.scenario.length === 0) return false;
  if (!stage.artilleryPosition) return false;
  if (stage.difficultyLevel < 1 || stage.difficultyLevel > 3) return false;

  // Validate scenario events
  return stage.scenario.every(event => {
    if (!Object.values(ScenarioEventType).includes(event.type)) return false;

    if (event.type === ScenarioEventType.SPAWN) {
      if (!event.position) return false;
      if (!Object.values(TargetType).includes(event.targetType)) return false;

      // Moving targets check
      if (
        (event.targetType === TargetType.FRIGATE ||
          event.targetType === TargetType.CRUISER) &&
        !event.velocity
      ) {
        return false;
      }
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
