/**
 * GameScene - Clean implementation with proper component integration
 * Implements UI-04: 3-pane layout for main gameplay
 * Implements TR-02: Canvas 2D API compliance (no DOM manipulation)
 * Implements all game system requirements
 */

import { CanvasManager } from '../../rendering/CanvasManager';
import { StageConfig } from '../../data/StageData';
import { SceneType, SceneTransition } from './TitleScene';
import { MouseHandler, MouseEventData } from '../../input/MouseHandler';
import { Vector2 } from '../../math/Vector2';
import { Vector3 } from '../../math/Vector3';
import { EffectRenderer } from '../../rendering/renderers/EffectRenderer';
import {
  PhysicsEngine,
  State3D,
  AccelerationFunction,
} from '../../physics/PhysicsEngine';
import { Forces } from '../../physics/Forces';
import {
  PHYSICS_CONSTANTS,
  GAME_CONSTANTS,
  CRT_COLORS,
  FONTS,
} from '../../data/Constants';

export enum GameState {
  PLAYING = 'playing',
  PAUSED = 'paused',
  GAME_OVER = 'game_over',
  STAGE_CLEAR = 'stage_clear',
}

export enum TargetingState {
  NO_TARGET = 'NO_TARGET',
  TRACKING = 'TRACKING',
  LOCKED_ON = 'LOCKED_ON',
}

export interface GameSceneConfig {
  selectedStage: StageConfig;
}

interface TargetState {
  id: string;
  position: Vector3;
  velocity?: Vector3;
  isDestroyed: boolean;
  type: string;
  spawnTime: number;
}

interface ProjectileState {
  id: string;
  position: Vector3;
  velocity: Vector3;
  isActive: boolean;
  spawnTime: number;
}

/**
 * Main game scene with clean Canvas 2D API compliant implementation
 */
export class GameScene {
  private canvasManager: CanvasManager;
  private mouseHandler: MouseHandler;
  private onSceneTransition: (transition: SceneTransition) => void;
  private config: GameSceneConfig;
  private effectRenderer: EffectRenderer;
  private physicsEngine: PhysicsEngine;

  // Game state
  private gameState: GameState = GameState.PLAYING;
  private gameTime: number = 0;
  private startTime: number = 0;

  // Game entities
  private targets: TargetState[] = [];
  private projectiles: ProjectileState[] = [];
  private artilleryPosition: Vector3;

  // Targeting system
  private targetingState: TargetingState = TargetingState.NO_TARGET;
  private trackedTarget: TargetState | null = null;
  private lockedTarget: TargetState | null = null;

  // Artillery controls
  private azimuthAngle: number = 0;
  private elevationAngle: number = 45;

  // Radar controls
  private radarAzimuth: number = 0;
  private radarRange: number = GAME_CONSTANTS.DEFAULT_RADAR_RANGE;
  private maxRadarRange: number = GAME_CONSTANTS.MAX_RADAR_RANGE;

  // Mouse control state
  private isMouseDragging: boolean = false;
  private lastMousePosition: Vector2 = new Vector2(0, 0);
  private mouseSensitivity: number = 0.5;

  // UI interaction state
  private isDraggingAzimuthSlider: boolean = false;
  private isDraggingElevationSlider: boolean = false;
  private hoveredButton: string | null = null;

  // UI element bounds (calculated during render)
  private uiElements: Map<
    string,
    { x: number; y: number; width: number; height: number }
  > = new Map();

  // Animation
  private animationTime: number = 0;

  // UI Layout constants (UI-04: 3-pane layout)
  private readonly UI_LAYOUT = {
    CONTROL_PANEL_WIDTH: 300,
    VERTICAL_RADAR_WIDTH: 250,
    // Removed HORIZONTAL_RADAR_HEIGHT - now uses full center area
  } as const;

  constructor(
    canvasManager: CanvasManager,
    onSceneTransition: (transition: SceneTransition) => void,
    config: GameSceneConfig
  ) {
    this.canvasManager = canvasManager;
    this.onSceneTransition = onSceneTransition;
    this.config = config;
    this.mouseHandler = new MouseHandler(this.canvasManager.getCanvas());
    this.effectRenderer = new EffectRenderer(this.canvasManager);

    // Initialize physics engine with RK4 integration
    const accelerationFunction: AccelerationFunction = (
      state: State3D,
      _time: number
    ) => {
      const mass = PHYSICS_CONSTANTS.PROJECTILE_MASS;
      const gravity = Forces.gravity(
        mass,
        PHYSICS_CONSTANTS.GRAVITY_ACCELERATION,
        new Vector3(
          PHYSICS_CONSTANTS.GRAVITY_DIRECTION.x,
          PHYSICS_CONSTANTS.GRAVITY_DIRECTION.y,
          PHYSICS_CONSTANTS.GRAVITY_DIRECTION.z
        )
      );
      const drag = Forces.drag(
        state.velocity,
        PHYSICS_CONSTANTS.AIR_DENSITY_SEA_LEVEL,
        PHYSICS_CONSTANTS.PROJECTILE_DRAG_COEFFICIENT,
        PHYSICS_CONSTANTS.PROJECTILE_CROSS_SECTIONAL_AREA
      );

      // Convert force to acceleration: a = F/m
      const totalForce = Forces.sum(gravity, drag);
      return totalForce.multiply(1 / mass);
    };
    this.physicsEngine = new PhysicsEngine(accelerationFunction);

    // Initialize artillery position
    this.artilleryPosition = new Vector3(
      this.config.selectedStage.artilleryPosition.x,
      this.config.selectedStage.artilleryPosition.y,
      this.config.selectedStage.artilleryPosition.z
    );

    this.initializeGame();
    this.setupEventListeners();
  }

