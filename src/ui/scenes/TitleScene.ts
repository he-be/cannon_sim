/**
 * TitleScene - Title screen scene for Browser Artillery
 * Implements title screen UI as per UI-01 specification
 */

import { CanvasManager } from '../../rendering/CanvasManager';

export enum SceneType {
  TITLE = 'title',
  STAGE_SELECT = 'stage_select',
  GAME = 'game',
}

export interface SceneTransition {
  type: SceneType;
  data?: unknown;
}

interface ButtonBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * TitleScene handles the title screen display and user interaction
 * Implements UI-01: Game title and START button
 * Implements UI-03: CRT/fleet console style design
 */
export class TitleScene {
  private canvasManager: CanvasManager;
  private onSceneTransition: (transition: SceneTransition) => void;
  private startButtonBounds?: ButtonBounds;

  constructor(
    canvasManager: CanvasManager,
    onSceneTransition: (transition: SceneTransition) => void
  ) {
    this.canvasManager = canvasManager;
    this.onSceneTransition = onSceneTransition;
    this.setupEventListeners();
  }

  /**
   * Render the title screen
   * Implements CRT/console style as per UI-03
   */
  render(): void {
    const ctx = this.canvasManager.context;
    const canvas = this.canvasManager.getCanvas();

    // Clear canvas with dark background (console style)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw title text
    this.drawTitle(ctx, canvas);

    // Draw START button
    this.drawStartButton(ctx, canvas);
  }

  /**
   * Draw the game title
   */
  private drawTitle(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement
  ): void {
    ctx.fillStyle = '#00FF00'; // Green text (CRT style)
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const titleText = 'BROWSER ARTILLERY';
    const titleX = canvas.width / 2;
    const titleY = canvas.height / 2 - 100;

    // Add glow effect for CRT style
    ctx.shadowColor = '#00FF00';
    ctx.shadowBlur = 10;
    ctx.fillText(titleText, titleX, titleY);
    ctx.shadowBlur = 0;
  }

  /**
   * Draw the START button
   */
  private drawStartButton(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement
  ): void {
    const buttonWidth = 200;
    const buttonHeight = 60;
    const buttonX = canvas.width / 2 - buttonWidth / 2;
    const buttonY = canvas.height / 2 + 50;

    // Button background (gray console style)
    ctx.fillStyle = '#333333';
    ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

    // Button border
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);

    // Button text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('START', canvas.width / 2, buttonY + buttonHeight / 2);

    // Store button bounds for click detection
    this.startButtonBounds = {
      x: buttonX,
      y: buttonY,
      width: buttonWidth,
      height: buttonHeight,
    };
  }

  /**
   * Setup event listeners for user interaction
   */
  private setupEventListeners(): void {
    const canvas = this.canvasManager.getCanvas();

    this.handleClick = this.handleClick.bind(this);
    canvas.addEventListener('click', this.handleClick);
  }

  /**
   * Handle click events on the title screen
   */
  private handleClick(event: MouseEvent): void {
    const canvas = this.canvasManager.getCanvas();
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const buttonBounds = this.startButtonBounds;
    if (
      buttonBounds &&
      x >= buttonBounds.x &&
      x <= buttonBounds.x + buttonBounds.width &&
      y >= buttonBounds.y &&
      y <= buttonBounds.y + buttonBounds.height
    ) {
      // START button clicked - transition to stage select
      this.onSceneTransition({ type: SceneType.STAGE_SELECT });
    }
  }

  /**
   * Cleanup event listeners when scene is destroyed
   */
  destroy(): void {
    const canvas = this.canvasManager.getCanvas();
    canvas.removeEventListener('click', this.handleClick);
  }
}
