/**
 * StageSelectScene - Stage selection scene for Browser Artillery
 * Implements stage selection UI as per UI-02 specification
 */

import { CanvasManager } from '../../rendering/CanvasManager';
import { StageData, StageConfig } from '../../data/StageData';
import { SceneType, SceneTransition } from './TitleScene';
import { MouseHandler, MouseEventData } from '../../input/MouseHandler';

interface StageButton {
  stage: StageConfig;
  bounds: { x: number; y: number; width: number; height: number };
}

/**
 * StageSelectScene handles the stage selection display and user interaction
 * Implements UI-02: Stage selection with 3 difficulty levels
 * Implements UI-03: CRT/fleet console style design
 */
export class StageSelectScene {
  private canvasManager: CanvasManager;
  private onSceneTransition: (transition: SceneTransition) => void;
  private mouseHandler: MouseHandler;
  private stageButtons: StageButton[] = [];

  constructor(
    canvasManager: CanvasManager,
    onSceneTransition: (transition: SceneTransition) => void
  ) {
    this.canvasManager = canvasManager;
    this.onSceneTransition = onSceneTransition;
    this.mouseHandler = new MouseHandler(this.canvasManager.getCanvas());
    this.setupEventListeners();
  }

  /**
   * Render the stage selection screen
   * Implements CRT/console style as per UI-03
   */
  render(): void {
    const ctx = this.canvasManager.context;
    const canvas = this.canvasManager.getCanvas();

    // Clear canvas with dark background (console style)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw title
    this.drawTitle(ctx, canvas);

    // Draw stage buttons
    this.drawStageButtons(ctx, canvas);
  }

  /**
   * Draw the stage selection title
   */
  private drawTitle(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement
  ): void {
    ctx.fillStyle = '#00FF00'; // Green text (CRT style)
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const titleText = 'SELECT STAGE';
    const titleX = canvas.width / 2;
    const titleY = canvas.height / 2 - 150;

    // Add glow effect for CRT style
    ctx.shadowColor = '#00FF00';
    ctx.shadowBlur = 10;
    ctx.fillText(titleText, titleX, titleY);
    ctx.shadowBlur = 0;
  }

  /**
   * Draw the stage selection buttons
   */
  private drawStageButtons(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement
  ): void {
    const buttonWidth = 300;
    const buttonHeight = 80;
    const buttonSpacing = 100;
    const startY = canvas.height / 2 - 50;

    this.stageButtons = [];

    for (let i = 1; i <= 3; i++) {
      const stage = StageData.getStage(i);
      if (!stage) continue;

      const buttonX = canvas.width / 2 - buttonWidth / 2;
      const buttonY = startY + (i - 1) * buttonSpacing;

      // Button background (gray console style)
      ctx.fillStyle = '#333333';
      ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

      // Button border
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);

      // Stage title
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        stage.name,
        canvas.width / 2,
        buttonY + buttonHeight / 2 - 15
      );

      // Stage description
      ctx.fillStyle = '#CCCCCC';
      ctx.font = '14px monospace';
      ctx.fillText(
        stage.description,
        canvas.width / 2,
        buttonY + buttonHeight / 2 + 10
      );

      // Store button bounds for click detection
      this.stageButtons.push({
        stage,
        bounds: {
          x: buttonX,
          y: buttonY,
          width: buttonWidth,
          height: buttonHeight,
        },
      });
    }
  }

  /**
   * Setup event listeners for user interaction using MouseHandler
   */
  private setupEventListeners(): void {
    this.mouseHandler.addEventListener(this.handleMouseEvent.bind(this));
  }

  /**
   * Handle mouse events using MouseHandler
   */
  private handleMouseEvent(event: MouseEventData): void {
    if (event.type === 'click' && event.button === 0) {
      // Left click only
      const clickPos = event.position.canvas;

      for (const button of this.stageButtons) {
        const { bounds, stage } = button;
        if (
          clickPos.x >= bounds.x &&
          clickPos.x <= bounds.x + bounds.width &&
          clickPos.y >= bounds.y &&
          clickPos.y <= bounds.y + bounds.height
        ) {
          // Stage button clicked - transition to game scene with selected stage
          this.onSceneTransition({
            type: SceneType.GAME,
            data: { selectedStage: stage },
          });
          break;
        }
      }
    }
  }

  /**
   * Cleanup event listeners when scene is destroyed
   */
  destroy(): void {
    this.mouseHandler.destroy();
  }
}
