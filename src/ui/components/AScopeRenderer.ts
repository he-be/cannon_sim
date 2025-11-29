/**
 * AScopeRenderer - A-Scope style distance display
 * 2-channel analog oscilloscope for radar distance detection
 */

import { CanvasManager } from '../../rendering/CanvasManager';
import { Vector3 } from '../../math/Vector3';
import { CRT_COLORS } from '../../data/Constants';

export interface AScopeTarget {
  id: string;
  distance: number; // Distance in meters
  strength: number; // Signal strength (0.0 ~ 1.0)
}

export interface AScopeBounds {
  x: number; // Top-left X
  y: number; // Top-left Y
  width: number;
  height: number;
}

/**
 * AScopeRenderer renders a 2-channel oscilloscope-style distance display
 * - Channel 1: Target response (horizontal: distance, vertical: intensity)
 * - Channel 2: Distance gate marker
 * - Targets only appear when radar azimuth AND elevation match
 */
export class AScopeRenderer {
  private canvasManager: CanvasManager;
  private bounds: AScopeBounds;

  constructor(canvasManager: CanvasManager, bounds: AScopeBounds) {
    this.canvasManager = canvasManager;
    this.bounds = bounds;
  }

  /**
   * Render the A-Scope
   */
  render(
    targets: AScopeTarget[],
    rangeGate: number,
    maxRange: number,
    projectiles?: Array<{ position: Vector3; isActive: boolean }>,
    radarAzimuth?: number,
    radarElevation?: number,
    _currentTime: number = Date.now()
  ): void {
    const ctx = this.canvasManager.context;

    ctx.save();

    // Clear background
    ctx.fillStyle = CRT_COLORS.BACKGROUND;
    ctx.fillRect(
      this.bounds.x,
      this.bounds.y,
      this.bounds.width,
      this.bounds.height
    );

    // Render components
    this.renderGrid(maxRange);
    this.renderBaseline();
    this.renderTargetResponse(targets, maxRange);

    if (projectiles && projectiles.length > 0 && radarAzimuth !== undefined) {
      this.renderProjectiles(
        projectiles,
        maxRange,
        radarAzimuth,
        radarElevation || 0
      );
    }

    // Render explosions
    // Removed per user request due to persistent "green fill" bug
    // this.renderExplosions(maxRange, currentTime);

    this.renderRangeGate(rangeGate, maxRange);

    ctx.restore();
  }

  /**
   * Render grid lines and distance markers
   */
  private renderGrid(maxRange: number): void {
    const ctx = this.canvasManager.context;
    const { x, y, width, height } = this.bounds;

    // Vertical grid lines at 5km intervals
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.1)';
    ctx.lineWidth = 1;

