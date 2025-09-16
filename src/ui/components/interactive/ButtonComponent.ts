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

  constructor(id: string, text: string, onClick: () => void) {
    super(id);
    this.text = text;
    this.onClick = onClick;
    this.bounds = { x: 0, y: 0, width: this.minWidth, height: this.minHeight };
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return;

    ctx.save();

    // Button background
    ctx.fillStyle = this.isHovered
      ? 'rgba(0, 255, 0, 0.2)'
      : 'rgba(0, 255, 0, 0.1)';
    ctx.fillRect(
      this.bounds.x,
      this.bounds.y,
      this.bounds.width,
      this.bounds.height
    );

    // Button border
    ctx.strokeStyle = this.isHovered
      ? CRT_COLORS.WARNING_TEXT
      : CRT_COLORS.PRIMARY_TEXT;
    ctx.lineWidth = 1;
    ctx.strokeRect(
      this.bounds.x,
      this.bounds.y,
      this.bounds.width,
      this.bounds.height
    );

    // Button text
    ctx.fillStyle = this.isHovered
      ? CRT_COLORS.WARNING_TEXT
      : CRT_COLORS.PRIMARY_TEXT;
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

  setMinSize(width: number, height: number): void {
    this.minWidth = width;
    this.minHeight = height;
    this.bounds.width = Math.max(this.bounds.width, width);
    this.bounds.height = Math.max(this.bounds.height, height);
  }
}
