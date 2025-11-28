/**
 * GameScene - Clean implementation with proper component integration
 * Implements UI-04: 3-pane layout for main gameplay
 * Implements TR-02: Canvas 2D API compliance (no DOM manipulation)
 * Implements all game system requirements
 */

import { CanvasManager } from '../../rendering/CanvasManager';
import { SceneTransition } from './TitleScene';

import { Vector3 } from '../../math/Vector3';
import { EffectRenderer } from '../../rendering/renderers/EffectRenderer';
import { PhysicsEngine } from '../../physics/PhysicsEngine';
import { TrajectoryRenderer } from '../../rendering/TrajectoryRenderer';

import { PHYSICS_CONSTANTS, GAME_CONSTANTS } from '../../data/Constants';
import {
  GameInputController,
  GameActions,
} from '../../input/GameInputController';
import { GameConfig, DEFAULT_GAME_CONFIG } from '../../game/GameConfig';
import { UIMode } from '../../ui/UIMode';
import { UIController } from '../controllers/UIController';
import { UIControllerA } from '../controllers/UIControllerA';
import { UIControllerB } from '../controllers/UIControllerB';
import { EntityManager } from '../../game/EntityManager';
import { Artillery } from '../../game/entities/Artillery';
import { RadarController } from '../../game/RadarController';
import { TargetingSystem, TargetingState } from '../../game/TargetingSystem';
import { LeadAngleSystem } from '../../game/LeadAngleSystem';
import { SceneInitializer } from '../../game/SceneInitializer';
import { GameRules } from '../../game/GameRules';
import { GameState } from '../../game/GameState';
import { MouseHandler, MouseEventData } from '../../input/MouseHandler';
import { UIStateMapper } from '../UIStateMapper';
import { ExtendedLeadAngle } from '../../game/LeadAngleSystem';
import { GameStateOverlay } from '../components/GameStateOverlay';
import { TrajectoryPredictionSystem } from '../../game/TrajectoryPredictionSystem';

export type GameSceneConfig = GameConfig;

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
  private onSceneTransition: (transition: SceneTransition) => void;
  private config: GameConfig;
  private effectRenderer: EffectRenderer;
  private inputController: GameInputController;
  private physicsEngine: PhysicsEngine;
  private trajectoryRenderer: TrajectoryRenderer;
  private mouseHandler: MouseHandler;
  private gameStateOverlay: GameStateOverlay;
  private trajectoryPredictionSystem: TrajectoryPredictionSystem;

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
    config: GameConfig = DEFAULT_GAME_CONFIG
  ) {
    this.canvasManager = canvasManager;
    this.onSceneTransition = onSceneTransition;
    this.config = config;
    this.mouseHandler = new MouseHandler(this.canvasManager.getCanvas());
    this.gameStateOverlay = new GameStateOverlay(this.canvasManager);

    // Initialize systems using SceneInitializer
    const systems = SceneInitializer.initializeSystems(
      this.canvasManager,
      this.config
    );

    this.effectRenderer = systems.effectRenderer;
    this.entityManager = systems.entityManager;
    this.artilleryPosition = systems.artilleryPosition;
    this.artillery = systems.artillery;
    this.targetingSystem = systems.targetingSystem;
    this.leadAngleSystem = systems.leadAngleSystem;
    this.radarController = systems.radarController;
    this.physicsEngine = systems.physicsEngine;
    this.trajectoryRenderer = systems.trajectoryRenderer;

    this.trajectoryPredictionSystem = new TrajectoryPredictionSystem(
      this.trajectoryRenderer
    );

    // Initialize GameInputController
    const gameActions: GameActions = {
      fireProjectile: () => this.fireProjectile(),
      toggleLock: () => this.handleTargetLock(),
      toggleAuto: () => this.handleAutoToggle(),
      toggleRadarRotation: () => this.toggleRadarAutoRotation(),
      transitionScene: type => this.onSceneTransition({ type }),
      restartGame: () => {
        if (this.gameState === GameState.GAME_OVER) {
          this.initializeGame();
        }
      },
      setRadarAzimuth: az => {
        this.radarController.setAzimuth(az);
        this.radarController.setAutoRotating(false);
      },
      setRadarElevation: el => this.radarController.setElevation(el),
      setRadarAutoRotating: rot => this.radarController.setAutoRotating(rot),
      isRadarRotating: () => this.radarController.isRotating(),
      getGameState: () => this.gameState,
    };

    this.inputController = new GameInputController(gameActions);

    // Define UI Events
    const uiEvents = this.inputController.getUIEvents();

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
    this.inputController.initialize(this.uiController);
    this.inputController.attach();

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

    SceneInitializer.resetGame(
      {
        entityManager: this.entityManager,
        artillery: this.artillery,
        radarController: this.radarController,
        targetingSystem: this.targetingSystem,
        leadAngleSystem: this.leadAngleSystem,
        physicsEngine: this.physicsEngine,
        trajectoryRenderer: this.trajectoryRenderer,
        effectRenderer: this.effectRenderer,
        artilleryPosition: this.artilleryPosition,
      },
      this.config,
      this.gameTime
    );
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Disable right-click context menu to enable right-click targeting
    this.canvasManager.getCanvas().addEventListener('contextmenu', e => {
      e.preventDefault();
    });

    // Setup mouse event handling
    this.mouseHandler.addEventListener((event: MouseEventData) => {
      this.inputController.handleMouseEvent(event);
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
    UIStateMapper.update(this.uiController, {
      artillery: this.artillery,
      targetingSystem: this.targetingSystem,
      entityManager: this.entityManager,
      leadAngleSystem: this.leadAngleSystem,
      gameTime: this.gameTime,
      isAutoMode: this.isAutoMode,
      artilleryPosition: this.artilleryPosition,
      physicsEngine: this.physicsEngine,
    });
  }

  /**
   * Render the game scene
   */
  render(): void {
    // Update UI Manager with current game data
    this.updateUIState();

    // Render UI (replaces all the individual render methods)
    this.uiController.getUIManager().render(this.animationTime);

    // Render game state overlays
    this.gameStateOverlay.render(this.gameState);

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
    this.inputController.detach();
    this.mouseHandler.destroy();
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
    GameRules.checkCollisions(
      this.entityManager,
      this.gameTime,
      this.artilleryPosition,
      this.maxRadarRange,
      position => this.createExplosion(position, 'target_destruction')
    );
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
    const newState = GameRules.checkWinCondition(
      this.entityManager,
      this.gameTime
    );

    if (newState) {
      this.gameState = newState;
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
   * Render CRT scan lines effect (static only)
   */
  // REMOVED: renderScanLines() - now handled by UIManager

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
    this.trajectoryPredictionSystem.update(
      this.artillery,
      this.artilleryPosition
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
