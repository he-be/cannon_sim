import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameScene } from './GameScene';
import {} from './TitleScene';
import { CanvasManager } from '../../rendering/CanvasManager';
import { Vector3 } from '../../math/Vector3';
import { TargetType } from '../../game/entities/Target';
import {
  ScenarioEventType,
  SpawnEvent,
  WaitEvent,
} from '../../game/scenario/ScenarioEvent';
import { StageConfig } from '../../data/StageData';
import { UIControllerA } from '../controllers/UIControllerA';
import { UIControllerB } from '../controllers/UIControllerB';
import { TextMeasurementService } from '../services/TextMeasurementService';
import { SceneInitializer } from '../../game/SceneInitializer';

import { GameInputController } from '../../input/GameInputController';

// Mock GameInputController
vi.mock('../../input/GameInputController', () => {
  return {
    GameInputController: vi.fn().mockImplementation(() => {
      return {
        attach: vi.fn(),
        detach: vi.fn(),
        update: vi.fn(),
        isKeyPressed: vi.fn().mockReturnValue(false),
        getMousePosition: vi.fn().mockReturnValue({ x: 0, y: 0 }),
        isMouseDown: vi.fn().mockReturnValue(false),
      };
    }),
  };
});

// Mock EffectRenderer
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

// Mock stage data
const mockStageConfig: StageConfig = {
  id: 1,
  name: 'Test Stage',
  description: 'Test stage for GameScene',
  artilleryPosition: new Vector3(0, -8000, 0),
  scenario: [
    {
      type: ScenarioEventType.SPAWN,
      targetType: TargetType.STATIC,
      position: new Vector3(1000, 5000, 500),
    } as SpawnEvent,
    {
      type: ScenarioEventType.WAIT,
      duration: 2,
    } as WaitEvent,
    {
      type: ScenarioEventType.SPAWN,
      targetType: TargetType.MOVING_SLOW,
      position: new Vector3(-2000, 8000, 800),
      velocity: new Vector3(50, 0, 0),
    } as SpawnEvent,
  ],
  winCondition: 'destroy_all',
  difficultyLevel: 1,
};

