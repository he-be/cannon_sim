/**
 * TitleScene - Clean implementation with proper component integration
 * Implements UI-01: Game title and START button
 * Implements UI-03: CRT monitor style
 * Implements TR-02: Canvas 2D API compliance
 */

import { CanvasManager } from '../../rendering/CanvasManager';
import { MouseHandler, MouseEventData } from '../../input/MouseHandler';
import { Vector2 } from '../../math/Vector2';

export enum SceneType {
  TITLE = 'title',
  STAGE_SELECT = 'stage_select',
  GAME = 'game',
}

export interface SceneTransition {
  type: SceneType;
  data?: unknown;
}

interface ButtonConfig {
  position: Vector2;
  size: Vector2;
  text: string;
  action: () => void;
}

/**
 * Title scene with CRT monitor styling and proper input handling
 */
export class TitleScene {
  private canvasManager: CanvasManager;
  private mouseHandler: MouseHandler;
  private onSceneTransition: (transition: SceneTransition) => void;
  private startButton: ButtonConfig;
  private animationTime: number = 0;

  // CRT styling constants
  private readonly CRT_COLORS = {
    BACKGROUND: '#001100',
    PRIMARY_TEXT: '#00ff00',
    SECONDARY_TEXT: '#66ff66',
    BUTTON_NORMAL: '#004400',
    BUTTON_HOVER: '#006600',
    BUTTON_BORDER: '#00ff00',
    SCAN_LINE: 'rgba(0, 255, 0, 0.1)',
  } as const;

  private readonly FONTS = {
    TITLE: 'bold 48px monospace',
    SUBTITLE: '20px monospace',
    BUTTON: '24px monospace',
    VERSION: '14px monospace',
  } as const;

  constructor(
    canvasManager: CanvasManager,
    onSceneTransition: (transition: SceneTransition) => void
  ) {
    this.canvasManager = canvasManager;
    this.onSceneTransition = onSceneTransition;
    this.mouseHandler = new MouseHandler(this.canvasManager.getCanvas());

    // Setup START button
    const centerX = this.canvasManager.width / 2;
    const centerY = this.canvasManager.height / 2;

    this.startButton = {
      position: new Vector2(centerX - 80, centerY + 50),
      size: new Vector2(160, 50),
      text: 'START',
      action: (): void => this.handleStartClick(),
    };

    this.setupEventListeners();
  }

  /**
   * Update scene state
   */
  update(deltaTime: number): void {
    this.animationTime += deltaTime;
  }

  /**
   * Render title scene
   */
  render(): void {
    this.clearCanvas();
    this.renderBackground();
    this.renderTitle();
    this.renderSubtitle();
    this.renderStartButton();
    this.renderVersion();
    this.renderScanLines();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.mouseHandler.destroy();
  }

  /**
   * Setup mouse event handling using MouseHandler component
   */
  private setupEventListeners(): void {
    this.mouseHandler.addEventListener((event: MouseEventData) => {
      if (event.type === 'click') {
        this.handleMouseClick(event);
      }
    });
  }

  /**
   * Handle mouse click events
   */
  private handleMouseClick(event: MouseEventData): void {
    const clickPos = new Vector2(
      event.position.canvas.x,
      event.position.canvas.y
    );

    if (this.isPointInButton(clickPos, this.startButton)) {
      this.startButton.action();
    }
  }

  /**
   * Check if point is within button bounds
   */
  private isPointInButton(point: Vector2, button: ButtonConfig): boolean {
    return (
      point.x >= button.position.x &&
      point.x <= button.position.x + button.size.x &&
      point.y >= button.position.y &&
      point.y <= button.position.y + button.size.y
    );
  }

  /**
   * Handle START button click
   */
  private handleStartClick(): void {
    this.onSceneTransition({ type: SceneType.STAGE_SELECT });
  }

  /**
   * Clear canvas with CRT background
   */
  private clearCanvas(): void {
    const ctx = this.canvasManager.context;
    ctx.fillStyle = this.CRT_COLORS.BACKGROUND;
    ctx.fillRect(0, 0, this.canvasManager.width, this.canvasManager.height);
  }

