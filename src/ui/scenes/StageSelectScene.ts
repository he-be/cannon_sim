/**
 * StageSelectScene - Clean implementation with proper component integration
 * Implements UI-02: Stage selection with 3 difficulty levels
 * Implements UI-03: CRT monitor style
 * Implements TR-02: Canvas 2D API compliance
 */

import { CanvasManager } from '../../rendering/CanvasManager';
import { getStageById, StageConfig } from '../../data/StageData';
import { SceneType, SceneTransition } from './TitleScene';
import { MouseHandler, MouseEventData } from '../../input/MouseHandler';
import { Vector2 } from '../../math/Vector2';
import { UIMode } from '../UIMode';

interface StageButtonConfig {
  stage: StageConfig;
  uiMode: UIMode;
  position: Vector2;
  size: Vector2;
  isHovered: boolean;
}

/**
 * Stage selection scene with CRT monitor styling and proper input handling
 */
export class StageSelectScene {
  private canvasManager: CanvasManager;
  private mouseHandler: MouseHandler;
  private onSceneTransition: (transition: SceneTransition) => void;
  private stageButtons: StageButtonConfig[] = [];
  private animationTime: number = 0;

  // CRT styling constants
  private readonly CRT_COLORS = {
    BACKGROUND: '#001100',
    PRIMARY_TEXT: '#00ff00',
    SECONDARY_TEXT: '#66ff66',
    TERTIARY_TEXT: '#aaffaa',
    BUTTON_NORMAL: '#003300',
    BUTTON_HOVER: '#005500',
    BUTTON_SELECTED: '#007700',
    BUTTON_BORDER: '#00ff00',
    SCAN_LINE: 'rgba(0, 255, 0, 0.1)',
  } as const;

  private readonly FONTS = {
    TITLE: 'bold 32px monospace',
    SUBTITLE: '18px monospace',
    BUTTON_TITLE: 'bold 20px monospace',
    BUTTON_DESC: '14px monospace',
    INFO: '12px monospace',
  } as const;

  constructor(
    canvasManager: CanvasManager,
    onSceneTransition: (transition: SceneTransition) => void
  ) {
    this.canvasManager = canvasManager;
    this.onSceneTransition = onSceneTransition;
    this.mouseHandler = new MouseHandler(this.canvasManager.getCanvas());

    this.setupStageButtons();
    this.setupEventListeners();
  }

  /**
   * Update scene state
   */
  update(deltaTime: number): void {
    this.animationTime += deltaTime;
    this.updateHoverStates();
  }

  /**
   * Render stage selection scene
   */
  render(): void {
    this.clearCanvas();
    this.renderBackground();
    this.renderTitle();
    this.renderColumnHeaders();
    this.renderStageButtons();
    this.renderInstructions();
    this.renderScanLines();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.mouseHandler.destroy();
  }

  /**
   * Setup stage buttons with 2-column layout for UI mode selection
   * Left column: UI A, Right column: UI B
   */
  private setupStageButtons(): void {
    this.stageButtons = [];
    const buttonWidth = 280;
    const buttonHeight = 90;
    const verticalSpacing = 110;
    const horizontalGap = 40;
    const startY = this.canvasManager.height / 2 - 80;

    // Calculate center position for 2-column layout
    const totalWidth = buttonWidth * 2 + horizontalGap;
    const leftColumnX = this.canvasManager.width / 2 - totalWidth / 2;
    const rightColumnX = leftColumnX + buttonWidth + horizontalGap;

    for (let i = 1; i <= 3; i++) {
      const stage = getStageById(i);
      if (!stage) continue;

      const y = startY + (i - 1) * verticalSpacing;

      // UI A button (left column)
      this.stageButtons.push({
        stage,
        uiMode: UIMode.MODE_A,
        position: new Vector2(leftColumnX, y),
        size: new Vector2(buttonWidth, buttonHeight),
        isHovered: false,
      });

      // UI B button (right column)
      this.stageButtons.push({
        stage,
        uiMode: UIMode.MODE_B,
        position: new Vector2(rightColumnX, y),
        size: new Vector2(buttonWidth, buttonHeight),
        isHovered: false,
      });
    }
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

    for (const button of this.stageButtons) {
      if (this.isPointInButton(clickPos, button)) {
        this.handleStageSelection(button);
        break;
      }
    }
  }

