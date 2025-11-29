import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameScene } from './GameScene';
import { CanvasManager } from '../../rendering/CanvasManager';
import { UIMode } from '../UIMode';
import { UIControllerA } from '../controllers/UIControllerA';
import { UIControllerB } from '../controllers/UIControllerB';
import { StageConfig } from '../../data/StageData';
import { Vector3 } from '../../math/Vector3';

// Mock UI Controllers
vi.mock('../controllers/UIControllerA', () => {
  return {
    UIControllerA: vi.fn().mockImplementation(() => {
      return {
        update: vi.fn(),
        render: vi.fn(),
        handleKeyDown: vi.fn(),
        handleKeyUp: vi.fn(),
        getUIManager: vi.fn().mockReturnValue({
          setRadarDirection: vi.fn(),
          setRangeGate: vi.fn(),
          setRadarState: vi.fn(),
          setAutoMode: vi.fn(),
        }),
        getRadarState: vi
          .fn()
          .mockReturnValue({ azimuth: 0, elevation: 45, range: 5000 }),
        setRadarState: vi.fn(),
      };
    }),
  };
});
vi.mock('../controllers/UIControllerB', () => {
  return {
    UIControllerB: vi.fn().mockImplementation(() => {
      return {
        update: vi.fn(),
        render: vi.fn(),
        handleKeyDown: vi.fn(),
        handleKeyUp: vi.fn(),
        getUIManager: vi.fn().mockReturnValue({
          setRadarDirection: vi.fn(),
          setRangeGate: vi.fn(),
          setRadarState: vi.fn(),
          setAutoMode: vi.fn(),
        }),
        getRadarState: vi
          .fn()
          .mockReturnValue({ azimuth: 0, elevation: 45, range: 5000 }),
        setRadarState: vi.fn(),
      };
    }),
  };
});

// Mock other dependencies
// Mock other dependencies
vi.mock('../../input/MouseHandler', () => {
  return {
    MouseHandler: vi.fn().mockImplementation(() => {
      return {
        attach: vi.fn(),
        detach: vi.fn(),
        setCallbacks: vi.fn(),
        addEventListener: vi.fn(),
      };
    }),
  };
});
vi.mock('../../rendering/renderers/EffectRenderer', () => {
  return {
    EffectRenderer: vi.fn().mockImplementation(() => {
      return {
        render: vi.fn(),
        createExplosion: vi.fn(),
        addMuzzleFlash: vi.fn(),
        addImpact: vi.fn(),
        addTrail: vi.fn(),
        reset: vi.fn(),
        clearAll: vi.fn(),
        update: vi.fn(),
      };
    }),
  };
});
vi.mock('../../game/entities/Artillery', () => {
  return {
    Artillery: vi.fn().mockImplementation(() => {
      return {
        canFire: vi.fn().mockReturnValue(true),
        fire: vi.fn().mockReturnValue({
          position: { x: 0, y: 0, z: 0 },
          velocity: { x: 0, y: 0, z: 0 },
        }),
        getPosition: vi.fn().mockReturnValue({ x: 0, y: 0, z: 0 }),
        setTargetPosition: vi.fn(),
        update: vi.fn(),
      };
    }),
  };
});
vi.mock('../../game/LeadAngleCalculator', () => {
  return {
    LeadAngleCalculator: vi.fn().mockImplementation(() => {
      return {
        calculateLeadAngle: vi.fn().mockReturnValue(0),
      };
    }),
  };
});
vi.mock('../../physics/PhysicsEngine', () => {
  return {
    PhysicsEngine: vi.fn().mockImplementation(() => {
      return {
        update: vi.fn(),
        addBody: vi.fn(),
        removeBody: vi.fn(),
      };
    }),
  };
});
vi.mock('../../rendering/TrajectoryRenderer', () => {
  return {
    TrajectoryRenderer: vi.fn().mockImplementation(() => {
      return {
        render: vi.fn(),
        update: vi.fn(),
        updateTrajectory: vi.fn(),
      };
    }),
  };
});

vi.mock('../../game/SceneInitializer', () => ({
  SceneInitializer: {
    initializeSystems: vi.fn().mockReturnValue({
      entityManager: { reset: vi.fn() },
      artillery: {},
      radarController: {
        reset: vi.fn(),
        setAzimuth: vi.fn(),
        setElevation: vi.fn(),
        setAutoRotating: vi.fn(),
        isRotating: vi.fn().mockReturnValue(false),
      },
      targetingSystem: { reset: vi.fn() },
      leadAngleSystem: {},
      physicsEngine: { update: vi.fn(), addBody: vi.fn(), removeBody: vi.fn() },
      trajectoryRenderer: { render: vi.fn(), update: vi.fn() },
      effectRenderer: {
        render: vi.fn(),
        createExplosion: vi.fn(),
        addMuzzleFlash: vi.fn(),
        addImpact: vi.fn(),
        addTrail: vi.fn(),
        reset: vi.fn(),
        clearAll: vi.fn(),
        update: vi.fn(),
      },
      artilleryPosition: { x: 0, y: 0, z: 0 },
      scenarioManager: { loadScenario: vi.fn() },
    }),
    resetGame: vi.fn(),
  },
}));

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
      scenario: [],
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
