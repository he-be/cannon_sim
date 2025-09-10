/**
 * StageSelectScene test suite
 * Tests stage selection UI as per UI-02 specification
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StageSelectScene } from './StageSelectScene';
import { SceneType } from './TitleScene';

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

describe('StageSelectScene', () => {
  let stageSelectScene: StageSelectScene;
  let mockOnSceneTransition: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnSceneTransition = vi.fn();
    stageSelectScene = new StageSelectScene(
      mockCanvasManager as any,
      mockOnSceneTransition
    );
  });

  describe('render', () => {
    it('should render the stage selection screen with dark background', () => {
      stageSelectScene.render();

      expect(mockCanvasManager.context.fillStyle).toBe('#000000');
      expect(mockCanvasManager.context.fillRect).toHaveBeenCalledWith(
        0,
        0,
        800,
        600
      );
    });

    it('should render the stage selection title', () => {
      stageSelectScene.render();

      expect(mockCanvasManager.context.fillStyle).toBe('#00FF00');
      expect(mockCanvasManager.context.font).toBe('bold 36px monospace');
      expect(mockCanvasManager.context.fillText).toHaveBeenCalledWith(
        'SELECT STAGE',
        400,
        150
      );
    });

    it('should render three stage buttons', () => {
      stageSelectScene.render();

      // Check that fillRect was called for button backgrounds (3 buttons)
      const fillRectCalls = mockCanvasManager.context.fillRect.mock.calls;
      expect(fillRectCalls.length).toBeGreaterThanOrEqual(4); // Background + 3 buttons

      // Check that strokeRect was called for button borders (3 buttons)
      const strokeRectCalls = mockCanvasManager.context.strokeRect.mock.calls;
      expect(strokeRectCalls.length).toBe(3);
    });
  });

  describe('stage button interaction', () => {
    it('should transition to game scene when stage 1 button is clicked', () => {
      // First render to set up buttons
      stageSelectScene.render();

      // Simulate click on stage 1 button (around center-left area)
      const mockEvent = {
        clientX: 400, // Center X
        clientY: 250, // Around stage 1 button Y position
      } as MouseEvent;

      const canvas = mockCanvasManager.getCanvas();
      const clickHandler = canvas.addEventListener.mock.calls.find(
        ([event, _handler]) => event === 'click'
      )?.[1];

      if (clickHandler) {
        clickHandler(mockEvent);
      }

      expect(mockOnSceneTransition).toHaveBeenCalledWith({
        type: SceneType.GAME,
        data: expect.objectContaining({
          selectedStage: expect.objectContaining({
            id: 1,
            name: 'Stage 1: Static Targets',
          }),
        }),
      });
    });

    it('should transition to game scene when stage 2 button is clicked', () => {
      stageSelectScene.render();

      const mockEvent = {
        clientX: 400,
        clientY: 350, // Around stage 2 button Y position
      } as MouseEvent;

      const canvas = mockCanvasManager.getCanvas();
      const clickHandler = canvas.addEventListener.mock.calls.find(
        ([event, _handler]) => event === 'click'
      )?.[1];

      if (clickHandler) {
        clickHandler(mockEvent);
      }

      expect(mockOnSceneTransition).toHaveBeenCalledWith({
        type: SceneType.GAME,
        data: expect.objectContaining({
          selectedStage: expect.objectContaining({
            id: 2,
            name: 'Stage 2: Slow Moving Targets',
          }),
        }),
      });
    });

    it('should transition to game scene when stage 3 button is clicked', () => {
      stageSelectScene.render();

      const mockEvent = {
        clientX: 400,
        clientY: 450, // Around stage 3 button Y position
      } as MouseEvent;

      const canvas = mockCanvasManager.getCanvas();
      const clickHandler = canvas.addEventListener.mock.calls.find(
        ([event, _handler]) => event === 'click'
      )?.[1];

      if (clickHandler) {
        clickHandler(mockEvent);
      }

      expect(mockOnSceneTransition).toHaveBeenCalledWith({
        type: SceneType.GAME,
        data: expect.objectContaining({
          selectedStage: expect.objectContaining({
            id: 3,
            name: 'Stage 3: Fast Moving Targets',
          }),
        }),
      });
    });

    it('should not transition when clicking outside buttons', () => {
      stageSelectScene.render();

      const mockEvent = {
        clientX: 100,
        clientY: 100, // Outside button area
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
      stageSelectScene.destroy();

      const canvas = mockCanvasManager.getCanvas();
      expect(canvas.removeEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function)
      );
    });
  });
});
