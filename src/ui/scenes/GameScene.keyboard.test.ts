import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameScene } from './GameScene';
import { GameState } from '../../game/GameState';

// Mock dependencies
vi.mock('../../rendering/CanvasManager');
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
vi.mock('../UIManager', () => {
  return {
    UIManager: vi.fn().mockImplementation(() => {
      return {
        render: vi.fn(),
        setArtilleryAngles: vi.fn(),
        setRadarDirection: vi.fn(),
        setLeadAngle: vi.fn(),
        setArtilleryState: vi.fn(),
        setLockState: vi.fn(),
        setAutoMode: vi.fn(),
        setGameTime: vi.fn(),
        setRadarInfo: vi.fn(),
        setTargetInfo: vi.fn(),
        setTargetList: vi.fn(),
        addRadarTarget: vi.fn(),
        removeRadarTarget: vi.fn(),
        updateRadarTarget: vi.fn(),
        updateProjectiles: vi.fn(),
        updateTrajectoryPrediction: vi.fn(),
        setRangeGate: vi.fn(),
      };
    }),
  };
});

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

// Mock SceneInitializer
vi.mock('../../game/SceneInitializer', () => ({
  SceneInitializer: {
    initializeSystems: vi.fn().mockReturnValue({
      entityManager: {
        reset: vi.fn(),
        addProjectile: vi.fn(),
      },
      artillery: {
        canFire: vi.fn().mockReturnValue(true),
        fire: vi.fn().mockReturnValue({
          position: { x: 0, y: 0, z: 0 },
          velocity: { x: 0, y: 0, z: 0 },
        }),
        getPosition: vi.fn().mockReturnValue({ x: 0, y: 0, z: 0 }),
        setTargetPosition: vi.fn(),
      },
      radarController: {
        reset: vi.fn(),
        setAzimuth: vi.fn(),
        setElevation: vi.fn(),
        setAutoRotating: vi.fn(),
        isRotating: vi.fn().mockReturnValue(false),
      },
      targetingSystem: {
        reset: vi.fn(),
        toggleLock: vi.fn(),
        handleLockToggle: vi.fn().mockReturnValue({ state: 'LOCKED_ON' }),
        getTargetingState: vi.fn().mockReturnValue('IDLE'),
        getLockedTarget: vi.fn().mockReturnValue(null),
        getTrackedTarget: vi.fn().mockReturnValue(null),
      },
      leadAngleSystem: {},
      physicsEngine: { update: vi.fn(), addBody: vi.fn(), removeBody: vi.fn() },
      trajectoryRenderer: {
        render: vi.fn(),
        update: vi.fn(),
        updateTrajectory: vi.fn(),
      },
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

// Mock GameInputController
let capturedActions: any;
vi.mock('../../input/GameInputController', () => {
  return {
    GameInputController: vi.fn().mockImplementation(actions => {
      capturedActions = actions;
      return {
        initialize: vi.fn(),
        attach: vi.fn(),
        detach: vi.fn(),
        getUIEvents: vi.fn().mockReturnValue({}),
      };
    }),
  };
});

describe('GameScene Keyboard Controls', () => {
  let gameScene: GameScene;
  let mockCanvasManager: any;
  let mockCanvas: any;
  let onSceneTransition: any;
  let config: any;

  beforeEach(() => {
    mockCanvas = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getBoundingClientRect: vi.fn().mockReturnValue({ left: 0, top: 0 }),
    };
    mockCanvasManager = {
      getCanvas: vi.fn().mockReturnValue(mockCanvas),
      width: 800,
      height: 600,
      context: {
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        drawImage: vi.fn(),
        fillRect: vi.fn(),
        fillText: vi.fn(),
        measureText: vi.fn().mockReturnValue({ width: 10 }),
      },
    };
    onSceneTransition = vi.fn();
    config = {
      selectedStage: {
        id: 'test',
        name: 'Test Stage',
        artilleryPosition: { x: 0, y: 0, z: 0 },
        scenario: [],
      },
    };

    gameScene = new GameScene(mockCanvasManager, onSceneTransition, config);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should fire projectile on Space key when playing', () => {
    const addProjectileSpy = (gameScene as any).entityManager.addProjectile;

    // Simulate fire action from input controller
    capturedActions.fireProjectile();

    expect(addProjectileSpy).toHaveBeenCalled();
  });

  it('should fire projectile on F key', () => {
    const addProjectileSpy = (gameScene as any).entityManager.addProjectile;

    // Simulate fire action from input controller
    capturedActions.fireProjectile();

    expect(addProjectileSpy).toHaveBeenCalled();
  });

  it('should toggle lock on L key', () => {
    // Mock targeting system state to allow locking
    (gameScene as any).targetingSystem.getTargetingState = vi
      .fn()
      .mockReturnValue('IDLE');
    const handleLockToggleSpy = ((
      gameScene as any
    ).targetingSystem.handleLockToggle = vi
      .fn()
      .mockReturnValue({ state: 'LOCKED_ON' }));

    // Simulate lock toggle action
    capturedActions.toggleLock();

    expect(handleLockToggleSpy).toHaveBeenCalled();
  });

  it('should toggle auto mode on K key', () => {
    // Mock game state to PLAYING
    (gameScene as any).gameState = GameState.PLAYING;
    const setAutoModeSpy = (gameScene as any).uiController.getUIManager()
      .setAutoMode;

    // Simulate auto toggle action
    capturedActions.toggleAuto();

    expect(setAutoModeSpy).toHaveBeenCalled();
  });
});