  /**
   * Initialize game entities and state
   */
  private initializeGame(): void {
    this.startTime = Date.now();
    this.gameTime = 0;
    this.gameState = GameState.PLAYING;

    // Initialize targets from stage configuration
    this.targets = this.config.selectedStage.targets.map(
      (targetConfig, index) => ({
        id: `target-${index}`,
        position: new Vector3(
          targetConfig.position.x,
          targetConfig.position.y,
          targetConfig.position.z
        ),
        velocity: targetConfig.velocity
          ? new Vector3(
              targetConfig.velocity.x,
              targetConfig.velocity.y,
              targetConfig.velocity.z
            )
          : undefined,
        isDestroyed: false,
        type: targetConfig.type,
        spawnTime: this.gameTime + targetConfig.spawnDelay,
      })
    );

    // Clear projectiles and effects
    this.projectiles = [];
    this.effectRenderer.clearAll();

    // Reset targeting
    this.targetingState = TargetingState.NO_TARGET;
    this.trackedTarget = null;
    this.lockedTarget = null;
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    this.mouseHandler.addEventListener((event: MouseEventData) => {
      this.handleMouseEvent(event);
    });

    // Keyboard events for game controls
    window.addEventListener('keydown', event => this.handleKeyDown(event));
  }

  /**
   * Update game state
   */
  update(deltaTime: number): void {
    this.animationTime += deltaTime;
    this.gameTime = (Date.now() - this.startTime) / 1000;

    if (this.gameState !== GameState.PLAYING) return;

    // Update targets
    this.updateTargets(deltaTime);

    // Update projectiles
    this.updateProjectiles(deltaTime);

    // Update effects
    this.effectRenderer.update(deltaTime);

    // Check collisions
    this.checkCollisions();

    // Update targeting system
    this.updateTargeting();

    // Check win/lose conditions
    this.checkGameConditions();
  }

  /**
   * Render the game scene
   */
  render(): void {
    this.clearCanvas();
    this.renderLayout();
    this.renderControlPanel();
    this.renderHorizontalRadar();
    this.renderVerticalRadar();
    this.renderGameStateOverlay();
    this.renderScanLines();

    // Render effects on top
    this.effectRenderer.render();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.mouseHandler.destroy();
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  /**
   * Update target states
   */
  private updateTargets(deltaTime: number): void {
    this.targets.forEach(target => {
      if (target.isDestroyed) return;

      // Check if target should spawn
      if (this.gameTime < target.spawnTime) return;

      // Update position based on velocity
      if (target.velocity) {
        target.position = target.position.add(
          target.velocity.multiply(deltaTime)
        );
      }

      // Check if target reached artillery position (game over condition)
      const distance = target.position
        .subtract(this.artilleryPosition)
        .magnitude();
      if (distance < 1000) {
        // 1km collision radius
        this.gameState = GameState.GAME_OVER;
      }
    });
  }

  /**
   * Update projectile states
   */
  private updateProjectiles(deltaTime: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      if (!projectile.isActive) continue;

      // Use physics engine for accurate RK4 integration
      const currentState: State3D = {
        position: projectile.position,
        velocity: projectile.velocity,
      };

      const newState = this.physicsEngine.integrate(
        currentState,
        this.gameTime,
        deltaTime
      );

      projectile.position = newState.position;
      projectile.velocity = newState.velocity;

      // Remove if hit ground or out of range
      if (
        projectile.position.z <= PHYSICS_CONSTANTS.GROUND_LEVEL ||
        this.gameTime - projectile.spawnTime >
          PHYSICS_CONSTANTS.MAX_PROJECTILE_LIFETIME
      ) {
        // Create impact explosion
        if (projectile.position.z <= 0) {
          this.effectRenderer.createExplosion(
            projectile.position,
            'projectile_impact'
          );
        }
        this.projectiles.splice(i, 1);
      }
    }
  }

  /**
   * Check collisions between projectiles and targets
   */
  private checkCollisions(): void {
    this.projectiles.forEach(projectile => {
      if (!projectile.isActive) return;

      this.targets.forEach(target => {
        if (target.isDestroyed || this.gameTime < target.spawnTime) return;

        const distance = projectile.position
          .subtract(target.position)
          .magnitude();
        if (distance < 50) {
          // 50m collision radius
          // Hit!
          target.isDestroyed = true;
          projectile.isActive = false;

          // Create destruction explosion
          this.effectRenderer.createExplosion(
            target.position,
            'target_destruction'
          );

          // Clear targeting if this target was being tracked/locked
          if (this.trackedTarget === target) {
            this.trackedTarget = null;
          }
          if (this.lockedTarget === target) {
            this.lockedTarget = null;
            this.targetingState = TargetingState.NO_TARGET;
          }
        }
      });
    });
  }

  /**
   * Update targeting system
   */
  private updateTargeting(): void {
    // If we have a locked target, keep tracking it
    if (this.lockedTarget && !this.lockedTarget.isDestroyed) {
      this.targetingState = TargetingState.LOCKED_ON;
      this.trackedTarget = this.lockedTarget;

      // Auto-track locked target with radar
      this.updateRadarToTarget(this.lockedTarget);
    } else {
      // Find target near cursor for tracking
      const nearestTarget = this.findTargetNearCursor();
      if (nearestTarget) {
        this.targetingState = TargetingState.TRACKING;
        this.trackedTarget = nearestTarget;
      } else {
        this.targetingState = TargetingState.NO_TARGET;
        this.trackedTarget = null;
      }
    }
  }

