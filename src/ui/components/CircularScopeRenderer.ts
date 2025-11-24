/**
 * CircularScopeRenderer - Plan Position Indicator (PPI) style radar scope
 * Displays targets by azimuth and range (no elevation information)
 */

import { CanvasManager } from '../../rendering/CanvasManager';
import { Vector2 } from '../../math/Vector2';
import { Vector3 } from '../../math/Vector3';
import { CRT_COLORS } from '../../data/Constants';

export interface CircularScopeTarget {
  id: string;
  azimuth: number; // Azimuth in degrees (0 = North)
  distance: number; // Distance in meters
  elevation: number;
}

export interface CircularScopeBounds {
  x: number; // Top-left X
  y: number; // Top-left Y
  width: number;
  height: number;
  center: Vector2;
  radius: number;
}

/**
 * CircularScopeRenderer renders a PPI-style circular radar scope
 * - Center = Radar position (not artillery position)
 * - Radar beam = Green solid line
 * - Distance rings = 1km intervals (thin) + 5km intervals (thick)
 * - Projectile trajectory = Green dashed line
 */
export class CircularScopeRenderer {
  private canvasManager: CanvasManager;
  private bounds: CircularScopeBounds;

  constructor(canvasManager: CanvasManager, bounds: CircularScopeBounds) {
    this.canvasManager = canvasManager;
    this.bounds = bounds;
  }

  /**
   * Render the circular scope
   */
  private targetHistory: Map<
    string,
    { azimuth: number; distance: number; timestamp: number }
  > = new Map();
  private readonly BEAM_WIDTH = 10; // degrees (wider for better visibility)
  private readonly PERSISTENCE_DURATION = 2500; // ms

  /**
   * Render the circular scope
   */
  render(
    targets: CircularScopeTarget[],
    radarAzimuth: number,
    radarElevation: number,
    maxRange: number,
    trajectoryPath: Vector2[],
    projectiles: Array<{ position: Vector3; isActive: boolean }>,
    currentTime: number = Date.now()
  ): void {
    const ctx = this.canvasManager.context;

    ctx.save();

    // Clear scope background
    ctx.fillStyle = CRT_COLORS.BACKGROUND;
    ctx.fillRect(
      this.bounds.x,
      this.bounds.y,
      this.bounds.width,
      this.bounds.height
    );

    // Render radar beam
    this.renderRadarBeam(radarAzimuth);

    // Render targets (dots)
    this.renderTargets(
      targets,
      radarAzimuth,
      radarElevation,
      maxRange,
      currentTime
    );

    // Render components
    this.renderDistanceRings(maxRange);
    this.renderCompassMarkers();

    if (trajectoryPath && trajectoryPath.length > 0) {
      this.renderTrajectory(trajectoryPath, maxRange);
    }

    if (projectiles && projectiles.length > 0) {
      this.renderProjectiles(projectiles, maxRange);
    }

    ctx.restore();
  }

