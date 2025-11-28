import { Vector3 } from '../math/Vector3';
import { TrajectoryRenderer } from '../rendering/TrajectoryRenderer';
import { Artillery } from './entities/Artillery';
import { PHYSICS_CONSTANTS } from '../data/Constants';

/**
 * TrajectoryPredictionSystem
 * Calculates and displays trajectory prediction based on current aim
 * Implements UI-13/UI-16 requirements for real-time trajectory prediction
 */
export class TrajectoryPredictionSystem {
  private trajectoryRenderer: TrajectoryRenderer;

  constructor(trajectoryRenderer: TrajectoryRenderer) {
    this.trajectoryRenderer = trajectoryRenderer;
  }

  update(artillery: Artillery, artilleryPosition: Vector3): void {
    const muzzleVelocity = PHYSICS_CONSTANTS.MUZZLE_VELOCITY;
    const azimuthRad = artillery.currentAzimuth * (Math.PI / 180);
    const elevationRad = artillery.currentElevation * (Math.PI / 180);

    const predictedVelocity = new Vector3(
      muzzleVelocity * Math.sin(azimuthRad) * Math.cos(elevationRad),
      muzzleVelocity * Math.cos(azimuthRad) * Math.cos(elevationRad),
      muzzleVelocity * Math.sin(elevationRad)
    );

    // Update trajectory prediction with ID "prediction"
    this.trajectoryRenderer.updateTrajectory(
      'prediction',
      [artilleryPosition.copy()],
      predictedVelocity
    );
  }
}
