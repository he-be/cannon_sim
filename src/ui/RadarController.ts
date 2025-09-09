/**
 * RadarController - Interactive radar control system for T020
 * Handles mouse drag operations, range cursor control, and real-time feedback
 */

import { MouseHandler, MouseEventData } from '../input/MouseHandler';
import { Vector2 } from '../math/Vector2';
import { Vector3 } from '../math/Vector3';

export interface RadarState {
  // Radar orientation
  azimuth: number; // degrees from north
  elevation: number; // degrees above horizon

  // Range control
  currentRange: number; // meters
  maxRange: number; // maximum detection range
  rangeCursor: number; // current range cursor position (0-1)

  // Operation state
  isActive: boolean;
  isTracking: boolean;

  // Display parameters
  sweepAngle: number; // radar sweep cone angle in degrees
  position: Vector3; // radar position in world coordinates
}

export interface RadarTarget {
  id: string;
  position: Vector3;
  velocity: Vector3;
  distance: number;
  bearing: number; // degrees from north
  elevation: number; // degrees above horizon
  targetType: 'MOVING_FAST' | 'MOVING_SLOW' | 'STATIONARY' | 'UNKNOWN';
  strength: number; // signal strength 0-1
}

export interface RadarEvents {
  onDirectionChange: (azimuth: number, elevation: number) => void;
  onRangeChange: (range: number) => void;
  onTargetDetected: (target: RadarTarget) => void;
  onTargetLost: (targetId: string) => void;
  onSweepComplete: () => void;
}

/**
 * Controls radar operations through mouse interactions
 */
export class RadarController {
  private _state: RadarState;
  private _events: RadarEvents;
  private _mouseHandler: MouseHandler;

  // Canvas elements for radar displays
  private _horizontalCanvas: HTMLCanvasElement;
  private _verticalCanvas: HTMLCanvasElement;
  private _horizontalCtx: CanvasRenderingContext2D;
  private _verticalCtx: CanvasRenderingContext2D;

  // Interaction state
  private _isDragging = false;
  private _dragType: 'direction' | 'range' | null = null;

  // Detected targets
  private _detectedTargets: Map<string, RadarTarget> = new Map();

  // Animation
  private _sweepAnimationId: number | null = null;

  constructor(
    events: RadarEvents,
    horizontalCanvasId: string = 'horizontal-radar',
    verticalCanvasId: string = 'vertical-radar'
  ) {
    this._events = events;
    this._state = this.createInitialState();

    // Initialize canvas elements
    this._horizontalCanvas = this.getCanvasElement(horizontalCanvasId);
    this._verticalCanvas = this.getCanvasElement(verticalCanvasId);

    this._horizontalCtx = this._horizontalCanvas.getContext('2d')!;
    this._verticalCtx = this._verticalCanvas.getContext('2d')!;

    // Initialize mouse handler for horizontal radar (primary control)
    this._mouseHandler = new MouseHandler(this._horizontalCanvas);
    this._mouseHandler.setGameWorldBounds(
      this._state.maxRange * 2,
      this._state.maxRange * 2,
      this._state.maxRange,
      this._state.maxRange
    );

    this.setupEventListeners();
    this.startRadarSweep();
  }

  /**
   * Create initial radar state
   */
  private createInitialState(): RadarState {
    return {
      azimuth: 0, // North
      elevation: 0, // Horizontal
      currentRange: 5000, // 5km default
      maxRange: 10000, // 10km maximum
      rangeCursor: 0.5, // 50% of max range
      isActive: true,
      isTracking: false,
      sweepAngle: 30, // 30 degree sweep cone
      position: new Vector3(0, 0, 100), // 100m elevation default
    };
  }

  /**
   * Get canvas element with error handling
   */
  private getCanvasElement(id: string): HTMLCanvasElement {
    const canvas = document.getElementById(id) as HTMLCanvasElement;
    if (!canvas) {
      throw new Error(`Radar canvas '${id}' not found`);
    }
    return canvas;
  }

  /**
   * Setup mouse event listeners for radar control
   */
  private setupEventListeners(): void {
    this._mouseHandler.addEventListener((event: MouseEventData) => {
      switch (event.type) {
        case 'mousedown':
          this.handleMouseDown(event);
          break;
        case 'mousemove':
          this.handleMouseMove(event);
          break;
        case 'mouseup':
          this.handleMouseUp(event);
          break;
        case 'dragstart':
          this.handleDragStart(event);
          break;
        case 'dragend':
          this.handleDragEnd(event);
          break;
      }
    });
  }

  /**
   * Handle mouse down events
   */
  private handleMouseDown(event: MouseEventData): void {
    const canvasPos = this.gameToCanvasCoords(event.position.game);
    const center = new Vector2(
      this._horizontalCanvas.width / 2,
      this._horizontalCanvas.height / 2
    );

    const distanceFromCenter = canvasPos.subtract(center).magnitude();
    const canvasRadius =
      Math.min(this._horizontalCanvas.width, this._horizontalCanvas.height) /
        2 -
      20;

    // Determine interaction type based on click position
    if (distanceFromCenter > canvasRadius * 0.8) {
      // Near edge - range control
      this._dragType = 'range';
    } else {
      // Inside radar scope - direction control
      this._dragType = 'direction';
    }
  }

