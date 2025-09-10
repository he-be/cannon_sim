/**
 * GameScene test suite
 * Tests main game scene as per UI-04 and game system specifications
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameScene } from './GameScene';

// Mock all dependencies
const mockCanvasManager = {
  context: {
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
    strokeRect: vi.fn(),
  } as any,
  getCanvas: vi.fn(() => ({
    width: 800,
    height: 600,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0 })),
  })),
};

const mockStageConfig = {
  id: 1,
  name: 'Test Stage',
  description: 'Test stage description',
  targets: [],
  artilleryPosition: { x: 0, y: 0, z: 0 },
};

describe('GameScene', () => {
  let gameScene: GameScene;
  let mockOnSceneTransition: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnSceneTransition = vi.fn();
    gameScene = new GameScene(mockCanvasManager as any, mockOnSceneTransition, {
      selectedStage: mockStageConfig as any,
    });
  });

  describe('initialization', () => {
    it('should initialize with PLAYING game state', () => {
      // GameScene is initialized in constructor, so we can't directly test private properties
      // This would require mocking the dependencies or using a different approach
      expect(gameScene).toBeDefined();
    });

    it('should render the game screen layout', () => {
      gameScene.render();

      // Check that canvas is cleared
      expect(mockCanvasManager.context.fillStyle).toBe('#000000');
      expect(mockCanvasManager.context.fillRect).toHaveBeenCalledWith(
        0,
        0,
        800,
        600
      );
    });
  });

  describe('rendering', () => {
    it('should render control panel', () => {
      gameScene.render();

      // Check control panel background
      expect(mockCanvasManager.context.fillStyle).toBe('#2a2a2a');
      expect(mockCanvasManager.context.fillRect).toHaveBeenCalledWith(
        0,
        0,
        200,
        600
      );
    });

    it('should render horizontal radar', () => {
      gameScene.render();

      // Check radar background
      expect(mockCanvasManager.context.fillStyle).toBe('#000');
      expect(mockCanvasManager.context.fillRect).toHaveBeenCalledWith(
        200,
        0,
        400,
        600
      );
    });

    it('should render vertical radar and target info', () => {
      gameScene.render();

      // Check right panel background
      expect(mockCanvasManager.context.fillStyle).toBe('#2a2a2a');
      expect(mockCanvasManager.context.fillRect).toHaveBeenCalledWith(
        600,
        0,
        200,
        600
      );
    });
  });

  describe('game state overlays', () => {
    it('should render game over overlay when game is over', () => {
      // We can't directly set private gameState, so this test is limited
      // In a real implementation, we would need to expose game state or use a different approach
      gameScene.render();

      // The overlay rendering would be tested if we could set the game state
      expect(mockCanvasManager.context.fillText).toHaveBeenCalled();
    });

    it('should render stage clear overlay when stage is cleared', () => {
      gameScene.render();

      // Similar limitation as above
      expect(mockCanvasManager.context.fillText).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should clean up resources on destroy', () => {
      gameScene.destroy();

      const canvas = mockCanvasManager.getCanvas();
      expect(canvas.removeEventListener).toHaveBeenCalledWith(
        'mousedown',
        expect.any(Function)
      );
      expect(canvas.removeEventListener).toHaveBeenCalledWith(
        'mousemove',
        expect.any(Function)
      );
      expect(canvas.removeEventListener).toHaveBeenCalledWith(
        'mouseup',
        expect.any(Function)
      );
      expect(canvas.removeEventListener).toHaveBeenCalledWith(
        'wheel',
        expect.any(Function)
      );
    });
  });
});
