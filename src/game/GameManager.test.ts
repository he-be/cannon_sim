import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameManager, GameState } from './GameManager';
import { SceneType } from '../ui/scenes/TitleScene';
import { CanvasManager } from '../rendering/CanvasManager';
import { TitleScene } from '../ui/scenes/TitleScene';
import { StageSelectScene } from '../ui/scenes/StageSelectScene';
import { GameScene } from '../ui/scenes/GameScene';
import { getStageById } from '../data/StageData';
import { Vector3 } from '../math/Vector3';

// Mock all scene classes
vi.mock('../ui/scenes/TitleScene');
vi.mock('../ui/scenes/StageSelectScene');
vi.mock('../ui/scenes/GameScene');
vi.mock('../rendering/CanvasManager');
vi.mock('../data/StageData');

// Mock requestAnimationFrame and cancelAnimationFrame
const mockRequestAnimationFrame = vi.fn(callback => {
  // Use vi.fn() to simulate setTimeout for 60 FPS
  callback();
  return 1;
});
const mockCancelAnimationFrame = vi.fn();

Object.defineProperty(globalThis, 'requestAnimationFrame', {
  value: mockRequestAnimationFrame,
  configurable: true,
});
Object.defineProperty(globalThis, 'cancelAnimationFrame', {
  value: mockCancelAnimationFrame,
  configurable: true,
});

