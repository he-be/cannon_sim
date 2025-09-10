/**
 * TitleScene test suite
 * Tests title screen UI as per UI-01 specification
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TitleScene, SceneType } from './TitleScene';

// Mock CanvasManager
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

describe('TitleScene', () => {
  let titleScene: TitleScene;
  let mockOnSceneTransition: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnSceneTransition = vi.fn();
    titleScene = new TitleScene(
      mockCanvasManager as any,
      mockOnSceneTransition
    );
  });

  describe('render', () => {
    it('should render the title screen with dark background', () => {
      titleScene.render();

      expect(mockCanvasManager.context.fillStyle).toBe('#000000');
      expect(mockCanvasManager.context.fillRect).toHaveBeenCalledWith(
        0,
        0,
        800,
        600
      );
    });

    it('should render the game title', () => {
      titleScene.render();

      expect(mockCanvasManager.context.fillStyle).toBe('#00FF00');
      expect(mockCanvasManager.context.font).toBe('bold 48px monospace');
      expect(mockCanvasManager.context.fillText).toHaveBeenCalledWith(
        'BROWSER ARTILLERY',
        400,
        200
      );
    });

    it('should render the START button', () => {
      titleScene.render();

      // Button background
      expect(mockCanvasManager.context.fillStyle).toBe('#333333');
      expect(mockCanvasManager.context.fillRect).toHaveBeenCalledWith(
        300,
        350,
        200,
        60
      );

      // Button border
      expect(mockCanvasManager.context.strokeStyle).toBe('#FFFFFF');
      expect(mockCanvasManager.context.strokeRect).toHaveBeenCalledWith(
        300,
        350,
        200,
        60
      );

      // Button text
      expect(mockCanvasManager.context.fillStyle).toBe('#FFFFFF');
      expect(mockCanvasManager.context.font).toBe('bold 24px monospace');
      expect(mockCanvasManager.context.fillText).toHaveBeenCalledWith(
        'START',
        400,
        380
      );
    });
  });

  describe('scene transition', () => {
    it('should transition to stage select when START button is clicked', () => {
      const mockEvent = {
        clientX: 400,
        clientY: 380,
      } as MouseEvent;

      // Simulate button click
      const canvas = mockCanvasManager.getCanvas();
      const clickHandler = canvas.addEventListener.mock.calls.find(
        ([event, _handler]) => event === 'click'
      )?.[1];

      if (clickHandler) {
        clickHandler(mockEvent);
      }

      expect(mockOnSceneTransition).toHaveBeenCalledWith({
        type: SceneType.STAGE_SELECT,
      });
    });

    it('should not transition when clicking outside START button', () => {
      const mockEvent = {
        clientX: 100,
        clientY: 100,
      } as MouseEvent;

      const canvas = mockCanvasManager.getCanvas();
      const clickHandler = canvas.addEventListener.mock.calls.find(
        ([event, _handler]) => event === 'click'
      )?.[1];

      if (clickHandler) {
        clickHandler(mockEvent);
      }

      expect(mockOnSceneTransition).not.toHaveBeenCalled();
    });
  });

  describe('event cleanup', () => {
    it('should remove event listeners on destroy', () => {
      titleScene.destroy();

      const canvas = mockCanvasManager.getCanvas();
      expect(canvas.removeEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function)
      );
    });
  });
});
