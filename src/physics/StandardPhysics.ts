import { Vector3 } from '../math/Vector3';
import { Forces } from './Forces';
import { PHYSICS_CONSTANTS } from '../data/Constants';
import { State3D } from './PhysicsEngine';

/**
 * Standard physics configuration for artillery projectiles.
 * Provides a centralized source of truth for physics calculations
 * to ensure consistency between simulation and prediction.
 */
export const StandardPhysics = {
  /**
   * Calculate acceleration for a standard artillery projectile
   * Includes Gravity, Drag, and Coriolis force
   */
  accelerationFunction: (state: State3D, _time: number): Vector3 => {
    const mass = PHYSICS_CONSTANTS.PROJECTILE_MASS;

    // 1. Gravity
    const gravity = Forces.gravity(
      mass,
      PHYSICS_CONSTANTS.GRAVITY_ACCELERATION,
      new Vector3(
        PHYSICS_CONSTANTS.GRAVITY_DIRECTION.x,
        PHYSICS_CONSTANTS.GRAVITY_DIRECTION.y,
        PHYSICS_CONSTANTS.GRAVITY_DIRECTION.z
      )
    );

    // 2. Drag
    const drag = Forces.drag(
      state.velocity,
      PHYSICS_CONSTANTS.AIR_DENSITY_SEA_LEVEL,
      PHYSICS_CONSTANTS.PROJECTILE_DRAG_COEFFICIENT,
      PHYSICS_CONSTANTS.PROJECTILE_CROSS_SECTIONAL_AREA
    );

    // 3. Coriolis Force
    // Earth's rotation rate (rad/s)
    const earthAngularVelocity = new Vector3(0, 0, 7.2921159e-5);
    const coriolis = Forces.coriolis(
      mass,
      earthAngularVelocity,
      state.velocity
    );

    // Sum forces and convert to acceleration (a = F/m)
    const totalForce = Forces.sum(gravity, drag, coriolis);
    return totalForce.multiply(1 / mass);
  },
};
