import { Vector3 } from '../math/Vector3';

export type State3D = {
  position: Vector3;
  velocity: Vector3;
};

export type Derivative3D = {
  dPosition: Vector3; // derivative of position -> velocity
  dVelocity: Vector3; // derivative of velocity -> acceleration
};

export type AccelerationFunction = (
  state: State3D,
  timeSeconds: number
) => Vector3;

/**
 * PhysicsEngine integrates motion using classical RK4.
 */
export class PhysicsEngine {
  private readonly computeAcceleration: AccelerationFunction;

  constructor(accelerationFn: AccelerationFunction) {
    this.computeAcceleration = accelerationFn;
  }

  private evaluate(
    state: State3D,
    time: number,
    dt: number,
    deriv: Derivative3D
  ): Derivative3D {
    const newPosition = state.position.add(deriv.dPosition.multiply(dt));
    const newVelocity = state.velocity.add(deriv.dVelocity.multiply(dt));

    return {
      dPosition: newVelocity,
      dVelocity: this.computeAcceleration(
        { position: newPosition, velocity: newVelocity },
        time + dt
      ),
    };
  }

  integrate(state: State3D, time: number, dt: number): State3D {
    const a: Derivative3D = {
      dPosition: state.velocity,
      dVelocity: this.computeAcceleration(state, time),
    };

    const b = this.evaluate(state, time, dt * 0.5, a);
    const c = this.evaluate(state, time, dt * 0.5, b);
    const d = this.evaluate(state, time, dt, c);

    const dpos = a.dPosition
      .add(b.dPosition.multiply(2))
      .add(c.dPosition.multiply(2))
      .add(d.dPosition)
      .multiply(dt / 6);

    const dvel = a.dVelocity
      .add(b.dVelocity.multiply(2))
      .add(c.dVelocity.multiply(2))
      .add(d.dVelocity)
      .multiply(dt / 6);

    return {
      position: state.position.add(dpos),
      velocity: state.velocity.add(dvel),
    };
  }

  /**
   * Calculate trajectory points for a projectile
   * @param startPosition Initial position
   * @param startVelocity Initial velocity
   * @param duration Maximum duration to simulate
   * @param stepSize Time step for integration
   * @param samplingInterval Number of steps between saved points
   * @param groundLevel Y coordinate of ground (default 0)
   */
  calculateTrajectory(
    startPosition: Vector3,
    startVelocity: Vector3,
    duration: number,
    stepSize: number,
    samplingInterval: number = 10,
    groundLevel: number = 0
  ): Vector3[] {
    const trajectory: Vector3[] = [];
    let state: State3D = {
      position: startPosition,
      velocity: startVelocity,
    };

    let time = 0;
    let stepCounter = 0;

    // Add initial point
    trajectory.push(
      new Vector3(state.position.x, state.position.y, state.position.z)
    );

    while (time < duration && trajectory.length < 1000) {
      if (stepCounter % samplingInterval === 0 && stepCounter > 0) {
        trajectory.push(
          new Vector3(state.position.x, state.position.y, state.position.z)
        );
      }

      state = this.integrate(state, time, stepSize);
      time += stepSize;
      stepCounter++;

      if (state.position.z <= groundLevel) {
        // Add the final ground impact point
        trajectory.push(
          new Vector3(state.position.x, state.position.y, state.position.z)
        );
        break;
      }
    }

    return trajectory;
  }
}
