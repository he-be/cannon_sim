/**
 * Canvas-based Radar Renderer
 * Implements TR-02: Canvas 2D API compliance
 * Based on RadarController design pattern but with integrated Canvas rendering
 */

import { CanvasManager } from '../../rendering/CanvasManager';
import { Vector2 } from '../../math/Vector2';
import { Vector3 } from '../../math/Vector3';
import { CRT_COLORS, FONTS } from '../../data/Constants';
import { TargetType } from '../../game/entities/Target';

export interface RadarEvents {
  onDirectionChange: (azimuth: number, elevation: number) => void;
  onRangeChange: (range: number) => void;
  onTargetDetected: (target: RadarTarget) => void;
  onTargetLost: (targetId: string) => void;
}

export interface RadarTarget {
  id: string;
  position: Vector3;
  velocity: Vector3;
  type: string;
  bearing: number;
  distance: number;
  strength: number;
}

export interface RadarState {
  azimuth: number; // Current radar direction
  elevation: number; // Current radar elevation
  currentRange: number; // Current range setting
  maxRange: number; // Maximum range
  rangeCursor: number; // Range cursor position (0-1)
  isActive: boolean;
  isTracking: boolean;
  sweepAngle: number; // Radar beam width
  position: Vector3; // Radar position
}

export class RadarRenderer {
  private canvasManager: CanvasManager;
  private events: RadarEvents;
  private state: RadarState;

  // Layout
  private readonly horizontalRadarBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  private readonly verticalRadarBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  // Detected targets
  private detectedTargets: Map<string, RadarTarget> = new Map();

  // Interaction state
  private isDragging = false;
  private dragType: 'direction' | 'range' | null = null;
  private lastMousePosition: Vector2 = new Vector2(0, 0);

  // Projectiles for display
  private projectiles: Array<{
    id: string;
    position: Vector3;
    velocity: Vector3;
    isActive: boolean;
  }> = [];

  // Trajectory prediction
  private trajectoryPrediction: Vector3[] = [];

  constructor(
    canvasManager: CanvasManager,
    events: RadarEvents,
    horizontalBounds: { x: number; y: number; width: number; height: number },
    verticalBounds: { x: number; y: number; width: number; height: number }
  ) {
    this.canvasManager = canvasManager;
    this.events = events;
    this.horizontalRadarBounds = horizontalBounds;
    this.verticalRadarBounds = verticalBounds;

    this.state = this.createInitialState();
  }

  private createInitialState(): RadarState {
    return {
      azimuth: 0,
      elevation: 0,
      currentRange: 5000,
      maxRange: 20000,
      rangeCursor: 0.25,
      isActive: true,
      isTracking: false,
      sweepAngle: 120, // 120 degree horizontal sweep
      position: new Vector3(0, 0, 0),
    };
  }

  /**
   * Render both horizontal and vertical radar displays
   */
  render(): void {
    this.renderHorizontalRadar();
    this.renderVerticalRadar();
  }

  /**
   * Render horizontal radar (top-down view)
   */
  private renderHorizontalRadar(): void {
    const ctx = this.canvasManager.context;
    const bounds = this.horizontalRadarBounds;

    ctx.save();

    // Clip to radar bounds
    ctx.beginPath();
    ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.clip();

    // Clear radar area
    ctx.fillStyle = 'rgba(0, 20, 0, 0.8)';
    ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);

    // Draw radar grid
    this.drawHorizontalGrid(ctx, bounds);

    // Draw radar beam
    this.drawRadarBeam(ctx, bounds);

    // Draw range cursor
    this.drawRangeCursor(ctx, bounds);

    // Draw targets
    this.drawTargetsOnHorizontalRadar(ctx, bounds);

    // Draw projectiles
    this.drawProjectilesOnHorizontalRadar(ctx, bounds);

    // Draw trajectory prediction
    this.drawTrajectoryPrediction(ctx, bounds);