  /**
   * Render distance rings (1km thin lines + 5km thick lines)
   */
  private renderDistanceRings(maxRange: number): void {
    const ctx = this.canvasManager.context;
    const center = this.bounds.center;
    const radius = this.bounds.radius;

    // 1km unit thin lines
    for (let range = 1000; range <= maxRange; range += 1000) {
      const r = (range / maxRange) * radius;
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 5km unit thick lines with labels
    for (let range = 5000; range <= maxRange; range += 5000) {
      const r = (range / maxRange) * radius;
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
      ctx.stroke();

      // Distance label
      ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
      ctx.font = '12px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${range / 1000}km`, center.x + 5, center.y - r);
    }
  }

  /**
   * Render compass markers (N, E, S, W)
   */
  private renderCompassMarkers(): void {
    const ctx = this.canvasManager.context;
    const center = this.bounds.center;
    const radius = this.bounds.radius;
    const labelOffset = 15;

    ctx.fillStyle = CRT_COLORS.PRIMARY_TEXT;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // North (0°)
    ctx.fillText('N', center.x, center.y - radius - labelOffset);

    // East (90°)
    ctx.fillText('E', center.x + radius + labelOffset, center.y);

    // South (180°)
    ctx.fillText('S', center.x, center.y + radius + labelOffset);

    // West (270°)
    ctx.fillText('W', center.x - radius - labelOffset, center.y);
  }

  /**
   * Render radar beam as green solid line
   */
  private renderRadarBeam(azimuth: number): void {
    const ctx = this.canvasManager.context;
    const center = this.bounds.center;
    const radius = this.bounds.radius;

    // Convert azimuth to radians (0° = North = -90° in canvas coords)
    const angleRad = ((azimuth - 90) * Math.PI) / 180;
    const endX = center.x + radius * Math.cos(angleRad);
    const endY = center.y + radius * Math.sin(angleRad);

    ctx.strokeStyle = CRT_COLORS.PRIMARY_TEXT; // Green
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(center.x, center.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  }

  /**
   * Render targets as green dots (azimuth and distance only)
   * Only shows targets within beam width or recently scanned (afterimage)
   */
  private renderTargets(
    targets: CircularScopeTarget[],
    radarAzimuth: number,
    radarElevation: number,
    maxRange: number,
    currentTime: number
  ): void {
    const ctx = this.canvasManager.context;
    const center = this.bounds.center;
    const radius = this.bounds.radius;

    // Normalize radar azimuth to 0-360
    let normalizedRadarAz = radarAzimuth % 360;
    if (normalizedRadarAz < 0) normalizedRadarAz += 360;

    // Update history for targets in beam
    targets.forEach(target => {
      // Normalize target azimuth to 0-360
      let targetAz = target.azimuth % 360;
      if (targetAz < 0) targetAz += 360;

      // Calculate angular difference (Azimuth)
      let angleDiff = Math.abs(targetAz - normalizedRadarAz);
      if (angleDiff > 180) angleDiff = 360 - angleDiff;

      // Calculate elevation difference
      const elevationDiff = Math.abs(target.elevation - radarElevation);

      // If within beam (Azimuth AND Elevation), update history
      if (
        angleDiff <= this.BEAM_WIDTH / 2 &&
        elevationDiff <= this.BEAM_WIDTH / 2
      ) {
        this.targetHistory.set(target.id, {
          azimuth: targetAz,
          distance: target.distance,
          timestamp: currentTime,
        });
      }
    });

    // Render targets from history
    this.targetHistory.forEach((data, id) => {
      const age = currentTime - data.timestamp;

      // Remove old history
      if (age > this.PERSISTENCE_DURATION) {
        this.targetHistory.delete(id);
        return;
      }

      // Calculate opacity based on age
      const alpha = 1.0 - age / this.PERSISTENCE_DURATION;

      // Convert azimuth to radians
      const angleRad = ((data.azimuth - 90) * Math.PI) / 180;

      // Calculate position on scope
      const r = Math.min((data.distance / maxRange) * radius, radius);
      const x = center.x + r * Math.cos(angleRad);
      const y = center.y + r * Math.sin(angleRad);

      // Draw target dot
      ctx.fillStyle = CRT_COLORS.PRIMARY_TEXT;
      ctx.globalAlpha = alpha;

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Add glow effect
      ctx.save();
      ctx.globalAlpha = alpha * 0.5;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    ctx.globalAlpha = 1.0; // Reset alpha
  }

  /**
   * Render projectile trajectory as green dashed line (horizontal plane projection)
   */
  private renderTrajectory(trajectoryPath: Vector2[], maxRange: number): void {
    const ctx = this.canvasManager.context;
    const center = this.bounds.center;
    const radius = this.bounds.radius;

    ctx.strokeStyle = CRT_COLORS.PRIMARY_TEXT; // Green
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]); // Dashed pattern

    ctx.beginPath();

    for (let i = 0; i < trajectoryPath.length; i++) {
      const point = trajectoryPath[i];

      // Calculate distance and azimuth from point
      const distance = Math.sqrt(point.x * point.x + point.y * point.y);
      const azimuth = Math.atan2(point.x, point.y);

      // Map to scope coordinates
      const r = Math.min((distance / maxRange) * radius, radius);
      const x = center.x + r * Math.sin(azimuth);
      const y = center.y - r * Math.cos(azimuth); // Y is inverted

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();
    ctx.setLineDash([]); // Reset dash pattern
  }

  /**
   * Render projectiles as white dots
   */
  private renderProjectiles(
    projectiles: Array<{ position: Vector3; isActive: boolean }>,
    maxRange: number
  ): void {
    const ctx = this.canvasManager.context;
    const center = this.bounds.center;
    const radius = this.bounds.radius;

    ctx.fillStyle = CRT_COLORS.PROJECTILE; // White

    for (const projectile of projectiles) {
      if (!projectile.isActive) continue;

      // Calculate distance and azimuth from projectile position
      // Note: Radar is at (0,0,0)
      const distance = Math.sqrt(
        projectile.position.x * projectile.position.x +
          projectile.position.y * projectile.position.y
      );
      const azimuth = Math.atan2(projectile.position.x, projectile.position.y);

      // Map to scope coordinates
      const r = Math.min((distance / maxRange) * radius, radius);
      const x = center.x + r * Math.sin(azimuth);
      const y = center.y - r * Math.cos(azimuth); // Y is inverted

      // Draw projectile dot
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2); // 3px radius
      ctx.fill();
    }
  }

  /**
   * Update bounds (for window resize)
   */
  setBounds(bounds: CircularScopeBounds): void {
    this.bounds = bounds;
  }
}
