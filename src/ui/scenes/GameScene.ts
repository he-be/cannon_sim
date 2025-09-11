/**
 * GameScene - Main game scene for Browser Artillery
 * Implements game screen layout and gameplay flow as per UI-04 and game system specifications
 */

import { CanvasManager } from '../../rendering/CanvasManager';
import { StageConfig } from '../../data/StageData';
import { SceneType, SceneTransition } from './TitleScene';
import { Artillery } from '../../game/entities/Artillery';
import { Target } from '../../game/entities/Target';
import { Radar } from '../../game/entities/Radar';
import { ProjectileManager } from '../../game/ProjectileManager';
import { LeadAngleCalculator } from '../../game/LeadAngleCalculator';
import { TrajectoryCalculator } from '../../game/TrajectoryCalculator';
import { CollisionDetector } from '../../physics/CollisionDetector';
import { GameLoop } from '../../core/GameLoop';
import { RadarCoordinateConverter } from '../../math/RadarCoordinateConverter';

export enum GameState {
  PLAYING = 'playing',
  PAUSED = 'paused',
  GAME_OVER = 'game_over',
  STAGE_CLEAR = 'stage_clear',
}

export interface GameSceneConfig {
  selectedStage: StageConfig;
}

/**
 * GameScene handles the main gameplay
 * Implements UI-04: 3-pane layout and all game system requirements
 */
export class GameScene {
  private canvasManager: CanvasManager;
  private onSceneTransition: (transition: SceneTransition) => void;
  private config: GameSceneConfig;

  // Game entities
  private artillery!: Artillery;
  private targets: Target[] = [];
  private radar!: Radar;
  private projectileManager!: ProjectileManager;

  // Game systems
  private leadCalculator!: LeadAngleCalculator;
  // @ts-expect-error - Reserved for future trajectory prediction features
  private _trajectoryCalculator!: TrajectoryCalculator;
  private collisionDetector!: CollisionDetector;
  private gameLoop!: GameLoop;

  // Game state
  private gameState: GameState = GameState.PLAYING;
  private startTime: number = 0;
  private gameTime: number = 0;

  // UI state
  private azimuthAngle: number = 0;
  private elevationAngle: number = 45;
  private lockedTarget: Target | null = null;

  // Radar control state
  private radarAzimuth: number = 0; // Current radar direction
  private radarRangeCursor: number = 10000; // Distance cursor position (meters)
  private isMouseDragging: boolean = false;
  private lastMousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private mouseSensitivity: number = 0.1; // degrees per pixel

  constructor(
    canvasManager: CanvasManager,
    onSceneTransition: (transition: SceneTransition) => void,
    config: GameSceneConfig
  ) {
    this.canvasManager = canvasManager;
    this.onSceneTransition = onSceneTransition;
    this.config = config;

    this.initializeGame();
    this.setupEventListeners();
  }

  /**
   * Initialize game entities and systems
   */
  private initializeGame(): void {
    // Initialize artillery at stage position
    this.artillery = new Artillery(this.config.selectedStage.artilleryPosition);

    // Initialize targets from stage config
    this.targets = this.config.selectedStage.targets.map(
      target => new Target(target.position, target.type, target.velocity)
    );

    // Initialize radar
    this.radar = new Radar(this.config.selectedStage.artilleryPosition);

    // Initialize game systems
    this.projectileManager = new ProjectileManager();
    this.leadCalculator = new LeadAngleCalculator();
    this._trajectoryCalculator = new TrajectoryCalculator();
    this.collisionDetector = new CollisionDetector();

    // Initialize game loop
    this.gameLoop = new GameLoop(
      deltaTime => this.update(deltaTime),
      () => this.render()
    );

    this.startTime = Date.now();
    this.gameLoop.start();
  }

  /**
   * Setup event listeners for user input
   */
  private setupEventListeners(): void {
    const canvas = this.canvasManager.getCanvas();

    // Mouse events for radar control (GS-03, GS-T01, GS-T02)
    canvas.addEventListener('mousedown', event => this.handleMouseDown(event));
    canvas.addEventListener('mousemove', event => this.handleMouseMove(event));
    canvas.addEventListener('mouseup', () => this.handleMouseUp());
    canvas.addEventListener('wheel', event => this.handleWheel(event));
    canvas.addEventListener('contextmenu', event => event.preventDefault()); // Disable right-click menu

    // Keyboard events
    window.addEventListener('keydown', event => this.handleKeyDown(event));
  }

