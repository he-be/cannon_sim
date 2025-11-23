import { UIComponent } from '../core/UIComponent';
import { CRT_COLORS } from '../../../data/Constants';

export class IndicatorComponent extends UIComponent {
  private isOn: boolean = false;
  private onColor: string;
  private offColor: string;
  private radius: number = 6;

  constructor(
    id: string,
    onColor: string = CRT_COLORS.TARGET_LOCKED,
    offColor: string = '#111111'
  ) {
    super(id);
    this.onColor = onColor;
    this.offColor = offColor;

    this.bounds.width = this.radius * 2 + 4;
    this.bounds.height = this.radius * 2 + 4;
  }

  setState(isOn: boolean): void {
    this.isOn = isOn;
  }

  setColor(onColor: string): void {
    this.onColor = onColor;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return;

    const centerX = this.bounds.x + this.bounds.width / 2;
    const centerY = this.bounds.y + this.bounds.height / 2;

    ctx.save();

    // Draw bezel/ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, this.radius + 1, 0, Math.PI * 2);
    ctx.fillStyle = '#222';
    ctx.fill();
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw light
    ctx.beginPath();
    ctx.arc(centerX, centerY, this.radius, 0, Math.PI * 2);

    if (this.isOn) {
      ctx.fillStyle = this.onColor;
      ctx.shadowColor = this.onColor;
      ctx.shadowBlur = 10;
    } else {
      ctx.fillStyle = this.offColor;
      ctx.shadowBlur = 0;
    }

    ctx.fill();

    // Glossy reflection
    ctx.beginPath();
    ctx.arc(
      centerX - this.radius * 0.3,
      centerY - this.radius * 0.3,
      this.radius * 0.3,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fill();

    ctx.restore();
  }
}