  /**
   * Update hover states based on mouse position
   */
  private updateHoverStates(): void {
    // Reset all hover states
    this.stageButtons.forEach(button => {
      button.isHovered = false;
    });

    // Get current mouse position from MouseHandler if available
    // For now, we'll handle this in the click handler
  }

  /**
   * Check if point is within button bounds
   */
  private isPointInButton(point: Vector2, button: StageButtonConfig): boolean {
    return (
      point.x >= button.position.x &&
      point.x <= button.position.x + button.size.x &&
      point.y >= button.position.y &&
      point.y <= button.position.y + button.size.y
    );
  }

  /**
   * Handle stage and UI mode selection
   */
  private handleStageSelection(button: StageButtonConfig): void {
    this.onSceneTransition({
      type: SceneType.GAME,
      data: {
        selectedStage: button.stage,
        uiMode: button.uiMode,
      },
    });
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
    const ctx = this.canvasManager.context;
    ctx.save();

    // Subtle grid pattern for CRT effect
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.02)';
    ctx.lineWidth = 1;

    const gridSize = 25;
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
   * Render scene title
   */
  private renderTitle(): void {
    const ctx = this.canvasManager.context;
    const centerX = this.canvasManager.width / 2;
    const titleY = this.canvasManager.height / 2 - 200;

    ctx.save();
    ctx.font = this.FONTS.TITLE;
    ctx.fillStyle = this.CRT_COLORS.PRIMARY_TEXT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Add pulsing effect
    const pulse = 0.9 + 0.1 * Math.sin(this.animationTime * 3);
    ctx.globalAlpha = pulse;

    ctx.fillText('SELECT STAGE', centerX, titleY);

    // Add glow effect
    ctx.shadowColor = this.CRT_COLORS.PRIMARY_TEXT;
    ctx.shadowBlur = 15;
    ctx.fillText('SELECT STAGE', centerX, titleY);

    ctx.restore();

    // Render subtitle
    ctx.save();
    ctx.font = this.FONTS.SUBTITLE;
    ctx.fillStyle = this.CRT_COLORS.SECONDARY_TEXT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillText('Choose your artillery mission', centerX, titleY + 40);

    ctx.restore();
  }

  /**
   * Render column headers for UI modes
   */
  private renderColumnHeaders(): void {
    const ctx = this.canvasManager.context;
    const buttonWidth = 280;
    const horizontalGap = 40;
    const totalWidth = buttonWidth * 2 + horizontalGap;
    const leftColumnX = this.canvasManager.width / 2 - totalWidth / 2;
    const rightColumnX = leftColumnX + buttonWidth + horizontalGap;
    const headerY = this.canvasManager.height / 2 - 120;

    ctx.save();
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // UI A header (left)
    ctx.fillStyle = this.CRT_COLORS.PRIMARY_TEXT;
    ctx.fillText('UI MODE A', leftColumnX + buttonWidth / 2, headerY);
    ctx.font = '12px monospace';
    ctx.fillStyle = this.CRT_COLORS.TERTIARY_TEXT;
    ctx.fillText('(Classic)', leftColumnX + buttonWidth / 2, headerY + 18);

    // UI B header (right)
    ctx.fillStyle = this.CRT_COLORS.PRIMARY_TEXT;
    ctx.font = 'bold 18px monospace';
    ctx.fillText('UI MODE B', rightColumnX + buttonWidth / 2, headerY);
    ctx.font = '12px monospace';
    ctx.fillStyle = this.CRT_COLORS.TERTIARY_TEXT;
    ctx.fillText(
      '(Circular Scope)',
      rightColumnX + buttonWidth / 2,
      headerY + 18
    );

    ctx.restore();
  }

