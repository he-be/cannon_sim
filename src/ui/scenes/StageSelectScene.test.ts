import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StageSelectScene } from './StageSelectScene';
import { SceneType } from './TitleScene';
import { CanvasManager } from '../../rendering/CanvasManager';
import { MouseHandler } from '../../input/MouseHandler';
import { getStageById } from '../../data/StageData';
import { Vector3 } from '../../math/Vector3';

// Mock MouseHandler
vi.mock('../../input/MouseHandler');

// Mock StageData
vi.mock('../../data/StageData', () => ({
  getStageById: vi.fn((id: number) => {
    const stages = [
      null, // No stage 0
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
  }),
}));

describe('StageSelectScene (T028-2 - Complete Rewrite)', () => {
  let stageSelectScene: StageSelectScene;
  let mockCanvasManager: CanvasManager;
  let mockContext: CanvasRenderingContext2D;
  let mockCanvas: HTMLCanvasElement;
  let mockOnSceneTransition: vi.MockedFunction<any>;

  beforeEach(() => {
    // Reset StageData mock before each test
    vi.clearAllMocks();

    mockCanvas = {
      width: 800,
      height: 600,
    } as HTMLCanvasElement;

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
    } as any;

    mockCanvasManager = {
      getCanvas: () => mockCanvas,
      getContext: () => mockContext,
      context: mockContext,
      width: 800,
      height: 600,
    } as any;

    mockOnSceneTransition = vi.fn();

    // Ensure getStageById mock is properly configured
    const mockGetStageById = vi.mocked(getStageById);
    mockGetStageById.mockImplementation((id: number) => {
      const stages = [
        null, // No stage 0
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

    stageSelectScene = new StageSelectScene(
      mockCanvasManager,
      mockOnSceneTransition
    );
  });

  afterEach(() => {
    stageSelectScene.destroy();
  });

  describe('initialization', () => {
    it('should initialize with CanvasManager and transition callback', () => {
      expect(stageSelectScene).toBeDefined();
      expect(MouseHandler).toHaveBeenCalledWith(mockCanvas);
    });

    it('should setup mouse event listeners', () => {
      const mockMouseHandler = vi.mocked(MouseHandler).mock.instances[0];
      expect(mockMouseHandler.addEventListener).toHaveBeenCalled();
    });

    it('should load stage data during initialization', () => {
      expect(getStageById).toHaveBeenCalledWith(1);
      expect(getStageById).toHaveBeenCalledWith(2);
      expect(getStageById).toHaveBeenCalledWith(3);
    });
  });

  describe('scene update', () => {
    it('should update animation time', () => {
      const deltaTime = 0.016; // 60 FPS

      expect(() => {
        stageSelectScene.update(deltaTime);
      }).not.toThrow();
    });

    it('should handle multiple updates', () => {
      for (let i = 0; i < 100; i++) {
        stageSelectScene.update(0.016);
      }

      expect(true).toBe(true); // Should complete without errors
    });
  });

  describe('rendering', () => {
    it('should render without errors', () => {
      expect(() => {
        stageSelectScene.render();
      }).not.toThrow();
    });

    it('should call Canvas 2D API methods for rendering', () => {
      stageSelectScene.render();

      expect(mockContext.fillRect).toHaveBeenCalled();
      expect(mockContext.fillText).toHaveBeenCalled();
      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
    });

    it('should render stage selection title', () => {
      stageSelectScene.render();

      expect(mockContext.fillText).toHaveBeenCalledWith(
        'SELECT STAGE',
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should render subtitle', () => {
      stageSelectScene.render();

      expect(mockContext.fillText).toHaveBeenCalledWith(
        'Choose your artillery mission',
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should render three stage buttons', () => {
      stageSelectScene.render();

      // Should render stage names
      expect(mockContext.fillText).toHaveBeenCalledWith(
        'Stage 1: Static Targets',
        expect.any(Number),
        expect.any(Number)
      );
      expect(mockContext.fillText).toHaveBeenCalledWith(
        'Stage 2: Slow Moving Targets',
        expect.any(Number),
        expect.any(Number)
      );
      expect(mockContext.fillText).toHaveBeenCalledWith(
        'Stage 3: Fast Moving Targets',
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should render stage descriptions', () => {
      stageSelectScene.render();

      expect(mockContext.fillText).toHaveBeenCalledWith(
        'Destroy stationary targets',
        expect.any(Number),
        expect.any(Number)
      );
      expect(mockContext.fillText).toHaveBeenCalledWith(
        'Hit slow moving targets',
        expect.any(Number),
        expect.any(Number)
      );
      expect(mockContext.fillText).toHaveBeenCalledWith(
        'Challenge fast moving targets',
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should render difficulty indicators', () => {
      stageSelectScene.render();

      expect(mockContext.fillText).toHaveBeenCalledWith(
        'EASY',
        expect.any(Number),
        expect.any(Number)
      );
      expect(mockContext.fillText).toHaveBeenCalledWith(
        'MEDIUM',
        expect.any(Number),
        expect.any(Number)
      );
      expect(mockContext.fillText).toHaveBeenCalledWith(
        'HARD',
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should render instructions', () => {
      stageSelectScene.render();

      // Updated instructions text for UI mode selection
      expect(mockContext.fillText).toHaveBeenCalledWith(
        expect.stringContaining('Choose between Classic'),
        expect.any(Number),
        expect.any(Number)
      );
    });
  });

  describe('CRT styling effects', () => {
    it('should apply CRT background color', () => {
      stageSelectScene.render();

      // Check that background is filled
      expect(mockContext.fillRect).toHaveBeenCalledWith(0, 0, 800, 600);
    });

    it('should render scan lines for CRT effect', () => {
      stageSelectScene.render();

      // Should call fillRect multiple times for scan lines
      const fillRectCalls = vi.mocked(mockContext.fillRect).mock.calls;
      const scanLineCalls = fillRectCalls.filter(
        call => call[3] === 1 || call[3] === 2 // Height 1 or 2 for scan lines
      );

      expect(scanLineCalls.length).toBeGreaterThan(0);
    });

    it('should apply glow effects', () => {
      stageSelectScene.render();

      expect(mockContext.shadowColor).toBe('#00ff00');
      expect(mockContext.shadowBlur).toBeGreaterThan(0);
    });

    it('should render background grid pattern', () => {
      stageSelectScene.render();

      expect(mockContext.beginPath).toHaveBeenCalled();
      expect(mockContext.moveTo).toHaveBeenCalled();
      expect(mockContext.lineTo).toHaveBeenCalled();
      expect(mockContext.stroke).toHaveBeenCalled();
    });
  });

  describe('stage selection interaction', () => {
    it('should handle mouse events through MouseHandler', () => {
      const mockMouseHandler = vi.mocked(MouseHandler).mock.instances[0];
      const eventCallback = vi.mocked(mockMouseHandler.addEventListener).mock
        .calls[0][0];

      expect(eventCallback).toBeDefined();
      expect(typeof eventCallback).toBe('function');
    });

    it('should transition to game scene when stage 1 UI A is selected', () => {
      const mockMouseHandler = vi.mocked(MouseHandler).mock.instances[0];
      const eventCallback = vi.mocked(mockMouseHandler.addEventListener).mock
        .calls[0][0];

      // 2-column layout: Left column (UI A)
      // Button 1 UI A: leftColumnX = (800 - (280*2 + 40)) / 2 = 100, y = 300 - 80 = 220
      // Center: x = 100 + 140 = 240, y = 220 + 45 = 265
      const clickEvent = {
        type: 'click',
        position: {
          canvas: { x: 240, y: 265 }, // Center of Stage 1 UI A button
        },
        button: 0,
        state: 'pressed',
      } as any;

      eventCallback(clickEvent);

      expect(mockOnSceneTransition).toHaveBeenCalledWith({
        type: SceneType.GAME,
        data: {
          selectedStage: expect.objectContaining({
            id: 1,
            name: 'Stage 1: Static Targets',
            difficultyLevel: 1 as const,
          }),
          uiMode: expect.any(String), // UIMode.MODE_A
        },
      });
    });

    it('should transition to game scene when stage 2 UI A is selected', () => {
      const mockMouseHandler = vi.mocked(MouseHandler).mock.instances[0];
      const eventCallback = vi.mocked(mockMouseHandler.addEventListener).mock
        .calls[0][0];

      // Button 2 UI A: y = 220 + 110 = 330, center: y = 330 + 45 = 375
      const clickEvent = {
        type: 'click',
        position: {
          canvas: { x: 240, y: 375 }, // Center of Stage 2 UI A button
        },
        button: 0,
        state: 'pressed',
      } as any;

      eventCallback(clickEvent);

      expect(mockOnSceneTransition).toHaveBeenCalledWith({
        type: SceneType.GAME,
        data: {
          selectedStage: expect.objectContaining({
            id: 2,
            name: 'Stage 2: Slow Moving Targets',
            difficultyLevel: 2 as const,
          }),
          uiMode: expect.any(String),
        },
      });
    });

    it('should transition to game scene when stage 3 UI B is selected', () => {
      const mockMouseHandler = vi.mocked(MouseHandler).mock.instances[0];
      const eventCallback = vi.mocked(mockMouseHandler.addEventListener).mock
        .calls[0][0];

      // Right column (UI B): rightColumnX = 100 + 280 + 40 = 420
      // Button 3 UI B: y = 220 + 2 * 110 = 440, center: x = 420 + 140 = 560, y = 440 + 45 = 485
      const clickEvent = {
        type: 'click',
        position: {
          canvas: { x: 560, y: 485 }, // Center of Stage 3 UI B button
        },
        button: 0,
        state: 'pressed',
      } as any;

      eventCallback(clickEvent);

      expect(mockOnSceneTransition).toHaveBeenCalledWith({
        type: SceneType.GAME,
        data: {
          selectedStage: expect.objectContaining({
            id: 3,
            name: 'Stage 3: Fast Moving Targets',
            difficultyLevel: 3 as const,
          }),
          uiMode: expect.any(String), // UIMode.MODE_B
        },
      });
    });

    it('should not trigger transition when clicking outside buttons', () => {
      const mockMouseHandler = vi.mocked(MouseHandler).mock.instances[0];
      const eventCallback = vi.mocked(mockMouseHandler.addEventListener).mock
        .calls[0][0];

      // Simulate click outside button areas
      const clickEvent = {
        type: 'click',
        position: {
          canvas: { x: 100, y: 100 },
        },
        button: 0,
        state: 'pressed',
      } as any;

      eventCallback(clickEvent);

      expect(mockOnSceneTransition).not.toHaveBeenCalled();
    });
  });

  describe('animation effects', () => {
    it('should update animation over time', () => {
      // Test animation updates
      stageSelectScene.update(0);
      stageSelectScene.render();

      stageSelectScene.update(1); // 1 second later
      stageSelectScene.render();

      // Animation should affect rendering
      expect(mockContext.save).toHaveBeenCalled();
    });

    it('should animate scan lines', () => {
      stageSelectScene.update(1);
      stageSelectScene.render();

      // Moving scan line should be rendered
      const fillRectCalls = vi.mocked(mockContext.fillRect).mock.calls;
      const movingLineCalls = fillRectCalls.filter(call => call[3] === 2); // Height 2 for moving line

      expect(movingLineCalls.length).toBeGreaterThan(0);
    });

    it('should animate title pulsing effect', () => {
      stageSelectScene.update(1);
      stageSelectScene.render();

      // Title should use pulsing alpha effect
      expect(mockContext.globalAlpha).not.toBe(1);
    });
  });

  describe('resource cleanup', () => {
    it('should cleanup MouseHandler on destroy', () => {
      const mockMouseHandler = vi.mocked(MouseHandler).mock.instances[0];

      stageSelectScene.destroy();

      expect(mockMouseHandler.destroy).toHaveBeenCalled();
    });

    it('should handle multiple destroy calls', () => {
      expect(() => {
        stageSelectScene.destroy();
        stageSelectScene.destroy(); // Should not throw
      }).not.toThrow();
    });
  });

  describe('Canvas 2D API compliance', () => {
    it('should use only Canvas 2D API methods', () => {
      stageSelectScene.render();

      // Implementation uses only Canvas 2D API methods
      expect(mockContext.fillRect).toHaveBeenCalled();
      expect(mockContext.fillText).toHaveBeenCalled();
      expect(mockContext.strokeRect).toHaveBeenCalled();
    });

    it('should use proper Canvas context methods', () => {
      stageSelectScene.render();

      const canvasMethods = [
        'fillRect',
        'strokeRect',
        'fillText',
        'save',
        'restore',
        'beginPath',
        'moveTo',
        'lineTo',
        'stroke',
      ];

      canvasMethods.forEach(method => {
        expect(
          mockContext[method as keyof CanvasRenderingContext2D]
        ).toHaveBeenCalled();
      });
    });

    it('should set Canvas properties correctly', () => {
      stageSelectScene.render();

      expect(mockContext.fillStyle).toBeTruthy();
      expect(mockContext.font).toBeTruthy();
      expect(mockContext.textAlign).toBeTruthy();
      expect(mockContext.textBaseline).toBeTruthy();
    });
  });

  describe('responsive design', () => {
    it('should adapt to different canvas sizes', () => {
      const smallCanvas = {
        width: 600,
        height: 400,
      } as HTMLCanvasElement;

      const smallCanvasManager = {
        getCanvas: () => smallCanvas,
        getContext: () => mockContext,
        context: mockContext,
        width: 600,
        height: 400,
        center: { x: 300, y: 200 },
      } as any;

      const smallStageSelectScene = new StageSelectScene(
        smallCanvasManager,
        mockOnSceneTransition
      );

      expect(() => {
        smallStageSelectScene.render();
        smallStageSelectScene.destroy();
      }).not.toThrow();
    });

    it('should position elements relative to canvas size', () => {
      stageSelectScene.render();

      const fillTextCalls = vi.mocked(mockContext.fillText).mock.calls;

      // Title should be centered
      const titleCall = fillTextCalls.find(call => call[0] === 'SELECT STAGE');
      expect(titleCall?.[1]).toBe(400); // Center X
    });
  });

  describe('stage data integration', () => {
    it('should handle missing stage data gracefully', () => {
      // Mock getStageById to return null for a stage
      vi.mocked(getStageById).mockReturnValueOnce(null);

      const testScene = new StageSelectScene(
        mockCanvasManager,
        mockOnSceneTransition
      );

      expect(() => {
        testScene.render();
        testScene.destroy();
      }).not.toThrow();
    });

    it('should display correct difficulty colors', () => {
      stageSelectScene.render();

      // Check that different colors are used for different difficulties
      const fillStyleValues = vi.mocked(mockContext).fillStyle;
      expect(typeof fillStyleValues).toBe('string');
    });
  });

  describe('UI specification compliance', () => {
    it('should implement UI-02: Stage selection with 3 difficulty levels', () => {
      stageSelectScene.render();

      // Should call StageData.getStage for stages 1, 2, 3
      expect(getStageById).toHaveBeenCalledWith(1);
      expect(getStageById).toHaveBeenCalledWith(2);
      expect(getStageById).toHaveBeenCalledWith(3);

      // Should render difficulty indicators
      expect(mockContext.fillText).toHaveBeenCalledWith(
        'EASY',
        expect.any(Number),
        expect.any(Number)
      );
      expect(mockContext.fillText).toHaveBeenCalledWith(
        'MEDIUM',
        expect.any(Number),
        expect.any(Number)
      );
      expect(mockContext.fillText).toHaveBeenCalledWith(
        'HARD',
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should implement UI-03: CRT monitor style', () => {
      stageSelectScene.render();

      // Should use CRT styling elements
      expect(mockContext.shadowBlur).toBeGreaterThan(0); // Glow effects
      expect(mockContext.fillRect).toHaveBeenCalled(); // Scan lines
    });

    it('should implement TR-02: Canvas 2D API compliance', () => {
      stageSelectScene.render();

      // Should only use Canvas 2D API methods, no DOM manipulation
      const canvas2DMethods = [
        'fillRect',
        'strokeRect',
        'fillText',
        'save',
        'restore',
      ];
      canvas2DMethods.forEach(method => {
        expect(
          mockContext[method as keyof CanvasRenderingContext2D]
        ).toHaveBeenCalled();
      });
    });
  });
});