  /**
   * Handle mouse move events
   */
  private handleMouseMove(event: MouseEventData): void {
    if (!this._isDragging) return;

    const canvasPos = this.gameToCanvasCoords(event.position.game);
    const center = new Vector2(
      this._horizontalCanvas.width / 2,
      this._horizontalCanvas.height / 2
    );

    if (this._dragType === 'direction') {
      this.updateRadarDirection(canvasPos, center);
    } else if (this._dragType === 'range') {
      this.updateRadarRange(canvasPos, center);
    }
  }

  /**
   * Handle mouse up events
   */
  private handleMouseUp(_event: MouseEventData): void {
    this._isDragging = false;
    this._dragType = null;
  }

  /**
   * Handle drag start events
   */
  private handleDragStart(_event: MouseEventData): void {
    this._isDragging = true;
  }

  /**
   * Handle drag end events
   */
  private handleDragEnd(_event: MouseEventData): void {
    this._isDragging = false;
    this._dragType = null;
  }

  /**
   * Update radar direction based on mouse position
   */
  private updateRadarDirection(mousePos: Vector2, center: Vector2): void {
    const delta = mousePos.subtract(center);

    // Calculate azimuth (angle from north, clockwise)
    const azimuth =
      ((Math.atan2(delta.x, -delta.y) * 180) / Math.PI + 360) % 360;

    // Update state
    this._state.azimuth = azimuth;

    // Trigger event
    this._events.onDirectionChange(this._state.azimuth, this._state.elevation);
  }

  /**
   * Update radar range based on mouse position
   */
  private updateRadarRange(mousePos: Vector2, center: Vector2): void {
    const distance = mousePos.subtract(center).magnitude();
    const maxRadius =
      Math.min(this._horizontalCanvas.width, this._horizontalCanvas.height) /
        2 -
      20;

    // Calculate range as percentage of maximum
    const rangeCursor = Math.min(distance / maxRadius, 1.0);
    const range = rangeCursor * this._state.maxRange;

    this._state.rangeCursor = rangeCursor;
    this._state.currentRange = range;

    // Trigger event
    this._events.onRangeChange(range);
  }

  /**
   * Convert game coordinates to canvas coordinates
   */
  private gameToCanvasCoords(gamePos: Vector2): Vector2 {
    const centerX = this._horizontalCanvas.width / 2;
    const centerY = this._horizontalCanvas.height / 2;
    const scale =
      Math.min(this._horizontalCanvas.width, this._horizontalCanvas.height) /
      (this._state.maxRange * 2);

    return new Vector2(
      centerX + (gamePos.x - this._state.maxRange) * scale,
      centerY + (gamePos.y - this._state.maxRange) * scale
    );
  }

  /**
   * Start radar sweep animation
   */
  private startRadarSweep(): void {
    if (!this._state.isActive) return;

    const sweep = (): void => {
      // Update sweep animation
      this.updateRadarDisplay();

      // Continue animation
      this._sweepAnimationId = globalThis.requestAnimationFrame(sweep);
    };

    this._sweepAnimationId = globalThis.requestAnimationFrame(sweep);
  }

  /**
   * Update radar display with current state and targets
   */
  private updateRadarDisplay(): void {
    this.drawHorizontalRadar();
    this.drawVerticalRadar();
  }

  /**
   * Draw horizontal radar display (top-down view)
   */
  private drawHorizontalRadar(): void {
    const ctx = this._horizontalCtx;
    const canvas = this._horizontalCanvas;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) / 2 - 20;