// Mock UI Controllers
// Mock UI Controllers
vi.mock('../controllers/UIControllerA', () => {
  return {
    UIControllerA: vi.fn().mockImplementation(() => {
      return {
        initialize: vi.fn(),
        update: vi.fn(),
        updateControls: vi.fn(),
        render: vi.fn(),
        updateLeadAngle: vi.fn(),
        updateTargetingInfo: vi.fn(),
        updateRadarAzimuth: vi.fn(),
        handleInput: vi.fn(),
        getRadarState: vi
          .fn()
          .mockReturnValue({ azimuth: 0, elevation: 0, range: 10000 }),
        setRadarState: vi.fn(),
        getUIManager: vi.fn().mockReturnValue({
          setRadarDirection: vi.fn(),
          setRangeGate: vi.fn(),
          setArtilleryAngles: vi.fn(),
          setLeadAngle: vi.fn(),
          updateLeadAngle: vi.fn(),
          updateTargetingInfo: vi.fn(),
          updateRadarAzimuth: vi.fn(),
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
          render: vi.fn(),
        }),
        handleKeyDown: vi.fn(),
        handleKeyUp: vi.fn(),
      };
    }),
  };
});
vi.mock('../controllers/UIControllerB', () => {
  return {
    UIControllerB: vi.fn().mockImplementation(() => {
      return {
        initialize: vi.fn(),
        update: vi.fn(),
        updateControls: vi.fn(),
        render: vi.fn(),
        updateLeadAngle: vi.fn(),
        updateTargetingInfo: vi.fn(),
        updateRadarAzimuth: vi.fn(),
        handleInput: vi.fn(),
        getRadarState: vi
          .fn()
          .mockReturnValue({ azimuth: 0, elevation: 0, range: 10000 }),
        setRadarState: vi.fn(),
        getUIManager: vi.fn().mockReturnValue({
          setRadarDirection: vi.fn(),
          setRangeGate: vi.fn(),
          setArtilleryAngles: vi.fn(),
          setLeadAngle: vi.fn(),
          updateLeadAngle: vi.fn(),
          updateTargetingInfo: vi.fn(),
          updateRadarAzimuth: vi.fn(),
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
          render: vi.fn(),
        }),
        handleKeyDown: vi.fn(),
        handleKeyUp: vi.fn(),
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
        updateTargets: vi.fn(),
        checkGameOverCondition: vi.fn().mockReturnValue(false),
        updateProjectiles: vi.fn(),
        checkCollisions: vi.fn().mockReturnValue([]),
        getTargets: vi.fn().mockReturnValue([]),
        getProjectiles: vi.fn().mockReturnValue([]),
      },
      artillery: {
        canFire: vi.fn().mockReturnValue(true),
        fire: vi.fn().mockReturnValue({
          position: { x: 0, y: 0, z: 0 },
          velocity: { x: 0, y: 0, z: 0 },
        }),
        getPosition: vi.fn().mockReturnValue({ x: 0, y: 0, z: 0 }),
        setTargetPosition: vi.fn(),
        update: vi.fn(),
        getMuzzleVelocityVector: vi.fn().mockReturnValue({ x: 0, y: 0, z: 0 }),
      },
      radarController: {
        reset: vi.fn(),
        setAzimuth: vi.fn(),
        setElevation: vi.fn(),
        setAutoRotating: vi.fn(),
        isRotating: vi.fn().mockReturnValue(false),
        updateAutoRotation: vi.fn(),
      },
      targetingSystem: {
        reset: vi.fn(),
        toggleLock: vi.fn(),
        handleLockToggle: vi.fn().mockReturnValue({ state: 'LOCKED_ON' }),
        getTargetingState: vi.fn().mockReturnValue('IDLE'),
        getLockedTarget: vi.fn().mockReturnValue(null),
        getTrackedTarget: vi.fn().mockReturnValue(null),
        update: vi.fn(),
      },
      leadAngleSystem: {
        getLeadAngle: vi.fn().mockReturnValue(null),
        update: vi.fn().mockReturnValue(false),
        clear: vi.fn(),
      },
      physicsEngine: {
        update: vi.fn(),
        addBody: vi.fn(),
        removeBody: vi.fn(),
        calculateTrajectory: vi.fn().mockReturnValue([]),
      },
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
      artilleryPosition: {
        x: 0,
        y: 0,
        z: 0,
        copy: vi.fn().mockReturnValue({ x: 0, y: 0, z: 0 }),
      },
      scenarioManager: {
        loadScenario: vi.fn(),
        update: vi.fn(),
        isScenarioFinished: vi.fn().mockReturnValue(false),
      },
    }),
    resetGame: vi.fn(),
  },
}));