  /**
   * Check game win/lose conditions
   */
  private checkGameConditions(): void {
    // Check stage clear (all targets destroyed)
    const activeTargets = this.targets.filter(
      t => !t.isDestroyed && this.gameTime >= t.spawnTime
    );

    if (activeTargets.length === 0 && this.targets.length > 0) {
      this.gameState = GameState.STAGE_CLEAR;
    }
  }

  /**
   * Clear canvas with CRT background
   */
  private clearCanvas(): void {
    const ctx = this.canvasManager.context;
    ctx.fillStyle = CRT_COLORS.BACKGROUND;
    ctx.fillRect(0, 0, this.canvasManager.width, this.canvasManager.height);
  }

  /**
   * Render UI layout structure (UI-04: 3-pane layout - modified for full center radar)
   */
  private renderLayout(): void {
    const ctx = this.canvasManager.context;
    ctx.save();

    // Draw layout dividers
    ctx.strokeStyle = CRT_COLORS.GRID_LINE;
    ctx.lineWidth = 2;

    // Vertical divider between control panel and center radar
    const controlPanelRight = this.UI_LAYOUT.CONTROL_PANEL_WIDTH;
    ctx.beginPath();
    ctx.moveTo(controlPanelRight, 0);
    ctx.lineTo(controlPanelRight, this.canvasManager.height);
    ctx.stroke();

    // Vertical divider between center radar and vertical radar
    const verticalRadarLeft =
      this.canvasManager.width - this.UI_LAYOUT.VERTICAL_RADAR_WIDTH;
    ctx.beginPath();
    ctx.moveTo(verticalRadarLeft, 0);
    ctx.lineTo(verticalRadarLeft, this.canvasManager.height);
    ctx.stroke();

    // Removed horizontal divider - center radar now uses full height

    ctx.restore();
  }

  /**
   * Render control panel (left pane)
   */
  private renderControlPanel(): void {
    const ctx = this.canvasManager.context;
    const margin = 15;
    let y = margin;
    const lineHeight = 20;

    ctx.save();

    // Panel title
    ctx.fillStyle = CRT_COLORS.PRIMARY_TEXT;
    ctx.font = FONTS.TITLE;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('FIRE CONTROL', margin, y);
    y += lineHeight * 1.5;

    // Artillery controls
    ctx.font = FONTS.SUBTITLE;
    ctx.fillText('Artillery', margin, y);
    y += lineHeight;

    ctx.font = FONTS.DATA;
    ctx.fillStyle = CRT_COLORS.SECONDARY_TEXT;
    ctx.fillText(`Azimuth: ${this.azimuthAngle.toFixed(1)}°`, margin + 10, y);
    y += lineHeight;
    ctx.fillText(
      `Elevation: ${this.elevationAngle.toFixed(1)}°`,
      margin + 10,
      y
    );
    y += lineHeight * 1.5;

    // Radar controls
    ctx.fillStyle = CRT_COLORS.PRIMARY_TEXT;
    ctx.font = FONTS.SUBTITLE;
    ctx.fillText('Radar', margin, y);
    y += lineHeight;

    ctx.font = FONTS.DATA;
    ctx.fillStyle = CRT_COLORS.SECONDARY_TEXT;
    ctx.fillText(`Azimuth: ${this.radarAzimuth.toFixed(1)}°`, margin + 10, y);
    y += lineHeight;
    ctx.fillText(
      `Range: ${(this.radarRange / 1000).toFixed(1)}km`,
      margin + 10,
      y
    );
    y += lineHeight * 1.5;

    // Targeting information
    y = this.renderTargetingInfo(ctx, margin, y, lineHeight);

    // Control buttons and sliders
    y += lineHeight;
    this.renderControlElements(ctx, margin, y, lineHeight);

    ctx.restore();
  }

  /**
   * Render targeting information in control panel
   */
  private renderTargetingInfo(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    lineHeight: number
  ): number {
    // Targeting status
    ctx.fillStyle = CRT_COLORS.PRIMARY_TEXT;
    ctx.font = FONTS.SUBTITLE;
    ctx.fillText('Targeting', x, y);
    y += lineHeight;

    // Status indicator
    let statusText = 'MANUAL';
    let statusColor: string = CRT_COLORS.SECONDARY_TEXT;

    switch (this.targetingState) {
      case TargetingState.TRACKING:
        statusText = 'TRACKING';
        statusColor = CRT_COLORS.WARNING_TEXT;
        break;
      case TargetingState.LOCKED_ON:
        statusText = 'LOCKED ON';
        statusColor = CRT_COLORS.CRITICAL_TEXT;
        break;
    }

    ctx.font = FONTS.DATA;
    ctx.fillStyle = statusColor;
    ctx.fillText(`Status: ${statusText}`, x + 10, y);
    y += lineHeight;

    // Target information
    const displayTarget = this.lockedTarget || this.trackedTarget;
    if (displayTarget) {
      const distance = displayTarget.position
        .subtract(this.artilleryPosition)
        .magnitude();
      const speed = displayTarget.velocity
        ? displayTarget.velocity.magnitude()
        : 0;

      ctx.fillStyle = CRT_COLORS.SECONDARY_TEXT;
      ctx.fillText(`Type: ${displayTarget.type}`, x + 10, y);
      y += lineHeight;
      ctx.fillText(`Range: ${(distance / 1000).toFixed(1)}km`, x + 10, y);
      y += lineHeight;
      ctx.fillText(`Speed: ${speed.toFixed(1)}m/s`, x + 10, y);
      y += lineHeight;
    } else {
      ctx.fillStyle = '#666666';
      ctx.fillText('Type: ---', x + 10, y);
      y += lineHeight;
      ctx.fillText('Range: ---', x + 10, y);
      y += lineHeight;
      ctx.fillText('Speed: ---', x + 10, y);
      y += lineHeight;
    }

    y += lineHeight;

    // Game time
    ctx.fillStyle = CRT_COLORS.PRIMARY_TEXT;
    ctx.font = FONTS.SUBTITLE;
    ctx.fillText('Mission Time', x, y);
    y += lineHeight;

    const minutes = Math.floor(this.gameTime / 60);
    const seconds = Math.floor(this.gameTime % 60);
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    ctx.font = FONTS.DATA;
    ctx.fillStyle = CRT_COLORS.SECONDARY_TEXT;
    ctx.fillText(timeStr, x + 10, y);
    y += lineHeight;

    return y;
  }

