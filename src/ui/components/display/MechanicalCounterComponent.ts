import { UIComponent } from '../core/UIComponent';
import { CRT_COLORS, FONTS } from '../../../data/Constants';

export class MechanicalCounterComponent extends UIComponent {
  private value: number = 0;
  private targetValue: number = 0;
  private digits: number; // Integer digits
  private decimals: number; // Decimal places
  private digitHeight: number = 20;
  private digitWidth: number = 14;
  private label: string;
  private color: string;

  constructor(
    id: string,
    label: string,
    initialValue: number = 0,
    digits: number = 3,
    decimals: number = 1,
    color: string = CRT_COLORS.PRIMARY_TEXT
  ) {
    super(id);
    this.label = label;
    this.value = initialValue;
    this.targetValue = initialValue;
    this.digits = digits;
    this.decimals = decimals;
    this.color = color;

    this.updateSize();
  }

  setValue(value: number): void {
    this.targetValue = value;
  }

  setColor(color: string): void {
    this.color = color;
  }

  update(deltaTime: number): void {
    // Smoothly interpolate value towards target
    const diff = this.targetValue - this.value;
    if (Math.abs(diff) > 0.001) {
      // Adjust speed based on difference
      // Move towards target with speed proportional to distance, but with a minimum speed
      const direction = Math.sign(diff);
      const distance = Math.abs(diff);

      // Speed: units per second
      // If far away, move fast (e.g. distance * 5)
      // If close, move at least 1.0 units/sec to snap quickly
      const speed = Math.max(distance * 5, 1.0);

      const step = speed * deltaTime;

      if (step >= distance) {
        this.value = this.targetValue;
      } else {
        this.value += direction * step;
      }
    } else {
      this.value = this.targetValue;
    }
  }

