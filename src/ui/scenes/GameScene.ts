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
import { TrajectoryRenderer } from '../../rendering/TrajectoryRenderer';
import { LeadAngleCalculator } from '../../game/LeadAngleCalculator';
import {
  PHYSICS_CONSTANTS,
  GAME_CONSTANTS,
  CRT_COLORS,
  FONTS,
} from '../../data/Constants';
import { TargetType } from '../../game/entities/Target';

// Extended lead angle interface with display information
interface ExtendedLeadAngle {
  azimuth: number;
  elevation: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  convergenceError?: number;
  flightTime?: number;
}
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
  private trajectoryRenderer: TrajectoryRenderer;
  private leadAngleCalculator: LeadAngleCalculator;

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
  private radarElevation: number = 0; // レーダー仰角（度）
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

  // Fine control button state
  private buttonHoldTimer: number | null = null;
  private buttonHoldInterval: number | null = null;
  private isButtonHeld = false;

  // Lead angle calculation (GS-07)
  private leadAngleUpdateTimer: number = 0;
  private currentLeadAngle: ExtendedLeadAngle | null = null;
  private readonly LEAD_ANGLE_UPDATE_INTERVAL = 0.5; // 500ms間隔

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

      // Add Coriolis force for realistic ballistics (T006 complete implementation)
      const earthAngularVelocity = new Vector3(0, 0, 7.2921159e-5); // Earth's rotation rate (rad/s)
      const coriolis = Forces.coriolis(
        mass,
        earthAngularVelocity,
        state.velocity
      );

      // Convert force to acceleration: a = F/m
      const totalForce = Forces.sum(gravity, drag, coriolis);
      return totalForce.multiply(1 / mass);
    };
    this.physicsEngine = new PhysicsEngine(accelerationFunction);

    // Initialize trajectory renderer
    this.trajectoryRenderer = new TrajectoryRenderer({
      maxTrailLength: 200,
      trailFadeTime: 5000, // milliseconds
      projectileSize: 2,
      trailWidth: 1,
      showVelocityVector: false,
      showPredictedPath: true,
      colors: {
        active: CRT_COLORS.PRIMARY_TEXT,
        fading: CRT_COLORS.SECONDARY_TEXT,
        impact: CRT_COLORS.WARNING_TEXT,
        predicted: CRT_COLORS.TARGET_TRACKED,
      },
    });

    // Initialize artillery position
    this.artilleryPosition = new Vector3(
      this.config.selectedStage.artilleryPosition.x,
      this.config.selectedStage.artilleryPosition.y,
      this.config.selectedStage.artilleryPosition.z
    );

    // Initialize lead angle calculator for GS-07 requirement
    this.leadAngleCalculator = new LeadAngleCalculator();

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

    // Disable right-click context menu to enable right-click targeting
    this.canvasManager.getCanvas().addEventListener('contextmenu', e => {
      e.preventDefault();
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

    // Update trajectory prediction (UI-13/UI-16)
    this.updateTrajectoryPrediction();

    // Update lead angle calculation (GS-07)
    this.leadAngleUpdateTimer += deltaTime;
    if (this.leadAngleUpdateTimer >= this.LEAD_ANGLE_UPDATE_INTERVAL) {
      this.updateLeadAngleCalculation();
      this.leadAngleUpdateTimer = 0;
    }

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
    // Clean up button hold timers
    this.stopButtonHold();
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

      // Update projectile trajectory trail (T023 requirement)
      this.trajectoryRenderer.updateTrajectory(
        projectile.id,
        [projectile.position],
        projectile.velocity
      );

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

        // Remove trajectory trail when projectile is destroyed (T023)
        this.trajectoryRenderer.removeTrajectory(projectile.id);
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

          // Calculate actual collision point (T047)
          const collisionPoint = this.calculateCollisionPoint(
            projectile.position,
            target.position
          );

          // Create destruction explosion only if within radar range (T047)
          if (this.isPositionInRadarRange(collisionPoint)) {
            this.effectRenderer.createExplosion(
              collisionPoint,
              'target_destruction'
            );
          }

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

      const displayName = this.getTargetDisplayName(
        displayTarget.type as TargetType
      );
      ctx.fillStyle = CRT_COLORS.SECONDARY_TEXT;
      ctx.fillText(`Type: ${displayName}`, x + 10, y);
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

    // Lead angle display (GS-07, UI-06)
    y += lineHeight * 0.5;
    ctx.fillStyle = CRT_COLORS.PRIMARY_TEXT;
    ctx.font = FONTS.SUBTITLE;
    ctx.fillText('Recommended Lead', x, y);
    y += lineHeight;

    const leadAngle = this.currentLeadAngle;
    if (leadAngle) {
      // Confidence color coding
      let confidenceColor: string;
      switch (leadAngle.confidence) {
        case 'HIGH':
          confidenceColor = CRT_COLORS.TARGET_LOCKED; // Green: High precision
          break;
        case 'MEDIUM':
          confidenceColor = CRT_COLORS.WARNING_TEXT; // Yellow: Medium precision
          break;
        case 'LOW':
          confidenceColor = CRT_COLORS.CRITICAL_TEXT; // Red: Low precision
          break;
        default:
          confidenceColor = CRT_COLORS.SECONDARY_TEXT;
      }

      ctx.font = FONTS.DATA;
      ctx.fillStyle = confidenceColor;
      ctx.fillText(`Az: ${Math.round(leadAngle.azimuth)}°`, x + 10, y);
      y += lineHeight;
      ctx.fillText(`El: ${Math.round(leadAngle.elevation)}°`, x + 10, y);
      y += lineHeight;

      // Additional info (flight time, confidence)
      ctx.fillStyle = CRT_COLORS.SECONDARY_TEXT;
      ctx.font = FONTS.SMALL;
      if (leadAngle.flightTime) {
        ctx.fillText(`Time: ${leadAngle.flightTime.toFixed(1)}s`, x + 10, y);
        y += lineHeight * 0.8;
      }
      ctx.fillText(`Confidence: ${leadAngle.confidence}`, x + 10, y);
      y += lineHeight * 0.8;
      if (leadAngle.convergenceError !== undefined) {
        ctx.fillText(
          `Error: ${leadAngle.convergenceError.toFixed(1)}m`,
          x + 10,
          y
        );
        y += lineHeight * 0.8;
      }
    } else {
      ctx.fillStyle = '#666666';
      ctx.font = FONTS.DATA;
      ctx.fillText('Az: ---°', x + 10, y);
      y += lineHeight;
      ctx.fillText('El: ---°', x + 10, y);
      y += lineHeight;
      ctx.fillStyle = CRT_COLORS.SECONDARY_TEXT;
      ctx.font = FONTS.SMALL;
      ctx.fillText('No target locked', x + 10, y);
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

    // Lock On Button
    const lockButtonY = y + 5;
    const lockButtonText =
      this.targetingState === TargetingState.TRACKING
        ? 'LOCK ON'
        : this.targetingState === TargetingState.LOCKED_ON
          ? 'UNLOCK'
          : 'LOCK ON';
    this.renderButton(
      ctx,
      x + 10,
      lockButtonY,
      buttonWidth,
      buttonHeight,
      lockButtonText,
      'lock-button'
    );
    y += lineHeight * 1.8;

    // Fine control buttons for Azimuth
    const azFineButtonY = azimuthSliderY;
    const azDecButtonX = x + sliderWidth + 120;
    const azIncButtonX = azDecButtonX + 35;
    const fineButtonWidth = 30;
    const fineButtonHeight = 15;

    this.renderButton(
      ctx,
      azDecButtonX,
      azFineButtonY,
      fineButtonWidth,
      fineButtonHeight,
      'AZ-',
      'az-dec-button'
    );
    this.renderButton(
      ctx,
      azIncButtonX,
      azFineButtonY,
      fineButtonWidth,
      fineButtonHeight,
      'AZ+',
      'az-inc-button'
    );

    // Fine control buttons for Elevation
    const elFineButtonY = elevationSliderY;
    const elDecButtonX = x + sliderWidth + 120;
    const elIncButtonX = elDecButtonX + 35;

    this.renderButton(
      ctx,
      elDecButtonX,
      elFineButtonY,
      fineButtonWidth,
      fineButtonHeight,
      'EL-',
      'el-dec-button'
    );
    this.renderButton(
      ctx,
      elIncButtonX,
      elFineButtonY,
      fineButtonWidth,
      fineButtonHeight,
      'EL+',
      'el-inc-button'
    );

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

    // Draw trajectory prediction lines (UI-13 requirement)
    this.renderTrajectoryPrediction(
      ctx,
      radarLeft,
      radarTop,
      radarWidth,
      radarHeight
    );

    // Draw radar elevation display (T046)
    this.renderRadarElevationDisplay(
      ctx,
      radarLeft,
      radarTop,
      radarWidth,
      radarHeight
    );

    // Draw lead angle visualization (GS-07)
    this.renderLeadAngleVisualization(
      ctx,
      radarLeft,
      radarTop,
      radarWidth,
      radarHeight
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

    // Draw trajectory prediction lines (UI-16 requirement)
    this.renderVerticalTrajectoryPrediction(
      ctx,
      radarLeft,
      radarTop,
      radarWidth,
      radarHeight
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

      const displayName = this.getTargetDisplayName(
        displayTarget.type as TargetType
      );
      ctx.fillText(`Type: ${displayName}`, x + 5, textY);
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

      // Draw target with vessel-specific styling
      let color: string = CRT_COLORS.TARGET_NORMAL;
      let baseSize = this.getVesselSymbolSize(target.type as TargetType);

      if (target === this.lockedTarget) {
        color = CRT_COLORS.TARGET_LOCKED;
        baseSize *= 1.4; // Enlarge locked targets

        // Draw lock indicator
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, baseSize + 4, 0, Math.PI * 2);
        ctx.stroke();
      } else if (target === this.trackedTarget) {
        color = CRT_COLORS.TARGET_TRACKED;
        baseSize *= 1.2; // Slightly enlarge tracked targets
      }

      // Draw vessel-specific symbol
      this.drawVesselSymbol(
        ctx,
        screenPos.x,
        screenPos.y,
        baseSize,
        target.type as TargetType,
        color
      );
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
      } else if (clickedElement.endsWith('-button')) {
        // Handle fine control button presses
        if (clickedElement === 'az-dec-button') {
          this.startButtonHold('az-');
        } else if (clickedElement === 'az-inc-button') {
          this.startButtonHold('az+');
        } else if (clickedElement === 'el-dec-button') {
          this.startButtonHold('el-');
        } else if (clickedElement === 'el-inc-button') {
          this.startButtonHold('el+');
        }
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
    // Stop any button hold operations
    this.stopButtonHold();
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

    console.log(
      `Mouse click: button=${event.button}, element=${clickedElement}, targetingState=${this.targetingState}`
    );

    if (event.button === 0) {
      // Left click - only handle button clicks, no default projectile firing
      if (clickedElement && this.isButton(clickedElement)) {
        this.handleButtonClick(clickedElement);
      }
      // Removed: Default behavior - fire projectile (UI-07 violation fix)
    } else if (event.button === 2) {
      // Right click - target lock/unlock
      console.log(`Right click detected, calling handleTargetLock()`);
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

    // Add trajectory trail for UI-13/UI-16 (trajectory prediction)
    this.trajectoryRenderer.updateTrajectory(
      projectile.id,
      [projectile.position],
      projectile.velocity
    );
  }

  /**
   * Calculate and display trajectory prediction based on current aim
   * Implements UI-13/UI-16 requirements for real-time trajectory prediction
   */
  private updateTrajectoryPrediction(): void {
    const muzzleVelocity = PHYSICS_CONSTANTS.MUZZLE_VELOCITY;
    const azimuthRad = this.azimuthAngle * (Math.PI / 180);
    const elevationRad = this.elevationAngle * (Math.PI / 180);

    const predictedVelocity = new Vector3(
      muzzleVelocity * Math.sin(azimuthRad) * Math.cos(elevationRad),
      muzzleVelocity * Math.cos(azimuthRad) * Math.cos(elevationRad),
      muzzleVelocity * Math.sin(elevationRad)
    );

    // Update trajectory prediction with ID "prediction"
    this.trajectoryRenderer.updateTrajectory(
      'prediction',
      [this.artilleryPosition.copy()],
      predictedVelocity
    );
  }

  /**
   * Handle target lock/unlock
   */
  private handleTargetLock(): void {
    console.log(
      `handleTargetLock: targetingState=${this.targetingState}, trackedTarget=${!!this.trackedTarget}, lockedTarget=${!!this.lockedTarget}`
    );

    // GS-05: Right-click to lock onto TRACKING target
    if (this.targetingState === TargetingState.TRACKING && this.trackedTarget) {
      console.log(`Locking onto target: ${this.trackedTarget.id}`);
      // Lock onto currently tracked target
      this.lockedTarget = this.trackedTarget;
      this.targetingState = TargetingState.LOCKED_ON;
      this.updateRadarToTarget(this.trackedTarget);
    } else if (this.lockedTarget) {
      console.log(`Unlocking target: ${this.lockedTarget.id}`);
      // Unlock current target if already locked
      this.lockedTarget = null;
      this.targetingState = TargetingState.NO_TARGET;
      this.trackedTarget = null;
    } else {
      console.log(`No action: not in TRACKING state or no target available`);
    }
  }

  /**
   * Find target near cursor
   */
  private findTargetNearCursor(): TargetState | null {
    // Find target that matches radar crosshairs (azimuth + range)
    const BEAM_WIDTH_DEGREES = 5; // 5 degree radar beam width as per spec
    const RANGE_TOLERANCE = 200; // 200m range tolerance

    return (
      this.targets.find(target => {
        if (target.isDestroyed || this.gameTime < target.spawnTime) {
          return false;
        }

        // Calculate target's bearing and distance from artillery position
        // Using XY plane for horizontal radar calculations
        const dx = target.position.x - this.artilleryPosition.x;
        const dy = target.position.y - this.artilleryPosition.y;
        const targetDistance = Math.sqrt(dx * dx + dy * dy);

        // Calculate target's azimuth angle (normalized to 0-360)
        let targetAzimuth = Math.atan2(dx, dy) * (180 / Math.PI);
        if (targetAzimuth < 0) targetAzimuth += 360;

        // Normalize radar azimuth to 0-360
        let radarAz = this.radarAzimuth;
        if (radarAz < 0) radarAz += 360;

        // Calculate angular difference (handling 360-degree boundary)
        let angleDiff = Math.abs(targetAzimuth - radarAz);
        if (angleDiff > 180) angleDiff = 360 - angleDiff;

        // Check if target is within radar beam width and range cursor tolerance
        const withinBeam = angleDiff <= BEAM_WIDTH_DEGREES / 2;
        const withinRange =
          Math.abs(targetDistance - this.radarRange) <= RANGE_TOLERANCE;

        return withinBeam && withinRange;
      }) || null
    );
  }

  /**
   * Update radar to track target
   */
  private updateRadarToTarget(target: TargetState): void {
    const dx = target.position.x - this.artilleryPosition.x;
    const dy = target.position.y - this.artilleryPosition.y;
    const dz = target.position.z - this.artilleryPosition.z;

    // Calculate azimuth angle from artillery to target (統一: XY平面)
    this.radarAzimuth = Math.atan2(dx, dy) * (180 / Math.PI);

    // Calculate horizontal distance (radar range)
    const horizontalDistance = Math.sqrt(dx * dx + dy * dy);
    this.radarRange = horizontalDistance;

    // Calculate elevation angle from artillery to target (T046)
    this.radarElevation = Math.atan2(dz, horizontalDistance) * (180 / Math.PI);
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
      case 'lock-button':
        this.handleTargetLock();
        break;
      case 'menu-button':
        this.onSceneTransition({ type: SceneType.TITLE });
        break;
      case 'az-dec-button':
        this.adjustAngle('azimuth', -0.1);
        break;
      case 'az-inc-button':
        this.adjustAngle('azimuth', 0.1);
        break;
      case 'el-dec-button':
        this.adjustAngle('elevation', -0.1);
        break;
      case 'el-inc-button':
        this.adjustAngle('elevation', 0.1);
        break;
    }
  }

  /**
   * Get target display name for UI
   */
  private getTargetDisplayName(targetType: TargetType): string {
    switch (targetType) {
      case TargetType.BALLOON:
        return '気球';
      case TargetType.FRIGATE:
        return 'フリゲート';
      case TargetType.CRUISER:
        return '巡洋艦';
      case TargetType.STATIC:
        return 'Static Target';
      case TargetType.MOVING_SLOW:
        return 'Slow Target';
      case TargetType.MOVING_FAST:
        return 'Fast Target';
      default:
        return 'Unknown Target';
    }
  }

  /**
   * Get vessel symbol size based on target type
   */
  private getVesselSymbolSize(targetType: TargetType): number {
    switch (targetType) {
      case TargetType.BALLOON:
        return 8; // Large balloon
      case TargetType.FRIGATE:
        return 5; // Medium frigate
      case TargetType.CRUISER:
        return 7; // Large cruiser
      case TargetType.STATIC:
      case TargetType.MOVING_SLOW:
      case TargetType.MOVING_FAST:
      default:
        return 3; // Default size for compatibility
    }
  }

  /**
   * Draw vessel-specific symbol
   */
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
        // Draw balloon as circle with cross
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        // Cross inside
        ctx.beginPath();
        ctx.moveTo(x - size * 0.5, y);
        ctx.lineTo(x + size * 0.5, y);
        ctx.moveTo(x, y - size * 0.5);
        ctx.lineTo(x, y + size * 0.5);
        ctx.stroke();
        break;

      case TargetType.FRIGATE:
        // Draw frigate as diamond shape
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size * 0.6, y);
        ctx.lineTo(x, y + size);
        ctx.lineTo(x - size * 0.6, y);
        ctx.closePath();
        ctx.fill();
        break;

      case TargetType.CRUISER:
        // Draw cruiser as larger rectangle with center dot
        ctx.fillRect(x - size * 0.8, y - size * 0.4, size * 1.6, size * 0.8);
        // Center dot
        ctx.beginPath();
        ctx.arc(x, y, size * 0.2, 0, Math.PI * 2);
        ctx.stroke();
        break;

      case TargetType.STATIC:
      case TargetType.MOVING_SLOW:
      case TargetType.MOVING_FAST:
      default:
        // Default circle for compatibility
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
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

  /**
   * Adjust angle values for fine control
   */
  private adjustAngle(type: 'azimuth' | 'elevation', delta: number): void {
    if (type === 'azimuth') {
      this.azimuthAngle = Math.max(
        -180,
        Math.min(180, this.azimuthAngle + delta)
      );
    } else {
      this.elevationAngle = Math.max(
        0,
        Math.min(90, this.elevationAngle + delta)
      );
    }
  }

  /**
   * Start continuous angle adjustment on button hold
   */
  private startButtonHold(buttonType: 'az+' | 'az-' | 'el+' | 'el-'): void {
    if (this.isButtonHeld) return;

    this.isButtonHeld = true;
    const adjustmentRate = 0.1; // 0.1 degrees per adjustment
    const intervalTime = 100; // 100ms = 10 adjustments per second = 1 degree per second

    // Clear any existing intervals
    this.stopButtonHold();

    // Start adjustment after initial delay
    this.buttonHoldTimer = window.setTimeout(() => {
      this.buttonHoldInterval = window.setInterval(() => {
        switch (buttonType) {
          case 'az+':
            this.adjustAngle('azimuth', adjustmentRate);
            break;
          case 'az-':
            this.adjustAngle('azimuth', -adjustmentRate);
            break;
          case 'el+':
            this.adjustAngle('elevation', adjustmentRate);
            break;
          case 'el-':
            this.adjustAngle('elevation', -adjustmentRate);
            break;
        }
      }, intervalTime);
    }, 300); // 300ms initial delay
  }

  /**
   * Stop continuous angle adjustment
   */
  private stopButtonHold(): void {
    this.isButtonHeld = false;
    if (this.buttonHoldTimer) {
      window.clearTimeout(this.buttonHoldTimer);
      this.buttonHoldTimer = null;
    }
    if (this.buttonHoldInterval) {
      window.clearInterval(this.buttonHoldInterval);
      this.buttonHoldInterval = null;
    }
  }

  /**
   * Render radar elevation display in horizontal radar (T046)
   */
  private renderRadarElevationDisplay(
    ctx: CanvasRenderingContext2D,
    radarLeft: number,
    radarTop: number,
    radarWidth: number,
    _radarHeight: number
  ): void {
    ctx.save();

    // Display elevation in top-right corner of radar
    const displayX = radarLeft + radarWidth - 120;
    const displayY = radarTop + 30;

    ctx.fillStyle = CRT_COLORS.PRIMARY_TEXT;
    ctx.font = FONTS.DATA;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // Format elevation display
    const elevationText = `EL: ${this.radarElevation.toFixed(1)}°`;
    ctx.fillText(elevationText, displayX, displayY);

    // Add a subtle background for better visibility
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = CRT_COLORS.BACKGROUND;
    const textMetrics = ctx.measureText(elevationText);
    ctx.fillRect(displayX - 5, displayY - 10, textMetrics.width + 10, 20);
    ctx.restore();

    // Re-draw the text over the background
    ctx.fillStyle = CRT_COLORS.PRIMARY_TEXT;
    ctx.fillText(elevationText, displayX, displayY);

    ctx.restore();
  }

  /**
   * Check if position is within radar range for explosion effects (T047)
   */
  private isPositionInRadarRange(position: Vector3): boolean {
    const distance = this.artilleryPosition.subtract(position).magnitude();
    return distance <= this.maxRadarRange;
  }

  /**
   * Calculate collision point between projectile and target (T047)
   */
  private calculateCollisionPoint(
    projectilePos: Vector3,
    targetPos: Vector3
  ): Vector3 {
    // Return midpoint between projectile and target at collision
    return projectilePos.add(targetPos).multiply(0.5);
  }

  /**
   * Render trajectory prediction on horizontal radar (T048)
   */
  private renderTrajectoryPrediction(
    ctx: CanvasRenderingContext2D,
    radarLeft: number,
    radarTop: number,
    radarWidth: number,
    radarHeight: number
  ): void {
    ctx.save();

    // 現在の砲の方位・仰角から発射した砲弾の3D軌跡を計算
    const trajectory: Vector3[] = [];

    // 現在の砲設定を使用
    const azimuthRad = (this.azimuthAngle * Math.PI) / 180;
    const elevationRad = (this.elevationAngle * Math.PI) / 180;

    // 初期速度計算
    const muzzleVelocity = PHYSICS_CONSTANTS.MUZZLE_VELOCITY;
    const initialVelocity = new Vector3(
      muzzleVelocity * Math.sin(azimuthRad) * Math.cos(elevationRad),
      muzzleVelocity * Math.cos(azimuthRad) * Math.cos(elevationRad),
      muzzleVelocity * Math.sin(elevationRad)
    );

    // 物理エンジンセットアップ（実際の砲弾と同じ）
    const mass = PHYSICS_CONSTANTS.PROJECTILE_MASS;
    const accelerationFunction = (state: State3D, _time: number): Vector3 => {
      const Fg = Forces.gravity(
        mass,
        PHYSICS_CONSTANTS.GRAVITY_ACCELERATION,
        new Vector3(
          PHYSICS_CONSTANTS.GRAVITY_DIRECTION.x,
          PHYSICS_CONSTANTS.GRAVITY_DIRECTION.y,
          PHYSICS_CONSTANTS.GRAVITY_DIRECTION.z
        )
      );

      const Fd = Forces.drag(
        state.velocity,
        PHYSICS_CONSTANTS.AIR_DENSITY_SEA_LEVEL,
        PHYSICS_CONSTANTS.PROJECTILE_DRAG_COEFFICIENT,
        PHYSICS_CONSTANTS.PROJECTILE_CROSS_SECTIONAL_AREA
      );

      const totalForce = Forces.sum(Fg, Fd);
      return totalForce.multiply(1 / mass);
    };

    const physicsEngine = new PhysicsEngine(accelerationFunction);

    // 初期状態
    let state: State3D = {
      position: new Vector3(
        this.artilleryPosition.x,
        this.artilleryPosition.y,
        this.artilleryPosition.z
      ),
      velocity: initialVelocity,
    };

    // 軌跡計算
    const dt = PHYSICS_CONSTANTS.PHYSICS_TIMESTEP;
    const maxTime = PHYSICS_CONSTANTS.MAX_PROJECTILE_LIFETIME;
    let time = 0;

    while (time < maxTime) {
      // 3Dワールド座標をそのまま記録
      trajectory.push(
        new Vector3(state.position.x, state.position.y, state.position.z)
      );

      // 物理積分
      state = physicsEngine.integrate(state, time, dt);
      time += dt;

      // 終了条件
      if (state.position.z <= PHYSICS_CONSTANTS.GROUND_LEVEL) {
        break;
      }
    }

    if (trajectory.length === 0) {
      ctx.restore();
      return;
    }

    // 軌跡線描画（ターゲット表示と同じ方法）
    ctx.strokeStyle = CRT_COLORS.WARNING_TEXT;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();

    let firstPoint = true;
    trajectory.forEach(point => {
      // 既存のworldToRadarScreen()を使用（ターゲットと同じ変換）
      const screenPos = this.worldToRadarScreen(
        point,
        radarLeft,
        radarTop,
        radarWidth,
        radarHeight,
        true // horizontal radar
      );

      if (screenPos) {
        if (firstPoint) {
          ctx.moveTo(screenPos.x, screenPos.y);
          firstPoint = false;
        } else {
          ctx.lineTo(screenPos.x, screenPos.y);
        }
      }
    });

    ctx.stroke();
    ctx.restore();
  }

  /**
   * Render vertical trajectory prediction on vertical radar (T049)
   */
  private renderVerticalTrajectoryPrediction(
    ctx: CanvasRenderingContext2D,
    radarLeft: number,
    radarTop: number,
    radarWidth: number,
    radarHeight: number
  ): void {
    ctx.save();

    // 現在の砲の方位・仰角から発射した砲弾の3D軌跡を計算
    // calculateTrajectoryToTarget()と同じ計算だが、ターゲット不要
    const trajectory: Vector3[] = [];

    // 現在の砲設定を使用
    const azimuthRad = (this.azimuthAngle * Math.PI) / 180;
    const elevationRad = (this.elevationAngle * Math.PI) / 180;

    // 初期速度計算
    const muzzleVelocity = PHYSICS_CONSTANTS.MUZZLE_VELOCITY;
    const initialVelocity = new Vector3(
      muzzleVelocity * Math.sin(azimuthRad) * Math.cos(elevationRad),
      muzzleVelocity * Math.cos(azimuthRad) * Math.cos(elevationRad),
      muzzleVelocity * Math.sin(elevationRad)
    );

    // 物理エンジンセットアップ（実際の砲弾と同じ）
    const mass = PHYSICS_CONSTANTS.PROJECTILE_MASS;
    const accelerationFunction = (state: State3D, _time: number): Vector3 => {
      const Fg = Forces.gravity(
        mass,
        PHYSICS_CONSTANTS.GRAVITY_ACCELERATION,
        new Vector3(
          PHYSICS_CONSTANTS.GRAVITY_DIRECTION.x,
          PHYSICS_CONSTANTS.GRAVITY_DIRECTION.y,
          PHYSICS_CONSTANTS.GRAVITY_DIRECTION.z
        )
      );

      const Fd = Forces.drag(
        state.velocity,
        PHYSICS_CONSTANTS.AIR_DENSITY_SEA_LEVEL,
        PHYSICS_CONSTANTS.PROJECTILE_DRAG_COEFFICIENT,
        PHYSICS_CONSTANTS.PROJECTILE_CROSS_SECTIONAL_AREA
      );

      const totalForce = Forces.sum(Fg, Fd);
      return totalForce.multiply(1 / mass);
    };

    const physicsEngine = new PhysicsEngine(accelerationFunction);

    // 初期状態
    let state: State3D = {
      position: new Vector3(
        this.artilleryPosition.x,
        this.artilleryPosition.y,
        this.artilleryPosition.z
      ),
      velocity: initialVelocity,
    };

    // 軌跡計算
    const dt = PHYSICS_CONSTANTS.PHYSICS_TIMESTEP;
    const maxTime = PHYSICS_CONSTANTS.MAX_PROJECTILE_LIFETIME;
    let time = 0;

    while (time < maxTime) {
      // 3Dワールド座標をそのまま記録
      trajectory.push(
        new Vector3(state.position.x, state.position.y, state.position.z)
      );

      // 物理積分
      state = physicsEngine.integrate(state, time, dt);
      time += dt;

      // 終了条件
      if (state.position.z <= PHYSICS_CONSTANTS.GROUND_LEVEL) {
        break;
      }
    }

    if (trajectory.length === 0) {
      ctx.restore();
      return;
    }

    // 軌跡線描画（ターゲット表示と同じ方法）
    ctx.strokeStyle = CRT_COLORS.WARNING_TEXT;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();

    let firstPoint = true;
    trajectory.forEach(point => {
      // 既存のworldToRadarScreen()を使用（ターゲットと同じ変換）
      const screenPos = this.worldToRadarScreen(
        point,
        radarLeft,
        radarTop,
        radarWidth,
        radarHeight,
        false // vertical radar
      );

      if (screenPos) {
        if (firstPoint) {
          ctx.moveTo(screenPos.x, screenPos.y);
          firstPoint = false;
        } else {
          ctx.lineTo(screenPos.x, screenPos.y);
        }
      }
    });

    ctx.stroke();
    ctx.restore();
  }

  /**
   * Calculate vertical trajectory projection (T049)
   */
  private calculateVerticalTrajectory(): Vector3[] {
    const trajectory: Vector3[] = [];

    // Use current artillery angle settings
    const azimuthRad = (this.azimuthAngle * Math.PI) / 180;
    const elevationRad = (this.elevationAngle * Math.PI) / 180;

    // Initial velocity calculation using projectile physics
    const muzzleVelocity = PHYSICS_CONSTANTS.MUZZLE_VELOCITY;
    const initialVelocity = new Vector3(
      muzzleVelocity * Math.sin(azimuthRad) * Math.cos(elevationRad),
      muzzleVelocity * Math.cos(azimuthRad) * Math.cos(elevationRad),
      muzzleVelocity * Math.sin(elevationRad)
    );

    // Set up physics engine with same forces as real projectiles
    const mass = PHYSICS_CONSTANTS.PROJECTILE_MASS;
    const accelerationFunction = (state: State3D, _time: number): Vector3 => {
      const Fg = Forces.gravity(
        mass,
        PHYSICS_CONSTANTS.GRAVITY_ACCELERATION,
        new Vector3(
          PHYSICS_CONSTANTS.GRAVITY_DIRECTION.x,
          PHYSICS_CONSTANTS.GRAVITY_DIRECTION.y,
          PHYSICS_CONSTANTS.GRAVITY_DIRECTION.z
        )
      );

      const Fd = Forces.drag(
        state.velocity,
        PHYSICS_CONSTANTS.AIR_DENSITY_SEA_LEVEL,
        PHYSICS_CONSTANTS.PROJECTILE_DRAG_COEFFICIENT,
        PHYSICS_CONSTANTS.PROJECTILE_CROSS_SECTIONAL_AREA
      );

      const totalForce = Forces.sum(Fg, Fd);
      return totalForce.multiply(1 / mass); // F = ma -> a = F/m
    };

    const physicsEngine = new PhysicsEngine(accelerationFunction);

    // Initial state
    let state: State3D = {
      position: new Vector3(
        this.artilleryPosition.x,
        this.artilleryPosition.y,
        this.artilleryPosition.z
      ),
      velocity: initialVelocity,
    };

    // Use same timestep as physics simulation
    const dt = PHYSICS_CONSTANTS.PHYSICS_TIMESTEP;
    const maxTime = PHYSICS_CONSTANTS.MAX_PROJECTILE_LIFETIME;
    let time = 0;

    // Simulate trajectory using RK4 integration
    while (time < maxTime) {
      // Project 3D trajectory onto vertical plane aligned with current radar bearing
      // This creates a side-view showing altitude vs. distance
      const horizontalDistance = Math.sqrt(
        Math.pow(state.position.x - this.artilleryPosition.x, 2) +
          Math.pow(state.position.y - this.artilleryPosition.y, 2)
      );

      // Create a pseudo-position for vertical radar display
      const verticalPoint = new Vector3(
        horizontalDistance, // X = horizontal distance from artillery
        0, // Y = 0 (not used in vertical radar)
        state.position.z // Z = altitude
      );

      trajectory.push(verticalPoint);

      // Integrate physics state
      state = physicsEngine.integrate(state, time, dt);
      time += dt;

      // Stop if projectile hits ground or goes too far
      if (
        state.position.z <= PHYSICS_CONSTANTS.GROUND_LEVEL ||
        horizontalDistance > this.maxRadarRange * 2
      ) {
        break;
      }
    }

    return trajectory;
  }

  /**
   * Update lead angle calculation using TargetTracker (GS-07)
   */
  private updateLeadAngleCalculation(): void {
    if (this.targetingState === TargetingState.LOCKED_ON && this.lockedTarget) {
      // Use LeadAngleCalculator for basic lead angle calculation
      const targetVelocity = this.lockedTarget.velocity || new Vector3(0, 0, 0);

      const leadAngle = this.leadAngleCalculator.calculateLeadAngle(
        this.artilleryPosition,
        this.lockedTarget.position,
        targetVelocity
      );

      // Determine confidence based on target speed and distance
      const speed = targetVelocity.magnitude();
      const distance = this.lockedTarget.position
        .subtract(this.artilleryPosition)
        .magnitude();

      let confidence: 'HIGH' | 'MEDIUM' | 'LOW';
      if (speed < 30 && distance < 3000) {
        confidence = 'HIGH';
      } else if (speed < 80 && distance < 8000) {
        confidence = 'MEDIUM';
      } else {
        confidence = 'LOW';
      }

      // Estimate flight time for display
      const flightTime = this.leadAngleCalculator.estimateFlightTime(distance);

      this.renderLeadAngleDisplay(
        leadAngle.azimuth,
        leadAngle.elevation,
        confidence,
        undefined, // No convergence error for basic calculation
        flightTime
      );
    } else {
      // Target not locked: Clear display
      this.clearLeadAngleDisplay();
    }
  }

  /**
   * Render lead angle display with confidence indication (GS-07, UI-06)
   */
  private renderLeadAngleDisplay(
    azimuth: number,
    elevation: number,
    confidence: 'HIGH' | 'MEDIUM' | 'LOW',
    convergenceError?: number,
    flightTime?: number
  ): void {
    // This will be rendered in renderTargetingInfo method
    // Store current lead angle values for display
    this.currentLeadAngle = {
      azimuth,
      elevation,
      confidence,
      convergenceError,
      flightTime,
    };
  }

  /**
   * Clear lead angle display
   */
  private clearLeadAngleDisplay(): void {
    this.currentLeadAngle = null;
  }

  /**
   * Render lead angle visualization on horizontal radar (GS-07)
   */
  private renderLeadAngleVisualization(
    ctx: CanvasRenderingContext2D,
    radarLeft: number,
    radarTop: number,
    radarWidth: number,
    radarHeight: number
  ): void {
    if (this.targetingState !== TargetingState.LOCKED_ON || !this.lockedTarget)
      return;

    const leadAngle = this.currentLeadAngle;
    if (!leadAngle) return;

    // Calculate predicted impact position using lead angles
    const targetVelocity = this.lockedTarget.velocity || new Vector3(0, 0, 0);
    const flightTime =
      leadAngle.flightTime ||
      this.leadAngleCalculator.estimateFlightTime(
        this.lockedTarget.position.subtract(this.artilleryPosition).magnitude()
      );

    // Simple future position prediction: current position + velocity * time
    const futurePos = this.lockedTarget.position.add(
      targetVelocity.multiply(flightTime)
    );
    const futureScreenPos = this.worldToRadarScreen(
      futurePos,
      radarLeft,
      radarTop,
      radarWidth,
      radarHeight,
      true
    );

    if (futureScreenPos) {
      ctx.save();

      // Draw predicted target position
      ctx.strokeStyle = CRT_COLORS.CRITICAL_TEXT;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(futureScreenPos.x, futureScreenPos.y, 10, 0, 2 * Math.PI);
      ctx.stroke();

      // Draw predicted impact point (at same location for basic visualization)
      const confidenceColor =
        leadAngle.confidence === 'HIGH'
          ? CRT_COLORS.TARGET_LOCKED
          : leadAngle.confidence === 'MEDIUM'
            ? CRT_COLORS.WARNING_TEXT
            : CRT_COLORS.CRITICAL_TEXT;

      ctx.fillStyle = confidenceColor;
      ctx.beginPath();
      ctx.arc(futureScreenPos.x, futureScreenPos.y, 6, 0, 2 * Math.PI);
      ctx.fill();

      // Draw crosshair
      ctx.strokeStyle = confidenceColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(futureScreenPos.x - 10, futureScreenPos.y);
      ctx.lineTo(futureScreenPos.x + 10, futureScreenPos.y);
      ctx.moveTo(futureScreenPos.x, futureScreenPos.y - 10);
      ctx.lineTo(futureScreenPos.x, futureScreenPos.y + 10);
      ctx.stroke();

      // Label
      ctx.fillStyle = confidenceColor;
      ctx.font = FONTS.SMALL;
      ctx.fillText('LEAD', futureScreenPos.x + 15, futureScreenPos.y - 5);

      ctx.restore();
    }
  }
}
