import { UIController } from './controllers/UIController';
import { Artillery } from '../game/entities/Artillery';
import { TargetingSystem, TargetingState } from '../game/TargetingSystem';
import { EntityManager } from '../game/EntityManager';
import { LeadAngleSystem } from '../game/LeadAngleSystem';
import { Vector3 } from '../math/Vector3';
import { TargetType } from '../game/entities/Target';
import { PhysicsEngine } from '../physics/PhysicsEngine';
import { PHYSICS_CONSTANTS } from '../data/Constants';

export interface GameStateData {
  artillery: Artillery;
  targetingSystem: TargetingSystem;
  entityManager: EntityManager;
  leadAngleSystem: LeadAngleSystem;
  gameTime: number;
  isAutoMode: boolean;
  artilleryPosition: Vector3;
  physicsEngine: PhysicsEngine;
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class UIStateMapper {
  static update(uiController: UIController, state: GameStateData): void {
    const uiManager = uiController.getUIManager();

    // Update artillery angles
    uiManager.setArtilleryAngles(
      state.artillery.currentAzimuth,
      state.artillery.currentElevation
    );

    // Update artillery reload state
    uiManager.setArtilleryState(
      state.artillery.canFire(),
      state.artillery.reloadProgress
    );

    // Update radar state
    const radarState = uiController.getRadarState();
    uiManager.setRadarDirection(radarState.azimuth, radarState.elevation);

    // Handle range gate vs display range
    if ('setRangeGate' in uiManager) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (uiManager as any).setRangeGate(radarState.range);
    } else {
      uiManager.setRadarRange(radarState.range);
    }

    // Update radar info
    uiManager.setRadarInfo(
      radarState.azimuth,
      radarState.elevation,
      radarState.range
    );

    // Update game time
    uiManager.setGameTime(state.gameTime);

    // Update lock state
    uiManager.setLockState(
      state.targetingSystem.getTargetingState() === TargetingState.LOCKED_ON
    );

    // Update auto mode
    uiManager.setAutoMode(state.isAutoMode);

    // Update target information
    const displayTarget =
      state.targetingSystem.getLockedTarget() ||
      state.targetingSystem.getTrackedTarget();

    if (displayTarget) {
      const distance = displayTarget.position
        .subtract(state.artilleryPosition)
        .magnitude();
      const speed = displayTarget.velocity
        ? displayTarget.velocity.magnitude()
        : 0;

      uiManager.setTargetInfo({
        status: state.targetingSystem.getTargetingState(),
        type: UIStateMapper.getTargetDisplayName(
          displayTarget.type as TargetType
        ),
        range: distance,
        speed: speed,
      });
    } else {
      uiManager.setTargetInfo(null);
    }

    // Update target list
    const targetListData = state.entityManager
      .getTargets()
      .filter(t => {
        if (state.gameTime < t.spawnTime) return false;
        if (!t.isDestroyed) return true;
        // Show destroyed targets for 2 seconds
        return state.gameTime - t.destructionTime < 2.0;
      })
      .map(target => {
        const relativePos = target.position.subtract(state.artilleryPosition);
        const distance = relativePos.magnitude();

        const mathAngle =
          Math.atan2(relativePos.y, relativePos.x) * (180 / Math.PI);
        let bearing = 90 - mathAngle;
        if (bearing < 0) bearing += 360;
        bearing = bearing % 360;

        let isApproaching = false;
        if (target.velocity) {
          const dot = target.velocity.dot(relativePos);
          isApproaching = dot < 0;
        }

        return {
          id: target.id,
          bearing: bearing,
          distance: distance,
          altitude: target.position.z,
          isApproaching: isApproaching,
          // TODO: Add isDestroyed flag to TargetListData if we want to show it differently
        };
      });

    uiManager.setTargetList(targetListData);

    // Update lead angle
    const currentLeadAngle = state.leadAngleSystem.getLeadAngle();
    uiManager.setLeadAngle(currentLeadAngle);

    // Update radar targets
    UIStateMapper.updateRadarTargets(uiController, state);

    // Update projectiles
    uiManager.updateProjectiles(state.entityManager.getProjectiles());

    // Update trajectory prediction
    UIStateMapper.updateTrajectoryPrediction(uiController, state);
  }

  private static updateRadarTargets(
    uiController: UIController,
    state: GameStateData
  ): void {
    const uiManager = uiController.getUIManager();

    // Remove destroyed targets (only if older than 2 seconds)
    state.entityManager.getTargets().forEach(target => {
      if (
        target.isDestroyed &&
        state.gameTime - target.destructionTime >= 2.0
      ) {
        uiManager.removeRadarTarget(target.id);
      }
    });

    // Update active targets (and recently destroyed ones)
    state.entityManager.getTargets().forEach(target => {
      if (state.gameTime < target.spawnTime) return;
      if (
        target.isDestroyed &&
        state.gameTime - target.destructionTime >= 2.0
      ) {
        return;
      }

      const dx = target.position.x - state.artilleryPosition.x;
      const dy = target.position.y - state.artilleryPosition.y;
      const dz = target.position.z - state.artilleryPosition.z;

      const mathAngle = Math.atan2(dy, dx) * (180 / Math.PI);
      let bearing = 90 - mathAngle;
      if (bearing < 0) bearing += 360;
      bearing = bearing % 360;

      const distance = Math.sqrt(dx * dx + dy * dy);
      const elevation = Math.atan2(dz, distance) * (180 / Math.PI);

      // Simple signal strength based on distance
      const maxRange = 20000;
      const strength = Math.max(0, 1 - distance / maxRange);

      uiManager.updateRadarTarget({
        id: target.id,
        bearing: bearing,
        distance: distance,
        elevation: elevation,
        strength: strength,
        position: target.position,
        velocity: target.velocity,
        type: target.type,
      });
    });
  }

  private static updateTrajectoryPrediction(
    uiController: UIController,
    state: GameStateData
  ): void {
    const initialVelocity = state.artillery.getMuzzleVelocityVector();
    const points = state.physicsEngine.calculateTrajectory(
      state.artilleryPosition,
      initialVelocity,
      PHYSICS_CONSTANTS.MAX_PROJECTILE_LIFETIME,
      PHYSICS_CONSTANTS.PHYSICS_TIMESTEP,
      10,
      PHYSICS_CONSTANTS.GROUND_LEVEL
    );

    uiController.getUIManager().updateTrajectoryPrediction(points);
  }

  private static getTargetDisplayName(type: TargetType): string {
    switch (type) {
      case TargetType.BALLOON:
        return 'BALLOON';
      case TargetType.FRIGATE:
        return 'FRIGATE';
      case TargetType.CRUISER:
        return 'CRUISER';
      case TargetType.STATIC:
        return 'STATIC';
      case TargetType.MOVING_SLOW:
        return 'SLOW';
      case TargetType.MOVING_FAST:
        return 'FAST';
      default:
        return 'UNKNOWN';
    }
  }
}
