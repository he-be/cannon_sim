/**
 * ProjectileRenderer - Real-time projectile symbol rendering system for T023
 * Handles individual projectile visualization with different symbol types
 */

import { Vector3 } from '../../math/Vector3';
import { Vector2 } from '../../math/Vector2';
import { CanvasManager } from '../CanvasManager';

export interface ProjectileSymbol {
  id: string;
  position: Vector3;
  velocity: Vector3;
  symbolType: ProjectileSymbolType;
  color: string;
  size: number;
  rotation?: number; // radians
  isActive: boolean;
  lastUpdateTime: number;
}

export enum ProjectileSymbolType {
  CIRCLE = 'circle',
  TRIANGLE = 'triangle', // Arrow pointing in velocity direction
  SQUARE = 'square',
  CROSS = 'cross',
  DIAMOND = 'diamond',
}

export interface ProjectileRenderOptions {
  showVelocityDirection: boolean;
  rotateWithVelocity: boolean;
  scaleWithSpeed: boolean;
  minSize: number;
  maxSize: number;
  colors: {
    active: string;
    inactive: string;
    friendly: string;
    enemy: string;
  };
}

/**
 * Renders individual projectile symbols in real-time
 */
export class ProjectileRenderer {
  private _projectiles: Map<string, ProjectileSymbol> = new Map();
  private _options: ProjectileRenderOptions;

  // Canvas coordinate conversion parameters
  private _gameWorldBounds: {
    width: number;
    height: number;
    centerX: number;
    centerY: number;
  };

