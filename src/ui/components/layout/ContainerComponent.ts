import { UIComponent } from '../core/UIComponent';
import { UIEvent } from '../core/UIEvent';
import { RectUtils } from '../core/Rectangle';

export abstract class ContainerComponent extends UIComponent {
  protected children: UIComponent[] = [];

  constructor(id: string, children: UIComponent[] = []) {
    super(id);
    this.children = children;
    this.children.forEach(child => (child.parent = this));
  }

  addChild(child: UIComponent): void {
    child.parent = this;
    this.children.push(child);
    this.invalidateLayout();
  }

  removeChild(child: UIComponent): void {
    const index = this.children.indexOf(child);
    if (index >= 0) {
      child.parent = undefined;
      this.children.splice(index, 1);
      this.invalidateLayout();
    }
  }

  getChildren(): readonly UIComponent[] {
    return this.children;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return;

    this.renderBackground(ctx);
    this.renderChildren(ctx);
  }

  protected renderBackground(_ctx: CanvasRenderingContext2D): void {
    // Override in subclasses if background needed
  }

  protected renderChildren(ctx: CanvasRenderingContext2D): void {
    for (const child of this.children) {
      if (child.visible) {
        child.render(ctx);
      }
    }
  }

  protected onEvent(event: UIEvent): boolean {
    // Check children in reverse order (top-most first)
    for (let i = this.children.length - 1; i >= 0; i--) {
      const child = this.children[i];
      if (
        child.visible &&
        RectUtils.contains(child.bounds, event.position.x, event.position.y)
      ) {
        if (child.handleEvent(event)) {
          return true;
        }
      }
    }
    return false;
  }

  abstract calculateLayout(): void;

  protected invalidateLayout(): void {
    this.calculateLayout();
  }
}
