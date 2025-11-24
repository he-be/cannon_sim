import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameScene } from './GameScene';
import { CanvasManager } from '../../rendering/CanvasManager';
import { UIMode } from '../UIMode';
import { UIControllerA } from '../controllers/UIControllerA';
import { UIControllerB } from '../controllers/UIControllerB';
import { StageConfig } from '../../data/StageData';
import { Vector3 } from '../../math/Vector3';

// Mock UI Controllers
vi.mock('../controllers/UIControllerA');
vi.mock('../controllers/UIControllerB');

// Mock other dependencies
vi.mock('../../input/MouseHandler');
vi.mock('../../rendering/renderers/EffectRenderer');
vi.mock('../../game/entities/Artillery');
vi.mock('../../game/LeadAngleCalculator');
vi.mock('../../physics/PhysicsEngine');
vi.mock('../../rendering/TrajectoryRenderer');

describe('GameScene UI Integration', () => {
  let mockCanvasManager: CanvasManager;
  let mockOnSceneTransition: vi.MockedFunction<any>;
  let mockStageConfig: StageConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    mockCanvasManager = {
      getCanvas: () => ({
        addEventListener: vi.fn(),
        width: 800,
        height: 600,
      }),
      getContext: () => ({}),
      context: {},
      width: 800,
      height: 600,
    } as any;

    mockOnSceneTransition = vi.fn();

    mockStageConfig = {
      id: 1,
      name: 'Test Stage',
      description: 'Test Description',
      difficultyLevel: 1,
      artilleryPosition: new Vector3(0, 0, 0),
      targets: [],
      winCondition: 'destroy_all',
    };
  });

  it('should initialize UIControllerB by default', () => {
    new GameScene(mockCanvasManager, mockOnSceneTransition, {
      selectedStage: mockStageConfig,
    });

    expect(UIControllerB).toHaveBeenCalled();
    expect(UIControllerA).not.toHaveBeenCalled();
  });

  it('should initialize UIControllerA when MODE_A is explicitly selected', () => {
    new GameScene(mockCanvasManager, mockOnSceneTransition, {
      selectedStage: mockStageConfig,
      uiMode: UIMode.MODE_A,
    });

    expect(UIControllerA).toHaveBeenCalled();
    expect(UIControllerB).not.toHaveBeenCalled();
  });

  it('should initialize UIControllerB when MODE_B is selected', () => {
    new GameScene(mockCanvasManager, mockOnSceneTransition, {
      selectedStage: mockStageConfig,
      uiMode: UIMode.MODE_B,
    });

    expect(UIControllerB).toHaveBeenCalled();
    expect(UIControllerA).not.toHaveBeenCalled();
  });
});