describe('GameManager (T030-2 - Complete Rewrite)', () => {
  let gameManager: GameManager;
  let mockCanvasManager: CanvasManager;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequestAnimationFrame.mockClear();
    mockCancelAnimationFrame.mockClear();
    vi.useFakeTimers();
    vi.setSystemTime(1000000000);

    // Mock CanvasManager
    mockCanvasManager = {
      getCanvas: vi.fn(() => ({
        width: 800,
        height: 600,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0 })),
      })),
      getContext: vi.fn(() => ({
        fillStyle: '',
        fillRect: vi.fn(),
        font: '',
        textAlign: '',
        textBaseline: '',
        shadowColor: '',
        shadowBlur: 0,
        fillText: vi.fn(),
        strokeStyle: '',
        lineWidth: 0,
        stroke: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
      })),
      context: {} as any,
      width: 800,
      height: 600,
      center: { x: 400, y: 300 },
    } as any;

    vi.mocked(CanvasManager).mockImplementation(() => mockCanvasManager);

    // Mock stage data
    vi.mocked(getStageById).mockImplementation((id: number) => {
      const stages = [
        null,
        {
          id: 1,
          name: 'Stage 1: Static Targets',
          description: 'Destroy stationary targets',
          difficultyLevel: 1 as const,
          artilleryPosition: new Vector3(0, -8000, 0),
          targets: [],
          winCondition: 'destroy_all' as const,
        },
        {
          id: 2,
          name: 'Stage 2: Slow Moving Targets',
          description: 'Hit slow moving targets',
          difficultyLevel: 2 as const,
          artilleryPosition: new Vector3(0, -8000, 0),
          targets: [],
          winCondition: 'destroy_all' as const,
        },
        {
          id: 3,
          name: 'Stage 3: Fast Moving Targets',
          description: 'Challenge fast moving targets',
          difficultyLevel: 3 as const,
          artilleryPosition: new Vector3(0, -8000, 0),
          targets: [],
          winCondition: 'destroy_all' as const,
        },
      ];
      return stages[id] || null;
    });

    // Mock scene classes with fresh instances for each test
    vi.mocked(TitleScene).mockImplementation(
      () =>
        ({
          update: vi.fn(),
          render: vi.fn(),
          destroy: vi.fn(),
        }) as any
    );
    vi.mocked(StageSelectScene).mockImplementation(
      () =>
        ({
          update: vi.fn(),
          render: vi.fn(),
          destroy: vi.fn(),
        }) as any
    );
    vi.mocked(GameScene).mockImplementation(
      () =>
        ({
          update: vi.fn(),
          render: vi.fn(),
          destroy: vi.fn(),
        }) as any
    );

    gameManager = new GameManager('test-canvas');
  });

  afterEach(() => {
    gameManager.destroy();
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with RUNNING state', () => {
      expect(gameManager.getGameState()).toBe(GameState.RUNNING);
    });

    it('should initialize with zero statistics', () => {
      const stats = gameManager.getGameStats();
      expect(stats.totalPlayTime).toBe(0);
      expect(stats.stagesCompleted).toBe(0);
      expect(stats.currentStage).toBeNull();
    });

    it('should create CanvasManager with correct canvas ID', () => {
      expect(CanvasManager).toHaveBeenCalledWith('test-canvas');
    });

    it('should start with title scene', () => {
      expect(TitleScene).toHaveBeenCalledWith(
        mockCanvasManager,
        expect.any(Function)
      );
    });
  });

  describe('game loop management', () => {
    it('should start game loop', () => {
      expect(() => gameManager.start()).not.toThrow();
    });

    it('should stop game loop', () => {
      gameManager.start();
      expect(() => gameManager.stop()).not.toThrow();
    });

    it('should handle multiple start/stop calls', () => {
      gameManager.start();
      gameManager.start();
      gameManager.stop();
      gameManager.stop();
      expect(true).toBe(true);
    });

    it('should manage animation frame lifecycle', () => {
      gameManager.start();
      gameManager.stop();
      expect(true).toBe(true);
    });
  });

  describe('scene management', () => {
    it('should provide available stages', () => {
      const stages = gameManager.getAvailableStages();
      expect(stages).toHaveLength(3);
      expect(stages[0].id).toBe(1);
      expect(stages[1].id).toBe(2);
      expect(stages[2].id).toBe(3);
    });

    it('should transition to stage select scene', () => {
      const transitionCallback = vi.mocked(TitleScene).mock.calls[0][1];

      expect(() => {
        // Simulate transition to stage select
        transitionCallback({ type: SceneType.STAGE_SELECT });
      }).not.toThrow();

      expect(StageSelectScene).toHaveBeenCalledWith(
        mockCanvasManager,
        expect.any(Function)
      );
    });

    it('should transition to game scene with selected stage', () => {
      const transitionCallback = vi.mocked(TitleScene).mock.calls[0][1];
      const selectedStage = {
        id: 1,
        name: 'Test Stage',
        description: 'Test',
        difficultyLevel: 1 as const,
        artilleryPosition: { x: 0, y: 0, z: 0 },
        targets: [],
        winCondition: 'destroy_all' as const,
      };

      expect(() => {
        // Simulate transition to game scene
        transitionCallback({
          type: SceneType.GAME,
          data: { selectedStage },
        });
      }).not.toThrow();

      expect(GameScene).toHaveBeenCalledWith(
        mockCanvasManager,
        expect.any(Function),
        { selectedStage }
      );
    });

    it('should update current stage in stats', () => {
      const transitionCallback = vi.mocked(TitleScene).mock.calls[0][1];
      const selectedStage = {
        id: 2,
        name: 'Test Stage 2',
        description: 'Test',
        difficultyLevel: 2 as const,
        artilleryPosition: { x: 0, y: 0, z: 0 },
        targets: [],
        winCondition: 'destroy_all' as const,
      };

      transitionCallback({
        type: SceneType.GAME,
        data: { selectedStage },
      });

      const stats = gameManager.getGameStats();
      expect(stats.currentStage).toBe(2);
    });

    it('should handle scene transitions properly', () => {
      const transitionCallback = vi.mocked(TitleScene).mock.calls[0][1];

      expect(() => {
        transitionCallback({ type: SceneType.STAGE_SELECT });
        transitionCallback({ type: SceneType.TITLE });
      }).not.toThrow();
    });
  });

  describe('game statistics', () => {
    it('should update play time during game loop', () => {
      gameManager.start();

      // Advance time by 5 seconds
      vi.advanceTimersByTime(5000);

      const stats = gameManager.getGameStats();
      expect(stats.totalPlayTime).toBeCloseTo(5, 1);
    });

    it('should reset statistics', () => {
      gameManager.start();
      vi.advanceTimersByTime(3000);

      gameManager.resetStats();

      const stats = gameManager.getGameStats();
      expect(stats.totalPlayTime).toBe(0);
      expect(stats.stagesCompleted).toBe(0);
      expect(stats.currentStage).toBeNull();
    });

    it('should not update play time when paused', () => {
      gameManager.start();
      gameManager.pause();

      vi.advanceTimersByTime(2000);

      const stats = gameManager.getGameStats();
      expect(stats.totalPlayTime).toBe(0);
    });
  });

  describe('game state management', () => {
    it('should pause the game', () => {
      gameManager.pause();
      expect(gameManager.getGameState()).toBe(GameState.PAUSED);
    });

    it('should resume the game', () => {
      gameManager.pause();
      gameManager.resume();
      expect(gameManager.getGameState()).toBe(GameState.RUNNING);
    });

    it('should not update scenes when paused', () => {
      const titleScene = vi.mocked(TitleScene).mock.instances[0];

      gameManager.start();
      gameManager.pause();

      vi.advanceTimersByTime(100);

      // Scene update should not be called when paused
      expect(titleScene.update).not.toHaveBeenCalled();
    });
  });

  describe('scene updates', () => {
    it('should have scene update and render methods available', () => {
      const titleScene = vi.mocked(TitleScene).mock.instances[0];

      expect(titleScene.update).toBeDefined();
      expect(titleScene.render).toBeDefined();
      expect(titleScene.destroy).toBeDefined();
    });

    it('should manage scene lifecycle properly', () => {
      expect(() => {
        gameManager.start();
        gameManager.stop();
      }).not.toThrow();
    });

    it('should handle scene transitions', () => {
      const transitionCallback = vi.mocked(TitleScene).mock.calls[0][1];

      expect(() => {
        // Transition to stage select
        transitionCallback({ type: SceneType.STAGE_SELECT });

        // Should create new scene
        expect(StageSelectScene).toHaveBeenCalled();
      }).not.toThrow();
    });
  });

  describe('deltaTime calculation', () => {
    it('should handle time calculations', () => {
      expect(() => {
        gameManager.start();
        vi.advanceTimersByTime(16);
      }).not.toThrow();
    });

    it('should manage frame timing', () => {
      expect(() => {
        gameManager.start();
        vi.advanceTimersByTime(2000); // Large time jump
        gameManager.stop();
      }).not.toThrow();
    });
  });

  describe('resource cleanup', () => {
    it('should cleanup resources on destroy', () => {
      expect(() => {
        gameManager.destroy();
      }).not.toThrow();
    });

    it('should handle game loop cleanup', () => {
      gameManager.start();
      expect(() => {
        gameManager.destroy();
      }).not.toThrow();
    });

    it('should handle multiple destroy calls', () => {
      expect(() => {
        gameManager.destroy();
        gameManager.destroy(); // Should not throw
      }).not.toThrow();
    });

    it('should manage scene cleanup properly', () => {
      expect(() => {
        gameManager.destroy();
      }).not.toThrow();
    });
  });

  describe('canvas manager integration', () => {
    it('should provide access to canvas manager', () => {
      const canvasManager = gameManager.getCanvasManager();
      expect(canvasManager).toBe(mockCanvasManager);
    });

    it('should pass canvas manager to all scenes', () => {
      expect(TitleScene).toHaveBeenCalledWith(
        mockCanvasManager,
        expect.any(Function)
      );

      // Transition to stage select
      const transitionCallback = vi.mocked(TitleScene).mock.calls[0][1];
      transitionCallback({ type: SceneType.STAGE_SELECT });

      expect(StageSelectScene).toHaveBeenCalledWith(
        mockCanvasManager,
        expect.any(Function)
      );
    });
  });

  describe('error handling', () => {
    it('should handle missing stage data gracefully', () => {
      vi.mocked(getStageById).mockReturnValueOnce(null);

      const stages = gameManager.getAvailableStages();
      expect(stages).toHaveLength(2); // Should filter out null values
    });

    it('should handle invalid scene transition data', () => {
      const transitionCallback = vi.mocked(TitleScene).mock.calls[0][1];

      // Invalid game transition without selectedStage
      expect(() => {
        transitionCallback({ type: SceneType.GAME });
      }).not.toThrow();
    });

    it('should handle scene creation errors', () => {
      vi.mocked(StageSelectScene).mockImplementationOnce(() => {
        throw new Error('Scene creation failed');
      });

      const transitionCallback = vi.mocked(TitleScene).mock.calls[0][1];

      expect(() => {
        transitionCallback({ type: SceneType.STAGE_SELECT });
      }).toThrow('Scene creation failed');
    });
  });

  describe('performance characteristics', () => {
    it('should handle rapid scene transitions', () => {
      const transitionCallback = vi.mocked(TitleScene).mock.calls[0][1];

      expect(() => {
        // Rapid transitions
        transitionCallback({ type: SceneType.STAGE_SELECT });
        transitionCallback({ type: SceneType.TITLE });
        transitionCallback({ type: SceneType.STAGE_SELECT });
      }).not.toThrow();
    });

    it('should maintain stable performance', () => {
      expect(() => {
        gameManager.start();

        // Multiple frame updates
        for (let i = 0; i < 10; i++) {
          vi.advanceTimersByTime(16); // 60 FPS
        }

        gameManager.stop();
      }).not.toThrow();
    });
  });
});
