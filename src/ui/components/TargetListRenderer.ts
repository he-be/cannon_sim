import { CanvasManager } from '../../rendering/CanvasManager';
import { CRT_COLORS, FONTS } from '../../data/Constants';

export interface TargetListData {
  id: string;
  bearing: number;
  distance: number;
  altitude: number;
  isApproaching: boolean;
}

export class TargetListRenderer {
  private canvasManager: CanvasManager;
  private bounds: { x: number; y: number; width: number; height: number };
  private targets: TargetListData[] = [];

  constructor(
    canvasManager: CanvasManager,
    bounds: { x: number; y: number; width: number; height: number }
  ) {
    this.canvasManager = canvasManager;
    this.bounds = bounds;
  }

  updateTargets(targets: TargetListData[]): void {
    this.targets = targets;
  }

  setBounds(bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): void {
    this.bounds = bounds;
  }

  render(): void {
    const ctx = this.canvasManager.context;
    const { x, y, width, height } = this.bounds;

    ctx.save();

    // Background
    ctx.fillStyle = 'rgba(0, 20, 0, 0.8)';
    ctx.fillRect(x, y, width, height);

    // Border
    ctx.strokeStyle = CRT_COLORS.GRID_LINE;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    // Clip to bounds
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();

    // Header
    const padding = 10;
    const startY = y + padding + 10;

    ctx.font = FONTS.DATA;
    ctx.fillStyle = CRT_COLORS.SECONDARY_TEXT;
    ctx.textAlign = 'left';

    // Column positions
    const colId = x + padding;
    const colBearing = x + padding + 60;
    const colDist = x + padding + 130;
    const colAlt = x + padding + 200;

    ctx.fillText('TRACK', colId, startY);
    ctx.fillText('BEARING', colBearing, startY);
    ctx.fillText('DIST', colDist, startY);
    ctx.fillText('ALT', colAlt, startY);

    // Separator line
    ctx.beginPath();
    ctx.moveTo(x + padding, startY + 5);
    ctx.lineTo(x + width - padding, startY + 5);
    ctx.strokeStyle = CRT_COLORS.GRID_LINE;
    ctx.stroke();

    // List items
    const rowHeight = 20;
    let currentY = startY + 25;

    this.targets.forEach(target => {
      if (currentY > y + height - padding) return; // Overflow check

      // TRACK ID
      ctx.fillStyle = CRT_COLORS.PRIMARY_TEXT;
      ctx.fillText(target.id, colId, currentY);

      // BEARING
      ctx.fillStyle = CRT_COLORS.SECONDARY_TEXT;
      ctx.fillText(`${target.bearing.toFixed(0)}°`, colBearing, currentY);

      // Distance (Color coded)
      ctx.fillStyle = target.isApproaching
        ? CRT_COLORS.WARNING_TEXT
        : CRT_COLORS.SECONDARY_TEXT;
      ctx.fillText(`${Math.round(target.distance)}m`, colDist, currentY);

      // Altitude
      ctx.fillStyle = CRT_COLORS.SECONDARY_TEXT;
      ctx.fillText(`${Math.round(target.altitude)}m`, colAlt, currentY);

      currentY += rowHeight;
    });

    ctx.restore();
  }
}