  constructor(options?: Partial<ProjectileRenderOptions>) {
    this._options = {
      showVelocityDirection: true,
      rotateWithVelocity: true,
      scaleWithSpeed: false,
      minSize: 2,
      maxSize: 8,
      colors: {
        active: '#00ff00',
        inactive: '#666666',
        friendly: '#0080ff',
        enemy: '#ff4000',
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
   * Add or update a projectile symbol
   */
  updateProjectile(
    id: string,
    position: Vector3,
    velocity: Vector3,
    options?: Partial<{
      symbolType: ProjectileSymbolType;
      color: string;
      size: number;
      isActive: boolean;
    }>
  ): void {
    const currentTime = Date.now();
    const rotation = this._options.rotateWithVelocity
      ? Math.atan2(velocity.y, velocity.x)
      : 0;

    const size = this._options.scaleWithSpeed
      ? this.calculateSizeFromSpeed(velocity.magnitude())
      : options?.size || this._options.minSize;

    if (this._projectiles.has(id)) {
      // Update existing projectile
      const projectile = this._projectiles.get(id)!;
      projectile.position = position.copy();
      projectile.velocity = velocity.copy();
      projectile.rotation = rotation;
      projectile.size = size;
      projectile.lastUpdateTime = currentTime;
      projectile.isActive = options?.isActive ?? projectile.isActive;

      if (options?.symbolType) projectile.symbolType = options.symbolType;
      if (options?.color) projectile.color = options.color;
    } else {
      // Create new projectile
      const projectile: ProjectileSymbol = {
        id,
        position: position.copy(),
        velocity: velocity.copy(),
        symbolType: options?.symbolType || ProjectileSymbolType.CIRCLE,
        color: options?.color || this._options.colors.active,
        size,
        rotation,
        isActive: options?.isActive ?? true,
        lastUpdateTime: currentTime,
      };

      this._projectiles.set(id, projectile);
    }
  }

  /**
   * Remove a projectile symbol
   */
  removeProjectile(id: string): void {
    this._projectiles.delete(id);
  }

  /**
   * Mark projectile as inactive (for cleanup)
   */
  deactivateProjectile(id: string): void {
    const projectile = this._projectiles.get(id);
    if (projectile) {
      projectile.isActive = false;
    }
  }

  /**
   * Clean up old inactive projectiles
   */
  cleanup(maxAge: number = 1000): void {
    const currentTime = Date.now();
    const toRemove: string[] = [];

    for (const [id, projectile] of this._projectiles) {
      if (
        !projectile.isActive &&
        currentTime - projectile.lastUpdateTime > maxAge
      ) {
        toRemove.push(id);
      }
    }

    toRemove.forEach(id => this.removeProjectile(id));
  }

  /**
   * Render all projectiles on horizontal radar display
   */
  renderOnHorizontalRadar(canvas: CanvasManager): void {
    for (const projectile of this._projectiles.values()) {
      const canvasPos = this.worldToHorizontalCanvas(
        projectile.position,
        canvas
      );
      this.renderProjectileSymbol(canvas, projectile, canvasPos, true);
    }
  }

  /**
   * Render all projectiles on vertical radar display
   */
  renderOnVerticalRadar(canvas: CanvasManager): void {
    for (const projectile of this._projectiles.values()) {
      const canvasPos = this.worldToVerticalCanvas(projectile.position, canvas);
      this.renderProjectileSymbol(canvas, projectile, canvasPos, false);
    }
  }

  /**
   * Render a single projectile symbol
   */
  private renderProjectileSymbol(
    canvas: CanvasManager,
    projectile: ProjectileSymbol,
    position: Vector2,
    isHorizontal: boolean
  ): void {
    const color = projectile.isActive
      ? projectile.color
      : this._options.colors.inactive;

    const rotation = isHorizontal ? projectile.rotation || 0 : 0;

    switch (projectile.symbolType) {
      case ProjectileSymbolType.CIRCLE:
        canvas.drawCircle(position, projectile.size, color, true);
        break;

      case ProjectileSymbolType.TRIANGLE:
        this.drawTriangle(canvas, position, projectile.size, color, rotation);
        break;

      case ProjectileSymbolType.SQUARE:
        this.drawSquare(canvas, position, projectile.size, color, rotation);
        break;

      case ProjectileSymbolType.CROSS:
        this.drawCross(canvas, position, projectile.size, color, rotation);
        break;

      case ProjectileSymbolType.DIAMOND:
        this.drawDiamond(canvas, position, projectile.size, color, rotation);
        break;
    }

    // Draw velocity direction indicator if enabled
    if (this._options.showVelocityDirection && projectile.isActive) {
      this.drawVelocityIndicator(canvas, projectile, position, isHorizontal);
    }
  }

  /**
   * Draw triangle symbol (arrow)
   */
  private drawTriangle(
    canvas: CanvasManager,
    center: Vector2,
    size: number,
    color: string,
    rotation: number
  ): void {
    const points = [
      { x: size, y: 0 }, // Point
      { x: -size * 0.5, y: size * 0.5 }, // Bottom right
      { x: -size * 0.5, y: -size * 0.5 }, // Bottom left
    ];

    const rotatedPoints = points.map(p => {
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      return new Vector2(
        center.x + p.x * cos - p.y * sin,
        center.y + p.x * sin + p.y * cos
      );
    });

    // Draw triangle using lines
    for (let i = 0; i < rotatedPoints.length; i++) {
      const start = rotatedPoints[i];
      const end = rotatedPoints[(i + 1) % rotatedPoints.length];
      canvas.drawLine(start, end, color, 1);
    }
  }

  /**
   * Draw square symbol
   */
  private drawSquare(
    canvas: CanvasManager,
    center: Vector2,
    size: number,
    color: string,
    rotation: number
  ): void {
    const halfSize = size * 0.5;
    const points = [
      { x: -halfSize, y: -halfSize },
      { x: halfSize, y: -halfSize },
      { x: halfSize, y: halfSize },
      { x: -halfSize, y: halfSize },
    ];

    const rotatedPoints = points.map(p => {
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      return new Vector2(
        center.x + p.x * cos - p.y * sin,
        center.y + p.x * sin + p.y * cos
      );
    });

    // Draw square using lines
    for (let i = 0; i < rotatedPoints.length; i++) {
      const start = rotatedPoints[i];
      const end = rotatedPoints[(i + 1) % rotatedPoints.length];
      canvas.drawLine(start, end, color, 1);
    }
  }

  /**
   * Draw cross symbol
   */
  private drawCross(
    canvas: CanvasManager,
    center: Vector2,
    size: number,
    color: string,
    rotation: number
  ): void {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);

    // Horizontal line
    const h1 = new Vector2(center.x + size * cos, center.y + size * sin);
    const h2 = new Vector2(center.x - size * cos, center.y - size * sin);

    // Vertical line
    const v1 = new Vector2(center.x + size * -sin, center.y + size * cos);
    const v2 = new Vector2(center.x - size * -sin, center.y - size * cos);

    canvas.drawLine(h1, h2, color, 1);
    canvas.drawLine(v1, v2, color, 1);
  }

  /**
   * Draw diamond symbol
   */
  private drawDiamond(
    canvas: CanvasManager,
    center: Vector2,
    size: number,
    color: string,
    rotation: number
  ): void {
    const points = [
      { x: 0, y: -size }, // Top
      { x: size, y: 0 }, // Right
      { x: 0, y: size }, // Bottom
      { x: -size, y: 0 }, // Left
    ];

    const rotatedPoints = points.map(p => {
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      return new Vector2(
        center.x + p.x * cos - p.y * sin,
        center.y + p.x * sin + p.y * cos
      );
    });

    // Draw diamond using lines
    for (let i = 0; i < rotatedPoints.length; i++) {
      const start = rotatedPoints[i];
      const end = rotatedPoints[(i + 1) % rotatedPoints.length];
      canvas.drawLine(start, end, color, 1);
    }
  }

  /**
   * Draw velocity direction indicator
   */
  private drawVelocityIndicator(
    canvas: CanvasManager,
    projectile: ProjectileSymbol,
    position: Vector2,
    isHorizontal: boolean
  ): void {
    const velocity = projectile.velocity;
    const scale = 0.05; // Scale factor for velocity vector display

    let velocityEnd: Vector2;

    if (isHorizontal) {
      // Top-down view: show horizontal velocity components
      velocityEnd = new Vector2(
        position.x + velocity.x * scale,
        position.y + velocity.y * scale
      );
    } else {
      // Side view: show forward and vertical velocity
      const horizontalSpeed = Math.sqrt(
        velocity.x * velocity.x + velocity.y * velocity.y
      );
      velocityEnd = new Vector2(
        position.x + horizontalSpeed * scale,
        position.y - velocity.z * scale
      );
    }

    canvas.drawLine(position, velocityEnd, '#ffff00', 1);
  }

  /**
   * Calculate size based on projectile speed
   */
  private calculateSizeFromSpeed(speed: number): number {
    const maxSpeed = 1000; // m/s
    const ratio = Math.min(speed / maxSpeed, 1);
    return (
      this._options.minSize +
      (this._options.maxSize - this._options.minSize) * ratio
    );
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
   * Get rendering options
   */
  getOptions(): ProjectileRenderOptions {
    return { ...this._options };
  }

  /**
   * Update rendering options
   */
  setOptions(options: Partial<ProjectileRenderOptions>): void {
    this._options = { ...this._options, ...options };
  }

  /**
   * Get number of active projectiles
   */
  getProjectileCount(): number {
    return this._projectiles.size;
  }

  /**
   * Get active projectiles count
   */
  getActiveProjectileCount(): number {
    return Array.from(this._projectiles.values()).filter(p => p.isActive)
      .length;
  }

  /**
   * Clear all projectiles
   */
  clearAll(): void {
    this._projectiles.clear();
  }

  /**
   * Get projectile by ID
   */
  getProjectile(id: string): ProjectileSymbol | null {
    return this._projectiles.get(id) || null;
  }

  /**
   * Get all projectiles
   */
  getAllProjectiles(): ProjectileSymbol[] {
    return Array.from(this._projectiles.values());
  }
}
