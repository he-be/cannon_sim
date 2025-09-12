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
import {
  RadarCoordinateConverter,
  ScreenCoordinates,
} from '../../math/RadarCoordinateConverter';
import { Vector3 } from '../../math/Vector3';
import { MouseHandler, MouseEventData } from '../../input/MouseHandler';
import { ProjectileRenderer } from '../../rendering/renderers/ProjectileRenderer';
import { EffectRenderer } from '../../rendering/renderers/EffectRenderer';

export enum GameState {
  PLAYING = 'playing',
  PAUSED = 'paused',
  GAME_OVER = 'game_over',
  STAGE_CLEAR = 'stage_clear',
}

export enum TargetingState {
  NO_TARGET = 'NO_TARGET',
  TRACKING = 'TRACKING', // Target under cursor, not locked
  LOCKED_ON = 'LOCKED_ON', // Target locked with right-click
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
  private mouseHandler: MouseHandler;

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
  private projectileRenderer!: ProjectileRenderer;
  private effectRenderer!: EffectRenderer;

  // Game state
  private gameState: GameState = GameState.PLAYING;
  private startTime: number = 0;
  private gameTime: number = 0;

  // UI state
  private azimuthAngle: number = 0;
  private elevationAngle: number = 45;
  private lockedTarget: Target | null = null;

  // Targeting state management
  private targetingState: TargetingState = TargetingState.NO_TARGET;
  private trackedTarget: Target | null = null; // Target currently under cursor

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
    this.mouseHandler = new MouseHandler(this.canvasManager.getCanvas());

