import { ContainerComponent } from './ContainerComponent';
import { UIComponent } from '../core/UIComponent';

export class HBoxContainer extends ContainerComponent {
  public gap: number = 5;
  public alignment: 'start' | 'center' | 'end' = 'center';

  constructor(id: string, children: UIComponent[] = [], gap: number = 5) {
    super(id, children);
    this.gap = gap;
  }

  calculateLayout(): void {
    const innerBounds = this.getInnerBounds();
    let currentX = innerBounds.x;

    for (const child of this.children) {
      if (!child.visible) continue;

      let childY = innerBounds.y;

      // Apply vertical alignment
      switch (this.alignment) {
        case 'center':
          childY =
            innerBounds.y + (innerBounds.height - child.bounds.height) / 2;
          break;
        case 'end':
          childY = innerBounds.y + innerBounds.height - child.bounds.height;
          break;
        case 'start':
        default:
          childY = innerBounds.y;
          break;
      }

      child.setBounds(
        currentX,
        childY,
        child.bounds.width,
        Math.min(child.bounds.height || innerBounds.height, innerBounds.height)
      );

      currentX += child.bounds.width + this.gap;
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

  // Calculate total preferred width
  getPreferredWidth(): number {
    let totalWidth = this.padding.left + this.padding.right;
    let visibleChildren = 0;

    for (const child of this.children) {
      if (child.visible) {
        totalWidth += child.bounds.width;
        visibleChildren++;
      }
    }

    if (visibleChildren > 0) {
      totalWidth += (visibleChildren - 1) * this.gap;
    }

    return totalWidth;
  }
}
