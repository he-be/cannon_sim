/**
 * TrajectoryRenderer - Projectile trajectory rendering system for T021
 * Handles real-time projectile visualization with trails and impact effects
 */

import { Vector3 } from '../math/Vector3';
import { Vector2 } from '../math/Vector2';
import { CanvasManager } from './CanvasManager';

export interface TrajectoryPoint {
  position: Vector3;
  velocity: Vector3;
  timeStamp: number;
  isActive: boolean;
}

export interface ProjectileTrail {
  id: string;
  points: TrajectoryPoint[];
  color: string;
  maxLength: number;
  fadeTime: number; // milliseconds
  startTime: number;
}

export interface TrajectoryRenderOptions {
  maxTrailLength: number; // maximum points in trail
  trailFadeTime: number; // milliseconds
  projectileSize: number; // pixel radius
  trailWidth: number; // line width
  showVelocityVector: boolean;
  showPredictedPath: boolean;
  colors: {
    active: string;
    fading: string;
    impact: string;
    predicted: string;
  };
}

/**
 * Renders projectile trajectories and flight paths on canvas displays
 */
export class TrajectoryRenderer {
  private _trails: Map<string, ProjectileTrail> = new Map();
  private _options: TrajectoryRenderOptions;

  // Canvas coordinate conversion parameters
  private _gameWorldBounds: {
    width: number;
    height: number;
    centerX: number;
    centerY: number;
  };

  constructor(options?: Partial<TrajectoryRenderOptions>) {
    this._options = {
      maxTrailLength: 100,
      trailFadeTime: 5000,
      projectileSize: 2,
      trailWidth: 1,
      showVelocityVector: false,
      showPredictedPath: false,
      colors: {
        active: '#00ff00',
        fading: '#006600',
        impact: '#ff0000',
        predicted: '#ffff00',
      },
      ...options,
    };

    this._gameWorldBounds = {
      width: 20000, // 20km
      height: 20000, // 20km
      centerX: 10000, // 10km
      centerY: 10000, // 10km
    };
  }

  /**
   * Set game world bounds for coordinate conversion
   */
  setGameWorldBounds(
    width: number,
    height: number,
    centerX: number,
    centerY: number
  ): void {
    this._gameWorldBounds = { width, height, centerX, centerY };
  }

  /**
   * Update projectile trail data
   */
  updateTrajectory(
    projectileId: string,
    trajectory: Vector3[],
    velocity: Vector3
  ): void {
    const currentTime = Date.now();

    if (!this._trails.has(projectileId)) {
      this._trails.set(projectileId, {
        id: projectileId,
        points: [],
        color: this._options.colors.active,
        maxLength: this._options.maxTrailLength,
        fadeTime: this._options.trailFadeTime,
        startTime: currentTime,
      });
    }

    const trail = this._trails.get(projectileId)!;

    // Convert trajectory points to trail points
    const newPoints: TrajectoryPoint[] = trajectory.map((pos, index) => ({
      position: pos,
      velocity: velocity, // Simplified - in real implementation, each point would have its own velocity
      timeStamp: currentTime - (trajectory.length - index - 1) * 16.67, // Approximate 60fps
      isActive: index === trajectory.length - 1, // Only the latest point is active
    }));

    // Replace old points with new trajectory
    trail.points = newPoints.slice(-this._options.maxTrailLength);
  }

  /**
   * Remove projectile trail when projectile is no longer active
   */
  removeTrajectory(projectileId: string): void {
    const trail = this._trails.get(projectileId);
    if (trail) {
      // Mark all points as inactive to start fade-out
      trail.points.forEach(point => {
        point.isActive = false;
      });
    }
  }

  /**
   * Clean up old faded trails
   */
  cleanup(): void {
    const currentTime = Date.now();
    const toRemove: string[] = [];

    this._trails.forEach((trail, id) => {
      const hasActivePoints = trail.points.some(point => {
        const age = currentTime - point.timeStamp;
        return point.isActive || age < trail.fadeTime;
      });

      if (!hasActivePoints) {
        toRemove.push(id);
      }
    });

    toRemove.forEach(id => this._trails.delete(id));
  }

  /**
   * Render all trajectories on horizontal radar display
   */
  renderOnHorizontalRadar(canvas: CanvasManager): void {
    this._trails.forEach(trail => {
      this.renderTrailHorizontal(canvas, trail);
    });
  }

  /**
   * Render all trajectories on vertical radar display
   */
  renderOnVerticalRadar(canvas: CanvasManager): void {
    this._trails.forEach(trail => {
      this.renderTrailVertical(canvas, trail);
    });
  }

  /**
   * Render a single trail on horizontal radar (top-down view)
   */
  private renderTrailHorizontal(
    canvas: CanvasManager,
    trail: ProjectileTrail
  ): void {
    const currentTime = Date.now();
    const points = trail.points;

    if (points.length < 2) return;

    // Draw trail line segments
    for (let i = 1; i < points.length; i++) {
      const prevPoint = points[i - 1];
      const currPoint = points[i];

      const age = currentTime - currPoint.timeStamp;
      if (age > trail.fadeTime) continue;

      // Calculate fade alpha
      const fadeRatio = currPoint.isActive
        ? 1.0
        : Math.max(0, 1 - age / trail.fadeTime);
      const alpha = Math.round(fadeRatio * 255)
        .toString(16)
        .padStart(2, '0');

      // Convert to canvas coordinates
      const prevCanvas = this.worldToHorizontalCanvas(
        prevPoint.position,
        canvas
      );
      const currCanvas = this.worldToHorizontalCanvas(
        currPoint.position,
        canvas
      );

      // Draw trail segment
      const color = currPoint.isActive
        ? trail.color
        : this._options.colors.fading;
      canvas.drawLine(
        prevCanvas,
        currCanvas,
        color + alpha,
        this._options.trailWidth
      );
    }

    // Draw current projectile position
    const latestPoint = points[points.length - 1];
    if (latestPoint.isActive) {
      const canvasPos = this.worldToHorizontalCanvas(
        latestPoint.position,
        canvas
      );
      canvas.drawCircle(
        canvasPos,
        this._options.projectileSize,
        trail.color,
        true
      );

      // Draw velocity vector if enabled
      if (this._options.showVelocityVector) {
        this.drawVelocityVector(canvas, latestPoint, canvasPos, true);
      }
    }
  }