  /**
   * Update game state
   */
  private update(deltaTime: number): void {
    if (this.gameState !== GameState.PLAYING) return;

    this.gameTime = (Date.now() - this.startTime) / 1000;

    // Update targets
    this.targets.forEach(target => {
      target.update(deltaTime);

      // Check game over condition (GS-10)
      if (target.position.y <= this.config.selectedStage.artilleryPosition.y) {
        this.gameState = GameState.GAME_OVER;
        this.gameLoop.stop();
        return;
      }
    });

    // Update projectiles
    this.projectileManager.update();

    // Update radar scanning
    this.radar.scan(this.targets);

    // Check collisions (GS-08, GS-09)
    this.checkCollisions();

    // Check stage clear condition
    if (this.targets.every(target => target.isDestroyed)) {
      this.gameState = GameState.STAGE_CLEAR;
      this.gameLoop.stop();
    }
  }

  /**
   * Check collisions between projectiles and targets
   */
  private checkCollisions(): void {
    const projectiles = this.projectileManager.getActiveProjectiles();

    projectiles.forEach(projectile => {
      this.targets.forEach(target => {
        if (
          !target.isDestroyed &&
          this.collisionDetector.checkCollision(projectile, target)
        ) {
          // Hit detected (GS-08)
          target.destroy();
          projectile.markAsTargetHit();

          // Unlock target if it was locked (GS-09)
          if (this.lockedTarget === target) {
            this.lockedTarget = null;
          }
        }
      });
    });
  }

  /**
   * Render the game screen
   * Implements UI-04: 3-pane layout
   */
  render(): void {
    // Update HTML control panel elements
    this.updateControlPanel();

    // Render horizontal radar (center pane)
    this.renderHorizontalRadar();

    // Render vertical radar (right pane)
    this.renderVerticalRadar();

    // Render game state overlays
    this.renderGameStateOverlay();
  }

