import { Rectangle, Padding, PaddingUtils } from './Rectangle';
import { UIEvent } from './UIEvent';

export abstract class UIComponent {
  public readonly id: string;
  public bounds: Rectangle = { x: 0, y: 0, width: 0, height: 0 };
  public padding: Padding = PaddingUtils.uniform(0);
  public visible: boolean = true;
  public parent?: UIComponent;

  constructor(id: string) {
    this.id = id;
  }

  abstract render(ctx: CanvasRenderingContext2D): void;

  handleEvent(event: UIEvent): boolean {
    if (!this.visible) return false;
    return this.onEvent(event);
  }

  protected onEvent(_event: UIEvent): boolean {
    return false; // Default: don't handle events
  }

  setBounds(x: number, y: number, width: number, height: number): void {
    this.bounds = { x, y, width, height };
  }

  setPadding(padding: Padding): void {
    this.padding = padding;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  getInnerBounds(): Rectangle {
    return {
      x: this.bounds.x + this.padding.left,
      y: this.bounds.y + this.padding.top,
      width: this.bounds.width - this.padding.left - this.padding.right,
      height: this.bounds.height - this.padding.top - this.padding.bottom,
    };
  }
}
