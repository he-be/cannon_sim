export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Padding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class RectUtils {
  static create(
    x: number,
    y: number,
    width: number,
    height: number
  ): Rectangle {
    return { x, y, width, height };
  }

  static contains(rect: Rectangle, x: number, y: number): boolean {
    return (
      x >= rect.x &&
      x <= rect.x + rect.width &&
      y >= rect.y &&
      y <= rect.y + rect.height
    );
  }

  static centerX(rect: Rectangle): number {
    return rect.x + rect.width / 2;
  }

  static centerY(rect: Rectangle): number {
    return rect.y + rect.height / 2;
  }

  static right(rect: Rectangle): number {
    return rect.x + rect.width;
  }

  static bottom(rect: Rectangle): number {
    return rect.y + rect.height;
  }

  static withPadding(rect: Rectangle, padding: Padding): Rectangle {
    return {
      x: rect.x + padding.left,
      y: rect.y + padding.top,
      width: rect.width - padding.left - padding.right,
      height: rect.height - padding.top - padding.bottom,
    };
  }
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class PaddingUtils {
  static uniform(value: number): Padding {
    return { top: value, right: value, bottom: value, left: value };
  }

  static horizontal(value: number): Padding {
    return { top: 0, right: value, bottom: 0, left: value };
  }

  static vertical(value: number): Padding {
    return { top: value, right: 0, bottom: value, left: 0 };
  }
}