  /**
   * Update HTML control panel elements
   */
  private updateControlPanel(): void {
    // Update azimuth display
    const azimuthValue = document.getElementById('azimuth-value');
    if (azimuthValue) {
      azimuthValue.textContent = `${this.azimuthAngle.toFixed(1)}°`;
    }

    // Update elevation display
    const elevationValue = document.getElementById('elevation-value');
    if (elevationValue) {
      elevationValue.textContent = `${this.elevationAngle.toFixed(1)}°`;
    }

    // Update lead angle display
    const leadAzimuth = document.getElementById('lead-azimuth');
    const leadElevation = document.getElementById('lead-elevation');

    if (this.lockedTarget) {
      const leadAngle = this.leadCalculator.calculateLeadAngle(
        this.artillery.position,
        this.lockedTarget.position,
        this.lockedTarget.velocity
      );

      if (leadAngle && leadAzimuth && leadElevation) {
        leadAzimuth.textContent = `${leadAngle.azimuth.toFixed(1)}`;
        leadElevation.textContent = `${leadAngle.elevation.toFixed(1)}`;
      }
    } else {
      if (leadAzimuth) leadAzimuth.textContent = '---';
      if (leadElevation) leadElevation.textContent = '---';
    }

    // Update target info
    this.updateTargetInfo();

    // Update game time
    const gameTimeElement = document.getElementById('game-time');
    if (gameTimeElement) {
      const minutes = Math.floor(this.gameTime / 60);
      const seconds = Math.floor(this.gameTime % 60);
      gameTimeElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Update target information display
   */
  private updateTargetInfo(): void {
    const targetStatus = document.getElementById('target-status');
    const targetType = document.getElementById('target-type');
    const targetRange = document.getElementById('target-range');
    const targetSpeed = document.getElementById('target-speed');
    const targetAltitude = document.getElementById('target-altitude');

    if (this.lockedTarget) {
      if (targetStatus) {
        targetStatus.textContent = 'LOCKED ON';
        targetStatus.className = 'info-value status-locked';
      }
      if (targetType) targetType.textContent = this.lockedTarget.type;
      if (targetRange)
        targetRange.textContent = `${this.lockedTarget.distanceFrom(this.artillery.position).toFixed(0)} m`;
      if (targetSpeed)
        targetSpeed.textContent = `${this.lockedTarget.speed.toFixed(1)} m/s`;
      if (targetAltitude)
        targetAltitude.textContent = `${this.lockedTarget.altitude.toFixed(0)} m`;
    } else {
      if (targetStatus) {
        targetStatus.textContent = 'NO TARGET';
        targetStatus.className = 'info-value status-no-target';
      }
      if (targetType) targetType.textContent = '---';
      if (targetRange) targetRange.textContent = '--- m';
      if (targetSpeed) targetSpeed.textContent = '--- m/s';
      if (targetAltitude) targetAltitude.textContent = '--- m';
    }
  }

  /**
   * Render center pane: Horizontal Radar (UI-11 to UI-14)
   */
  private renderHorizontalRadar(): void {
    const horizontalRadarCanvas = document.getElementById(
      'horizontal-radar-ui'
    ) as HTMLCanvasElement;
    if (!horizontalRadarCanvas) return;

    const ctx = horizontalRadarCanvas.getContext('2d');
    if (!ctx) return;

    const width = horizontalRadarCanvas.width;
    const height = horizontalRadarCanvas.height;

    // Clear canvas
    ctx.fillStyle = '#001100';
    ctx.fillRect(0, 0, width, height);

    // Draw radar grid (UI-11)
    this.drawHorizontalRadarGrid(ctx, width, height);

    // Draw targets
    this.drawTargetsOnHorizontalRadar(ctx, width, height);

    // Draw projectiles
    this.drawProjectilesOnHorizontalRadar(ctx, width, height);

    // Draw radar center line and cursor
    this.drawRadarControls(ctx, width, height);
  }

  /**
   * Draw horizontal radar grid
   */
  private drawHorizontalRadarGrid(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const centerX = width / 2;
    const gunY = height - 20;
    const maxRange = height - 40;

    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 1;

    // Draw distance lines (horizontal)
    for (let i = 1; i <= 4; i++) {
      const y = gunY - (maxRange / 4) * i;
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(width - 20, y);
      ctx.stroke();

      // Distance labels
      ctx.fillStyle = '#00ff00';
      ctx.font = '10px Consolas';
      ctx.textAlign = 'left';
      ctx.fillText(`${i * 5}km`, 2, y - 2);
    }

    // Draw bearing lines (vertical)
    const bearingRange = 120;
    const degreesPerPixel = bearingRange / (width - 40);

    for (let bearing = -60; bearing <= 60; bearing += 30) {
      const x = centerX + bearing / degreesPerPixel;
      if (x >= 20 && x <= width - 20) {
        ctx.beginPath();
        ctx.moveTo(x, 20);
        ctx.lineTo(x, gunY);
        ctx.stroke();

        // Bearing labels
        const label =
          bearing === 0 ? '0°' : `${bearing > 0 ? '+' : ''}${bearing}°`;
        ctx.fillStyle = '#00ff00';
        ctx.font = '10px Consolas';
        ctx.textAlign = 'center';
        ctx.fillText(label, x, gunY + 15);
      }
    }

    // Draw radar center line
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, 20);
    ctx.lineTo(centerX, gunY);
    ctx.stroke();

    // Draw gun position
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(centerX, gunY, 3, 0, Math.PI * 2);
    ctx.fill();

    // Gun label
    ctx.fillStyle = '#00ff00';
    ctx.font = '12px Consolas';
    ctx.textAlign = 'center';
    ctx.fillText('GUN', centerX - 15, gunY + 15);
  }

  /**
   * Draw targets on horizontal radar
   */
  private drawTargetsOnHorizontalRadar(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    this.targets.forEach(target => {
      if (!target.isDestroyed) {
        const dx = target.position.x - this.artillery.position.x;
        const dy = target.position.y - this.artillery.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= 20000) {
          // Within radar range - use new coordinate converter
          const screenPos =
            RadarCoordinateConverter.worldToHorizontalRadarScreen(
              target.position,
              this.artillery.position,
              this.radarAzimuth,
              { width, height },
              20000
            );
          const x = screenPos.x;
          const y = screenPos.y;

          // Draw target symbol
          ctx.fillStyle = '#ff0000';
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();

          // Target label
          ctx.fillStyle = '#ff0000';
          ctx.font = '10px Consolas';
          ctx.textAlign = 'center';
          ctx.fillText('TGT', x, y - 8);
        }
      }
    });
  }

