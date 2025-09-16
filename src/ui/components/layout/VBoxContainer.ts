import { ContainerComponent } from './ContainerComponent';
import { UIComponent } from '../core/UIComponent';

export class VBoxContainer extends ContainerComponent {
  public gap: number = 5;
  public alignment: 'start' | 'center' | 'end' = 'start';

  constructor(id: string, children: UIComponent[] = [], gap: number = 5) {
    super(id, children);
    this.gap = gap;
  }

  calculateLayout(): void {
    const innerBounds = this.getInnerBounds();
    let currentY = innerBounds.y;

    for (const child of this.children) {
      if (!child.visible) continue;

      // Ensure child has minimum size if not set
      if (child.bounds.width === 0) {
        child.bounds.width = innerBounds.width;
      }
      if (child.bounds.height === 0) {
        child.bounds.height = 20; // Default height
      }

      // Calculate child layout if it's a container
      if (child instanceof ContainerComponent) {
        child.calculateLayout();
      }

      let childX = innerBounds.x;

      // Apply horizontal alignment
      switch (this.alignment) {
        case 'center':
          childX = innerBounds.x + (innerBounds.width - child.bounds.width) / 2;
          break;
        case 'end':
          childX = innerBounds.x + innerBounds.width - child.bounds.width;
          break;
        case 'start':
        default:
          childX = innerBounds.x;
          break;
      }

      child.setBounds(
        childX,
        currentY,
        Math.min(child.bounds.width, innerBounds.width),
        child.bounds.height
      );

      currentY += child.bounds.height + this.gap;
    }
  }

  setGap(gap: number): void {
    this.gap = gap;
    this.invalidateLayout();
  }

  setAlignment(alignment: 'start' | 'center' | 'end'): void {
    this.alignment = alignment;
    this.invalidateLayout();
  }

  // Calculate total preferred height
  getPreferredHeight(): number {
    let totalHeight = this.padding.top + this.padding.bottom;
    let visibleChildren = 0;

    for (const child of this.children) {
      if (child.visible) {
        totalHeight += child.bounds.height;
        visibleChildren++;
      }
    }

    if (visibleChildren > 0) {
      totalHeight += (visibleChildren - 1) * this.gap;
    }

    return totalHeight;
  }
}