    // Clear canvas
    ctx.fillStyle = '#001100';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw range rings
    ctx.strokeStyle = '#003300';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      const ringRadius = (radius * i) / 4;
      ctx.beginPath();
      ctx.arc(centerX, centerY, ringRadius, 0, 2 * Math.PI);
      ctx.stroke();
    }

    // Draw compass directions
    ctx.strokeStyle = '#004400';
    ctx.lineWidth = 1;
    ctx.beginPath();
    // North-South line
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX, centerY + radius);
    // East-West line
    ctx.moveTo(centerX - radius, centerY);
    ctx.lineTo(centerX + radius, centerY);
    ctx.stroke();

    // Draw radar beam direction
    const beamAngle = ((this._state.azimuth - 90) * Math.PI) / 180; // Convert to canvas coordinates
    const sweepHalf = ((this._state.sweepAngle / 2) * Math.PI) / 180;

    ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(
      centerX,
      centerY,
      radius,
      beamAngle - sweepHalf,
      beamAngle + sweepHalf
    );
    ctx.closePath();
    ctx.fill();

    // Draw current range cursor
    const rangeRadius = radius * this._state.rangeCursor;
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, rangeRadius, 0, 2 * Math.PI);
    ctx.stroke();

    // Draw detected targets
    this.drawTargets(ctx, centerX, centerY, radius);
  }

  /**
   * Draw vertical radar display (side view)
   */
  private drawVerticalRadar(): void {
    const ctx = this._verticalCtx;
    const canvas = this._verticalCanvas;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Clear canvas
    ctx.fillStyle = '#001100';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw horizon line
    ctx.strokeStyle = '#003300';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(canvas.width, centerY);
    ctx.stroke();

    // Draw elevation grid
    for (let i = 1; i <= 3; i++) {
      const y = centerY - (i * centerY) / 3;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw elevation beam
    const elevationPixels = (this._state.elevation / 90) * centerY;
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + canvas.width / 3, centerY - elevationPixels);
    ctx.stroke();
  }

  /**
   * Draw detected targets on radar display
   */
  private drawTargets(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radius: number
  ): void {
    this._detectedTargets.forEach(target => {
      const targetRange = target.distance / this._state.maxRange;
      if (targetRange > 1.0) return; // Target beyond radar range

      const targetRadius = radius * targetRange;
      const bearingRad = ((target.bearing - 90) * Math.PI) / 180; // Convert to canvas coordinates

      const targetX = centerX + Math.cos(bearingRad) * targetRadius;
      const targetY = centerY + Math.sin(bearingRad) * targetRadius;

      // Draw target blip
      ctx.fillStyle = this.getTargetColor(target);
      ctx.beginPath();
      ctx.arc(targetX, targetY, 3 + target.strength * 2, 0, 2 * Math.PI);
      ctx.fill();

      // Draw target trail for moving targets
      if (target.velocity.magnitude() > 1) {
        const trailLength = Math.min(target.velocity.magnitude() / 10, 20);
        const trailAngle = Math.atan2(-target.velocity.y, target.velocity.x);

        ctx.strokeStyle = this.getTargetColor(target);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(targetX, targetY);
        ctx.lineTo(
          targetX - Math.cos(trailAngle) * trailLength,
          targetY + Math.sin(trailAngle) * trailLength
        );
        ctx.stroke();
      }
    });
  }

  /**
   * Get color for target based on type and strength
   */
  private getTargetColor(target: RadarTarget): string {
    const alpha = 0.7 + target.strength * 0.3;

    switch (target.targetType) {
      case 'MOVING_FAST':
        return `rgba(255, 0, 0, ${alpha})`;
      case 'MOVING_SLOW':
        return `rgba(255, 165, 0, ${alpha})`;
      case 'STATIONARY':
        return `rgba(0, 255, 0, ${alpha})`;
      default:
        return `rgba(255, 255, 0, ${alpha})`;
    }
  }

  /**
   * Add detected target to radar display
   */
  addTarget(target: RadarTarget): void {
    this._detectedTargets.set(target.id, target);
    this._events.onTargetDetected(target);
  }

  /**
   * Remove target from radar display
   */
  removeTarget(targetId: string): void {
    if (this._detectedTargets.delete(targetId)) {
      this._events.onTargetLost(targetId);
    }
  }

  /**
   * Update target information
   */
  updateTarget(target: RadarTarget): void {
    if (this._detectedTargets.has(target.id)) {
      this._detectedTargets.set(target.id, target);
    }
  }

  /**
   * Set radar direction programmatically
   */
  setDirection(azimuth: number, elevation: number): void {
    this._state.azimuth = (azimuth + 360) % 360;
    this._state.elevation = Math.max(0, Math.min(90, elevation));

    this._events.onDirectionChange(this._state.azimuth, this._state.elevation);
  }

  /**
   * Set radar range programmatically
   */
  setRange(range: number): void {
    this._state.currentRange = Math.max(
      0,
      Math.min(this._state.maxRange, range)
    );
    this._state.rangeCursor = this._state.currentRange / this._state.maxRange;

    this._events.onRangeChange(this._state.currentRange);
  }

  /**
   * Get current radar state
   */
  getState(): RadarState {
    return { ...this._state };
  }

  /**
   * Get all detected targets
   */
  getTargets(): RadarTarget[] {
    return Array.from(this._detectedTargets.values());
  }

  /**
   * Set radar active state
   */
  setActive(active: boolean): void {
    this._state.isActive = active;

    if (active && !this._sweepAnimationId) {
      this.startRadarSweep();
    } else if (!active && this._sweepAnimationId) {
      globalThis.cancelAnimationFrame(this._sweepAnimationId);
      this._sweepAnimationId = null;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this._sweepAnimationId) {
      globalThis.cancelAnimationFrame(this._sweepAnimationId);
      this._sweepAnimationId = null;
    }

    this._mouseHandler.destroy();
    this._detectedTargets.clear();
  }
}