  updateSize(): void {
    // Label width + spacing + (digits + decimals + dot) * digitWidth
    const ctx = document.createElement('canvas').getContext('2d');
    if (ctx) {
      ctx.font = FONTS.DATA;
      const labelWidth = ctx.measureText(this.label + ': ').width;
      const totalDigits = this.digits + this.decimals;
      const dotWidth = this.decimals > 0 ? 6 : 0;

      this.bounds.width =
        labelWidth + totalDigits * this.digitWidth + dotWidth + 4;
      this.bounds.height = this.digitHeight + 4;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return;

    // Update value (assuming render is called in loop, or we need explicit update call)
    // Since UIComponent doesn't have update(), we'll do a small step here or rely on external update
    // For now, let's do simple interpolation here assuming 60fps (16ms)
    this.update(0.016);

    ctx.save();

    // Draw Label
    ctx.fillStyle = this.color; // Use component color for label too? Or fixed?
    // Usually label is static color, value might change color.
    // Let's use secondary for label, primary (or specified) for value
    ctx.font = FONTS.DATA;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const labelText = this.label + ': ';
    ctx.fillStyle = CRT_COLORS.SECONDARY_TEXT;
    ctx.fillText(
      labelText,
      this.bounds.x,
      this.bounds.y + this.bounds.height / 2
    );

    // Calculate required counter width based on digits
    const totalDigits = this.digits + this.decimals;
    const dotWidth = this.decimals > 0 ? 6 : 0;
    const requiredCounterWidth = totalDigits * this.digitWidth + dotWidth + 4;

    // Draw Counter Background
    // Right align: x = bounds.x + bounds.width - counterWidth
    const counterWidth = requiredCounterWidth;
    const counterX = this.bounds.x + this.bounds.width - counterWidth;
    const counterY = this.bounds.y;
    const counterHeight = this.bounds.height;

    ctx.fillStyle = '#001100'; // Dark background for counter
    ctx.fillRect(counterX, counterY, counterWidth, counterHeight);

    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1;
    ctx.strokeRect(counterX, counterY, counterWidth, counterHeight);

    // Setup clipping for digits
    ctx.beginPath();
    ctx.rect(counterX, counterY, counterWidth, counterHeight);
    ctx.clip();

    // Calculate digits
    // Convert value to integer based on decimals
    // e.g. 123.45 (1 decimal) -> 1234.5
    const power = Math.pow(10, this.decimals);
    const absValue = Math.abs(this.value);
    let currentVal = absValue * power;

    // Draw digits from right to left
    // totalDigits is already calculated above
    let xPos = counterX + counterWidth - this.digitWidth - 2; // Start from right with padding

    let carry = 0; // Rotation carry from lower digit

    for (let i = 0; i < totalDigits; i++) {
      // Draw decimal point if needed
      if (this.decimals > 0 && i === this.decimals) {
        ctx.fillStyle = this.color;
        ctx.fillText(
          '.',
          xPos + this.digitWidth + 1,
          counterY + counterHeight / 2 + 2
        );
        xPos -= 6; // Width of dot
      }

      // Calculate value for this digit
      // i=0 is lowest decimal place

      // Logic:
      // 1. Get raw value for this position (e.g. 1234.5 -> 4.5 for i=0)
      // 2. Apply carry from previous digit

      // For i=0 (lowest):
      // val = currentVal % 10; (e.g. 4.5)
      // rotation = val % 1 (0.5) -> This is the scroll amount
      // digit = floor(val) (4)
      // carry = (val > 9) ? val - 9 : 0; (Wait, lowest digit wraps 9->0 continuously)

      // Correct logic from thought process:
      // i=0: val = currentVal % 10.
      //      display = val.
      //      carry = (val > 9.0) ? val - 9.0 : 0; (Actually for lowest digit, it drives the next one when it wraps)
      //      Wait, currentVal is continuous.
      //      If currentVal is 19.5:
      //      i=0: val = 9.5. Display 9.5 (9 and 0 visible). Carry = 0.5 (since > 9.0)

      //      If currentVal is 19.9:
      //      i=0: val = 9.9. Display 9.9. Carry = 0.9.

      //      If currentVal is 20.0:
      //      i=0: val = 0.0. Display 0.0. Carry = 0.0.

      //      i=1: val = floor(currentVal / 10) % 10 = 1.
      //           display = 1 + carry.
      //           If carry is 0.9, display is 1.9 (1 and 2 visible).

      const digitRaw = currentVal % 10;

      // Determine display offset and next carry
      let displayValue: number;
      let nextCarry = 0;

      if (i === 0) {
        // Lowest digit always scrolls continuously with the value
        displayValue = digitRaw;
        if (digitRaw > 9.0) {
          nextCarry = digitRaw - 9.0;
        }
      } else {
        // Higher digits only scroll when carry pushes them
        const digitInt = Math.floor(digitRaw);
        displayValue = digitInt + carry;

        // If this digit is pushed past 9, it carries over
        if (displayValue > 9.0) {
          nextCarry = displayValue - 9.0;
          // Wrap display for rendering (though >10 shouldn't happen with single carry)
          // displayValue = displayValue % 10; // Don't wrap yet, handle in draw
        }
      }

      // Draw separator line if not the first digit (rightmost)
      if (i > 0) {
        ctx.beginPath();
        // Draw line at the right edge of the current digit slot
        // Since we are moving right-to-left, this is the boundary with the previous digit
        const lineX = xPos + this.digitWidth;
        ctx.moveTo(lineX, counterY);
        ctx.lineTo(lineX, counterY + counterHeight);

        // Use a subtle version of the component color
        ctx.strokeStyle = this.color;
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }

      // Draw the digit strip
      this.drawDigitStrip(ctx, xPos, counterY, counterHeight, displayValue);

      // Prepare for next iteration
      currentVal = Math.floor(currentVal / 10);
      carry = nextCarry;
      xPos -= this.digitWidth;
    }

    // Draw sign if negative
    if (this.value < 0) {
      ctx.fillStyle = this.color;
      ctx.fillText(
        '-',
        xPos + this.digitWidth / 2,
        counterY + counterHeight / 2
      );
    }

    ctx.restore();
  }

  private drawDigitStrip(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    height: number,
    value: number
  ): void {
    // Value is e.g. 4.5
    // We want to draw '4' at center-ish, and '5' coming up from bottom?
    // Or '4' moving up, '5' appearing from bottom.
    // Standard odometer: Numbers move UP.
    // So if value is 4.1:
    // '4' is moving up slightly. '5' is below it? No, '3' is below?
    // Sequence is ... 3 4 5 ...
    // If value increases, numbers move DOWN?
    // Usually:
    // [ 4 ] -> [ 5 ]
    // 4 moves up, 5 comes from bottom.

    // Let's say center Y is cy.
    // digit 'd' is at cy - (fraction * digitHeight)
    // digit 'd+1' is at cy + digitHeight - (fraction * digitHeight)

    // value = 4.5
    // mainDigit = 4
    // fraction = 0.5
    // Draw '4' at offset -0.5h (moving up)
    // Draw '5' at offset +0.5h (coming into center)

    // Handle wrapping: 9 -> 0

    const normalizedValue = value % 10; // 0.0 - 9.99
    const mainDigit = Math.floor(normalizedValue);
    const fraction = normalizedValue - mainDigit;
    const nextDigit = (mainDigit + 1) % 10;

    const centerY = y + height / 2;

    ctx.fillStyle = this.color;
    ctx.font = 'bold 16px monospace'; // Fixed width font for digits
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const centerX = x + this.digitWidth / 2;

    // Draw main digit (moving up)
    // y pos: center - (fraction * height)
    // But we want it to scroll only the height of the character, not the whole box?
    // Let's use digitHeight for spacing

    const y1 = centerY - fraction * this.digitHeight;
    ctx.fillText(mainDigit.toString(), centerX, y1);

    // Draw next digit (coming from bottom)
    const y2 = centerY + this.digitHeight - fraction * this.digitHeight;
    ctx.fillText(nextDigit.toString(), centerX, y2);

    // Optional: Draw previous digit for continuity if needed, but 2 is usually enough
  }
}
