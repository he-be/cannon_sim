import { UIComponent } from '../core/UIComponent';
import { CRT_COLORS, FONTS } from '../../../data/Constants';

export type TextAlignment = 'left' | 'center' | 'right';
export type TextBaseline = 'top' | 'middle' | 'bottom';

export class TextComponent extends UIComponent {
  public text: string;
  public font: string;
  public color: string;
  public alignment: TextAlignment = 'left';
  public baseline: TextBaseline = 'top';

  constructor(
    id: string,
    text: string,
    font: string = FONTS.DATA,
    color: string = CRT_COLORS.PRIMARY_TEXT
  ) {
    super(id);
    this.text = text;
    this.font = font;
    this.color = color;

    // Calculate initial size based on text
    this.updateSize();
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return;

    ctx.save();
    ctx.fillStyle = this.color;
    ctx.font = this.font;
    ctx.textAlign = this.alignment;
    ctx.textBaseline = this.baseline;

    let x = this.bounds.x;
    if (this.alignment === 'center') {
      x += this.bounds.width / 2;
    } else if (this.alignment === 'right') {
      x += this.bounds.width;
    }

    let y = this.bounds.y;
    if (this.baseline === 'middle') {
      y += this.bounds.height / 2;
    } else if (this.baseline === 'bottom') {
      y += this.bounds.height;
    }

    ctx.fillText(this.text, x, y);
    ctx.restore();
  }

  setText(text: string): void {
    this.text = text;
    this.updateSize();
  }

  setFont(font: string): void {
    this.font = font;
    this.updateSize();
  }

  setColor(color: string): void {
    this.color = color;
  }

  setAlignment(alignment: TextAlignment): void {
    this.alignment = alignment;
  }

  setBaseline(baseline: TextBaseline): void {
    this.baseline = baseline;
  }

  private updateSize(): void {
    // Create temporary canvas to measure text
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    ctx.font = this.font;

    const metrics = ctx.measureText(this.text);
    const fontSize = parseInt(this.font.match(/(\d+)px/)?.[1] || '12');

    this.bounds.width = Math.ceil(metrics.width);
    this.bounds.height = Math.ceil(fontSize * 1.2); // Add some padding
  }

  // Get the measured width of the text
  getTextWidth(): number {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    ctx.font = this.font;
    return ctx.measureText(this.text).width;
  }
}
