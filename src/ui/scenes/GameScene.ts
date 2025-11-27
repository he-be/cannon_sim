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
import { Vector3 } from '../../math/Vector3';
import { EffectRenderer } from '../../rendering/renderers/EffectRenderer';
import { PhysicsEngine, State3D } from '../../physics/PhysicsEngine';
import { TrajectoryRenderer } from '../../rendering/TrajectoryRenderer';

import {
  PHYSICS_CONSTANTS,
  GAME_CONSTANTS,
  CRT_COLORS,
} from '../../data/Constants';
import { Target, TargetType } from '../../game/entities/Target';
import { Artillery } from '../../game/entities/Artillery';
import { UIEvents } from '../UIManager';
import { RadarTarget } from '../components/RadarRenderer';
import { UIController } from '../controllers/UIController';
import { UIControllerA } from '../controllers/UIControllerA';
import { UIControllerB } from '../controllers/UIControllerB';
import { UIMode } from '../UIMode';
import { StandardPhysics } from '../../physics/StandardPhysics';
import { EntityManager } from '../../game/EntityManager';
import { RadarController } from '../../game/RadarController';
import { TargetingSystem, TargetingState } from '../../game/TargetingSystem';
import { LeadAngleSystem, ExtendedLeadAngle } from '../../game/LeadAngleSystem';
import { InputHandler } from '../../input/InputHandler';

export enum GameState {
  PLAYING = 'playing',
  PAUSED = 'paused',
  GAME_OVER = 'game_over',
  STAGE_CLEAR = 'stage_clear',
}

export interface GameSceneConfig {
  selectedStage: StageConfig;
  uiMode?: UIMode;
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
  private mouseHandler: MouseHandler; // This property is no longer used but kept for now as per instruction to only make explicit changes.
  private onSceneTransition: (transition: SceneTransition) => void;
  private config: GameSceneConfig;
  private effectRenderer: EffectRenderer;
  private physicsEngine: PhysicsEngine;
  private trajectoryRenderer: TrajectoryRenderer;

  private uiController: UIController;

  // Game state
  private gameState: GameState = GameState.PLAYING;
  private gameTime: number = 0;
  private startTime: number = 0;

  // Game entities
  private entityManager: EntityManager;
  // targets and projectiles are now managed by entityManager
  private artillery: Artillery;
  private artilleryPosition: Vector3;
  private inputHandler: InputHandler;

  // Targeting system
  private targetingSystem: TargetingSystem;
  // Auto mode for automatic artillery control
  private isAutoMode: boolean = false;

  // Artillery controls
  // Artillery controls
  // Removed: azimuthAngle and elevationAngle are now managed by Artillery entity

  // Radar controls managed by UIController
  // Radar state is now accessed via uiController.getRadarState()
  private maxRadarRange: number = GAME_CONSTANTS.MAX_RADAR_RANGE;

  // Mouse control is now handled by UIManager

  // UI interaction is now handled by UIManager

  // Lead angle calculation (GS-07)

  private leadAngleSystem: LeadAngleSystem;

  // Animation
  private animationTime: number = 0;

  // Radar state (independent from artillery)
  // Radar state is now managed by RadarController
  private radarController: RadarController;
  // private radarAzimuth: number = 0;
  // private radarElevation: number = 45;
  // private isRadarAutoRotating: boolean = false;
  // private readonly RADAR_ROTATION_SPEED = 30;

  // Keyboard state for game controls (arrow keys handled by UIController)
  // Removed: ArrowLeft, ArrowRight, ArrowUp, ArrowDown - now in UIController

  // Radar control speeds moved to UIController

  // UI Layout is now handled by UIManager

