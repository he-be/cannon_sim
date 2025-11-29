import { CanvasManager } from '../rendering/CanvasManager';
import { GameSceneConfig } from '../ui/scenes/GameScene';
import { EntityManager } from './EntityManager';
import { Artillery } from './entities/Artillery';
import { RadarController } from './RadarController';
import { TargetingSystem } from './TargetingSystem';
import { LeadAngleSystem } from './LeadAngleSystem';
import { PhysicsEngine } from '../physics/PhysicsEngine';
import { StandardPhysics } from '../physics/StandardPhysics';
import { TrajectoryRenderer } from '../rendering/TrajectoryRenderer';
import { EffectRenderer } from '../rendering/renderers/EffectRenderer';
import { Vector3 } from '../math/Vector3';
import { CRT_COLORS } from '../data/Constants';
import { ScenarioManager } from './scenario/ScenarioManager';

export interface GameSystems {
  entityManager: EntityManager;
  artillery: Artillery;
  radarController: RadarController;
  targetingSystem: TargetingSystem;
  leadAngleSystem: LeadAngleSystem;
  physicsEngine: PhysicsEngine;
  trajectoryRenderer: TrajectoryRenderer;
  effectRenderer: EffectRenderer;
  artilleryPosition: Vector3;
  scenarioManager: ScenarioManager;
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class SceneInitializer {
  static initializeSystems(
    canvasManager: CanvasManager,
    config: GameSceneConfig
  ): GameSystems {
    const effectRenderer = new EffectRenderer(canvasManager);
    const entityManager = new EntityManager();

    const artilleryPosition = new Vector3(
      config.selectedStage.artilleryPosition.x,
      config.selectedStage.artilleryPosition.y,
      config.selectedStage.artilleryPosition.z
    );

    const artillery = new Artillery(artilleryPosition);
    const targetingSystem = new TargetingSystem();
    const leadAngleSystem = new LeadAngleSystem(artilleryPosition);
    const radarController = new RadarController();
    const scenarioManager = new ScenarioManager(entityManager);

    const physicsEngine = new PhysicsEngine(
      StandardPhysics.accelerationFunction
    );

    const trajectoryRenderer = new TrajectoryRenderer({
      maxTrailLength: 200,
      trailFadeTime: 5000,
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

    return {
      entityManager,
      artillery,
      radarController,
      targetingSystem,
      leadAngleSystem,
      physicsEngine,
      trajectoryRenderer,
      effectRenderer,
      artilleryPosition,
      scenarioManager,
    };
  }

  static resetGame(
    systems: GameSystems,
    config: GameSceneConfig,
    _gameTime: number
  ): void {
    // Reset radar
    systems.radarController.reset();

    // Reset entity manager (clears targets and projectiles)
    systems.entityManager.reset();

    // Load scenario
    systems.scenarioManager.loadScenario(config.selectedStage.scenario);

    // Clear effects
    systems.effectRenderer.clearAll();

    // Reset targeting
    systems.targetingSystem.reset();
  }
}
