import { Vector3 } from '../math/Vector3';

/**
 * Forces helper: provides gravity, drag, and coriolis force calculations.
 */
export const Forces = {
  /** Gravity force: F = m g (directed along gravityDirection, default negative Y) */
  gravity(
    mass: number,
    g: number,
    gravityDirection = new Vector3(0, -1, 0)
  ): Vector3 {
    const dir = gravityDirection.normalize();
    return dir.multiply(mass * g);
  },

  /** Quadratic drag: F_d = -0.5 ρ C_d A v |v| */
  drag(
    velocity: Vector3,
    airDensity: number,
    dragCoefficient: number,
    area: number
  ): Vector3 {
    const speed = velocity.magnitude();
    if (speed === 0) return new Vector3(0, 0, 0);
    const magnitude = 0.5 * airDensity * dragCoefficient * area * speed * speed;
    const direction = velocity.normalize().multiply(-1); // opposite to velocity
    return direction.multiply(magnitude);
  },

  /** Coriolis force in a rotating frame: F_c = -2 m (Ω × v) */
  coriolis(mass: number, angularVelocity: Vector3, velocity: Vector3): Vector3 {
    const omegaCrossV = angularVelocity.cross(velocity);
    return omegaCrossV.multiply(-2 * mass);
  },

  /** Sum of any number of force vectors */
  sum(...forces: Vector3[]): Vector3 {
    return forces.reduce((acc, f) => acc.add(f), new Vector3(0, 0, 0));
  },
};