  /**
   * Render control elements (sliders and buttons) in control panel
   */
  private renderControlElements(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    lineHeight: number
  ): void {
    const sliderWidth = 200;
    const sliderHeight = 15;
    const buttonWidth = 120;
    const buttonHeight = 25;

    // Artillery Control Sliders
    ctx.fillStyle = CRT_COLORS.PRIMARY_TEXT;
    ctx.font = FONTS.SUBTITLE;
    ctx.fillText('Artillery Control', x, y);
    y += lineHeight;

    // Azimuth Slider
    const azimuthSliderY = y + 5;
    this.renderSlider(
      ctx,
      x + 10,
      azimuthSliderY,
      sliderWidth,
      sliderHeight,
      this.azimuthAngle,
      -180,
      180,
      'azimuth-slider'
    );
    ctx.fillStyle = CRT_COLORS.SECONDARY_TEXT;
    ctx.font = FONTS.DATA;
    ctx.fillText(
      `Azimuth: ${this.azimuthAngle.toFixed(1)}°`,
      x + sliderWidth + 20,
      azimuthSliderY + 10
    );
    y += lineHeight * 1.5;

    // Elevation Slider
    const elevationSliderY = y + 5;
    this.renderSlider(
      ctx,
      x + 10,
      elevationSliderY,
      sliderWidth,
      sliderHeight,
      this.elevationAngle,
      0,
      90,
      'elevation-slider'
    );
    ctx.fillStyle = CRT_COLORS.SECONDARY_TEXT;
    ctx.font = FONTS.DATA;
    ctx.fillText(
      `Elevation: ${this.elevationAngle.toFixed(1)}°`,
      x + sliderWidth + 20,
      elevationSliderY + 10
    );
    y += lineHeight * 2;

    // Control Buttons
    ctx.fillStyle = CRT_COLORS.PRIMARY_TEXT;
    ctx.font = FONTS.SUBTITLE;
    ctx.fillText('Actions', x, y);
    y += lineHeight;

    // Fire Button
    const fireButtonY = y + 5;
    this.renderButton(
      ctx,
      x + 10,
      fireButtonY,
      buttonWidth,
      buttonHeight,
      'FIRE',
      'fire-button'
    );
    y += lineHeight * 1.8;

    // Cancel Tracking Button
    const cancelButtonY = y + 5;
    this.renderButton(
      ctx,
      x + 10,
      cancelButtonY,
      buttonWidth,
      buttonHeight,
      'CANCEL TRACK',
      'cancel-button'
    );
    y += lineHeight * 1.8;

    // Back to Menu Button
    const menuButtonY = y + 5;
    this.renderButton(
      ctx,
      x + 10,
      menuButtonY,
      buttonWidth,
      buttonHeight,
      'BACK TO MENU',
      'menu-button'
    );
  }

  /**
   * Render a slider control
   */
  private renderSlider(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    value: number,
    min: number,
    max: number,
    elementId: string
  ): void {
    // Store element bounds for interaction
    this.uiElements.set(elementId, { x, y, width, height });

    // Slider track
    ctx.strokeStyle = CRT_COLORS.GRID_LINE;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    // Slider handle position
    const normalizedValue = (value - min) / (max - min);
    const handleX = x + normalizedValue * (width - height);

    // Slider handle
    ctx.fillStyle = CRT_COLORS.PRIMARY_TEXT;
    ctx.fillRect(handleX, y, height, height);

    // Slider fill
    ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
    ctx.fillRect(x, y, handleX - x + height, height);
  }

  /**
   * Render a button control
   */
  private renderButton(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    elementId: string
  ): void {
    // Store element bounds for interaction
    this.uiElements.set(elementId, { x, y, width, height });

    const isHovered = this.hoveredButton === elementId;

    // Button background
    ctx.fillStyle = isHovered ? 'rgba(0, 255, 0, 0.2)' : 'rgba(0, 255, 0, 0.1)';
    ctx.fillRect(x, y, width, height);

    // Button border
    ctx.strokeStyle = isHovered
      ? CRT_COLORS.WARNING_TEXT
      : CRT_COLORS.PRIMARY_TEXT;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    // Button text
    ctx.fillStyle = isHovered
      ? CRT_COLORS.WARNING_TEXT
      : CRT_COLORS.PRIMARY_TEXT;
    ctx.font = FONTS.DATA;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + width / 2, y + height / 2);