  /**
   * Render background effects
   */
  private renderBackground(): void {
    // Add subtle background pattern for CRT effect
    const ctx = this.canvasManager.context;
    ctx.save();

    // Subtle grid pattern
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.02)';
    ctx.lineWidth = 1;

    const gridSize = 20;
    for (let x = 0; x < this.canvasManager.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.canvasManager.height);
      ctx.stroke();
    }

    for (let y = 0; y < this.canvasManager.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.canvasManager.width, y);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Render main title
   */
  private renderTitle(): void {
    const ctx = this.canvasManager.context;
    const centerX = this.canvasManager.width / 2;
    const titleY = this.canvasManager.height / 2 - 100;

    ctx.save();
    ctx.font = this.FONTS.TITLE;
    ctx.fillStyle = this.CRT_COLORS.PRIMARY_TEXT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Add pulsing effect
    const pulse = 0.9 + 0.1 * Math.sin(this.animationTime * 2);
    ctx.globalAlpha = pulse;

    ctx.fillText('BROWSER ARTILLERY', centerX, titleY);

    // Add glow effect
    ctx.shadowColor = this.CRT_COLORS.PRIMARY_TEXT;
    ctx.shadowBlur = 20;
    ctx.fillText('BROWSER ARTILLERY', centerX, titleY);

    ctx.restore();
  }

  /**
   * Render subtitle
   */
  private renderSubtitle(): void {
    const ctx = this.canvasManager.context;
    const centerX = this.canvasManager.width / 2;
    const subtitleY = this.canvasManager.height / 2 - 40;

    ctx.save();
    ctx.font = this.FONTS.SUBTITLE;
    ctx.fillStyle = this.CRT_COLORS.SECONDARY_TEXT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillText('Artillery Simulation System', centerX, subtitleY);

    ctx.restore();
  }

  /**
   * Render START button
   */
  private renderStartButton(): void {
    const ctx = this.canvasManager.context;
    const button = this.startButton;

    ctx.save();

    // Button background
    ctx.fillStyle = this.CRT_COLORS.BUTTON_NORMAL;
    ctx.fillRect(
      button.position.x,
      button.position.y,
      button.size.x,
      button.size.y
    );

    // Button border
    ctx.strokeStyle = this.CRT_COLORS.BUTTON_BORDER;
    ctx.lineWidth = 2;
    ctx.strokeRect(
      button.position.x,
      button.position.y,
      button.size.x,
      button.size.y
    );

    // Button text
    ctx.font = this.FONTS.BUTTON;
    ctx.fillStyle = this.CRT_COLORS.PRIMARY_TEXT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textX = button.position.x + button.size.x / 2;
    const textY = button.position.y + button.size.y / 2;

    ctx.fillText(button.text, textX, textY);

    // Add glow effect to button
    ctx.shadowColor = this.CRT_COLORS.PRIMARY_TEXT;
    ctx.shadowBlur = 10;
    ctx.fillText(button.text, textX, textY);

    ctx.restore();
  }

  /**
   * Render version information
   */
  private renderVersion(): void {
    const ctx = this.canvasManager.context;
    const versionX = 20;
    const versionY = this.canvasManager.height - 20;

    ctx.save();
    ctx.font = this.FONTS.VERSION;
    ctx.fillStyle = this.CRT_COLORS.SECONDARY_TEXT;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';

    ctx.fillText('v1.0.0 - Browser Artillery System', versionX, versionY);

    ctx.restore();
  }

  /**
   * Render CRT scan lines effect
   */
  private renderScanLines(): void {
    const ctx = this.canvasManager.context;

    ctx.save();
    ctx.fillStyle = this.CRT_COLORS.SCAN_LINE;

    // Horizontal scan lines
    for (let y = 0; y < this.canvasManager.height; y += 4) {
      ctx.fillRect(0, y, this.canvasManager.width, 1);
    }

    // Moving scan line
    const movingLineY = (this.animationTime * 100) % this.canvasManager.height;
    ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
    ctx.fillRect(0, movingLineY, this.canvasManager.width, 2);

    ctx.restore();
  }
}