  /**
   * Draw projectiles on horizontal radar
   */
  private drawProjectilesOnHorizontalRadar(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const projectiles = this.projectileManager.getActiveProjectiles();
    projectiles.forEach(projectile => {
      const dx = projectile.position.x - this.artillery.position.x;
      const dy = projectile.position.y - this.artillery.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= 20000) {
        // Use new coordinate converter for projectiles
        const screenPos = RadarCoordinateConverter.worldToHorizontalRadarScreen(
          projectile.position,
          this.artillery.position,
          this.radarAzimuth,
          { width, height },
          20000
        );
        const x = screenPos.x;
        const y = screenPos.y;

        // Draw projectile symbol
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  /**
   * Draw radar controls (center line, cursor)
   */
  private drawRadarControls(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const gunY = height - 20;
    const maxRange = height - 40;

    // Draw distance cursor (horizontal line) - UI-12
    const cursorRange = this.radarRangeCursor;
    const scale = maxRange / 20000; // 20km range
    const cursorY = gunY - cursorRange * scale;

    if (cursorY >= 20 && cursorY <= gunY) {
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(20, cursorY);
      ctx.lineTo(width - 20, cursorY);
      ctx.stroke();

      // Draw cursor range label
      ctx.fillStyle = '#ffff00';
      ctx.font = '10px Consolas';
      ctx.textAlign = 'right';
      ctx.fillText(
        `${(cursorRange / 1000).toFixed(1)}km`,
        width - 25,
        cursorY - 2
      );
    }

    // Display radar azimuth and elevation (UI-14)
    ctx.fillStyle = '#ffff00';
    ctx.font = '12px Consolas';
    ctx.textAlign = 'left';
    ctx.fillText(`Radar Az: ${this.radarAzimuth.toFixed(1)}°`, 10, 35);
    ctx.fillText(
      `Cursor Range: ${(this.radarRangeCursor / 1000).toFixed(1)}km`,
      10,
      50
    );
  }

  /**
   * Render right pane: Vertical Radar (UI-15 to UI-16)
   */
  private renderVerticalRadar(): void {
    const verticalRadarCanvas = document.getElementById(
      'vertical-radar'
    ) as HTMLCanvasElement;
    if (!verticalRadarCanvas) return;

    const ctx = verticalRadarCanvas.getContext('2d');
    if (!ctx) return;

    const width = verticalRadarCanvas.width;
    const height = verticalRadarCanvas.height;

    // Clear canvas
    ctx.fillStyle = '#001100';
    ctx.fillRect(0, 0, width, height);

    // Vertical radar grid and elements would be implemented here
    // This is a placeholder for the full radar implementation
    ctx.fillStyle = '#00ff00';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('VERTICAL RADAR', width / 2, height / 2);
  }

  /**
   * Render game state overlay (game over, stage clear)
   */
  private renderGameStateOverlay(): void {
    // Game state overlay would be implemented here
    // For now, we'll use a simple overlay on the main canvas
    const canvas = this.canvasManager.getCanvas();
    const ctx = this.canvasManager.context;

    if (this.gameState === GameState.GAME_OVER) {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 48px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);

      ctx.font = '24px monospace';
      ctx.fillText(
        'Press R to restart',
        canvas.width / 2,
        canvas.height / 2 + 60
      );
    } else if (this.gameState === GameState.STAGE_CLEAR) {
      ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#000';
      ctx.font = 'bold 48px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('STAGE CLEAR', canvas.width / 2, canvas.height / 2);

      ctx.font = '24px monospace';
      ctx.fillText(
        'Press SPACE to continue',
        canvas.width / 2,
        canvas.height / 2 + 60
      );
    }
  }

  /**
   * Handle mouse down events (GS-T04)
   */
  private handleMouseDown(event: MouseEvent): void {
    const canvas = this.canvasManager.getCanvas();
    const rect = canvas.getBoundingClientRect();

    // Calculate mouse position relative to canvas
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    this.isMouseDragging = true;
    this.lastMousePosition = { x: mouseX, y: mouseY };

    // Handle right click for target lock-on (GS-05)
    if (event.button === 2) {
      this.handleRightClick(mouseX, mouseY);
    }

    event.preventDefault();
  }

  /**
   * Handle mouse move events (GS-T01, GS-T02)
   */
  private handleMouseMove(event: MouseEvent): void {
    if (!this.isMouseDragging) return;

    const canvas = this.canvasManager.getCanvas();
    const rect = canvas.getBoundingClientRect();

    // Calculate mouse position relative to canvas
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Calculate mouse movement delta
    const deltaX = mouseX - this.lastMousePosition.x;
    const deltaY = mouseY - this.lastMousePosition.y;

    // Update radar azimuth based on horizontal mouse movement (GS-T01)
    const azimuthDelta = RadarCoordinateConverter.mouseToAzimuthDelta(
      deltaX,
      this.mouseSensitivity
    );
    this.radarAzimuth = RadarCoordinateConverter.normalizeAzimuth(
      this.radarAzimuth + azimuthDelta
    );

    // Update distance cursor based on vertical mouse movement (GS-T02)
    const maxRange = 20000; // 20km
    const canvasHeight = canvas.height;
    const rangeDelta = RadarCoordinateConverter.mouseToRangeDelta(
      deltaY,
      maxRange,
      canvasHeight
    );
    this.radarRangeCursor = Math.max(
      0,
      Math.min(maxRange, this.radarRangeCursor + rangeDelta)
    );

    // Update last mouse position
    this.lastMousePosition = { x: mouseX, y: mouseY };

    // Check for target tracking (GS-T03)
    this.updateTargetTracking();

    event.preventDefault();
  }

  /**
   * Handle mouse up events
   */
  private handleMouseUp(): void {
    this.isMouseDragging = false;
  }

  /**
   * Handle mouse wheel events (GS-T02 alternative)
   */
  private handleWheel(event: WheelEvent): void {
    const maxRange = 20000; // 20km
    const scrollSensitivity = 100; // meters per wheel tick

    // Update distance cursor based on wheel movement
    const rangeDelta =
      event.deltaY > 0 ? scrollSensitivity : -scrollSensitivity;
    this.radarRangeCursor = Math.max(
      0,
      Math.min(maxRange, this.radarRangeCursor + rangeDelta)
    );

    // Check for target tracking after cursor movement
    this.updateTargetTracking();

    event.preventDefault();
  }

  /**
   * Handle right click for target lock-on (GS-T04)
   */
  private handleRightClick(_mouseX: number, _mouseY: number): void {
    // Find target under cursor (simplified approach)
    const targetUnderCursor = this.findTargetNearCursor();

    if (targetUnderCursor) {
      // Lock onto target (GS-T04)
      this.lockedTarget = targetUnderCursor;
    } else {
      // Unlock current target
      this.lockedTarget = null;
    }
  }

  /**
   * Update target tracking state (GS-T03)
   */
  private updateTargetTracking(): void {
    // If a target is locked, update radar to follow it (GS-T05)
    if (this.lockedTarget && !this.lockedTarget.isDestroyed) {
      const targetAzimuth = RadarCoordinateConverter.calculateAzimuth(
        this.artillery.position,
        this.lockedTarget.position
      );
      this.radarAzimuth = targetAzimuth;

      // Update range cursor to target distance
      const targetDistance = this.lockedTarget.distanceFrom(
        this.artillery.position
      );
      this.radarRangeCursor = targetDistance;
    }
  }

  /**
   * Find target near cursor position
   */
  private findTargetNearCursor(): Target | null {
    const tolerance = 500; // meters

    for (const target of this.targets) {
      if (target.isDestroyed) continue;

      const targetDistance = target.distanceFrom(this.artillery.position);
      const targetAzimuth = RadarCoordinateConverter.calculateAzimuth(
        this.artillery.position,
        target.position
      );

      // Check if cursor is close to target
      const azimuthDiff = Math.abs(targetAzimuth - this.radarAzimuth);
      const rangeDiff = Math.abs(targetDistance - this.radarRangeCursor);

      if (azimuthDiff <= 10 && rangeDiff <= tolerance) {
        // 10 degrees, 500m tolerance
        return target;
      }
    }

    return null;
  }

  /**
   * Handle keyboard events
   */
  private handleKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'r':
      case 'R':
        if (this.gameState === GameState.GAME_OVER) {
          this.restartGame();
        }
        break;
      case ' ':
        if (this.gameState === GameState.STAGE_CLEAR) {
          this.onSceneTransition({ type: SceneType.STAGE_SELECT });
        }
        break;
    }
  }

  /**
   * Restart the game
   */
  private restartGame(): void {
    this.gameState = GameState.PLAYING;
    this.startTime = Date.now();
    this.lockedTarget = null;
    this.initializeGame();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.gameLoop.stop();
    // Remove event listeners
    const canvas = this.canvasManager.getCanvas();
    canvas.removeEventListener('mousedown', this.handleMouseDown);
    canvas.removeEventListener('mousemove', this.handleMouseMove);
    canvas.removeEventListener('mouseup', this.handleMouseUp);
    canvas.removeEventListener('wheel', this.handleWheel);
    window.removeEventListener('keydown', this.handleKeyDown);
  }
}