    this.initializeGame();
    this.setupEventListeners();
  }

  /**
   * Initialize game entities and systems
   */
  private initializeGame(): void {
    // Ensure artillery position is a Vector3 instance
    const artilleryPos = this.config.selectedStage.artilleryPosition as
      | Vector3
      | { x: number; y: number; z: number };
    const artilleryPosition =
      artilleryPos instanceof Vector3
        ? artilleryPos
        : new Vector3(artilleryPos.x, artilleryPos.y, artilleryPos.z);

    // Initialize artillery at stage position
    this.artillery = new Artillery(artilleryPosition);

    // Initialize targets from stage config with Vector3 conversion
    this.targets = this.config.selectedStage.targets.map(target => {
      const pos =
        (target.position as
          | Vector3
          | { x: number; y: number; z: number }) instanceof Vector3
          ? target.position
          : new Vector3(
              (target.position as { x: number; y: number; z: number }).x,
              (target.position as { x: number; y: number; z: number }).y,
              (target.position as { x: number; y: number; z: number }).z
            );
      const vel = target.velocity
        ? (target.velocity as
            | Vector3
            | { x: number; y: number; z: number }) instanceof Vector3
          ? target.velocity
          : new Vector3(
              (target.velocity as { x: number; y: number; z: number }).x,
              (target.velocity as { x: number; y: number; z: number }).y,
              (target.velocity as { x: number; y: number; z: number }).z
            )
        : undefined;
      return new Target(pos, target.type, vel);
    });

    // Initialize radar
    this.radar = new Radar(artilleryPosition);

    // Initialize game systems
    this.projectileManager = new ProjectileManager();
    this.leadCalculator = new LeadAngleCalculator();
    this._trajectoryCalculator = new TrajectoryCalculator();
    this.collisionDetector = new CollisionDetector();
    this.projectileRenderer = new ProjectileRenderer();
    this.effectRenderer = new EffectRenderer(this.canvasManager);

    // Initialize game loop
    this.gameLoop = new GameLoop(
      deltaTime => this.update(deltaTime),
      () => this.render()
    );

    this.startTime = Date.now();
    this.gameLoop.start();
  }

  /**
   * Setup event listeners for user input using MouseHandler
   */
  private setupEventListeners(): void {
    // Use MouseHandler for mouse events (GS-03, GS-T01, GS-T02)
    this.mouseHandler.addEventListener(this.handleMouseEvent.bind(this));

    // Wheel events still need manual handling since MouseHandler doesn't support them
    const canvas = this.canvasManager.getCanvas();
    canvas.addEventListener('wheel', event => this.handleWheel(event));
    canvas.addEventListener('contextmenu', event => event.preventDefault()); // Disable right-click menu

    // Keyboard events still handled directly
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

    // Update effects
    this.effectRenderer.update(deltaTime);

    // Update radar scanning
    this.radar.scan(this.targets);

    // Update target tracking system - automatic tracking
    this.updateTargetTracking();

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
          // Hit detected (GS-08) - Create explosion effect
          this.effectRenderer.createExplosion(
            target.position,
            'target_destruction'
          );
          target.destroy();
          projectile.markAsTargetHit();

          // Clean up targeting state if the destroyed target was being tracked (GS-09)
          if (this.lockedTarget === target) {
            this.lockedTarget = null;
            this.targetingState = TargetingState.NO_TARGET;
            this.trackedTarget = null;
          } else if (this.trackedTarget === target) {
            // If we were only tracking this target, clear tracking state
            this.trackedTarget = null;
            this.targetingState = TargetingState.NO_TARGET;
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

    // Render effects (explosions, particles)
    this.effectRenderer.render();

    // Render game state overlays
    this.renderGameStateOverlay();
  }

  /**
   * Update HTML control panel elements
   */
  private updateControlPanel(): void {
    // TR-02 Compliance: Render control panel info to Canvas instead of HTML DOM
    this.renderControlPanelToCanvas();
  }

  /**
   * Render control panel information to Canvas (TR-02 compliant)
   */
  private renderControlPanelToCanvas(): void {
    // Get or create control panel canvas
    const controlPanelCanvas = document.getElementById(
      'control-panel-canvas'
    ) as HTMLCanvasElement;
    if (!controlPanelCanvas) return;

    const ctx = controlPanelCanvas.getContext('2d');
    if (!ctx) return;

    const width = controlPanelCanvas.width;
    const height = controlPanelCanvas.height;

    // Clear canvas with console-style background
    ctx.fillStyle = '#001100';
    ctx.fillRect(0, 0, width, height);

    // Set text style for control panel
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let yPos = 20;
    const leftMargin = 20;
    const lineHeight = 25;

    // Artillery azimuth display
    ctx.fillStyle = '#00ff00';
    ctx.fillText('Azimuth:', leftMargin, yPos);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${this.azimuthAngle.toFixed(1)}°`, leftMargin + 80, yPos);
    yPos += lineHeight;

    // Artillery elevation display
    ctx.fillStyle = '#00ff00';
    ctx.fillText('Elevation:', leftMargin, yPos);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${this.elevationAngle.toFixed(1)}°`, leftMargin + 80, yPos);
    yPos += lineHeight * 1.5;

    // Lead angle display
    const calculationTarget = this.lockedTarget || this.trackedTarget;
    ctx.fillStyle = '#00ff00';
    ctx.fillText('Lead Angle:', leftMargin, yPos);
    yPos += lineHeight;

    if (calculationTarget) {
      const leadAngle = this.leadCalculator.calculateLeadAngle(
        this.artillery.position,
        calculationTarget.position,
        calculationTarget.velocity
      );

      if (leadAngle) {
        const isLocked = calculationTarget === this.lockedTarget;
        const color = isLocked ? '#ff0000' : '#ffff00';

        ctx.fillStyle = color;
        ctx.fillText(
          `Az: ${leadAngle.azimuth.toFixed(1)}°`,
          leftMargin + 20,
          yPos
        );
        yPos += lineHeight;
        ctx.fillText(
          `El: ${leadAngle.elevation.toFixed(1)}°`,
          leftMargin + 20,
          yPos
        );
      } else {
        ctx.fillStyle = '#666666';
        ctx.fillText('Az: ---°', leftMargin + 20, yPos);
        yPos += lineHeight;
        ctx.fillText('El: ---°', leftMargin + 20, yPos);
      }
    } else {
      ctx.fillStyle = '#666666';
      ctx.fillText('Az: ---°', leftMargin + 20, yPos);
      yPos += lineHeight;
      ctx.fillText('El: ---°', leftMargin + 20, yPos);
    }
    yPos += lineHeight;

    // Game time display
    ctx.fillStyle = '#00ff00';
    ctx.fillText('Game Time:', leftMargin, yPos);
    const minutes = Math.floor(this.gameTime / 60);
    const seconds = Math.floor(this.gameTime % 60);
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(timeStr, leftMargin + 80, yPos);
    yPos += lineHeight * 1.5;

    // Radar information
    ctx.fillStyle = '#00ff00';
    ctx.fillText('Radar Az:', leftMargin, yPos);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${this.radarAzimuth.toFixed(1)}°`, leftMargin + 80, yPos);
    yPos += lineHeight;

    ctx.fillStyle = '#00ff00';
    ctx.fillText('Range:', leftMargin, yPos);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(
      `${(this.radarRangeCursor / 1000).toFixed(1)}km`,
      leftMargin + 80,
      yPos
    );
    yPos += lineHeight;

    // Targeting mode display
    ctx.fillStyle = '#00ff00';
    ctx.fillText('Targeting:', leftMargin, yPos);

    let modeText = 'MANUAL';
    let modeColor = '#00ff00';

    switch (this.targetingState) {
      case TargetingState.LOCKED_ON:
        modeText = 'AUTO TRACK';
        modeColor = '#ff0000';
        break;
      case TargetingState.TRACKING:
        modeText = 'ACQUIRING';
        modeColor = '#ffff00';
        break;
    }

    ctx.fillStyle = modeColor;
    ctx.fillText(modeText, leftMargin + 80, yPos);
    yPos += lineHeight * 1.5;

    // Target information
    this.renderTargetInfoToCanvas(ctx, leftMargin, yPos, lineHeight);
  }

  /**
   * Render target information to Canvas (TR-02 compliant)
   */
  private renderTargetInfoToCanvas(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    lineHeight: number
  ): void {
    const displayTarget = this.lockedTarget || this.trackedTarget;

    // Target status header
    ctx.fillStyle = '#00ff00';
    ctx.fillText('Target Info:', x, y);
    y += lineHeight;

    if (displayTarget) {
      // Target status
      let statusText = 'NO TARGET';
      let statusColor = '#666666';

      switch (this.targetingState) {
        case TargetingState.LOCKED_ON:
          statusText = 'LOCKED ON';
          statusColor = '#ff0000';
          break;
        case TargetingState.TRACKING:
          statusText = 'TRACKING';
          statusColor = '#ffff00';
          break;
      }

      ctx.fillStyle = '#00ff00';
      ctx.fillText('Status:', x, y);
      ctx.fillStyle = statusColor;
      ctx.fillText(statusText, x + 60, y);
      y += lineHeight;

      // Target type
      const typeColor =
        displayTarget === this.lockedTarget ? '#ff0000' : '#ffff00';
      ctx.fillStyle = '#00ff00';
      ctx.fillText('Type:', x, y);
      ctx.fillStyle = typeColor;
      ctx.fillText(displayTarget.type, x + 60, y);
      y += lineHeight;

      // Target range
      const currentRange = displayTarget.distanceFrom(this.artillery.position);
      let rangeColor = '#00ff00'; // Long range - green
      if (currentRange < 5000) {
        rangeColor = '#ff0000'; // Close range - red
      } else if (currentRange < 15000) {
        rangeColor = '#ffff00'; // Medium range - yellow
      }

      ctx.fillStyle = '#00ff00';
      ctx.fillText('Range:', x, y);
      ctx.fillStyle = rangeColor;
      ctx.fillText(`${currentRange.toFixed(0)} m`, x + 60, y);
      y += lineHeight;

      // Target speed
      const currentSpeed = displayTarget.speed;
      let speedColor = '#00ff00'; // Slow - easier target
      if (currentSpeed > 200) {
        speedColor = '#ff0000'; // Fast - high threat
      } else if (currentSpeed > 50) {
        speedColor = '#ffff00'; // Medium speed
      }

      ctx.fillStyle = '#00ff00';
      ctx.fillText('Speed:', x, y);
      ctx.fillStyle = speedColor;
      ctx.fillText(`${currentSpeed.toFixed(1)} m/s`, x + 60, y);
      y += lineHeight;

      // Target altitude
      const currentAltitude = displayTarget.altitude;
      ctx.fillStyle = '#00ff00';
      ctx.fillText('Altitude:', x, y);
      ctx.fillStyle = '#00ff00';
      ctx.fillText(`${currentAltitude.toFixed(0)} m`, x + 60, y);
      y += lineHeight;

      // Additional target details
      this.renderAdditionalTargetDetailsToCanvas(
        ctx,
        x,
        y,
        lineHeight,
        displayTarget
      );
    } else {
      // No target - show placeholder
      ctx.fillStyle = '#666666';
      ctx.fillText('Status: NO TARGET', x, y);
      y += lineHeight;
      ctx.fillText('Type: ---', x, y);
      y += lineHeight;
      ctx.fillText('Range: --- m', x, y);
      y += lineHeight;
      ctx.fillText('Speed: --- m/s', x, y);
      y += lineHeight;
      ctx.fillText('Altitude: --- m', x, y);
    }
  }

  /**
   * Render additional target details to Canvas (TR-02 compliant)
   */
  private renderAdditionalTargetDetailsToCanvas(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    lineHeight: number,
    target: Target
  ): void {
    // Target bearing
    const bearing = RadarCoordinateConverter.calculateAzimuth(
      this.artillery.position,
      target.position
    );
    ctx.fillStyle = '#00ff00';
    ctx.fillText('Bearing:', x, y);
    ctx.fillStyle = '#00ff00';
    ctx.fillText(`${bearing.toFixed(1)}°`, x + 60, y);
    y += lineHeight;

    // Time to intercept estimation
    const range = target.distanceFrom(this.artillery.position);
    const muzzleVelocity = 850; // m/s - from ammunition display
    const estimatedTTI = range / muzzleVelocity;

    let ttiText: string;
    if (estimatedTTI < 60) {
      ttiText = `${estimatedTTI.toFixed(1)}s`;
    } else {
      ttiText = `${(estimatedTTI / 60).toFixed(1)}m`;
    }

    let ttiColor = '#00ff00'; // Plenty of time
    if (estimatedTTI < 10) {
      ttiColor = '#ff0000'; // Critical - very fast engagement needed
    } else if (estimatedTTI < 30) {
      ttiColor = '#ffff00'; // Moderate time
    }

    ctx.fillStyle = '#00ff00';
    ctx.fillText('TTI:', x, y);
    ctx.fillStyle = ttiColor;
    ctx.fillText(ttiText, x + 60, y);
    y += lineHeight;

    // Target heading if available
    if (target.velocity) {
      const heading =
        Math.atan2(target.velocity.x, target.velocity.y) * (180 / Math.PI);
      const normalizedHeading = heading < 0 ? heading + 360 : heading;

      ctx.fillStyle = '#00ff00';
      ctx.fillText('Heading:', x, y);
      ctx.fillStyle = '#00ff00';
      ctx.fillText(`${normalizedHeading.toFixed(0)}°`, x + 60, y);
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

          // Draw target with state-based visual feedback
          this.drawTargetWithState(ctx, x, y, target);
        }
      }
    });
  }

  /**
   * Draw projectiles on horizontal radar
   */
  private drawProjectilesOnHorizontalRadar(
    _ctx: CanvasRenderingContext2D,
    _width: number,
    _height: number
  ): void {
    // Update projectiles in renderer and delegate rendering
    const projectiles = this.projectileManager.getActiveProjectiles();
    projectiles.forEach((projectile, index) => {
      this.projectileRenderer.updateProjectile(
        `projectile-${index}`,
        projectile.position,
        projectile.velocity,
        {
          color: '#ffff00',
          size: 2,
          isActive: true,
        }
      );
    });

    // Use ProjectileRenderer for consistent rendering
    this.projectileRenderer.renderOnHorizontalRadar(this.canvasManager);
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

    // Draw vertical radar grid (UI-15)
    this.drawVerticalRadarGrid(ctx, width, height);

    // Draw targets on vertical radar
    this.drawTargetsOnVerticalRadar(ctx, width, height);

    // Draw projectiles on vertical radar
    this.drawProjectilesOnVerticalRadar(ctx, width, height);

    // Draw altitude markers and information
    this.drawVerticalRadarInfo(ctx, width, height);
  }

  /**
   * Draw vertical radar grid (UI-15)
   */
  private drawVerticalRadarGrid(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const gunX = 20; // Gun position (left side)
    const groundY = height - 20; // Ground level

    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 1;

    // Draw range lines (vertical)
    for (let i = 1; i <= 4; i++) {
      const x = gunX + ((width - 40) / 4) * i;
      ctx.beginPath();
      ctx.moveTo(x, 20);
      ctx.lineTo(x, groundY);
      ctx.stroke();

      // Range labels
      ctx.fillStyle = '#00ff00';
      ctx.font = '10px Consolas';
      ctx.textAlign = 'center';
      ctx.fillText(`${i * 5}km`, x, groundY + 15);
    }

    // Draw altitude lines (horizontal)
    for (let i = 1; i <= 4; i++) {
      const y = groundY - ((height - 40) / 4) * i;
      ctx.beginPath();
      ctx.moveTo(gunX, y);
      ctx.lineTo(width - 20, y);
      ctx.stroke();

      // Altitude labels
      ctx.fillStyle = '#00ff00';
      ctx.font = '10px Consolas';
      ctx.textAlign = 'left';
      ctx.fillText(`${i * 250}m`, 2, y - 2);
    }

    // Draw ground line
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(gunX, groundY);
    ctx.lineTo(width - 20, groundY);
    ctx.stroke();

    // Draw gun position
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(gunX, groundY, 3, 0, Math.PI * 2);
    ctx.fill();

    // Gun label
    ctx.fillStyle = '#00ff00';
    ctx.font = '12px Consolas';
    ctx.textAlign = 'left';
    ctx.fillText('GUN', gunX - 5, groundY + 15);
  }

  /**
   * Draw targets on vertical radar
   */
  private drawTargetsOnVerticalRadar(
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
          // Use coordinate converter for vertical radar
          const screenPos = RadarCoordinateConverter.worldToVerticalRadarScreen(
            target.position,
            this.artillery.position,
            this.radarAzimuth,
            { width, height },
            20000
          );

          // Only draw if within screen bounds
          if (
            screenPos.x >= 20 &&
            screenPos.x <= width - 20 &&
            screenPos.y >= 20 &&
            screenPos.y <= height - 20
          ) {
            // Draw target with state-based feedback (smaller than horizontal radar)
            this.drawTargetWithStateVertical(
              ctx,
              screenPos.x,
              screenPos.y,
              target
            );
          }
        }
      }
    });
  }

  /**
   * Draw projectiles on vertical radar
   */
  private drawProjectilesOnVerticalRadar(
    _ctx: CanvasRenderingContext2D,
    _width: number,
    _height: number
  ): void {
    // Update projectiles in renderer and delegate rendering
    const projectiles = this.projectileManager.getActiveProjectiles();
    projectiles.forEach((projectile, index) => {
      this.projectileRenderer.updateProjectile(
        `projectile-${index}`,
        projectile.position,
        projectile.velocity,
        {
          color: '#ffff00',
          size: 1.5,
          isActive: true,
        }
      );
    });

    // Use ProjectileRenderer for consistent rendering
    this.projectileRenderer.renderOnVerticalRadar(this.canvasManager);
  }

  /**
   * Draw vertical radar information and markers
   */
  private drawVerticalRadarInfo(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    // Draw radar beam indicator
    const beamWidth = 30; // pixels
    const centerX = 20 + (width - 40) * 0.5;

    ctx.fillStyle = 'rgba(255, 255, 0, 0.1)';
    ctx.fillRect(centerX - beamWidth / 2, 20, beamWidth, height - 40);

    // Draw elevation angle indicator if there's a locked target
    if (this.lockedTarget) {
      const targetElevation = this.calculateTargetElevation(this.lockedTarget);

      // Draw elevation line
      const elevationY = height - 20 - (targetElevation / 90) * (height - 40);
      if (elevationY >= 20 && elevationY <= height - 20) {
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(20, elevationY);
        ctx.lineTo(width - 20, elevationY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Elevation label
        ctx.fillStyle = '#ff0000';
        ctx.font = '10px Consolas';
        ctx.textAlign = 'right';
        ctx.fillText(
          `${targetElevation.toFixed(1)}°`,
          width - 25,
          elevationY - 2
        );
      }
    }

    // Display vertical radar information
    ctx.fillStyle = '#ffff00';
    ctx.font = '12px Consolas';
    ctx.textAlign = 'left';
    ctx.fillText(`Vertical Radar Az: ${this.radarAzimuth.toFixed(1)}°`, 10, 35);

    if (this.lockedTarget) {
      const elevation = this.calculateTargetElevation(this.lockedTarget);
      ctx.fillText(`Target Elevation: ${elevation.toFixed(1)}°`, 10, 50);
    }
  }

  /**
   * Draw target with state-based visual feedback for vertical radar
   */
  private drawTargetWithStateVertical(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    target: Target
  ): void {
    let fillColor = '#ff0000';
    let strokeColor = '#ff0000';
    let labelText = 'T';
    let symbolRadius = 3; // Smaller for vertical radar

    // Determine target state and apply visual feedback
    if (target === this.lockedTarget) {
      fillColor = '#ffff00';
      strokeColor = '#ffffff';
      labelText = 'L';
      symbolRadius = 4;

      // Draw smaller lock-on indicator
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.stroke();

      // Draw cross-hairs
      ctx.beginPath();
      ctx.moveTo(x - 5, y);
      ctx.lineTo(x + 5, y);
      ctx.moveTo(x, y - 5);
      ctx.lineTo(x, y + 5);
      ctx.stroke();
    } else if (
      target === this.trackedTarget &&
      this.targetingState === TargetingState.TRACKING
    ) {
      fillColor = '#ff8800';
      strokeColor = '#ffaa00';
      labelText = 'T';
      symbolRadius = 3.5;

      // Draw tracking indicator
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw main target symbol
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.arc(x, y, symbolRadius, 0, Math.PI * 2);
    ctx.fill();

    // Draw target border
    if (target === this.trackedTarget || target === this.lockedTarget) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, symbolRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw smaller target label
    ctx.fillStyle = fillColor;
    ctx.font = '8px Consolas';
    ctx.textAlign = 'center';
    ctx.fillText(labelText, x, y - 8);
  }

  /**
   * Calculate target elevation angle
   */
  private calculateTargetElevation(target: Target): number {
    const dx = target.position.x - this.artillery.position.x;
    const dy = target.position.y - this.artillery.position.y;
    const horizontalDistance = Math.sqrt(dx * dx + dy * dy);
    const verticalDistance = target.position.z - this.artillery.position.z;

    const elevationRad = Math.atan2(verticalDistance, horizontalDistance);
    const elevationDeg = elevationRad * (180 / Math.PI);

    return Math.max(0, Math.min(90, elevationDeg));
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
   * Handle all mouse events through MouseHandler (GS-T01, GS-T02, GS-T04)
   */
  private handleMouseEvent(event: MouseEventData): void {
    switch (event.type) {
      case 'mousedown':
        this.handleMouseDownEvent(event);
        break;
      case 'mousemove':
        this.handleMouseMoveEvent(event);
        break;
      case 'mouseup':
        this.handleMouseUpEvent(event);
        break;
      case 'click':
        if (event.button === 2) {
          // Right click for target lock-on (GS-T04)
          this.handleRightClickEvent(event);
        }
        break;
    }
  }

  /**
   * Handle mouse down events (GS-T04)
   */
  private handleMouseDownEvent(event: MouseEventData): void {
    this.isMouseDragging = true;
    this.lastMousePosition = {
      x: event.position.canvas.x,
      y: event.position.canvas.y,
    };
  }

  /**
   * Handle mouse move events (GS-T01, GS-T02)
   */
  private handleMouseMoveEvent(event: MouseEventData): void {
    if (!this.isMouseDragging) return;

    // Calculate mouse movement delta
    const deltaX = event.position.canvas.x - this.lastMousePosition.x;
    const deltaY = event.position.canvas.y - this.lastMousePosition.y;

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
    const canvasHeight = this.canvasManager.getCanvas().height;
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
    this.lastMousePosition = {
      x: event.position.canvas.x,
      y: event.position.canvas.y,
    };

    // Check for target tracking (GS-T03)
    this.updateTargetTracking();
  }

  /**
   * Handle mouse up events
   */
  private handleMouseUpEvent(_event: MouseEventData): void {
    this.isMouseDragging = false;
  }

  /**
   * Handle right click for target lock-on (GS-T04)
   */
  private handleRightClickEvent(_event: MouseEventData): void {
    // Find target under cursor using improved collision detection
    const targetUnderCursor = this.findTargetNearCursor();

    if (targetUnderCursor) {
      // Check if we're clicking on the same target that's already locked
      if (this.lockedTarget === targetUnderCursor) {
        // Unlock current target (toggle behavior)
        this.lockedTarget = null;
        this.targetingState = TargetingState.NO_TARGET;
        this.trackedTarget = null;
      } else {
        // Lock onto new target (GS-T04)
        this.lockedTarget = targetUnderCursor;
        this.targetingState = TargetingState.LOCKED_ON;
        this.trackedTarget = targetUnderCursor;

        // Immediately update radar to track the locked target
        this.updateRadarToTrackTarget(targetUnderCursor);
      }
    } else {
      // Right-click in empty space unlocks current target
      if (this.lockedTarget) {
        this.lockedTarget = null;
        this.targetingState = TargetingState.NO_TARGET;
        this.trackedTarget = null;
      }
    }
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
   * Update radar to immediately track a target (for lock-on)
   */
  private updateRadarToTrackTarget(target: Target): void {
    // Calculate target azimuth
    const targetAzimuth = RadarCoordinateConverter.calculateAzimuth(
      this.artillery.position,
      target.position
    );
    this.radarAzimuth = targetAzimuth;

    // Update range cursor to target distance
    const targetDistance = target.distanceFrom(this.artillery.position);
    this.radarRangeCursor = targetDistance;
  }

  /**
   * Update target tracking state (GS-T03)
   */
  private updateTargetTracking(): void {
    // If a target is locked, continuously update radar to follow it (GS-T05)
    if (this.lockedTarget && !this.lockedTarget.isDestroyed) {
      // Automatic continuous tracking for locked targets
      const targetAzimuth = RadarCoordinateConverter.calculateAzimuth(
        this.artillery.position,
        this.lockedTarget.position
      );
      this.radarAzimuth = targetAzimuth;

      // Update range cursor to target distance for real-time tracking
      const targetDistance = this.lockedTarget.distanceFrom(
        this.artillery.position
      );
      this.radarRangeCursor = targetDistance;

      // Maintain locked state
      this.targetingState = TargetingState.LOCKED_ON;
      this.trackedTarget = this.lockedTarget;
    } else {
      // Clean up if locked target was destroyed
      if (this.lockedTarget && this.lockedTarget.isDestroyed) {
        this.lockedTarget = null;
      }

      // Check for target under cursor for TRACKING state (GS-T03)
      const targetUnderCursor = this.findTargetNearCursor();

      if (targetUnderCursor) {
        this.targetingState = TargetingState.TRACKING;
        this.trackedTarget = targetUnderCursor;
      } else {
        this.targetingState = TargetingState.NO_TARGET;
        this.trackedTarget = null;
      }
    }
  }

  /**
   * Draw target with state-based visual feedback (GS-T03)
   */
  private drawTargetWithState(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    target: Target
  ): void {
    let fillColor = '#ff0000'; // Default red
    let strokeColor = '#ff0000';
    let labelText = 'TGT';
    let symbolRadius = 4;

    // Determine target state and apply visual feedback
    if (target === this.lockedTarget) {
      // LOCKED ON state - bright yellow with pulsing effect
      fillColor = '#ffff00';
      strokeColor = '#ffffff';
      labelText = 'LOCK';
      symbolRadius = 6;

      // Draw lock-on reticle
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.stroke();

      // Draw cross-hairs
      ctx.beginPath();
      ctx.moveTo(x - 8, y);
      ctx.lineTo(x + 8, y);
      ctx.moveTo(x, y - 8);
      ctx.lineTo(x, y + 8);
      ctx.stroke();
    } else if (
      target === this.trackedTarget &&
      this.targetingState === TargetingState.TRACKING
    ) {
      // TRACKING state - orange with highlight
      fillColor = '#ff8800';
      strokeColor = '#ffaa00';
      labelText = 'TRCK';
      symbolRadius = 5;

      // Draw tracking indicator
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw main target symbol
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.arc(x, y, symbolRadius, 0, Math.PI * 2);
    ctx.fill();

    // Draw target border
    if (target === this.trackedTarget || target === this.lockedTarget) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, symbolRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw target label
    ctx.fillStyle = fillColor;
    ctx.font = '10px Consolas';
    ctx.textAlign = 'center';
    ctx.fillText(labelText, x, y - 10);
  }

  /**
   * Calculate cursor screen position on horizontal radar
   */
  private calculateCursorScreenPosition(
    width: number,
    height: number,
    maxRange: number
  ): ScreenCoordinates {
    const centerX = width / 2;
    const gunY = height - 20;
    const maxRenderRange = height - 40;
    const scale = maxRenderRange / maxRange;

    // Distance cursor position
    const cursorY = gunY - this.radarRangeCursor * scale;

    // Cursor is always at center X (radar center line)
    return { x: centerX, y: cursorY };
  }

  private findTargetNearCursor(): Target | null {
    // Get horizontal radar canvas for coordinate calculations
    const horizontalRadarCanvas = document.getElementById(
      'horizontal-radar-ui'
    ) as HTMLCanvasElement;
    if (!horizontalRadarCanvas) return null;

    const width = horizontalRadarCanvas.width;
    const height = horizontalRadarCanvas.height;
    const maxRange = 20000; // 20km radar range

    // Calculate cursor screen position
    const cursorScreenPos = this.calculateCursorScreenPosition(
      width,
      height,
      maxRange
    );

    let closestTarget: Target | null = null;
    let closestDistance = Infinity;
    const screenTolerance = 15; // pixels

    for (const target of this.targets) {
      if (target.isDestroyed) continue;

      const dx = target.position.x - this.artillery.position.x;
      const dy = target.position.y - this.artillery.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Only consider targets within radar range
      if (distance <= maxRange) {
        // Convert target position to screen coordinates
        const targetScreenPos =
          RadarCoordinateConverter.worldToHorizontalRadarScreen(
            target.position,
            this.artillery.position,
            this.radarAzimuth,
            { width, height },
            maxRange
          );

        // Check if target is within screen tolerance of cursor
        if (
          RadarCoordinateConverter.isTargetUnderCursor(
            targetScreenPos,
            cursorScreenPos,
            screenTolerance
          )
        ) {
          // Find the closest target if multiple are under cursor
          const screenDistance = Math.sqrt(
            Math.pow(targetScreenPos.x - cursorScreenPos.x, 2) +
              Math.pow(targetScreenPos.y - cursorScreenPos.y, 2)
          );

          if (screenDistance < closestDistance) {
            closestDistance = screenDistance;
            closestTarget = target;
          }
        }
      }
    }

    return closestTarget;
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
    // Cleanup MouseHandler
    this.mouseHandler.destroy();
    // Remove manual event listeners
    const canvas = this.canvasManager.getCanvas();
    canvas.removeEventListener('wheel', this.handleWheel);
    window.removeEventListener('keydown', this.handleKeyDown);
  }
}
