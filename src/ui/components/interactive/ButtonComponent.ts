import { UIComponent } from '../core/UIComponent';
import { UIEvent, UIEventUtils } from '../core/UIEvent';
import { RectUtils } from '../core/Rectangle';
import { CRT_COLORS, FONTS } from '../../../data/Constants';

export class ButtonComponent extends UIComponent {
  public text: string;
  public onClick: () => void;
  public isHovered: boolean = false;
  public minWidth: number = 120;
  public minHeight: number = 25;
  public progress: number = 1.0; // 0.0 to 1.0
  public disabled: boolean = false;

  constructor(id: string, text: string, onClick: () => void) {
    super(id);
    this.text = text;
    this.onClick = onClick;
    this.bounds = { x: 0, y: 0, width: this.minWidth, height: this.minHeight };
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return;

    ctx.save();

    const isInteractive = !this.disabled && this.isHovered;

    // Progress bar background (if not fully ready)
    if (this.progress < 1.0) {
      // Draw progress fill
      const progressWidth = this.bounds.width * this.progress;
      ctx.fillStyle = 'rgba(0, 150, 0, 0.3)';
      ctx.fillRect(
        this.bounds.x,
        this.bounds.y,
        progressWidth,
        this.bounds.height
      );
    }

    // Button background
    if (this.disabled) {
      ctx.fillStyle = 'rgba(100, 100, 100, 0.1)';
    } else {
      ctx.fillStyle = isInteractive
        ? 'rgba(0, 255, 0, 0.2)'
        : 'rgba(0, 255, 0, 0.1)';
    }

    // Only fill the non-progress area if there's a progress bar
    if (this.progress < 1.0) {
      const progressWidth = this.bounds.width * this.progress;
      ctx.fillRect(
        this.bounds.x + progressWidth,
        this.bounds.y,
        this.bounds.width - progressWidth,
        this.bounds.height
      );
    } else {
      ctx.fillRect(
        this.bounds.x,
        this.bounds.y,
        this.bounds.width,
        this.bounds.height
      );
    }

    // Button border
    if (this.disabled) {
      ctx.strokeStyle = CRT_COLORS.SECONDARY_TEXT;
    } else {
      ctx.strokeStyle = isInteractive
        ? CRT_COLORS.WARNING_TEXT
        : CRT_COLORS.PRIMARY_TEXT;
    }
    ctx.lineWidth = 1;
    ctx.strokeRect(
      this.bounds.x,
      this.bounds.y,
      this.bounds.width,
      this.bounds.height
    );

    // Button text
    if (this.disabled) {
      ctx.fillStyle = CRT_COLORS.SECONDARY_TEXT;
    } else {
      ctx.fillStyle = isInteractive
        ? CRT_COLORS.WARNING_TEXT
        : CRT_COLORS.PRIMARY_TEXT;
    }
    ctx.font = FONTS.DATA;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      this.text,
      RectUtils.centerX(this.bounds),
      RectUtils.centerY(this.bounds)
    );

    ctx.restore();
  }

  protected onEvent(event: UIEvent): boolean {
    if (!RectUtils.contains(this.bounds, event.position.x, event.position.y)) {
      this.isHovered = false;
      return false;
    }

    // Don't handle events if disabled
    if (this.disabled) {
      this.isHovered = false;
      return false;
    }

    switch (event.type) {
      case 'mousemove':
        this.isHovered = true;
        return true;

      case 'click':
        this.onClick();
        UIEventUtils.markHandled(event);
        return true;

      default:
        return false;
    }
  }

  setText(text: string): void {
    this.text = text;
  }

  setProgress(progress: number): void {
    this.progress = Math.max(0, Math.min(1, progress));
  }

  setDisabled(disabled: boolean): void {
    this.disabled = disabled;
    if (disabled) {
      this.isHovered = false;
    }
  }

  setMinSize(width: number, height: number): void {
    this.minWidth = width;
    this.minHeight = height;
    this.bounds.width = Math.max(this.bounds.width, width);
    this.bounds.height = Math.max(this.bounds.height, height);
  }
}
