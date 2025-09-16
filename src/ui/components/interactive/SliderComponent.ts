import { UIComponent } from '../core/UIComponent';
import { UIEvent, UIEventUtils } from '../core/UIEvent';
import { RectUtils } from '../core/Rectangle';
import { CRT_COLORS } from '../../../data/Constants';

export class SliderComponent extends UIComponent {
  public value: number;
  public min: number;
  public max: number;
  public onChange: (value: number) => void;
  public isHovered: boolean = false;
  public isDragging: boolean = false;

  constructor(
    id: string,
    value: number,
    min: number,
    max: number,
    onChange: (value: number) => void
  ) {
    super(id);
    this.value = Math.max(min, Math.min(max, value));
    this.min = min;
    this.max = max;
    this.onChange = onChange;
    this.bounds = { x: 0, y: 0, width: 160, height: 15 };
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return;

    ctx.save();

    // Slider track
    ctx.strokeStyle =
      this.isHovered || this.isDragging
        ? CRT_COLORS.WARNING_TEXT
        : CRT_COLORS.GRID_LINE;
    ctx.lineWidth = 2;
    ctx.strokeRect(
      this.bounds.x,
      this.bounds.y,
      this.bounds.width,
      this.bounds.height
    );

    // Slider handle position
    const normalizedValue = (this.value - this.min) / (this.max - this.min);
    const handleX =
      this.bounds.x +
      normalizedValue * (this.bounds.width - this.bounds.height);

    // Slider handle
    ctx.fillStyle =
      this.isHovered || this.isDragging
        ? CRT_COLORS.WARNING_TEXT
        : CRT_COLORS.PRIMARY_TEXT;
    ctx.fillRect(
      handleX,
      this.bounds.y,
      this.bounds.height,
      this.bounds.height
    );

    // Slider fill
    ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
    ctx.fillRect(
      this.bounds.x,
      this.bounds.y,
      handleX - this.bounds.x + this.bounds.height,
      this.bounds.height
    );

    ctx.restore();
  }

  protected onEvent(event: UIEvent): boolean {
    if (!RectUtils.contains(this.bounds, event.position.x, event.position.y)) {
      if (event.type === 'mousemove' && !this.isDragging) {
        this.isHovered = false;
      }
      if (event.type === 'mouseup') {
        this.isDragging = false;
      }
      return this.isDragging; // Still handle if dragging
    }

    switch (event.type) {
      case 'mousemove':
        this.isHovered = true;
        if (this.isDragging) {
          this.updateValue(event.position.x);
          UIEventUtils.markHandled(event);
        }
        return true;

      case 'mousedown':
        this.isDragging = true;
        this.updateValue(event.position.x);
        UIEventUtils.markHandled(event);
        return true;

      case 'mouseup':
        this.isDragging = false;
        return true;

      default:
        return false;
    }
  }

  private updateValue(mouseX: number): void {
    const relativeX = Math.max(
      0,
      Math.min(this.bounds.width, mouseX - this.bounds.x)
    );
    const normalizedValue = relativeX / this.bounds.width;
    const newValue = this.min + normalizedValue * (this.max - this.min);

    if (Math.abs(newValue - this.value) > 0.001) {
      // Prevent unnecessary updates
      this.value = newValue;
      this.onChange(newValue);
    }
  }

  setValue(value: number): void {
    const clampedValue = Math.max(this.min, Math.min(this.max, value));
    if (Math.abs(clampedValue - this.value) > 0.001) {
      this.value = clampedValue;
    }
  }

  setRange(min: number, max: number): void {
    this.min = min;
    this.max = max;
    this.setValue(this.value); // Re-clamp current value
  }
}