    // Reset text alignment
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
  }

  /**
   * Render horizontal radar (center full area)
   */
  private renderHorizontalRadar(): void {
    const ctx = this.canvasManager.context;
    const radarLeft = this.UI_LAYOUT.CONTROL_PANEL_WIDTH + 10;
    const radarTop = 10;
    const radarWidth =
      this.canvasManager.width -
      this.UI_LAYOUT.CONTROL_PANEL_WIDTH -
      this.UI_LAYOUT.VERTICAL_RADAR_WIDTH -
      20;
    const radarHeight = this.canvasManager.height - 20;

    ctx.save();

    // Draw radar grid
    this.drawRadarGrid(ctx, radarLeft, radarTop, radarWidth, radarHeight, true);

    // Draw range cursor if adjusting radar range
    if (
      this.isMouseDragging &&
      !this.isDraggingAzimuthSlider &&
      !this.isDraggingElevationSlider
    ) {
      this.drawRangeCursor(ctx, radarLeft, radarTop, radarWidth, radarHeight);
    }

    // Draw targets
    this.drawTargetsOnRadar(
      ctx,
      radarLeft,
      radarTop,
      radarWidth,
      radarHeight,
      true
    );

    // Draw projectiles
    this.drawProjectilesOnRadar(
      ctx,
      radarLeft,
      radarTop,
      radarWidth,
      radarHeight,
      true
    );

    ctx.restore();
  }

  /**
   * Render vertical radar (right pane - upper portion)
   */
  private renderVerticalRadar(): void {
    const ctx = this.canvasManager.context;
    const radarLeft =
      this.canvasManager.width - this.UI_LAYOUT.VERTICAL_RADAR_WIDTH + 10;
    const radarTop = 10;
    const radarWidth = this.UI_LAYOUT.VERTICAL_RADAR_WIDTH - 20;
    const radarHeight = Math.floor((this.canvasManager.height - 30) * 0.65); // 65% of height

    ctx.save();

    // Draw radar grid
    this.drawRadarGrid(
      ctx,
      radarLeft,
      radarTop,
      radarWidth,
      radarHeight,
      false
    );

    // Draw targets (filtered by radar beam)
    this.drawTargetsOnRadar(
      ctx,
      radarLeft,
      radarTop,
      radarWidth,
      radarHeight,
      false
    );

    // Draw projectiles
    this.drawProjectilesOnRadar(
      ctx,
      radarLeft,
      radarTop,
      radarWidth,
      radarHeight,
      false
    );

    // Draw target information panel below
    const infoTop = radarTop + radarHeight + 10;
    const infoHeight = this.canvasManager.height - infoTop - 10;
    this.renderTargetInfoPanel(ctx, radarLeft, infoTop, radarWidth, infoHeight);

    ctx.restore();
  }

  /**
   * Draw range cursor during radar range adjustment (horizontal line)
   */
  private drawRangeCursor(
    ctx: CanvasRenderingContext2D,
    radarX: number,
    radarY: number,
    radarWidth: number,
    radarHeight: number
  ): void {
    const gunY = radarY + radarHeight - 10;

    // Calculate range cursor position (horizontal line)
    const rangeY =
      gunY - (this.radarRange / this.maxRadarRange) * (radarHeight - 20);

    // Draw horizontal range cursor line
    ctx.strokeStyle = CRT_COLORS.WARNING_TEXT;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(radarX + 10, rangeY);
    ctx.lineTo(radarX + radarWidth - 10, rangeY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Range text on the left side of the line
    ctx.fillStyle = CRT_COLORS.WARNING_TEXT;
    ctx.font = FONTS.SMALL;
    ctx.textAlign = 'left';
    ctx.fillText(
      `${(this.radarRange / 1000).toFixed(1)}km`,
      radarX + 5,
      rangeY - 3
    );
  }

  /**
   * Render target information panel (right pane bottom)
   */
  private renderTargetInfoPanel(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    // Panel background
    ctx.fillStyle = 'rgba(0, 50, 0, 0.3)';
    ctx.fillRect(x, y, width, height);

    // Panel border
    ctx.strokeStyle = CRT_COLORS.GRID_LINE;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    let textY = y + 15;
    const lineHeight = 15;

    // Title
    ctx.fillStyle = CRT_COLORS.PRIMARY_TEXT;
    ctx.font = FONTS.SUBTITLE;
    ctx.fillText('TARGET INFO', x + 5, textY);
    textY += lineHeight * 1.5;

    // Display information for locked or tracked target
    const displayTarget = this.lockedTarget || this.trackedTarget;
    if (displayTarget) {
      const distance = displayTarget.position
        .subtract(this.artilleryPosition)
        .magnitude();
      const speed = displayTarget.velocity
        ? displayTarget.velocity.magnitude()
        : 0;

      ctx.fillStyle = CRT_COLORS.SECONDARY_TEXT;
      ctx.font = FONTS.SMALL;

      ctx.fillText(`Type: ${displayTarget.type}`, x + 5, textY);
      textY += lineHeight;
      ctx.fillText(`Range: ${(distance / 1000).toFixed(1)}km`, x + 5, textY);
      textY += lineHeight;
      ctx.fillText(
        `Altitude: ${displayTarget.position.z.toFixed(0)}m`,
        x + 5,
        textY
      );
      textY += lineHeight;
      ctx.fillText(`Speed: ${speed.toFixed(1)}m/s`, x + 5, textY);
      textY += lineHeight;

      if (displayTarget.velocity) {
        const heading =
          Math.atan2(displayTarget.velocity.x, displayTarget.velocity.y) *
          (180 / Math.PI);
        ctx.fillText(`Heading: ${heading.toFixed(0)}°`, x + 5, textY);
      }
    } else {
      ctx.fillStyle = '#666666';
      ctx.font = FONTS.SMALL;
      ctx.fillText('No target selected', x + 5, textY);
    }
  }

  /**
   * Draw radar grid (horizontal or vertical)
   */
  private drawRadarGrid(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    isHorizontal: boolean
  ): void {
    ctx.strokeStyle = CRT_COLORS.GRID_LINE;
    ctx.lineWidth = 1;

    // Draw range circles/lines
    const centerX = x + width / 2;
    const centerY = y + height - 10; // Gun position at bottom for horizontal, different for vertical
    const gunY = isHorizontal ? centerY : y + height - 10;

    if (isHorizontal) {
      // Horizontal radar - distance lines
      for (let i = 1; i <= 4; i++) {
        const lineY = gunY - ((height - 20) / 4) * i;
        ctx.beginPath();
        ctx.moveTo(x + 10, lineY);
        ctx.lineTo(x + width - 10, lineY);
        ctx.stroke();

        // Range labels
        ctx.fillStyle = CRT_COLORS.SECONDARY_TEXT;
        ctx.font = FONTS.SMALL;
        ctx.textAlign = 'left';
        ctx.fillText(`${i * 5}km`, x + 5, lineY - 2);
      }

      // Bearing lines
      for (let bearing = -60; bearing <= 60; bearing += 30) {
        const lineX = centerX + (bearing / 120) * (width - 20);
        if (lineX >= x + 10 && lineX <= x + width - 10) {
          ctx.beginPath();
          ctx.moveTo(lineX, y + 10);
          ctx.lineTo(lineX, gunY);
          ctx.stroke();

          // Bearing labels
          const label =
            bearing === 0 ? '0°' : `${bearing > 0 ? '+' : ''}${bearing}°`;
          ctx.textAlign = 'center';
          ctx.fillText(label, lineX, gunY + 15);
        }
      }
    } else {
      // Vertical radar - range lines
      for (let i = 1; i <= 4; i++) {
        const lineX = x + 10 + ((width - 20) / 4) * i;
        ctx.beginPath();
        ctx.moveTo(lineX, y + 10);
        ctx.lineTo(lineX, y + height - 10);
        ctx.stroke();

        // Range labels
        ctx.fillStyle = CRT_COLORS.SECONDARY_TEXT;
        ctx.font = FONTS.SMALL;
        ctx.textAlign = 'center';
        ctx.fillText(`${i * 5}km`, lineX, y + height - 5);
      }

      // Altitude lines
      for (let i = 1; i <= 4; i++) {
        const lineY = y + height - 10 - ((height - 20) / 4) * i;
        ctx.beginPath();
        ctx.moveTo(x + 10, lineY);
        ctx.lineTo(x + width - 10, lineY);
        ctx.stroke();

        // Altitude labels
        ctx.textAlign = 'left';
        ctx.fillText(`${i * 2500}m`, x + 5, lineY - 2);
      }
    }

    // Draw gun position
    const gunX = isHorizontal ? centerX : x + 10;
    ctx.fillStyle = CRT_COLORS.PRIMARY_TEXT;
    ctx.beginPath();
    ctx.arc(gunX, gunY, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Draw targets on radar
   */
  private drawTargetsOnRadar(
    ctx: CanvasRenderingContext2D,
    radarX: number,
    radarY: number,
    radarWidth: number,
    radarHeight: number,
    isHorizontal: boolean
  ): void {
    this.targets.forEach(target => {
      if (target.isDestroyed || this.gameTime < target.spawnTime) return;

      // Calculate screen position
      const screenPos = this.worldToRadarScreen(
        target.position,
        radarX,
        radarY,
        radarWidth,
        radarHeight,
        isHorizontal
      );

      if (!screenPos) return;

      // Draw target with state-based styling
      let color: string = CRT_COLORS.TARGET_NORMAL;
      let size = 3;

      if (target === this.lockedTarget) {
        color = CRT_COLORS.TARGET_LOCKED;
        size = 5;

        // Draw lock indicator
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, 8, 0, Math.PI * 2);
        ctx.stroke();
      } else if (target === this.trackedTarget) {
        color = CRT_COLORS.TARGET_TRACKED;
        size = 4;
      }

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, size, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  /**
   * Draw projectiles on radar
   */
  private drawProjectilesOnRadar(
    ctx: CanvasRenderingContext2D,
    radarX: number,
    radarY: number,
    radarWidth: number,
    radarHeight: number,
    isHorizontal: boolean
  ): void {
    this.projectiles.forEach(projectile => {
      if (!projectile.isActive) return;

      const screenPos = this.worldToRadarScreen(
        projectile.position,
        radarX,
        radarY,
        radarWidth,
        radarHeight,
        isHorizontal
      );

      if (!screenPos) return;

      ctx.fillStyle = CRT_COLORS.PROJECTILE;
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, 2, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  /**
   * Convert world position to radar screen coordinates
   */
  private worldToRadarScreen(
    worldPos: Vector3,
    radarX: number,
    radarY: number,
    radarWidth: number,
    radarHeight: number,
    isHorizontal: boolean
  ): Vector2 | null {
    const dx = worldPos.x - this.artilleryPosition.x;
    const dy = worldPos.y - this.artilleryPosition.y;
    const dz = worldPos.z - this.artilleryPosition.z;

    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > this.maxRadarRange) return null;

    if (isHorizontal) {
      // Horizontal radar view (top-down)
      const bearing = Math.atan2(dx, dy) * (180 / Math.PI);

      // Calculate relative bearing with improved 360-degree boundary handling
      let relativeBearing = bearing - this.radarAzimuth;

      // Normalize to -180 to +180 range
      while (relativeBearing > 180) relativeBearing -= 360;
      while (relativeBearing < -180) relativeBearing += 360;

      // Check if target is within radar arc (±60 degrees)
      // Handle 360-degree boundary cases by checking both directions
      const isInArc = Math.abs(relativeBearing) <= 60;

      if (!isInArc) {
        // Additional check for 360-degree boundary crossing
        // If radar is near 0°/360°, check if target appears on the other side
        let altRelativeBearing = relativeBearing;
        if (relativeBearing > 0) {
          altRelativeBearing = relativeBearing - 360;
        } else {
          altRelativeBearing = relativeBearing + 360;
        }

        if (Math.abs(altRelativeBearing) > 60) {
          return null; // Truly outside radar arc
        }

        // Use the alternative bearing for display
        relativeBearing = altRelativeBearing;
      }

      const screenX =
        radarX + radarWidth / 2 + (relativeBearing / 120) * (radarWidth - 20);
      const screenY =
        radarY +
        radarHeight -
        10 -
        (distance / this.maxRadarRange) * (radarHeight - 20);

      return new Vector2(screenX, screenY);
    } else {
      // Vertical radar view (side view)
      // Apply beam width filtering: only show targets within 5-degree beam width (±2.5 degrees)
      const bearing = Math.atan2(dx, dy) * (180 / Math.PI);

      let relativeBearing = bearing - this.radarAzimuth;

      // Normalize to -180 to +180 range
      while (relativeBearing > 180) relativeBearing -= 360;
      while (relativeBearing < -180) relativeBearing += 360;

      // Filter by beam width: only show targets within ±2.5 degrees of radar center
      // Handle 360-degree boundary for beam width as well
      const isInBeam = Math.abs(relativeBearing) <= 2.5;

      if (!isInBeam) {
        // Check alternative bearing for 360-degree boundary
        let altRelativeBearing = relativeBearing;
        if (relativeBearing > 0) {
          altRelativeBearing = relativeBearing - 360;
        } else {
          altRelativeBearing = relativeBearing + 360;
        }

        if (Math.abs(altRelativeBearing) > 2.5) {
          return null; // Outside beam width
        }
      }

      const screenX =
        radarX + 10 + (distance / this.maxRadarRange) * (radarWidth - 20);
      const screenY =
        radarY + radarHeight - 10 - (dz / 10000) * (radarHeight - 20); // 10km altitude max

      return new Vector2(screenX, screenY);
    }
  }

  /**
   * Render game state overlay
   */
  private renderGameStateOverlay(): void {
    if (this.gameState === GameState.PLAYING) return;

    const ctx = this.canvasManager.context;
    const centerX = this.canvasManager.width / 2;
    const centerY = this.canvasManager.height / 2;

    ctx.save();

    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, this.canvasManager.width, this.canvasManager.height);

    // State text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (this.gameState === GameState.GAME_OVER) {
      ctx.fillStyle = CRT_COLORS.CRITICAL_TEXT;
      ctx.font = 'bold 48px monospace';
      ctx.fillText('MISSION FAILED', centerX, centerY - 30);

      ctx.fillStyle = CRT_COLORS.SECONDARY_TEXT;
      ctx.font = '20px monospace';
      ctx.fillText('Press R to restart', centerX, centerY + 30);
    } else if (this.gameState === GameState.STAGE_CLEAR) {
      ctx.fillStyle = CRT_COLORS.PRIMARY_TEXT;
      ctx.font = 'bold 48px monospace';
      ctx.fillText('MISSION SUCCESS', centerX, centerY - 30);

      ctx.fillStyle = CRT_COLORS.SECONDARY_TEXT;
      ctx.font = '20px monospace';
      ctx.fillText('Press SPACE to continue', centerX, centerY + 30);
    }

    ctx.restore();
  }

  /**
   * Render CRT scan lines effect (static only)
   */
  private renderScanLines(): void {
    const ctx = this.canvasManager.context;

    ctx.save();
    ctx.fillStyle = CRT_COLORS.SCAN_LINE;

    // Static horizontal scan lines only (removed moving scan line)
    for (let y = 0; y < this.canvasManager.height; y += 3) {
      ctx.fillRect(0, y, this.canvasManager.width, 1);
    }

    ctx.restore();
  }

  /**
   * Handle mouse events
   */
  private handleMouseEvent(event: MouseEventData): void {
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
      case 'click':
        this.handleMouseClick(event);
        break;
    }
  }

  /**
   * Handle mouse down events
   */
  private handleMouseDown(event: MouseEventData): void {
    const mousePos = new Vector2(
      event.position.canvas.x,
      event.position.canvas.y
    );

    // Check if clicking on UI elements
    const clickedElement = this.getClickedUIElement(mousePos);

    if (clickedElement) {
      if (clickedElement === 'azimuth-slider') {
        this.isDraggingAzimuthSlider = true;
        this.updateSliderValue(clickedElement, mousePos);
      } else if (clickedElement === 'elevation-slider') {
        this.isDraggingElevationSlider = true;
        this.updateSliderValue(clickedElement, mousePos);
      }
    } else {
      // Default radar dragging behavior
      this.isMouseDragging = true;
    }

    this.lastMousePosition = mousePos;
  }

  /**
   * Handle mouse move events
   */
  private handleMouseMove(event: MouseEventData): void {
    const currentPos = new Vector2(
      event.position.canvas.x,
      event.position.canvas.y
    );

    // Update hover state for buttons
    this.hoveredButton = this.getHoveredButton(currentPos);

    // Handle slider dragging
    if (this.isDraggingAzimuthSlider) {
      this.updateSliderValue('azimuth-slider', currentPos);
    } else if (this.isDraggingElevationSlider) {
      this.updateSliderValue('elevation-slider', currentPos);
    } else if (this.isMouseDragging) {
      // Default radar control behavior
      const deltaX = currentPos.x - this.lastMousePosition.x;
      const deltaY = currentPos.y - this.lastMousePosition.y;

      // Update radar controls
      this.radarAzimuth += deltaX * this.mouseSensitivity;
      this.radarRange = Math.max(
        1000,
        Math.min(this.maxRadarRange, this.radarRange - deltaY * 50)
      );

      // Normalize azimuth
      this.radarAzimuth = ((this.radarAzimuth % 360) + 360) % 360;
    }

    this.lastMousePosition = currentPos;
  }

  /**
   * Handle mouse up events
   */
  private handleMouseUp(_event: MouseEventData): void {
    this.isMouseDragging = false;
    this.isDraggingAzimuthSlider = false;
    this.isDraggingElevationSlider = false;
  }

  /**
   * Handle mouse click events
   */
  private handleMouseClick(event: MouseEventData): void {
    const mousePos = new Vector2(
      event.position.canvas.x,
      event.position.canvas.y
    );
    const clickedElement = this.getClickedUIElement(mousePos);

    if (event.button === 0) {
      // Left click
      if (clickedElement && this.isButton(clickedElement)) {
        this.handleButtonClick(clickedElement);
      } else {
        // Default behavior - fire projectile
        this.fireProjectile();
      }
    } else if (event.button === 2) {
      // Right click - target lock/unlock
      this.handleTargetLock();
    }
  }

  /**
   * Fire a projectile
   */
  private fireProjectile(): void {
    const muzzleVelocity = PHYSICS_CONSTANTS.MUZZLE_VELOCITY;
    const azimuthRad = this.azimuthAngle * (Math.PI / 180);
    const elevationRad = this.elevationAngle * (Math.PI / 180);

    const velocity = new Vector3(
      muzzleVelocity * Math.sin(azimuthRad) * Math.cos(elevationRad),
      muzzleVelocity * Math.cos(azimuthRad) * Math.cos(elevationRad),
      muzzleVelocity * Math.sin(elevationRad)
    );

    const projectile: ProjectileState = {
      id: `projectile-${Date.now()}`,
      position: this.artilleryPosition.copy(),
      velocity,
      isActive: true,
      spawnTime: this.gameTime,
    };

    this.projectiles.push(projectile);
  }

  /**
   * Handle target lock/unlock
   */
  private handleTargetLock(): void {
    const nearestTarget = this.findTargetNearCursor();

    if (nearestTarget) {
      if (this.lockedTarget === nearestTarget) {
        // Unlock
        this.lockedTarget = null;
        this.targetingState = TargetingState.NO_TARGET;
      } else {
        // Lock onto new target
        this.lockedTarget = nearestTarget;
        this.targetingState = TargetingState.LOCKED_ON;
        this.updateRadarToTarget(nearestTarget);
      }
    } else if (this.lockedTarget) {
      // Unlock current target
      this.lockedTarget = null;
      this.targetingState = TargetingState.NO_TARGET;
    }
  }

  /**
   * Find target near cursor
   */
  private findTargetNearCursor(): TargetState | null {
    // For now, return the first active target
    // In a full implementation, this would check cursor position against radar screen positions
    return (
      this.targets.find(t => !t.isDestroyed && this.gameTime >= t.spawnTime) ||
      null
    );
  }

  /**
   * Update radar to track target
   */
  private updateRadarToTarget(target: TargetState): void {
    const dx = target.position.x - this.artilleryPosition.x;
    const dy = target.position.y - this.artilleryPosition.y;

    this.radarAzimuth = Math.atan2(dx, dy) * (180 / Math.PI);
    this.radarRange = Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get the UI element at the given mouse position
   */
  private getClickedUIElement(mousePos: Vector2): string | null {
    for (const [elementId, bounds] of this.uiElements) {
      if (
        mousePos.x >= bounds.x &&
        mousePos.x <= bounds.x + bounds.width &&
        mousePos.y >= bounds.y &&
        mousePos.y <= bounds.y + bounds.height
      ) {
        return elementId;
      }
    }
    return null;
  }

  /**
   * Get the hovered button at the given mouse position
   */
  private getHoveredButton(mousePos: Vector2): string | null {
    const element = this.getClickedUIElement(mousePos);
    return element && this.isButton(element) ? element : null;
  }

  /**
   * Check if element is a button
   */
  private isButton(elementId: string): boolean {
    return elementId.endsWith('-button');
  }

  /**
   * Update slider value based on mouse position
   */
  private updateSliderValue(sliderId: string, mousePos: Vector2): void {
    const sliderBounds = this.uiElements.get(sliderId);
    if (!sliderBounds) return;

    const relativeX = Math.max(
      0,
      Math.min(sliderBounds.width, mousePos.x - sliderBounds.x)
    );
    const normalizedValue = relativeX / sliderBounds.width;

    if (sliderId === 'azimuth-slider') {
      this.azimuthAngle = -180 + normalizedValue * 360;
    } else if (sliderId === 'elevation-slider') {
      this.elevationAngle = normalizedValue * 90;
    }
  }

  /**
   * Handle button clicks
   */
  private handleButtonClick(buttonId: string): void {
    switch (buttonId) {
      case 'fire-button':
        this.fireProjectile();
        break;
      case 'cancel-button':
        this.lockedTarget = null;
        this.trackedTarget = null;
        this.targetingState = TargetingState.NO_TARGET;
        break;
      case 'menu-button':
        this.onSceneTransition({ type: SceneType.TITLE });
        break;
    }
  }

  /**
   * Handle keyboard events
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    switch (event.key) {
      case 'r':
      case 'R':
        if (this.gameState === GameState.GAME_OVER) {
          this.initializeGame();
        }
        break;
      case ' ':
        if (this.gameState === GameState.STAGE_CLEAR) {
          this.onSceneTransition({ type: SceneType.STAGE_SELECT });
        }
        break;
      case 'f':
      case 'F':
        this.fireProjectile();
        break;
    }
  };
}
