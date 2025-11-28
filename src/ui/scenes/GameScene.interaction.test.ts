import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameScene } from './GameScene';
import { MouseHandler } from '../../input/MouseHandler';
import { GameInputController } from '../../input/GameInputController';
import { UIControllerB } from '../controllers/UIControllerB';
import { Vector2 } from '../../math/Vector2';

// Mock dependencies
vi.mock('../../rendering/CanvasManager');
vi.mock('../../input/MouseHandler');
vi.mock('../../input/GameInputController');
vi.mock('../controllers/UIControllerB');
vi.mock('../components/ControlPanelRenderer');

describe('GameScene Interaction Integration', () => {
  let gameScene: GameScene;
  let mockCanvasManager: any;
  let mockCanvas: any;
  let mockMouseHandler: any;
  let mockInputController: any;
  let mockUIController: any;
  let mouseEventListener: (event: any) => void;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Canvas
    mockCanvas = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0 })),
      width: 800,
      height: 600,
    };

    // Mock CanvasManager
    mockCanvasManager = {
      getCanvas: vi.fn(() => mockCanvas),
      width: 800,
      height: 600,
    };

    // Mock MouseHandler
    mockMouseHandler = {
      addEventListener: vi.fn(listener => {
        mouseEventListener = listener;
      }),
      destroy: vi.fn(),
    };
    // Important: Mock the constructor to return our mock instance
    vi.mocked(MouseHandler).mockImplementation(() => mockMouseHandler);

    // Mock UIController
    mockUIController = {
      getUIManager: vi.fn(() => ({
        handleMouseEvent: vi.fn(),
        render: vi.fn(),
      })),
      handleMouseEvent: vi.fn(),
    };
    vi.mocked(UIControllerB).mockImplementation(() => mockUIController);

    // Mock GameInputController
    mockInputController = {
      initialize: vi.fn(),
      attach: vi.fn(),
      detach: vi.fn(),
      getUIEvents: vi.fn(() => ({})),
      handleMouseEvent: vi.fn(),
    };
    vi.mocked(GameInputController).mockImplementation(
      () => mockInputController
    );

    // Instantiate GameScene
    gameScene = new GameScene(mockCanvasManager, vi.fn());
  });

  it('should attach mouse listener on initialization', () => {
    expect(MouseHandler).toHaveBeenCalledWith(mockCanvas);
    expect(mockMouseHandler.addEventListener).toHaveBeenCalled();
  });

  it('should pass mouse events from MouseHandler to GameInputController', () => {
    // Ensure listener was attached
    expect(mouseEventListener).toBeDefined();

    // Simulate mouse click event from MouseHandler
    const mockEvent = {
      type: 'click',
      position: { canvas: new Vector2(100, 100) },
      button: 0,
    };

    // Trigger the listener
    mouseEventListener(mockEvent);

    // Verify GameInputController received it
    expect(mockInputController.handleMouseEvent).toHaveBeenCalledWith(
      mockEvent
    );
  });

  it('should clean up mouse handler on destroy', () => {
    gameScene.destroy();
    expect(mockMouseHandler.destroy).toHaveBeenCalled();
  });
});