    // Draw radar info
    this.drawRadarInfo(ctx, bounds);

    ctx.restore();
  }

  /**
   * Render vertical radar (side view)
   */
  private renderVerticalRadar(): void {
    const ctx = this.canvasManager.context;
    const bounds = this.verticalRadarBounds;

    ctx.save();

    // Clip to radar bounds
    ctx.beginPath();
    ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.clip();

    // Clear radar area
    ctx.fillStyle = 'rgba(0, 20, 0, 0.8)';
    ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);

    // Draw vertical grid
    this.drawVerticalGrid(ctx, bounds);

    // Draw targets in vertical view
    this.drawTargetsOnVerticalRadar(ctx, bounds);

    // Draw projectiles in vertical view
    this.drawProjectilesOnVerticalRadar(ctx, bounds);

    // Draw vertical trajectory prediction
    this.drawVerticalTrajectoryPrediction(ctx, bounds);

    ctx.restore();
  }

  private drawHorizontalGrid(
    ctx: CanvasRenderingContext2D,
    bounds: { x: number; y: number; width: number; height: number }
  ): void {
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height - 10; // Gun at bottom
    const radius = Math.min(bounds.width, bounds.height - 20) / 2;

    ctx.strokeStyle = CRT_COLORS.GRID_LINE;
    ctx.lineWidth = 1;

    // Range rings
    for (let i = 1; i <= 4; i++) {
      const ringRadius = (radius * i) / 4;
      ctx.beginPath();
      ctx.arc(centerX, centerY, ringRadius, 0, 2 * Math.PI);
      ctx.stroke();

      // Range labels
      ctx.fillStyle = CRT_COLORS.SECONDARY_TEXT;
      ctx.font = FONTS.SMALL;
      ctx.textAlign = 'left';
      const rangeKm = (this.state.maxRange * i) / 4000;
      ctx.fillText(
        `${rangeKm.toFixed(1)}km`,
        centerX + 5,
        centerY - ringRadius - 2
      );
    }

    // Bearing lines
    for (let bearing = -60; bearing <= 60; bearing += 30) {
      const angle = ((bearing + this.state.azimuth - 90) * Math.PI) / 180;
      const x1 = centerX + Math.cos(angle) * radius;
      const y1 = centerY + Math.sin(angle) * radius;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x1, y1);
      ctx.stroke();

      // Bearing labels
      if (bearing === 0) {
        ctx.fillStyle = CRT_COLORS.PRIMARY_TEXT;
        ctx.textAlign = 'center';
        ctx.fillText('0°', x1, y1 - 10);
      }
    }

    // Gun position
    ctx.fillStyle = CRT_COLORS.PRIMARY_TEXT;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 3, 0, 2 * Math.PI);
    ctx.fill();
  }

  private drawVerticalGrid(
    ctx: CanvasRenderingContext2D,
    bounds: { x: number; y: number; width: number; height: number }
  ): void {
    ctx.strokeStyle = CRT_COLORS.GRID_LINE;
    ctx.lineWidth = 1;

    // Range lines (horizontal)
    for (let i = 1; i <= 4; i++) {
      const x = bounds.x + 10 + ((bounds.width - 20) * i) / 4;
      ctx.beginPath();
      ctx.moveTo(x, bounds.y + 10);
      ctx.lineTo(x, bounds.y + bounds.height - 10);
      ctx.stroke();

      // Range labels
      ctx.fillStyle = CRT_COLORS.SECONDARY_TEXT;
      ctx.font = FONTS.SMALL;
      ctx.textAlign = 'center';
      const rangeKm = (this.state.maxRange * i) / 4000;
      ctx.fillText(`${rangeKm.toFixed(1)}km`, x, bounds.y + bounds.height - 5);
    }

    // Altitude lines (vertical)
    for (let i = 1; i <= 4; i++) {
      const y = bounds.y + bounds.height - 10 - ((bounds.height - 20) * i) / 4;
      ctx.beginPath();
      ctx.moveTo(bounds.x + 10, y);
      ctx.lineTo(bounds.x + bounds.width - 10, y);
      ctx.stroke();

      // Altitude labels
      ctx.textAlign = 'left';
      ctx.fillText(`${i * 2500}m`, bounds.x + 5, y - 2);
    }

    // Gun position
    ctx.fillStyle = CRT_COLORS.PRIMARY_TEXT;
    ctx.beginPath();
    ctx.arc(bounds.x + 10, bounds.y + bounds.height - 10, 3, 0, 2 * Math.PI);
    ctx.fill();
  }

  private drawRadarBeam(
    ctx: CanvasRenderingContext2D,
    bounds: { x: number; y: number; width: number; height: number }
  ): void {
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height - 10;
    const radius = Math.min(bounds.width, bounds.height - 20) / 2;

    // Draw sweep area
    const sweepStart =
      ((this.state.azimuth - this.state.sweepAngle / 2 - 90) * Math.PI) / 180;
    const sweepEnd =
      ((this.state.azimuth + this.state.sweepAngle / 2 - 90) * Math.PI) / 180;

    ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, sweepStart, sweepEnd);
    ctx.closePath();
    ctx.fill();

    // Draw center line
    const centerAngle = ((this.state.azimuth - 90) * Math.PI) / 180;
    const centerEndX = centerX + Math.cos(centerAngle) * radius;
    const centerEndY = centerY + Math.sin(centerAngle) * radius;

    ctx.strokeStyle = CRT_COLORS.PRIMARY_TEXT;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerEndX, centerEndY);
    ctx.stroke();
  }

  private drawRangeCursor(
    ctx: CanvasRenderingContext2D,
    bounds: { x: number; y: number; width: number; height: number }
  ): void {
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height - 10;
    const radius = Math.min(bounds.width, bounds.height - 20) / 2;

    const cursorRadius = radius * this.state.rangeCursor;

    ctx.strokeStyle = CRT_COLORS.WARNING_TEXT;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(centerX, centerY, cursorRadius, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);

    // Range text
    ctx.fillStyle = CRT_COLORS.WARNING_TEXT;
    ctx.font = FONTS.SMALL;
    ctx.textAlign = 'left';
    const rangeText = `${(this.state.currentRange / 1000).toFixed(1)}km`;
    ctx.fillText(rangeText, centerX + cursorRadius + 5, centerY - 5);
  }

  private drawTargetsOnHorizontalRadar(
    ctx: CanvasRenderingContext2D,
    bounds: { x: number; y: number; width: number; height: number }
  ): void {
    this.detectedTargets.forEach(target => {
      const screenPos = this.worldToHorizontalRadarScreen(
        target.position,
        bounds
      );
      if (!screenPos) return;

      const targetType = target.type as TargetType;
      const color = this.getTargetColor(targetType);
      const size = this.getTargetSize(targetType);

      this.drawVesselSymbol(
        ctx,
        screenPos.x,
        screenPos.y,
        size,
        targetType,
        color
      );
    });
  }

  private drawTargetsOnVerticalRadar(
    ctx: CanvasRenderingContext2D,
    bounds: { x: number; y: number; width: number; height: number }
  ): void {
    this.detectedTargets.forEach(target => {
      // Only show targets within beam width
      if (!this.isTargetInBeam(target)) return;

      const screenPos = this.worldToVerticalRadarScreen(
        target.position,
        bounds
      );
      if (!screenPos) return;

      const targetType = target.type as TargetType;
      const color = this.getTargetColor(targetType);
      const size = this.getTargetSize(targetType);

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, size, 0, 2 * Math.PI);
      ctx.fill();
    });
  }

  private drawProjectilesOnHorizontalRadar(
    ctx: CanvasRenderingContext2D,
    bounds: { x: number; y: number; width: number; height: number }
  ): void {
    this.projectiles.forEach(projectile => {
      if (!projectile.isActive) return;

      const screenPos = this.worldToHorizontalRadarScreen(
        projectile.position,
        bounds
      );
      if (!screenPos) return;

      ctx.fillStyle = CRT_COLORS.PROJECTILE;
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, 2, 0, 2 * Math.PI);
      ctx.fill();
    });
  }

  private drawProjectilesOnVerticalRadar(
    ctx: CanvasRenderingContext2D,
    bounds: { x: number; y: number; width: number; height: number }
  ): void {
    this.projectiles.forEach(projectile => {
      if (!projectile.isActive) return;

      const screenPos = this.worldToVerticalRadarScreen(
        projectile.position,
        bounds
      );
      if (!screenPos) return;

      ctx.fillStyle = CRT_COLORS.PROJECTILE;
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, 2, 0, 2 * Math.PI);
      ctx.fill();
    });
  }

  private drawTrajectoryPrediction(
    ctx: CanvasRenderingContext2D,
    bounds: { x: number; y: number; width: number; height: number }
  ): void {
    if (this.trajectoryPrediction.length < 2) return;

    ctx.strokeStyle = CRT_COLORS.WARNING_TEXT;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();

    let firstPoint = true;
    this.trajectoryPrediction.forEach(point => {
      const screenPos = this.worldToHorizontalRadarScreen(point, bounds);
      if (!screenPos) return;

      if (firstPoint) {
        ctx.moveTo(screenPos.x, screenPos.y);
        firstPoint = false;
      } else {
        ctx.lineTo(screenPos.x, screenPos.y);
      }
    });

    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawVerticalTrajectoryPrediction(
    ctx: CanvasRenderingContext2D,
    bounds: { x: number; y: number; width: number; height: number }
  ): void {
    if (this.trajectoryPrediction.length < 2) return;

    ctx.strokeStyle = CRT_COLORS.WARNING_TEXT;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();

    let firstPoint = true;
    this.trajectoryPrediction.forEach(point => {
      const screenPos = this.worldToVerticalRadarScreen(point, bounds);
      if (!screenPos) return;

      if (firstPoint) {
        ctx.moveTo(screenPos.x, screenPos.y);
        firstPoint = false;
      } else {
        ctx.lineTo(screenPos.x, screenPos.y);
      }
    });

    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawRadarInfo(
    ctx: CanvasRenderingContext2D,
    bounds: { x: number; y: number; width: number; height: number }
  ): void {
    const x = bounds.x + bounds.width - 120;
    const y = bounds.y + 30;

    ctx.fillStyle = CRT_COLORS.PRIMARY_TEXT;
    ctx.font = FONTS.DATA;
    ctx.textAlign = 'left';

    ctx.fillText(`Az: ${this.state.azimuth.toFixed(1)}°`, x, y);
    ctx.fillText(`El: ${this.state.elevation.toFixed(1)}°`, x, y + 15);
    ctx.fillText(
      `Range: ${(this.state.currentRange / 1000).toFixed(1)}km`,
      x,
      y + 30
    );
  }

  private worldToHorizontalRadarScreen(
    worldPos: Vector3,
    bounds: { x: number; y: number; width: number; height: number }
  ): Vector2 | null {
    const dx = worldPos.x - this.state.position.x;
    const dy = worldPos.y - this.state.position.y;

    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > this.state.maxRange) return null;

    const bearing = Math.atan2(dx, dy) * (180 / Math.PI);
    let relativeBearing = bearing - this.state.azimuth;

    // Normalize to -180 to +180
    while (relativeBearing > 180) relativeBearing -= 360;
    while (relativeBearing < -180) relativeBearing += 360;

    // Check if within sweep angle
    if (Math.abs(relativeBearing) > this.state.sweepAngle / 2) return null;

    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height - 10;
    const radius = Math.min(bounds.width, bounds.height - 20) / 2;

    const normalizedDistance = distance / this.state.maxRange;
    const screenDistance = normalizedDistance * radius;

    const angle = ((relativeBearing - 90) * Math.PI) / 180;
    const screenX = centerX + Math.cos(angle) * screenDistance;
    const screenY = centerY + Math.sin(angle) * screenDistance;

    return new Vector2(screenX, screenY);
  }

  private worldToVerticalRadarScreen(
    worldPos: Vector3,
    bounds: { x: number; y: number; width: number; height: number }
  ): Vector2 | null {
    const dx = worldPos.x - this.state.position.x;
    const dy = worldPos.y - this.state.position.y;
    const dz = worldPos.z - this.state.position.z;

    const horizontalDistance = Math.sqrt(dx * dx + dy * dy);
    if (horizontalDistance > this.state.maxRange) return null;

    const screenX =
      bounds.x +
      10 +
      (horizontalDistance / this.state.maxRange) * (bounds.width - 20);
    const screenY =
      bounds.y + bounds.height - 10 - (dz / 10000) * (bounds.height - 20);

    return new Vector2(screenX, screenY);
  }

  private isTargetInBeam(target: RadarTarget): boolean {
    const dx = target.position.x - this.state.position.x;
    const dy = target.position.y - this.state.position.y;

    const bearing = Math.atan2(dx, dy) * (180 / Math.PI);
    let relativeBearing = bearing - this.state.azimuth;

    while (relativeBearing > 180) relativeBearing -= 360;
    while (relativeBearing < -180) relativeBearing += 360;

    return Math.abs(relativeBearing) <= 2.5; // 5 degree beam width
  }

  private getTargetColor(targetType: TargetType): string {
    switch (targetType) {
      case TargetType.BALLOON:
        return CRT_COLORS.TARGET_NORMAL;
      case TargetType.FRIGATE:
        return CRT_COLORS.WARNING_TEXT;
      case TargetType.CRUISER:
        return CRT_COLORS.CRITICAL_TEXT;
      default:
        return CRT_COLORS.TARGET_NORMAL;
    }
  }

  private getTargetSize(targetType: TargetType): number {
    switch (targetType) {
      case TargetType.BALLOON:
        return 8;
      case TargetType.FRIGATE:
        return 5;
      case TargetType.CRUISER:
        return 7;
      default:
        return 3;
    }
  }

  private drawVesselSymbol(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    targetType: TargetType,
    color: string
  ): void {
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;

    switch (targetType) {
      case TargetType.BALLOON:
        // Circle with cross
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x - size * 0.5, y);
        ctx.lineTo(x + size * 0.5, y);
        ctx.moveTo(x, y - size * 0.5);
        ctx.lineTo(x, y + size * 0.5);
        ctx.stroke();
        break;

      case TargetType.FRIGATE:
        // Diamond shape
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size * 0.6, y);
        ctx.lineTo(x, y + size);
        ctx.lineTo(x - size * 0.6, y);
        ctx.closePath();
        ctx.fill();
        break;

      case TargetType.CRUISER:
        // Rectangle with center dot
        ctx.fillRect(x - size * 0.8, y - size * 0.4, size * 1.6, size * 0.8);
        ctx.beginPath();
        ctx.arc(x, y, size * 0.2, 0, Math.PI * 2);
        ctx.stroke();
        break;

      default:
        // Default circle
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
  }

  /**
   * Handle mouse events
   */
  handleMouseEvent(
    mousePos: Vector2,
    eventType: 'mousedown' | 'mousemove' | 'mouseup' | 'drag',
    _button: number = 0
  ): boolean {
    // Check if mouse is within horizontal radar bounds
    if (this.isPointInBounds(mousePos, this.horizontalRadarBounds)) {
      switch (eventType) {
        case 'mousedown':
          return this.handleRadarMouseDown(mousePos);
        case 'mousemove':
          this.handleRadarMouseMove(mousePos);
          return true;
        case 'mouseup':
          this.handleRadarMouseUp();
          return true;
      }
    }

    return false;
  }

  private isPointInBounds(
    point: Vector2,
    bounds: { x: number; y: number; width: number; height: number }
  ): boolean {
    return (
      point.x >= bounds.x &&
      point.x <= bounds.x + bounds.width &&
      point.y >= bounds.y &&
      point.y <= bounds.y + bounds.height
    );
  }

  private handleRadarMouseDown(mousePos: Vector2): boolean {
    const bounds = this.horizontalRadarBounds;
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height - 10;
    const radius = Math.min(bounds.width, bounds.height - 20) / 2;

    const distanceFromCenter = Math.sqrt(
      Math.pow(mousePos.x - centerX, 2) + Math.pow(mousePos.y - centerY, 2)
    );

    if (distanceFromCenter > radius * 0.8) {
      this.dragType = 'range';
    } else {
      this.dragType = 'direction';
    }

    this.isDragging = true;
    this.lastMousePosition = mousePos;
    return true;
  }

  private handleRadarMouseMove(mousePos: Vector2): void {
    if (!this.isDragging) return;

    const bounds = this.horizontalRadarBounds;
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height - 10;

    if (this.dragType === 'direction') {
      // Update radar direction
      const delta = mousePos.subtract(this.lastMousePosition);
      this.state.azimuth += delta.x * 0.5; // Sensitivity adjustment
      this.state.azimuth = ((this.state.azimuth % 360) + 360) % 360;

      this.events.onDirectionChange(this.state.azimuth, this.state.elevation);
    } else if (this.dragType === 'range') {
      // Update range cursor
      const distance = Math.sqrt(
        Math.pow(mousePos.x - centerX, 2) + Math.pow(mousePos.y - centerY, 2)
      );
      const radius = Math.min(bounds.width, bounds.height - 20) / 2;

      this.state.rangeCursor = Math.min(distance / radius, 1.0);
      this.state.currentRange = this.state.rangeCursor * this.state.maxRange;

      this.events.onRangeChange(this.state.currentRange);
    }

    this.lastMousePosition = mousePos;
  }

  private handleRadarMouseUp(): void {
    this.isDragging = false;
    this.dragType = null;
  }

  /**
   * Add detected target
   */
  addTarget(target: RadarTarget): void {
    this.detectedTargets.set(target.id, target);
    this.events.onTargetDetected(target);
  }

  /**
   * Remove target
   */
  removeTarget(targetId: string): void {
    if (this.detectedTargets.delete(targetId)) {
      this.events.onTargetLost(targetId);
    }
  }

  /**
   * Update target information
   */
  updateTarget(target: RadarTarget): void {
    this.detectedTargets.set(target.id, target);
  }

  /**
   * Update projectiles for display
   */
  updateProjectiles(
    projectiles: Array<{
      id: string;
      position: Vector3;
      velocity: Vector3;
      isActive: boolean;
    }>
  ): void {
    this.projectiles = projectiles;
  }

  /**
   * Update trajectory prediction
   */
  updateTrajectoryPrediction(trajectory: Vector3[]): void {
    this.trajectoryPrediction = trajectory;
  }

  /**
   * Set radar direction
   */
  setDirection(azimuth: number, elevation: number): void {
    this.state.azimuth = azimuth;
    this.state.elevation = elevation;
  }

  /**
   * Set radar range
   */
  setRange(range: number): void {
    this.state.currentRange = Math.max(0, Math.min(this.state.maxRange, range));
    this.state.rangeCursor = this.state.currentRange / this.state.maxRange;
  }

  /**
   * Get current radar state
   */
  getState(): RadarState {
    return { ...this.state };
  }

  /**
   * Get detected targets
   */
  getTargets(): RadarTarget[] {
    return Array.from(this.detectedTargets.values());
  }

  /**
   * Update radar state
   */
  updateState(newState: Partial<RadarState>): void {
    this.state = { ...this.state, ...newState };
  }
}
