import { UIComponent } from '../core/UIComponent';
import { UIEvent, UIEventUtils } from '../core/UIEvent';
import { RectUtils } from '../core/Rectangle';
import { CRT_COLORS, FONTS } from '../../../data/Constants';

export class AdjustmentButtonComponent extends UIComponent {
  public symbol: string;
  public onAdjust: () => void;
  public isHovered: boolean = false;
  public isPressed: boolean = false;
  private continuousAdjustment: number | null = null;
  private pressStartTime: number = 0;

  constructor(id: string, symbol: '+' | '-', onAdjust: () => void) {
    super(id);
    this.symbol = symbol;
    this.onAdjust = onAdjust;
    this.bounds = { x: 0, y: 0, width: 20, height: 20 };
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return;

    ctx.save();

    // Button background
    ctx.fillStyle = this.isPressed
      ? CRT_COLORS.WARNING_TEXT
      : this.isHovered
        ? 'rgba(0, 255, 0, 0.2)'
        : 'rgba(0, 50, 0, 0.3)';
    ctx.fillRect(
      this.bounds.x,
      this.bounds.y,
      this.bounds.width,
      this.bounds.height
    );

    // Button border
    ctx.strokeStyle =
      this.isHovered || this.isPressed
        ? CRT_COLORS.WARNING_TEXT
        : CRT_COLORS.GRID_LINE;
    ctx.lineWidth = 1;
    ctx.strokeRect(
      this.bounds.x,
      this.bounds.y,
      this.bounds.width,
      this.bounds.height
    );

    // Button text
    ctx.fillStyle = this.isPressed
      ? CRT_COLORS.BACKGROUND
      : CRT_COLORS.PRIMARY_TEXT;
    ctx.font = FONTS.DATA;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      this.symbol,
      RectUtils.centerX(this.bounds),
      RectUtils.centerY(this.bounds)
    );

    ctx.restore();
  }

  protected onEvent(event: UIEvent): boolean {
    if (!RectUtils.contains(this.bounds, event.position.x, event.position.y)) {
      if (event.type === 'mousemove' && !this.isPressed) {
        this.isHovered = false;
      }
      if (event.type === 'mouseup') {
        this.stopContinuousAdjustment();
      }
      return this.isPressed; // Still handle if pressed
    }

    switch (event.type) {
      case 'mousemove':
        this.isHovered = true;
        return true;

      case 'mousedown':
        this.isPressed = true;
        this.pressStartTime = Date.now();
        this.startContinuousAdjustment();
        UIEventUtils.markHandled(event);
        return true;

      case 'mouseup':
        this.stopContinuousAdjustment();
        return true;

      default:
        return false;
    }
  }

  private startContinuousAdjustment(): void {
    if (this.continuousAdjustment) {
      window.clearInterval(this.continuousAdjustment);
    }

    // Immediate first adjustment
    this.onAdjust();

    // Start continuous adjustment every 100ms
    this.continuousAdjustment = window.setInterval(() => {
      this.onAdjust();
    }, 100);
  }

  private stopContinuousAdjustment(): void {
    if (this.continuousAdjustment) {
      window.clearInterval(this.continuousAdjustment);
      this.continuousAdjustment = null;
    }
    this.isPressed = false;
  }

  cleanup(): void {
    this.stopContinuousAdjustment();
  }
}
