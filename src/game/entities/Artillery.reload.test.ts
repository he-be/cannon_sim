/**
 * Tests for Artillery reload mechanics
 * Reproducing the bug where firing multiple times fails
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Artillery, ArtilleryState } from './Artillery';
import { Vector3 } from '../../math/Vector3';

describe('Artillery Reload Mechanics', () => {
  let artillery: Artillery;

  beforeEach(() => {
    artillery = new Artillery(new Vector3(0, 0, 0));
  });

  it('should be in READY state initially', () => {
    expect(artillery.state).toBe(ArtilleryState.READY);
    expect(artillery.canFire()).toBe(true);
  });

  it('should transition to FIRED state after firing', () => {
    artillery.fire();
    expect(artillery.state).toBe(ArtilleryState.FIRED);
    expect(artillery.canFire()).toBe(false);
  });

  it('should not allow firing when in FIRED state', () => {
    artillery.fire();

    // Attempt to fire again without reloading
    expect(() => artillery.fire()).toThrow('Artillery not ready to fire');
  });

  it('should allow firing again after reload', () => {
    // First shot
    const projectile1 = artillery.fire();
    expect(projectile1).toBeDefined();
    expect(artillery.canFire()).toBe(false);

    // Reload
    artillery.reload();
    expect(artillery.canFire()).toBe(true);

    // Second shot should succeed
    const projectile2 = artillery.fire();
    expect(projectile2).toBeDefined();
  });

  it('should handle rapid fire with reload cooldown', () => {
    const shots: number[] = [];

    // Simulate 5 shots with reload in between
    for (let i = 0; i < 5; i++) {
      if (artillery.canFire()) {
        artillery.fire();
        shots.push(i);
        artillery.reload(); // Simulate reload after each shot
      }
    }

    expect(shots.length).toBe(5);
  });

  it('should maintain state during artillery movement', () => {
    // Fire while artillery is rotating
    artillery.setCommandedAngles(90, 45);
    artillery.update(0.5); // Update for 0.5 seconds

    // Should still be able to fire
    expect(artillery.canFire()).toBe(true);
    artillery.fire();
    expect(artillery.canFire()).toBe(false);

    // Continue rotating
    artillery.update(0.5);

    // Still should not be able to fire without reload
    expect(artillery.canFire()).toBe(false);

    // Reload and try again
    artillery.reload();
    expect(artillery.canFire()).toBe(true);
  });

  it('should automatically reload after cooldown period', () => {
    // Fire
    artillery.fire();
    expect(artillery.canFire()).toBe(false);

    // Update for less than cooldown (2 seconds)
    artillery.update(1.0);
    expect(artillery.canFire()).toBe(false);

    // Update for another 0.5 seconds (total 1.5s, still < 2s)
    artillery.update(0.5);
    expect(artillery.canFire()).toBe(false);

    // Update for another 0.6 seconds (total 2.1s, > 2s cooldown)
    artillery.update(0.6);
    expect(artillery.canFire()).toBe(true); // Should be ready now
  });

  it('should handle rapid firing with automatic reload', () => {
    const shotTimes: number[] = [];
    let currentTime = 0;

    // Simulate 10 seconds of gameplay, attempting to fire every 0.5 seconds
    for (let i = 0; i < 20; i++) {
      currentTime += 0.5;

      if (artillery.canFire()) {
        artillery.fire();
        shotTimes.push(currentTime);
      }

      artillery.update(0.5);
    }

    // With 2-second cooldown, we should get roughly:
    // Shot 1 at t=0.5, reload at t=2.5, Shot 2 at t=3.0, reload at t=5.0, etc.
    // In 10 seconds, expect 4-5 shots
    expect(shotTimes.length).toBeGreaterThanOrEqual(4);
    expect(shotTimes.length).toBeLessThanOrEqual(5);
  });
});
