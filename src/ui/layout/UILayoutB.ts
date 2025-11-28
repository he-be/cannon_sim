import { CanvasManager } from '../../rendering/CanvasManager';
import { Vector2 } from '../../math/Vector2';
import { CRT_COLORS } from '../../data/Constants';
import { CircularScopeBounds } from '../components/CircularScopeRenderer';
import { AScopeBounds } from '../components/AScopeRenderer';

export interface UIManagerBLayoutConfig {
  controlPanelWidth: number;
  scopeColumnWidth: number;
}

export interface UILayoutBounds {
  controlPanel: { x: number; y: number; width: number; height: number };
  circularScope: CircularScopeBounds;
  aScope: AScopeBounds;
  targetList: { x: number; y: number; width: number; height: number };
}

export class UILayoutB {
  private canvasManager: CanvasManager;
  private config: UIManagerBLayoutConfig;
  private bounds!: UILayoutBounds;

  constructor(canvasManager: CanvasManager, config: UIManagerBLayoutConfig) {
    this.canvasManager = canvasManager;
    this.config = config;
    this.calculateBounds();
  }

  getBounds(): UILayoutBounds {
    return this.bounds;
  }

  calculateBounds(): void {
    const canvasWidth = this.canvasManager.width;
    const canvasHeight = this.canvasManager.height;

    const rightColumnX = this.config.controlPanelWidth;
    const rightColumnWidth =
      canvasWidth -
      this.config.controlPanelWidth -
      this.config.scopeColumnWidth;

    // Calculate layout bounds for UI B
    this.bounds = {
      controlPanel: {
        x: 0,
        y: 0,
        width: this.config.controlPanelWidth,
        height: canvasHeight,
      },
      circularScope: {
        x: rightColumnX,
        y: 0,
        width: rightColumnWidth,
        height: Math.floor(canvasHeight * 0.6), // 60% for circular scope
        center: new Vector2(
          rightColumnX + rightColumnWidth / 2,
          Math.floor(canvasHeight * 0.3)
        ),
        radius: Math.min(rightColumnWidth, canvasHeight * 0.6) / 2 - 20,
      },
      aScope: {
        x: rightColumnX,
        y: Math.floor(canvasHeight * 0.6),
        width: rightColumnWidth,
        height: Math.floor(canvasHeight * 0.4), // 40% for A-scope
      },
      targetList: {
        x: canvasWidth - this.config.scopeColumnWidth,
        y: 0,
        width: this.config.scopeColumnWidth,
        height: canvasHeight,
      },
    };
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.strokeStyle = CRT_COLORS.GRID_LINE;
    ctx.lineWidth = 2;

    // Vertical divider between control panel and scopes
    ctx.beginPath();
    ctx.moveTo(this.bounds.controlPanel.width, 0);
    ctx.lineTo(this.bounds.controlPanel.width, this.canvasManager.height);
    ctx.stroke();

    // Vertical divider between scopes and target list
    ctx.beginPath();
    ctx.moveTo(this.bounds.targetList.x, 0);
    ctx.lineTo(this.bounds.targetList.x, this.canvasManager.height);
    ctx.stroke();

    // Horizontal divider between circular scope and A-scope
    ctx.beginPath();
    ctx.moveTo(this.bounds.circularScope.x, this.bounds.aScope.y);
    ctx.lineTo(
      this.bounds.circularScope.x + this.bounds.circularScope.width,
      this.bounds.aScope.y
    );
    ctx.stroke();

    ctx.restore();
  }
}