  /**
   * Render stage selection buttons with UI mode indication
   */
  private renderStageButtons(): void {
    const ctx = this.canvasManager.context;

    this.stageButtons.forEach(button => {
      ctx.save();

      // Button background with hover effect
      const bgColor = button.isHovered
        ? this.CRT_COLORS.BUTTON_HOVER
        : this.CRT_COLORS.BUTTON_NORMAL;

      ctx.fillStyle = bgColor;
      ctx.fillRect(
        button.position.x,
        button.position.y,
        button.size.x,
        button.size.y
      );

      // Button border with glow
      ctx.strokeStyle = this.CRT_COLORS.BUTTON_BORDER;
      ctx.lineWidth = 2;
      ctx.shadowColor = this.CRT_COLORS.BUTTON_BORDER;
      ctx.shadowBlur = 5;
      ctx.strokeRect(
        button.position.x,
        button.position.y,
        button.size.x,
        button.size.y
      );

      // Stage name
      ctx.fillStyle = this.CRT_COLORS.PRIMARY_TEXT;
      ctx.font = this.FONTS.BUTTON_TITLE;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      const centerX = button.position.x + button.size.x / 2;
      const nameY = button.position.y + 12;
      ctx.fillText(button.stage.name, centerX, nameY);

      // Stage description
      ctx.fillStyle = this.CRT_COLORS.TERTIARY_TEXT;
      ctx.font = this.FONTS.BUTTON_DESC;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      const descY = button.position.y + 42;
      ctx.fillText(button.stage.description, centerX, descY);

      // Difficulty indicator
      const difficultyText = this.getDifficultyText(
        button.stage.difficultyLevel
      );
      ctx.fillStyle = this.getDifficultyColor(button.stage.difficultyLevel);
      ctx.font = this.FONTS.INFO;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';

      const diffX = button.position.x + button.size.x - 10;
      const diffY = button.position.y + button.size.y - 8;
      ctx.fillText(difficultyText, diffX, diffY);

      ctx.restore();
    });
  }

  /**
   * Render instructions
   */
  private renderInstructions(): void {
    const ctx = this.canvasManager.context;
    const centerX = this.canvasManager.width / 2;
    const instructionsY = this.canvasManager.height - 80;

    ctx.save();
    ctx.font = this.FONTS.INFO;
    ctx.fillStyle = this.CRT_COLORS.SECONDARY_TEXT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillText(
      'Click on a stage to begin • Choose between Classic (UI A) or Circular Scope (UI B) interface',
      centerX,
      instructionsY
    );

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
    for (let y = 0; y < this.canvasManager.height; y += 3) {
      ctx.fillRect(0, y, this.canvasManager.width, 1);
    }

    // Moving scan line
    const movingLineY = (this.animationTime * 80) % this.canvasManager.height;
    ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
    ctx.fillRect(0, movingLineY, this.canvasManager.width, 2);

    ctx.restore();
  }

  /**
   * Get difficulty display text
   */
  private getDifficultyText(difficultyLevel: 1 | 2 | 3): string {
    switch (difficultyLevel) {
      case 1:
        return 'EASY';
      case 2:
        return 'MEDIUM';
      case 3:
        return 'HARD';
      default:
        return 'UNKNOWN';
    }
  }

  /**
   * Get difficulty color
   */
  private getDifficultyColor(difficultyLevel: 1 | 2 | 3): string {
    switch (difficultyLevel) {
      case 1:
        return '#00ff00';
      case 2:
        return '#ffff00';
      case 3:
        return '#ff6600';
      default:
        return this.CRT_COLORS.SECONDARY_TEXT;
    }
  }
}
