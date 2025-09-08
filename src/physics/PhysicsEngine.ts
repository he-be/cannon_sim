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
}