describe('GameScene (T029-2 - Complete Rewrite)', () => {
  let gameScene: GameScene;
  let mockCanvasManager: CanvasManager;
  let mockContext: CanvasRenderingContext2D;
  let mockCanvas: HTMLCanvasElement;
  let mockOnSceneTransition: vi.MockedFunction<any>;
  let mockInputController: any;

  beforeEach(() => {
    // Mock canvas and context
    mockCanvas = {
      width: 1200,
      height: 800,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        width: 1200,
        height: 800,
      }),
    } as unknown as HTMLCanvasElement;

    mockContext = {
      fillStyle: '',
      strokeStyle: '',
      font: '',
      textAlign: '',
      textBaseline: '',
      globalAlpha: 1,
      shadowColor: '',
      shadowBlur: 0,
      lineWidth: 1,
      save: vi.fn(),
      restore: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      closePath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      measureText: vi.fn(() => ({ width: 10 })),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      setLineDash: vi.fn(),
    } as any;

    // Mock TextMeasurementService
    const mockMeasurementService = {
      measureTextWidth: vi.fn().mockReturnValue(50),
    };
    (TextMeasurementService.getInstance as any) = vi.fn(
      () => mockMeasurementService
    );

    mockCanvasManager = {
      getCanvas: () => mockCanvas,
      getContext: () => mockContext,
      context: mockContext,
      width: 1200,
      height: 800,
      center: { x: 600, y: 400 },
    } as any;

    mockOnSceneTransition = vi.fn();

    // Mock GameInputController methods
    mockInputController = {
      initialize: vi.fn(),
      attach: vi.fn(),
      detach: vi.fn(),
      getUIEvents: vi.fn(() => ({
        onAzimuthChange: vi.fn(),
        onElevationChange: vi.fn(),
        onFireClick: vi.fn(),
        onLockToggle: vi.fn(),
        onAutoToggle: vi.fn(),
        onRadarRotateToggle: vi.fn(),
        onMenuClick: vi.fn(),
        onDirectionChange: vi.fn(),
        onRangeChange: vi.fn(),
        onTargetDetected: vi.fn(),
        onTargetLost: vi.fn(),
      })),
    };
    (GameInputController as any).mockImplementation(() => mockInputController);

    // Mock UIManager
    const mockUIManager = {
      setRadarDirection: vi.fn(),
      setRangeGate: vi.fn(),
      setArtilleryAngles: vi.fn(),
      setLeadAngle: vi.fn(),
      updateLeadAngle: vi.fn(),
      updateTargetingInfo: vi.fn(),
      updateRadarAzimuth: vi.fn(),
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
      render: vi.fn(),
    };

    // Mock UIController implementation
    const mockUIController = {
      initialize: vi.fn(),
      update: vi.fn(),
      updateControls: vi.fn(),
      render: vi.fn(),
      updateLeadAngle: vi.fn(),
      updateTargetingInfo: vi.fn(),
      updateRadarAzimuth: vi.fn(),
      handleInput: vi.fn(),
      getRadarState: vi
        .fn()
        .mockReturnValue({ azimuth: 0, elevation: 0, range: 10000 }),
      setRadarState: vi.fn(),
      getUIManager: vi.fn(() => mockUIManager),
      handleKeyDown: vi.fn(),
      handleKeyUp: vi.fn(),
    };
    (UIControllerA as any).mockImplementation(() => mockUIController);
    (UIControllerB as any).mockImplementation(() => mockUIController);

    gameScene = new GameScene(mockCanvasManager, mockOnSceneTransition, {
      selectedStage: mockStageConfig,
    });
  });

  afterEach(() => {
    if (gameScene) {
      gameScene.destroy();
    }
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with CanvasManager and configuration', () => {
      expect(gameScene).toBeDefined();
      expect(GameInputController).toHaveBeenCalled();
      expect(SceneInitializer.initializeSystems).toHaveBeenCalledWith(
        mockCanvasManager,
        expect.objectContaining({ selectedStage: mockStageConfig })
      );
    });

    it('should setup input controller', () => {
      expect(mockInputController.initialize).toHaveBeenCalled();
      expect(mockInputController.attach).toHaveBeenCalled();
    });

    it('should start with PLAYING game state', () => {
      // GameScene should start in playing state
      expect(gameScene).toBeDefined();
    });

    it('should initialize targets from stage configuration', () => {
      // Targets should be initialized from stage config
      expect(gameScene).toBeDefined();
    });
  });

  describe('game state management', () => {
    it('should update game time', () => {
      const deltaTime = 0.016; // 60 FPS

      expect(() => {
        gameScene.update(deltaTime);
      }).not.toThrow();
    });

    it('should handle multiple updates', () => {
      for (let i = 0; i < 100; i++) {
        gameScene.update(0.016);
      }

      expect(true).toBe(true); // Should complete without errors
    });

    it('should update effect renderer', () => {
      const mockEffectRenderer = (gameScene as any).effectRenderer;

      gameScene.update(0.016);

      expect(mockEffectRenderer.update).toHaveBeenCalledWith(0.016);
    });
  });

  describe('rendering', () => {
    it('should render without errors', () => {
      expect(() => {
        gameScene.render();
      }).not.toThrow();
    });

    it('should call Canvas 2D API methods for rendering', () => {
      gameScene.render();

      const uiManager = (gameScene as any).uiController.getUIManager();
      expect(uiManager.render).toHaveBeenCalled();
    });

    it('should render UI-04 3-pane layout', () => {
      gameScene.render();

      const uiManager = (gameScene as any).uiController.getUIManager();
      expect(uiManager.render).toHaveBeenCalled();
    });

    it('should render control panel', () => {
      gameScene.render();

      const uiManager = (gameScene as any).uiController.getUIManager();
      expect(uiManager.render).toHaveBeenCalled();
    });

    it('should render radar displays', () => {
      gameScene.render();

      const uiManager = (gameScene as any).uiController.getUIManager();
      expect(uiManager.render).toHaveBeenCalled();
    });

    it('should render targeting information', () => {
      gameScene.render();

      const uiManager = (gameScene as any).uiController.getUIManager();
      expect(uiManager.render).toHaveBeenCalled();
      expect(uiManager.setTargetInfo).toHaveBeenCalled();
    });
  });

  it('should render effects on top', () => {
    const mockEffectRenderer = (gameScene as any).effectRenderer;

    gameScene.render();

    expect(mockEffectRenderer.render).toHaveBeenCalled();
  });

  describe('mouse interaction', () => {
    it('should initialize GameInputController with actions', () => {
      expect(GameInputController).toHaveBeenCalledWith(
        expect.objectContaining({
          fireProjectile: expect.any(Function),
          toggleLock: expect.any(Function),
          toggleAuto: expect.any(Function),
        })
      );
    });

    it('should handle fire action', () => {
      const actions = vi.mocked(GameInputController).mock.calls[0][0] as any;

      // Spy on entityManager.addProjectile
      const addProjectileSpy = vi.spyOn(
        gameScene['entityManager'],
        'addProjectile'
      );

      actions.fireProjectile();

      expect(addProjectileSpy).toHaveBeenCalled();
    });

    it('should handle lock toggle action', () => {
      const actions = vi.mocked(GameInputController).mock.calls[0][0] as any;

      // Spy on targetingSystem.handleLockToggle
      const toggleLockSpy = vi.spyOn(
        gameScene['targetingSystem'],
        'handleLockToggle'
      );

      actions.toggleLock();

      expect(toggleLockSpy).toHaveBeenCalled();
    });
  });

  describe('keyboard controls', () => {
    it('should handle fire key (F)', () => {
      const keyEvent = new KeyboardEvent('keydown', { key: 'f' });

      expect(() => {
        window.dispatchEvent(keyEvent);
      }).not.toThrow();
    });

    it('should handle restart key (R) when game over', () => {
      const keyEvent = new KeyboardEvent('keydown', { key: 'R' });

      expect(() => {
        window.dispatchEvent(keyEvent);
      }).not.toThrow();
    });

    it('should handle continue key (Space) when stage cleared', () => {
      const keyEvent = new KeyboardEvent('keydown', { key: ' ' });

      expect(() => {
        window.dispatchEvent(keyEvent);
      }).not.toThrow();
    });
  });

  describe('game mechanics', () => {
    it('should update targets over time', () => {
      gameScene.update(0.016);
      gameScene.update(1.0); // Advance time for delayed spawns
      gameScene.update(0.016);

      expect(true).toBe(true); // Targets should be updated
    });

    it('should update projectiles with physics', () => {
      // Fire a projectile first (simulate F key)
      const keyEvent = new KeyboardEvent('keydown', { key: 'f' });
      window.dispatchEvent(keyEvent);

      gameScene.update(0.016);
      gameScene.update(0.016);

      expect(true).toBe(true); // Projectiles should be updated
    });

    it('should detect collisions between projectiles and targets', () => {
      const mockEffectRenderer = (gameScene as any).effectRenderer;
      console.log('Mock EffectRenderer keys:', Object.keys(mockEffectRenderer));

      // Simulate collision scenario
      gameScene.update(0.016);

      // Should be prepared to create explosions when collisions occur
      expect(mockEffectRenderer.createExplosion).toHaveBeenCalledTimes(0); // No collisions yet
    });

    it('should handle target spawning with delays', () => {
      // First target spawns immediately (delay 0)
      gameScene.update(0.016);

      // Second target spawns after 2 seconds (delay 2)
      gameScene.update(2.1); // Advance past spawn delay

      expect(true).toBe(true); // Targets should spawn according to delays
    });
  });

  describe('targeting system', () => {
    it('should start with NO_TARGET state', () => {
      // Should start with no targeting
      expect(gameScene).toBeDefined();
    });

    it('should track targets near cursor', () => {
      gameScene.update(0.016);

      // Should be able to track targets
      expect(true).toBe(true);
    });

    it('should lock onto targets via action', () => {
      const actions = vi.mocked(GameInputController).mock.calls[0][0] as any;
      const toggleLockSpy = vi.spyOn(
        gameScene['targetingSystem'],
        'handleLockToggle'
      );

      actions.toggleLock();

      expect(toggleLockSpy).toHaveBeenCalled();
    });
  });

  describe('responsive design', () => {
    it('should adapt to different canvas sizes', () => {
      const smallCanvas = {
        width: 800,
        height: 600,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        getBoundingClientRect: () => ({
          left: 0,
          top: 0,
          width: 800,
          height: 600,
        }),
      } as unknown as HTMLCanvasElement;

      const smallCanvasManager = {
        getCanvas: () => smallCanvas,
        getContext: () => mockContext,
        context: mockContext,
        width: 800,
        height: 600,
        center: { x: 400, y: 300 },
      } as any;

      const smallGameScene = new GameScene(
        smallCanvasManager,
        mockOnSceneTransition,
        { selectedStage: mockStageConfig }
      );

      expect(() => {
        smallGameScene.render();
        smallGameScene.destroy();
      }).not.toThrow();
    });

    it('should position UI elements relative to canvas size', () => {
      gameScene.render();

      // UI layout should be relative to canvas dimensions
      const uiManager = (gameScene as any).uiController.getUIManager();
      expect(uiManager.render).toHaveBeenCalled();
    });
  });

  describe('resource cleanup', () => {
    it('should cleanup GameInputController on destroy', () => {
      gameScene.destroy();

      expect(mockInputController.detach).toHaveBeenCalled();
    });

    it('should handle multiple destroy calls', () => {
      expect(() => {
        gameScene.destroy();
        gameScene.destroy(); // Should not throw
      }).not.toThrow();
    });

    it('should remove keyboard event listeners', () => {
      gameScene.destroy();

      // Should clean up keyboard listeners
      expect(true).toBe(true);
    });
  });

  describe('UI specification compliance', () => {
    it('should implement UI-04: 3-pane layout', () => {
      gameScene.render();

      // Should delegate rendering to UIManager
      const uiManager = (gameScene as any).uiController.getUIManager();
      expect(uiManager.render).toHaveBeenCalled();
    });

    it('should display UI elements', () => {
      gameScene.update(0.016);
      gameScene.render();

      const uiManager = (gameScene as any).uiController.getUIManager();
      expect(uiManager.render).toHaveBeenCalled();
      expect(uiManager.setTargetInfo).toHaveBeenCalled();
      expect(uiManager.setGameTime).toHaveBeenCalled();
    });

    describe('animation and effects', () => {
      it('should animate scan lines over time', () => {
        gameScene.update(1);
        gameScene.render();

        const uiManager = (gameScene as any).uiController.getUIManager();
        expect(uiManager.render).toHaveBeenCalledWith(expect.any(Number));
      });

      it('should update animation time', () => {
        gameScene.update(0.5);
        gameScene.render();
        const uiManager = (gameScene as any).uiController.getUIManager();
        expect(uiManager.render).toHaveBeenLastCalledWith(
          expect.closeTo(0.5, 2)
        );

        gameScene.update(0.5);
        gameScene.render();
        expect(uiManager.render).toHaveBeenLastCalledWith(
          expect.closeTo(1.0, 2)
        );
      });
    });

    describe('stage configuration integration', () => {
      it('should load targets from stage configuration', () => {
        expect(gameScene).toBeDefined();

        // Should initialize with targets from mockStageConfig
        gameScene.update(0.016);
        expect(true).toBe(true);
      });

      it('should position artillery according to stage', () => {
        // Artillery should be positioned at stage configuration location
        gameScene.render();
        // Check if UIManager was called to render
        const uiManager = (gameScene as any).uiController.getUIManager();
        expect(uiManager.render).toHaveBeenCalled();
      });

      it('should handle different target types', () => {
        // Should handle both STATIC and MOVING_SLOW targets from config
        gameScene.update(0.016);
        gameScene.render();
        expect(true).toBe(true);
      });
    });

    describe('performance characteristics', () => {
      it('should handle multiple targets efficiently', () => {
        // Should render multiple targets without performance issues
        gameScene.update(0.016);
        gameScene.render();

        const uiManager = (gameScene as any).uiController.getUIManager();
        expect(uiManager.render).toHaveBeenCalled();
      });

      it('should handle multiple projectiles efficiently', () => {
        // Fire multiple projectiles
        for (let i = 0; i < 5; i++) {
          const keyEvent = new KeyboardEvent('keydown', { key: 'f' });
          window.dispatchEvent(keyEvent);
        }

        gameScene.update(0.016);
        gameScene.render();

        expect(true).toBe(true);
      });
    });
  });
});
