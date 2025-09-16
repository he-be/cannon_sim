import { Vector2 } from '../../../math/Vector2';

export interface UIEvent {
  type: 'mousedown' | 'mousemove' | 'mouseup' | 'click';
  position: Vector2;
  handled: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class UIEventUtils {
  static createMouseEvent(
    type: 'mousedown' | 'mousemove' | 'mouseup' | 'click',
    position: Vector2
  ): UIEvent {
    return {
      type,
      position,
      handled: false,
    };
  }

  static markHandled(event: UIEvent): void {
    event.handled = true;
  }
}
