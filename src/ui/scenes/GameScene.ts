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

    // Radar grid and elements would be implemented here
    // This is a placeholder for the full radar implementation
    ctx.fillStyle = '#00ff00';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('HORIZONTAL RADAR', width / 2, height / 2);
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