  constructor(
    canvasManager: CanvasManager,
    onSceneTransition: (transition: SceneTransition) => void,
    config: GameSceneConfig
  ) {
    this.canvasManager = canvasManager;
    this.onSceneTransition = onSceneTransition;
    this.config = config;
    this.mouseHandler = new MouseHandler(this.canvasManager.getCanvas()); // This line is kept as per instruction to only make explicit changes.
    this.effectRenderer = new EffectRenderer(this.canvasManager);

    // Initialize EntityManager
    this.entityManager = new EntityManager();

    // Initialize artillery position
    this.artilleryPosition = new Vector3(
      this.config.selectedStage.artilleryPosition.x,
      this.config.selectedStage.artilleryPosition.y,
      this.config.selectedStage.artilleryPosition.z
    );

    // Initialize Artillery entity
    this.artillery = new Artillery(this.artilleryPosition);

    // Initialize systems
    this.targetingSystem = new TargetingSystem();
    this.leadAngleSystem = new LeadAngleSystem(this.artilleryPosition);

    // Initialize RadarController
    this.radarController = new RadarController();

    // Define UI Events
    const uiEvents: UIEvents = {
      onAzimuthChange: (value: number) => {
        this.radarController.setAzimuth(value);
        this.radarController.setAutoRotating(false);
      },
      onElevationChange: (value: number) => {
        this.radarController.setElevation(value);
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
      onRadarRotateToggle: () => {
        this.toggleRadarAutoRotation();
      },
      onMenuClick: () => {
        this.onSceneTransition({ type: SceneType.TITLE });
      },
      onDirectionChange: (_azimuth: number, _elevation: number) => {
        // Radar state is managed by UIController
      },
      onRangeChange: (_range: number) => {
        // Radar state is managed by UIController
      },
      onTargetDetected: (_target: RadarTarget) => {
        // Handle target detection if needed
      },
      onTargetLost: (_targetId: string) => {
        // Handle target loss if needed
      },
    };

    // Initialize UI Controller
    if (this.config.uiMode === UIMode.MODE_A) {
      this.uiController = new UIControllerA(this.canvasManager, uiEvents);
    } else {
      // Use Mode B (Circular Scope) by default
      this.uiController = new UIControllerB(
        this.canvasManager,
        uiEvents,
        this.radarController
      );
    }

    // Initialize Input Handler
    this.inputHandler = new InputHandler(
      {
        onFire: (): void => {
          if (this.gameState === GameState.STAGE_CLEAR) {
            this.onSceneTransition({ type: SceneType.STAGE_SELECT });
          } else if (this.gameState === GameState.PLAYING) {
            this.fireProjectile();
          }
        },
        onLockToggle: (): void => this.handleTargetLock(),
        onAutoToggle: (): void => this.handleAutoToggle(),
        onRestart: (): void => {
          if (this.gameState === GameState.GAME_OVER) {
            this.initializeGame();
          }
        },
        onSceneTransition: (transition): void =>
          this.onSceneTransition(transition),
        onCancelAutoRotation: (): void => {
          if (this.radarController.isRotating()) {
            this.radarController.setAutoRotating(false);
            console.log('Radar auto-rotation cancelled by manual input');
          }
        },
        onRadarRotateToggle: (): void => this.toggleRadarAutoRotation(),
      },
      this.uiController
    );
    this.inputHandler.attach();

    // Initialize radar state
    this.radarController.reset();

    // Initialize physics engine with RK4 integration
    // Initialize physics engine with RK4 integration
    // Use centralized physics logic for consistency
    this.physicsEngine = new PhysicsEngine(
      StandardPhysics.accelerationFunction
    );

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

    // Initialize Artillery entity
    this.artillery = new Artillery(this.artilleryPosition);

    // Initialize lead angle calculator for GS-07 requirement
    // Initialize LeadAngleSystem
    this.leadAngleSystem = new LeadAngleSystem(this.artilleryPosition);

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

    // Initialize radar state
    // Initialize radar state
    this.radarController.reset();

    // Initialize targets via EntityManager
    const targets = this.config.selectedStage.targets.map(
      config =>
        new Target(
          new Vector3(config.position.x, config.position.y, config.position.z),
          config.type,
          config.velocity
            ? new Vector3(
                config.velocity.x,
                config.velocity.y,
                config.velocity.z
              )
            : undefined,
          this.gameTime + config.spawnDelay
        )
    );
    this.entityManager.initializeTargets(targets);

    // Clear effects
    this.effectRenderer.clearAll();

    // Reset targeting
    // Reset targeting
    this.targetingSystem.reset();
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
  }

  /**
   * Update game state
   */
  update(deltaTime: number): void {
    this.animationTime += deltaTime;
    this.gameTime = (Date.now() - this.startTime) / 1000;

    if (this.gameState !== GameState.PLAYING) return;

    // Handle radar auto-rotation
    // Handle radar auto-rotation
    if (this.targetingSystem.getTargetingState() !== TargetingState.LOCKED_ON) {
      const newState = this.radarController.updateAutoRotation(deltaTime);
      if (newState) {
        // Sync with UIController so manual control continues from current position
        this.uiController.setRadarState(newState);
      }
    }

    // Update targets
    this.updateTargets(deltaTime);

    // Update artillery (heavy cannon mechanics)
    this.artillery.update(deltaTime);

    // AUTO mode: Track Calculated Lead
    const leadAngle = this.leadAngleSystem.getLeadAngle();
    if (this.isAutoMode && leadAngle) {
      this.artillery.setCommandedAngles(leadAngle.azimuth, leadAngle.elevation);
    }

    // Update UI controls (delegated to UIController)
    // When locked on target, radar automatically tracks the target
    const isLocked =
      this.targetingSystem.getTargetingState() === TargetingState.LOCKED_ON;
    if (isLocked && this.targetingSystem.getLockedTarget()) {
      // Update radar to follow locked target
      this.updateRadarToLockedTarget();
    }
    // Pass lock state to prevent manual radar movement when locked
    this.uiController.updateControls(deltaTime, isLocked);

    // Update projectiles
    this.updateProjectiles(deltaTime);

    // Update effects
    this.effectRenderer.update(deltaTime);

    // Check collisions
    this.checkCollisions();

    // Update targeting system
    this.updateTargeting(deltaTime);

    // Update trajectory prediction (UI-13/UI-16)
    this.updateTrajectoryPrediction();

    // Update lead angle calculation
    this.updateLeadAngleCalculation(deltaTime);

    // Check win/lose conditions
    this.checkGameConditions();
  }

  /**
   * Update UI state with current game data
   */
  private updateUIState(): void {
    // Update artillery angles (display both current and commanded)
    // Note: UIManager needs update to support displaying both
    // For now, we pass current angles as the main display
    this.uiController
      .getUIManager()
      .setArtilleryAngles(
        this.artillery.currentAzimuth,
        this.artillery.currentElevation
      );

    // Update artillery reload state
    this.uiController
      .getUIManager()
      .setArtilleryState(
        this.artillery.canFire(),
        this.artillery.reloadProgress
      );

    // Update radar state
    const radarState = this.uiController.getRadarState();
    this.uiController
      .getUIManager()
      .setRadarDirection(radarState.azimuth, radarState.elevation);

    // For UI B, radarState.range is the rangeGate (cursor position)
    // For UI A, radarState.range is the display range
    // Check if UIManager has setRangeGate method (UI B specific)
    const uiManager = this.uiController.getUIManager();
    if ('setRangeGate' in uiManager) {
      // UI B: Set range gate only, display range is always 15km
      (
        uiManager as typeof uiManager & {
          setRangeGate: (range: number) => void;
        }
      ).setRangeGate(radarState.range);
    } else {
      // UI A: Set display range (zoom functionality)
      uiManager.setRadarRange(radarState.range);
    }

    // Update radar info display in left panel (moved from center pane)
    this.uiController
      .getUIManager()
      .setRadarInfo(radarState.azimuth, radarState.elevation, radarState.range);

    // Update game time
    this.uiController.getUIManager().setGameTime(this.gameTime);

    // Update lock state
    this.uiController
      .getUIManager()
      .setLockState(
        this.targetingSystem.getTargetingState() === TargetingState.LOCKED_ON
      );

    // Update auto mode state
    this.uiController.getUIManager().setAutoMode(this.isAutoMode);

    // Update target information
    const displayTarget =
      this.targetingSystem.getLockedTarget() ||
      this.targetingSystem.getTrackedTarget();
    if (displayTarget) {
      const distance = displayTarget.position
        .subtract(this.artilleryPosition)
        .magnitude();
      const speed = displayTarget.velocity
        ? displayTarget.velocity.magnitude()
        : 0;

      this.uiController.getUIManager().setTargetInfo({
        status: this.targetingSystem.getTargetingState(),
        type: this.getTargetDisplayName(displayTarget.type as TargetType),
        range: distance,
        speed: speed,
      });
    } else {
      this.uiController.getUIManager().setTargetInfo(null);
    }

    // Update target list (TRACK)
    const targetListData = this.entityManager
      .getTargets()
      .filter(t => !t.isDestroyed && this.gameTime >= t.spawnTime)
      .map(target => {
        const relativePos = target.position.subtract(this.artilleryPosition);
        const distance = relativePos.magnitude();

        // Calculate bearing (azimuth)
        // Math.atan2(y, x) gives angle from East (0) CCW
        // Navigation bearing is from North (0) CW
        // Bearing = 90 - Math.atan2(y, x)
        const mathAngle =
          Math.atan2(relativePos.y, relativePos.x) * (180 / Math.PI);
        let bearing = 90 - mathAngle;
        if (bearing < 0) bearing += 360;
        bearing = bearing % 360;

        // Calculate if approaching or receding
        // Dot product of velocity and relative position vector
        // If negative, they are opposing (approaching)
        // If positive, they are aligned (receding)
        let isApproaching = false;
        if (target.velocity) {
          const dot = target.velocity.dot(relativePos);
          isApproaching = dot < 0;
        }

        return {
          id: target.id, // Use formatted Txx ID
          bearing: bearing,
          distance: distance,
          altitude: target.position.z,
          isApproaching: isApproaching,
        };
      });

    this.uiController.getUIManager().setTargetList(targetListData);

    // Update lead angle
    const currentLeadAngle = this.leadAngleSystem.getLeadAngle();
    if (currentLeadAngle) {
      this.uiController.getUIManager().setLeadAngle(currentLeadAngle);
    } else {
      this.uiController.getUIManager().setLeadAngle(null);
    }

    // Update radar targets
    this.updateRadarTargets();

    // Update projectiles
    this.uiController
      .getUIManager()
      .updateProjectiles(this.entityManager.getProjectiles());

    // Update trajectory prediction
    this.updateUITrajectoryPrediction();
  }

  private updateRadarTargets(): void {
    // First, remove fully destroyed targets from radar
    this.entityManager.getTargets().forEach(target => {
      if (target.isDestroyed) {
        this.uiController.getUIManager().removeRadarTarget(target.id);
      }
    });

    // Convert game targets to radar targets (active and falling targets)
    this.entityManager.getTargets().forEach(target => {
      // Show active and falling targets, but not fully destroyed ones
      if (target.isDestroyed || this.gameTime < target.spawnTime) return;

      const dx = target.position.x - this.artilleryPosition.x;
      const dy = target.position.y - this.artilleryPosition.y;
      const dz = target.position.z - this.artilleryPosition.z;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const bearing = Math.atan2(dx, dy) * (180 / Math.PI);
      const elevation = Math.atan2(dz, distance) * (180 / Math.PI);

      const radarTarget: RadarTarget = {
        id: target.id,
        position: target.position,
        velocity: target.velocity || new Vector3(0, 0, 0),
        type: target.type,
        bearing: bearing,
        distance: distance,
        elevation: elevation,
        strength: 1.0, // Full strength
      };

      this.uiController.getUIManager().updateRadarTarget(radarTarget);
    });
  }

  private updateUITrajectoryPrediction(): void {
    // Calculate trajectory prediction using the same method as before
    const trajectory = this.calculateTrajectoryPrediction();
    this.uiController.getUIManager().updateTrajectoryPrediction(trajectory);
  }

  private calculateTrajectoryPrediction(): Vector3[] {
    const trajectory: Vector3[] = [];

    const azimuthRad = (this.artillery.currentAzimuth * Math.PI) / 180;
    const elevationRad = (this.artillery.currentElevation * Math.PI) / 180;

    const muzzleVelocity = PHYSICS_CONSTANTS.MUZZLE_VELOCITY;
    const initialVelocity = new Vector3(
      muzzleVelocity * Math.sin(azimuthRad) * Math.cos(elevationRad),
      muzzleVelocity * Math.cos(azimuthRad) * Math.cos(elevationRad),
      muzzleVelocity * Math.sin(elevationRad)
    );

    // Use same physics setup as projectiles via centralized StandardPhysics
    const physicsEngine = new PhysicsEngine(
      StandardPhysics.accelerationFunction
    );

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
    this.uiController.getUIManager().render(this.animationTime);

    // Render game state overlays
    this.renderGameStateOverlay();

    // Render effects on top
    this.effectRenderer.render();
  }

  /**
   * Cleanup resources
   */
  /**
   * Cleanup resources
   */
  destroy(): void {
    this.mouseHandler.destroy();
    this.inputHandler.detach();
  }

  /**
   * Update target states
   */
  private updateTargets(deltaTime: number): void {
    // Delegate update to EntityManager
    this.entityManager.updateTargets(deltaTime, this.gameTime);

    // Check game over conditions
    // Check game over conditions
    if (
      this.entityManager.checkGameOverCondition(
        this.artilleryPosition,
        GAME_CONSTANTS.GAME_OVER_DISTANCE,
        this.gameTime
      )
    ) {
      this.handleGameOver();
    }
  }

  /**
   * Update projectile states
   */
  private updateProjectiles(deltaTime: number): void {
    this.entityManager.updateProjectiles(
      deltaTime,
      this.gameTime,
      this.physicsEngine,
      projectile => {
        // On impact callback
        if (projectile.position.z <= PHYSICS_CONSTANTS.GROUND_LEVEL) {
          this.createExplosion(projectile.position, 'projectile_impact');
        }
        // Remove trajectory trail when projectile is destroyed (T023)
        this.trajectoryRenderer.removeTrajectory(projectile.id);
      },
      projectile => {
        // Update projectile trajectory trail (T023 requirement)
        this.trajectoryRenderer.updateTrajectory(
          projectile.id,
          [projectile.position],
          projectile.velocity
        );
      }
    );
  }

  /**
   * Check collisions
   */
  /**
   * Check collisions
   */
  private checkCollisions(): void {
    const collisions = this.entityManager.checkCollisions(this.gameTime);

    collisions.forEach(collision => {
      if (this.isPositionInRadarRange(collision.collisionPoint)) {
        this.createExplosion(collision.collisionPoint, 'target_destruction');
      }
      // Target hit logic is handled by EntityManager (target.hit())
    });
  }

  /**
   * Update targeting system
   */
  private updateTargeting(_deltaTime: number): void {
    const radarState = this.uiController.getRadarState();

    // Update targeting system
    const result = this.targetingSystem.update(
      this.entityManager.getTargets(),
      radarState.azimuth,
      radarState.range,
      this.artilleryPosition,
      this.gameTime
    );

    // Check if lock was lost (e.g. target destroyed)
    if (this.isAutoMode && result.state !== TargetingState.LOCKED_ON) {
      this.isAutoMode = false;
      console.log('Target lost, auto mode disabled');
    }
  }

  /**
   * Check game win/lose conditions
   */
  private checkGameConditions(): void {
    // Check stage clear (all targets destroyed)
    const activeTargets = this.entityManager.getActiveTargets(this.gameTime);
    const allTargets = this.entityManager.getTargets();

    if (
      activeTargets.length === 0 &&
      allTargets.length > 0 &&
      this.entityManager.areAllTargetsDestroyed()
    ) {
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
  /**
   * Handle mouse events
   */
  private handleMouseEvent(event: MouseEventData): void {
    this.inputHandler.handleMouseEvent(event);
  }

  /**
   * Fire a projectile
   */
  private fireProjectile(): void {
    // Use artillery entity to fire
    if (!this.artillery.canFire()) return;

    // Set target position if locked (though firing uses current angles)
    const lockedTarget = this.targetingSystem.getLockedTarget();
    if (lockedTarget) {
      this.artillery.setTargetPosition(
        lockedTarget.position,
        lockedTarget.velocity
      );
    }

    const projectileData = this.artillery.fire();

    const projectile: ProjectileState = {
      id: `projectile-${Date.now()}`,
      position: projectileData.position,
      velocity: projectileData.velocity,
      isActive: true,
      spawnTime: this.gameTime,
    };

    this.entityManager.addProjectile(projectile);

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
    const azimuthRad = this.artillery.currentAzimuth * (Math.PI / 180);
    const elevationRad = this.artillery.currentElevation * (Math.PI / 180);

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
   * Handle target lock toggle
   */
  private handleTargetLock(): void {
    const result = this.targetingSystem.handleLockToggle();

    if (result.state === TargetingState.LOCKED_ON) {
      console.log('Target LOCKED');
    } else {
      console.log('Target UNLOCKED');
      this.isAutoMode = false; // Disable auto mode when unlocking
    }
  }

  /**
   * Handle auto mode toggle
   */
  private handleAutoToggle(): void {
    // Only allow auto mode when target is locked
    if (this.targetingSystem.getTargetingState() === TargetingState.LOCKED_ON) {
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
   * Update radar to point at locked target
   * Used for automatic target tracking when locked on
   */
  private updateRadarToLockedTarget(): void {
    const target = this.targetingSystem.getLockedTarget();
    if (!target) return;

    // Calculate direction to target
    const dx = target.position.x - this.artilleryPosition.x;
    const dy = target.position.y - this.artilleryPosition.y;
    const dz = target.position.z - this.artilleryPosition.z;

    // Calculate horizontal distance (radar range)
    const horizontalDistance = Math.sqrt(dx * dx + dy * dy);

    // Calculate azimuth angle from artillery to target (Unified: XY plane)
    let azimuth = Math.atan2(dx, dy) * (180 / Math.PI);
    if (azimuth < 0) azimuth += 360;

    // Calculate elevation angle
    const elevation = Math.atan2(dz, horizontalDistance) * (180 / Math.PI);

    // Update radar controller
    this.radarController.trackPosition(azimuth, elevation);

    // Update UIController's radar state to track target
    this.uiController.setRadarState({
      azimuth: azimuth,
      elevation: elevation,
      range: horizontalDistance,
    });
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
  /**
   * Handle keyboard key down events
   */

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
   * Toggle radar auto-rotation
   */
  private toggleRadarAutoRotation(): void {
    const isRotating = this.radarController.toggleAutoRotation();
    console.log(`Radar auto-rotation: ${isRotating ? 'ON' : 'OFF'}`);
  }

  /**
   * Update lead angle calculation using TargetTracker (GS-07)
   */
  private updateLeadAngleCalculation(deltaTime: number): void {
    const lockedTarget = this.targetingSystem.getLockedTarget();

    // Update lead angle system
    const updated = this.leadAngleSystem.update(deltaTime, lockedTarget);

    if (updated) {
      const leadAngle = this.leadAngleSystem.getLeadAngle();
      if (leadAngle) {
        // Apply to artillery if in auto mode
        if (this.isAutoMode) {
          this.artillery.setCommandedAngles(
            leadAngle.azimuth,
            leadAngle.elevation
          );
          console.log(
            `Auto mode: Applied Az=${leadAngle.azimuth.toFixed(1)}°, El=${leadAngle.elevation.toFixed(1)}°`
          );
        }

        // Update UI
        this.renderLeadAngleDisplay(leadAngle);
      }
    } else if (!lockedTarget) {
      this.clearLeadAngleDisplay();
    }
  }

  /**
   * Render lead angle display with confidence indication (GS-07, UI-06)
   */
  private renderLeadAngleDisplay(leadAngle: ExtendedLeadAngle): void {
    // Use UIController to update lead angle display
    this.uiController.updateLeadAngle(leadAngle);
  }

  /**
   * Clear lead angle display
   */
  private clearLeadAngleDisplay(): void {
    this.leadAngleSystem.clear();
  }

  /**
   * Handle game over
   */
  private handleGameOver(): void {
    this.gameState = GameState.GAME_OVER;
  }

  /**
   * Create explosion effect
   */
  private createExplosion(
    position: Vector3,
    type: 'projectile_impact' | 'target_destruction' = 'projectile_impact'
  ): void {
    this.effectRenderer.createExplosion(position, type);
  }

  /**
   * Render lead angle visualization on horizontal radar (GS-07)
   */
  // REMOVED: renderLeadAngleVisualization() - now handled by UIManager
}