    for (let range = 5000; range <= maxRange; range += 5000) {
      const px = x + (range / maxRange) * width;
      ctx.beginPath();
      ctx.moveTo(px, y);
      ctx.lineTo(px, y + height);
      ctx.stroke();

      // Distance label
      ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`${range / 1000}km`, px, y + 5);
    }

    // Horizontal centerline
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + height / 2);
    ctx.lineTo(x + width, y + height / 2);
    ctx.stroke();
  }

  /**
   * Render baseline (bottom of oscilloscope)
   */
  private renderBaseline(): void {
    const ctx = this.canvasManager.context;
    const { x, y, width, height } = this.bounds;

    ctx.strokeStyle = CRT_COLORS.PRIMARY_TEXT;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y + height);
    ctx.lineTo(x + width, y + height);
    ctx.stroke();
  }

  /**
   * Render target response spikes (Channel 1)
   */
  private renderTargetResponse(
    targets: AScopeTarget[],
    maxRange: number
  ): void {
    const ctx = this.canvasManager.context;
    const { x, y, width, height } = this.bounds;

    ctx.strokeStyle = CRT_COLORS.PRIMARY_TEXT;
    ctx.lineWidth = 2;

    for (const target of targets) {
      // Calculate X position based on distance
      const px = x + (target.distance / maxRange) * width;

      // Calculate spike height based on strength
      const spikeHeight = target.strength * height * 0.8;
      const py = y + height - spikeHeight;

      // Draw spike
      ctx.beginPath();
      ctx.moveTo(px, y + height);
      ctx.lineTo(px, py);
      ctx.stroke();

      // Add glow effect
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(px, y + height);
      ctx.lineTo(px, py);
      ctx.stroke();
      ctx.restore();
      ctx.stroke();
    }
  }

  /**
   * Render projectiles as small spikes if within beam
   */
  private renderProjectiles(
    projectiles: Array<{ position: Vector3; isActive: boolean }>,
    maxRange: number,
    radarAzimuth: number,
    radarElevation: number
  ): void {
    const ctx = this.canvasManager.context;
    const { x, y, width, height } = this.bounds;

    ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
    ctx.lineWidth = 2;

    for (const projectile of projectiles) {
      if (!projectile.isActive) continue;

      // Check if in beam
      if (!this.isProjectileInBeam(projectile, radarAzimuth, radarElevation))
        continue;

      // Calculate distance
      const distance = Math.sqrt(
        projectile.position.x * projectile.position.x +
          projectile.position.y * projectile.position.y
      );

      // Calculate X position based on distance
      const px = x + (distance / maxRange) * width;

      // Small spike height (fixed strength approx 0.3)
      const spikeHeight = height * 0.3;
      const py = y + height - spikeHeight;

      // Draw spike
      ctx.beginPath();
      ctx.moveTo(px, y + height);
      ctx.lineTo(px, py);
      ctx.stroke();
    }
  }

  private isProjectileInBeam(
    projectile: { position: Vector3 },
    radarAzimuth: number,
    radarElevation: number
  ): boolean {
    // Calculate bearing to projectile
    // Note: atan2(x, y) for 0=North clockwise
    const bearing =
      Math.atan2(projectile.position.x, projectile.position.y) *
      (180 / Math.PI);

    let relativeBearing = bearing - radarAzimuth;

    // Normalize to -180 to 180
    while (relativeBearing > 180) relativeBearing -= 360;
    while (relativeBearing < -180) relativeBearing += 360;

    // Calculate elevation to projectile
    const horizontalDistance = Math.sqrt(
      projectile.position.x * projectile.position.x +
        projectile.position.y * projectile.position.y
    );
    const elevation =
      Math.atan2(projectile.position.z, horizontalDistance) * (180 / Math.PI);
    const elevationDiff = Math.abs(elevation - radarElevation);

    // Check both azimuth and elevation (5 degree beam width)
    return Math.abs(relativeBearing) <= 2.5 && elevationDiff <= 2.5;
  }

  /**
   * Render distance gate marker (Channel 2)
   */
  private renderRangeGate(rangeGate: number, maxRange: number): void {
    const ctx = this.canvasManager.context;
    const { x, y, width, height } = this.bounds;

    // Calculate X position
    const px = x + (rangeGate / maxRange) * width;

    // Draw vertical dashed line
    ctx.strokeStyle = CRT_COLORS.WARNING_TEXT; // Yellow
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(px, y);
    ctx.lineTo(px, y + height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw distance label
    ctx.fillStyle = CRT_COLORS.WARNING_TEXT;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`GATE: ${(rangeGate / 1000).toFixed(1)}km`, px + 5, y + 15);

    // Draw gate markers (top and bottom)
    const markerSize = 8;
    ctx.fillStyle = CRT_COLORS.WARNING_TEXT;

    // Top marker
    ctx.beginPath();
    ctx.moveTo(px, y);
    ctx.lineTo(px - markerSize / 2, y + markerSize);
    ctx.lineTo(px + markerSize / 2, y + markerSize);
    ctx.closePath();
    ctx.fill();

    // Bottom marker
    ctx.beginPath();
    ctx.moveTo(px, y + height);
    ctx.lineTo(px - markerSize / 2, y + height - markerSize);
    ctx.lineTo(px + markerSize / 2, y + height - markerSize);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Update bounds (for window resize)
   */
  setBounds(bounds: AScopeBounds): void {
    this.bounds = bounds;
  }
}
