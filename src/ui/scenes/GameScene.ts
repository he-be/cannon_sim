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
  private trajectoryCalculator!: TrajectoryCalculator;
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
    this.trajectoryCalculator = new TrajectoryCalculator();
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
    this.projectileManager.update(deltaTime);

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
    const ctx = this.canvasManager.context;
    const canvas = this.canvasManager.getCanvas();

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Render 3-pane layout
    this.renderControlPanel(ctx, canvas);
    this.renderHorizontalRadar(ctx, canvas);
    this.renderVerticalRadarAndTargetInfo(ctx, canvas);

    // Render game state overlays
    this.renderGameStateOverlay(ctx, canvas);
  }

  /**
   * Render left pane: Control Panel (UI-05 to UI-10)
   */
  private renderControlPanel(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement
  ): void {
    const panelWidth = canvas.width * 0.25;
    const panelHeight = canvas.height;

    // Panel background
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, panelWidth, panelHeight);
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, panelWidth, panelHeight);

    // Title
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CONTROL PANEL', panelWidth / 2, 30);

    let y = 60;

    // Azimuth control (UI-05)
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ccc';
    ctx.font = '12px monospace';
    ctx.fillText('Azimuth:', 10, y);
    ctx.fillStyle = '#00ff00';
    ctx.fillText(`${this.azimuthAngle.toFixed(1)}°`, 10, y + 15);

    // Elevation control (UI-05)
    y += 40;
    ctx.fillStyle = '#ccc';
    ctx.fillText('Elevation:', 10, y);
    ctx.fillStyle = '#00ff00';
    ctx.fillText(`${this.elevationAngle.toFixed(1)}°`, 10, y + 15);

    // Lead angle display (UI-06)
    if (this.lockedTarget) {
      const leadAngle = this.leadCalculator.calculateLeadAngle(
        this.artillery.position,
        this.lockedTarget.position,
        this.lockedTarget.velocity
      );

      if (leadAngle) {
        y += 40;
        ctx.fillStyle = '#ccc';
        ctx.fillText('Lead Az:', 10, y);
        ctx.fillStyle = '#ffff00';
        ctx.fillText(`${leadAngle.azimuth.toFixed(1)}°`, 10, y + 15);

        y += 25;
        ctx.fillStyle = '#ccc';
        ctx.fillText('Lead El:', 10, y);
        ctx.fillStyle = '#ffff00';
        ctx.fillText(`${leadAngle.elevation.toFixed(1)}°`, 10, y + 15);
      }
    }

    // Ammunition display (UI-10)
    y += 40;
    ctx.fillStyle = '#ccc';
    ctx.fillText('Projectile:', 10, y);
    ctx.fillStyle = '#00ff00';
    ctx.fillText('HE 850m/s', 10, y + 15);

    // Fire button (UI-07)
    y += 40;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(10, y, panelWidth - 20, 30);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText('FIRE', panelWidth / 2, y + 20);

    // Unlock button (UI-08)
    y += 40;
    ctx.fillStyle = '#666';
    ctx.fillRect(10, y, panelWidth - 20, 25);
    ctx.fillStyle = '#fff';
    ctx.fillText('UNLOCK', panelWidth / 2, y + 16);

    // Game time (UI-09)
    y += 40;
    ctx.fillStyle = '#ccc';
    ctx.font = '12px monospace';
    ctx.fillText('Time:', 10, y);
    ctx.fillStyle = '#00ff00';
    const minutes = Math.floor(this.gameTime / 60);
    const seconds = Math.floor(this.gameTime % 60);
    ctx.fillText(
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
      10,
      y + 15
    );
  }

  /**
   * Render center pane: Horizontal Radar (UI-11 to UI-14)
   */
  private renderHorizontalRadar(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement
  ): void {
    const radarX = canvas.width * 0.25;
    const radarWidth = canvas.width * 0.5;
    const radarHeight = canvas.height;

    // Radar background
    ctx.fillStyle = '#000';
    ctx.fillRect(radarX, 0, radarWidth, radarHeight);
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.strokeRect(radarX, 0, radarWidth, radarHeight);

    // Radar grid and elements would be implemented here
    // This is a placeholder for the full radar implementation
    ctx.fillStyle = '#00ff00';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('HORIZONTAL RADAR', radarX + radarWidth / 2, radarHeight / 2);
  }

  /**
   * Render right pane: Vertical Radar & Target Info (UI-15 to UI-18)
   */
  private renderVerticalRadarAndTargetInfo(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement
  ): void {
    const panelX = canvas.width * 0.75;
    const panelWidth = canvas.width * 0.25;
    const panelHeight = canvas.height;

    // Panel background
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(panelX, 0, panelWidth, panelHeight);
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, 0, panelWidth, panelHeight);

    // Vertical radar (upper half)
    const radarHeight = panelHeight * 0.6;
    ctx.fillStyle = '#000';
    ctx.fillRect(panelX, 0, panelWidth, radarHeight);
    ctx.strokeStyle = '#00ff00';
    ctx.strokeRect(panelX, 0, panelWidth, radarHeight);

    // Target info (lower half)
    const infoY = radarHeight;
    const infoHeight = panelHeight * 0.4;

    ctx.fillStyle = '#333';
    ctx.fillRect(panelX, infoY, panelWidth, infoHeight);
    ctx.strokeStyle = '#666';
    ctx.strokeRect(panelX, infoY, panelWidth, infoHeight);

    // Target info content (UI-17, UI-18)
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TARGET INFO', panelX + panelWidth / 2, infoY + 20);

    let y = infoY + 40;
    ctx.textAlign = 'left';
    ctx.font = '11px monospace';

    if (this.lockedTarget) {
      ctx.fillStyle = '#ccc';
      ctx.fillText('Status:', panelX + 10, y);
      ctx.fillStyle = '#ff0000';
      ctx.fillText('LOCKED ON', panelX + 10, y + 12);

      y += 30;
      ctx.fillStyle = '#ccc';
      ctx.fillText('Type:', panelX + 10, y);
      ctx.fillStyle = '#00ff00';
      ctx.fillText(this.lockedTarget.type, panelX + 10, y + 12);

      y += 30;
      ctx.fillStyle = '#ccc';
      ctx.fillText('Range:', panelX + 10, y);
      ctx.fillStyle = '#00ff00';
      ctx.fillText(
        `${this.lockedTarget.distanceFrom(this.artillery.position).toFixed(0)}m`,
        panelX + 10,
        y + 12
      );

      y += 25;
      ctx.fillStyle = '#ccc';
      ctx.fillText('Speed:', panelX + 10, y);
      ctx.fillStyle = '#00ff00';
      ctx.fillText(
        `${this.lockedTarget.speed.toFixed(1)}m/s`,
        panelX + 10,
        y + 12
      );

      y += 25;
      ctx.fillStyle = '#ccc';
      ctx.fillText('Altitude:', panelX + 10, y);
      ctx.fillStyle = '#00ff00';
      ctx.fillText(
        `${this.lockedTarget.altitude.toFixed(0)}m`,
        panelX + 10,
        y + 12
      );
    } else {
      ctx.fillStyle = '#ccc';
      ctx.fillText('Status:', panelX + 10, y);
      ctx.fillStyle = '#666';
      ctx.fillText('NO TARGET', panelX + 10, y + 12);
    }
  }

  /**
   * Render game state overlay (game over, stage clear)
   */
  private renderGameStateOverlay(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement
  ): void {
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
   * Handle mouse down events
   */
  private handleMouseDown(_event: MouseEvent): void {
    // Placeholder for radar interaction
  }

  /**
   * Handle mouse move events
   */
  private handleMouseMove(_event: MouseEvent): void {
    // Placeholder for radar control
  }

  /**
   * Handle mouse up events
   */
  private handleMouseUp(): void {
    // Placeholder for radar interaction
  }

  /**
   * Handle mouse wheel events
   */
  private handleWheel(_event: WheelEvent): void {
    // Placeholder for radar zoom/distance control
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