  /**
   * Render a single trail on vertical radar (side view)
   */
  private renderTrailVertical(
    canvas: CanvasManager,
    trail: ProjectileTrail
  ): void {
    const currentTime = Date.now();
    const points = trail.points;

    if (points.length < 2) return;

    // Draw trail line segments
    for (let i = 1; i < points.length; i++) {
      const prevPoint = points[i - 1];
      const currPoint = points[i];

      const age = currentTime - currPoint.timeStamp;
      if (age > trail.fadeTime) continue;

      // Calculate fade alpha
      const fadeRatio = currPoint.isActive
        ? 1.0
        : Math.max(0, 1 - age / trail.fadeTime);
      const alpha = Math.round(fadeRatio * 255)
        .toString(16)
        .padStart(2, '0');

      // Convert to canvas coordinates (side view)
      const prevCanvas = this.worldToVerticalCanvas(prevPoint.position, canvas);
      const currCanvas = this.worldToVerticalCanvas(currPoint.position, canvas);

      // Draw trail segment
      const color = currPoint.isActive
        ? trail.color
        : this._options.colors.fading;
      canvas.drawLine(
        prevCanvas,
        currCanvas,
        color + alpha,
        this._options.trailWidth
      );
    }

    // Draw current projectile position
    const latestPoint = points[points.length - 1];
    if (latestPoint.isActive) {
      const canvasPos = this.worldToVerticalCanvas(
        latestPoint.position,
        canvas
      );
      canvas.drawCircle(
        canvasPos,
        this._options.projectileSize,
        trail.color,
        true
      );

      // Draw velocity vector if enabled
      if (this._options.showVelocityVector) {
        this.drawVelocityVector(canvas, latestPoint, canvasPos, false);
      }
    }
  }

  /**
   * Convert world coordinates to horizontal canvas coordinates
   */
  private worldToHorizontalCanvas(
    worldPos: Vector3,
    canvas: CanvasManager
  ): Vector2 {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Scale world coordinates to canvas coordinates
    const scaleX = (canvas.width - 40) / this._gameWorldBounds.width;
    const scaleY = (canvas.height - 40) / this._gameWorldBounds.height;

    const x = centerX + (worldPos.x - this._gameWorldBounds.centerX) * scaleX;
    const y = centerY + (worldPos.y - this._gameWorldBounds.centerY) * scaleY;

    return new Vector2(x, y);
  }

  /**
   * Convert world coordinates to vertical canvas coordinates (side view)
   */
  private worldToVerticalCanvas(
    worldPos: Vector3,
    canvas: CanvasManager
  ): Vector2 {
    const centerX = canvas.width / 2;
    const groundY = canvas.height - 20;

    // For side view: X = distance from center, Y = altitude
    const distance = Math.sqrt(
      Math.pow(worldPos.x - this._gameWorldBounds.centerX, 2) +
        Math.pow(worldPos.y - this._gameWorldBounds.centerY, 2)
    );

    const scaleX = (canvas.width - 40) / (this._gameWorldBounds.width / 2);
    const scaleY = (canvas.height - 40) / 5000; // 5km max altitude

    const x = centerX + distance * scaleX;
    const y = groundY - worldPos.z * scaleY;

    return new Vector2(x, y);
  }

  /**
   * Draw velocity vector for projectile
   */
  private drawVelocityVector(
    canvas: CanvasManager,
    point: TrajectoryPoint,
    canvasPos: Vector2,
    isHorizontal: boolean
  ): void {
    const velocity = point.velocity;
    const scale = 0.1; // Scale factor for velocity vector display

    let velocityEnd: Vector2;

    if (isHorizontal) {
      // Top-down view: show horizontal velocity components
      velocityEnd = new Vector2(
        canvasPos.x + velocity.x * scale,
        canvasPos.y + velocity.y * scale
      );
    } else {
      // Side view: show forward and vertical velocity
      const horizontalSpeed = Math.sqrt(
        velocity.x * velocity.x + velocity.y * velocity.y
      );
      velocityEnd = new Vector2(
        canvasPos.x + horizontalSpeed * scale,
        canvasPos.y - velocity.z * scale
      );
    }

    canvas.drawLine(canvasPos, velocityEnd, '#ffff00', 1);
    canvas.drawCircle(velocityEnd, 1, '#ffff00', true);
  }

  /**
   * Get rendering options
   */
  getOptions(): TrajectoryRenderOptions {
    return { ...this._options };
  }

  /**
   * Update rendering options
   */
  setOptions(options: Partial<TrajectoryRenderOptions>): void {
    this._options = { ...this._options, ...options };
  }

  /**
   * Get number of active trails
   */
  getActiveTrailCount(): number {
    return this._trails.size;
  }

  /**
   * Clear all trails
   */
  clearAll(): void {
    this._trails.clear();
  }
}
