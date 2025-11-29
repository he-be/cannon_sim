import { StageConfig } from '../data/StageData';
import { UIMode } from '../ui/UIMode';
import { Vector3 } from '../math/Vector3';
import { TargetType } from './entities/Target';
import { ScenarioEventType, SpawnEvent } from './scenario/ScenarioEvent';

export interface GameConfig {
  selectedStage: StageConfig;
  uiMode?: UIMode;
}

// Hardcoded default stage to avoid load-time dependency on StageData
// (which causes issues in tests where StageData is mocked but not yet initialized)
const DEFAULT_STAGE: StageConfig = {
  id: 1,
  name: '気球迎撃戦',
  description: '高高度に浮遊する気球を迎撃せよ',
  artilleryPosition: new Vector3(0, 0, 0),
  scenario: [
    {
      type: ScenarioEventType.SPAWN,
      position: new Vector3(1000, -10000, 1000),
      targetType: TargetType.BALLOON,
    } as SpawnEvent,
  ],
  winCondition: 'destroy_all',
  difficultyLevel: 1,
};

export const DEFAULT_GAME_CONFIG: GameConfig = {
  selectedStage: DEFAULT_STAGE,
  uiMode: UIMode.MODE_B,
};
