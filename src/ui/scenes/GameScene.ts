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
} from '../../data/Constants';
import { TargetType } from '../../game/entities/Target';
import { UIManager, UIEvents } from '../UIManager';
import { RadarTarget } from '../components/RadarRenderer';

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
  private uiManager: UIManager;

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
  // Auto mode for automatic artillery control
  private isAutoMode: boolean = false;

  // Artillery controls
  private azimuthAngle: number = 0;
  private elevationAngle: number = 45;

  // Radar controls
  private radarAzimuth: number = 0;
  private radarElevation: number = 0; // レーダー仰角（度）
  private radarRange: number = GAME_CONSTANTS.DEFAULT_RADAR_RANGE;
  private maxRadarRange: number = GAME_CONSTANTS.MAX_RADAR_RANGE;

  // Mouse control is now handled by UIManager

  // UI interaction is now handled by UIManager

  // Lead angle calculation (GS-07)
  private leadAngleUpdateTimer: number = 0;
  private currentLeadAngle: ExtendedLeadAngle | null = null;
  private readonly LEAD_ANGLE_UPDATE_INTERVAL = 0.5; // 500ms間隔

  // Animation
  private animationTime: number = 0;

  // UI Layout is now handled by UIManager

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

    // Initialize UI Manager with event handlers
    const uiEvents: UIEvents = {
      onAzimuthChange: (value: number) => {
        this.azimuthAngle = value;
      },
      onElevationChange: (value: number) => {
        this.elevationAngle = value;
      },
      onFireClick: () => {
        this.fireProjectile();
      },
      onLockToggle: () => {
        this.handleTargetLock();
      },
      onAutoToggle: () => {
        this.handleAutoToggle();
      },
      onMenuClick: () => {
        this.onSceneTransition({ type: SceneType.TITLE });
      },
      onDirectionChange: (azimuth: number, elevation: number) => {
        this.radarAzimuth = azimuth;
        this.radarElevation = elevation;
      },
      onRangeChange: (range: number) => {
        this.radarRange = range;
      },
      onTargetDetected: (target: RadarTarget) => {
        // Handle target detection if needed
        console.log('Target detected:', target.id);
      },
      onTargetLost: (targetId: string) => {
        // Handle target loss if needed
        console.log('Target lost:', targetId);
      },
    };

    this.uiManager = new UIManager(this.canvasManager, uiEvents);

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

    // Reset auto mode
    this.isAutoMode = false;
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
   * Update UI state with current game data
   */
  private updateUIState(): void {
    // Update artillery angles
    this.uiManager.setArtilleryAngles(this.azimuthAngle, this.elevationAngle);

    // Update radar state
    this.uiManager.setRadarDirection(this.radarAzimuth, this.radarElevation);
    this.uiManager.setRadarRange(this.radarRange);

    // Update radar info display in left panel (moved from center pane)
    this.uiManager.setRadarInfo(
      this.radarAzimuth,
      this.radarElevation,
      this.radarRange
    );

    // Update game time
    this.uiManager.setGameTime(this.gameTime);

    // Update lock state
    this.uiManager.setLockState(
      this.targetingState === TargetingState.LOCKED_ON
    );

    // Update auto mode state
    this.uiManager.setAutoMode(this.isAutoMode);

    // Update target information
    const displayTarget = this.lockedTarget || this.trackedTarget;
    if (displayTarget) {
      const distance = displayTarget.position
        .subtract(this.artilleryPosition)
        .magnitude();
      const speed = displayTarget.velocity
        ? displayTarget.velocity.magnitude()
        : 0;

      this.uiManager.setTargetInfo({
        status: this.targetingState,
        type: this.getTargetDisplayName(displayTarget.type as TargetType),
        range: distance,
        speed: speed,
      });
    } else {
      this.uiManager.setTargetInfo(null);
    }

    // Update lead angle
    if (this.currentLeadAngle) {
      this.uiManager.setLeadAngle(this.currentLeadAngle);
    } else {
      this.uiManager.setLeadAngle(null);
    }

    // Update radar targets
    this.updateRadarTargets();

    // Update projectiles
    this.uiManager.updateProjectiles(this.projectiles);

    // Update trajectory prediction
    this.updateUITrajectoryPrediction();
  }

  private updateRadarTargets(): void {
    // First, remove destroyed targets from radar
    this.targets.forEach(target => {
      if (target.isDestroyed) {
        this.uiManager.removeRadarTarget(target.id);
      }
    });

    // Convert game targets to radar targets (only active ones)
    this.targets.forEach(target => {
      if (target.isDestroyed || this.gameTime < target.spawnTime) return;

      const dx = target.position.x - this.artilleryPosition.x;
      const dy = target.position.y - this.artilleryPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const bearing = Math.atan2(dx, dy) * (180 / Math.PI);

      const radarTarget: RadarTarget = {
        id: target.id,
        position: target.position,
        velocity: target.velocity || new Vector3(0, 0, 0),
        type: target.type,
        bearing: bearing,
        distance: distance,
        strength: 1.0, // Full strength
      };

      this.uiManager.updateRadarTarget(radarTarget);
    });
  }

  private updateUITrajectoryPrediction(): void {
    // Calculate trajectory prediction using the same method as before
    const trajectory = this.calculateTrajectoryPrediction();
    this.uiManager.updateTrajectoryPrediction(trajectory);
  }

  private calculateTrajectoryPrediction(): Vector3[] {
    const trajectory: Vector3[] = [];

    const azimuthRad = (this.azimuthAngle * Math.PI) / 180;
    const elevationRad = (this.elevationAngle * Math.PI) / 180;

    const muzzleVelocity = PHYSICS_CONSTANTS.MUZZLE_VELOCITY;
    const initialVelocity = new Vector3(
      muzzleVelocity * Math.sin(azimuthRad) * Math.cos(elevationRad),
      muzzleVelocity * Math.cos(azimuthRad) * Math.cos(elevationRad),
      muzzleVelocity * Math.sin(elevationRad)
    );

    // Use same physics setup as projectiles
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

    let state: State3D = {
      position: new Vector3(
        this.artilleryPosition.x,
        this.artilleryPosition.y,
        this.artilleryPosition.z
      ),
      velocity: initialVelocity,
    };

    const dt = PHYSICS_CONSTANTS.PHYSICS_TIMESTEP;
    const maxTime = PHYSICS_CONSTANTS.MAX_PROJECTILE_LIFETIME;
    let time = 0;
    let stepCounter = 0;

    // Sample every 10th step to reduce trajectory points while maintaining accuracy
    const SAMPLING_INTERVAL = 10;

    while (time < maxTime && trajectory.length < 1000) {
      if (stepCounter % SAMPLING_INTERVAL === 0) {
        trajectory.push(
          new Vector3(state.position.x, state.position.y, state.position.z)
        );
      }

      state = physicsEngine.integrate(state, time, dt);
      time += dt;
      stepCounter++;

      if (state.position.z <= PHYSICS_CONSTANTS.GROUND_LEVEL) {
        // Add the final ground impact point
        trajectory.push(
          new Vector3(state.position.x, state.position.y, state.position.z)
        );
        break;
      }
    }

    return trajectory;
  }

  /**
   * Render the game scene
   */
  render(): void {
    // Update UI Manager with current game state
    this.updateUIState();

    // Render UI (replaces all the individual render methods)
    this.uiManager.render();

    // Render game state overlays
    this.renderGameStateOverlay();

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
            // Disable auto mode when locked target is destroyed
            this.isAutoMode = false;
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
   * Render control panel (left pane)
   */
  // REMOVED: renderControlPanel() - now handled by UIManager

  /**
   * Render horizontal radar (center full area)
   */
  // REMOVED: renderHorizontalRadar() - now handled by UIManager

  /**
   * Render vertical radar (right pane - upper portion)
   */
  // REMOVED: renderVerticalRadar() - now handled by UIManager

  /**
   * Draw range cursor during radar range adjustment (horizontal line)
   */
  // REMOVED: drawRangeCursor() - now handled by UIManager

  /**
   * Render target information panel (right pane bottom)
   */
  // REMOVED: renderTargetInfoPanel() - now handled by UIManager

  /**
   * Draw radar grid (horizontal or vertical)
   */
  // REMOVED: drawRadarGrid() - now handled by UIManager

  /**
   * Draw targets on radar
   */
  // REMOVED: drawTargetsOnRadar() - now handled by UIManager

  /**
   * Draw projectiles on radar
   */
  // REMOVED: drawProjectilesOnRadar() - now handled by UIManager

  /**
   * Convert world position to radar screen coordinates
   */
  // REMOVED: worldToRadarScreen() - now handled by UIManager

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
  // REMOVED: renderScanLines() - now handled by UIManager

  /**
   * Handle mouse events
   */
  private handleMouseEvent(event: MouseEventData): void {
    const mousePos = new Vector2(
      event.position.canvas.x,
      event.position.canvas.y
    );

    // Route all mouse events through UIManager
    const handled = this.uiManager.handleMouseEvent(
      mousePos,
      event.type,
      event.button
    );

    if (!handled) {
      // Handle any game-specific mouse interactions that aren't UI-related
      // Currently, all mouse interactions are UI-related in this game
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
      // Disable auto mode when unlocking
      this.isAutoMode = false;
    } else {
      console.log(`No action: not in TRACKING state or no target available`);
    }
  }

  /**
   * Handle auto/manual mode toggle
   */
  private handleAutoToggle(): void {
    // Only allow auto mode when target is locked
    if (this.targetingState === TargetingState.LOCKED_ON && this.lockedTarget) {
      this.isAutoMode = !this.isAutoMode;
      console.log(`Auto mode ${this.isAutoMode ? 'enabled' : 'disabled'}`);

      // If switching to manual mode, clear any auto-set angles
      if (!this.isAutoMode) {
        console.log('Returned to manual control');
      }
    } else {
      console.log('Auto mode only available when target is locked');
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
  // REMOVED: getVesselSymbolSize() - now handled by UIManager

  /**
   * Draw vessel-specific symbol
   */
  // REMOVED: drawVesselSymbol() - now handled by UIManager

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
   * Render radar elevation display in horizontal radar (T046)
   */
  // REMOVED: renderRadarElevationDisplay() - now handled by UIManager

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
  // REMOVED: renderTrajectoryPrediction() - now handled by UIManager

  /**
   * Render vertical trajectory prediction on vertical radar (T049)
   */
  // REMOVED: renderVerticalTrajectoryPrediction() - now handled by UIManager

  /**
   * Calculate vertical trajectory projection (T049)
   */
  // REMOVED: calculateVerticalTrajectory() - now handled by UIManager

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

      // If in auto mode, apply lead angles to artillery
      if (this.isAutoMode) {
        this.azimuthAngle = leadAngle.azimuth;
        this.elevationAngle = leadAngle.elevation;
        console.log(
          `Auto mode: Applied Az=${leadAngle.azimuth.toFixed(1)}°, El=${leadAngle.elevation.toFixed(1)}°`
        );
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
  // REMOVED: renderLeadAngleVisualization() - now handled by UIManager
}
