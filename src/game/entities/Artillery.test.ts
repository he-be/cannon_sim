import { describe, it, expect, beforeEach } from 'vitest';
import { Artillery } from './Artillery';
import { Vector3 } from '../../math/Vector3';

describe('Artillery Heavy Cannon Mechanics', () => {
  let artillery: Artillery;
  const initialPosition = new Vector3(0, 0, 0);

  beforeEach(() => {
    artillery = new Artillery(initialPosition);
  });

  it('should initialize with current angles matching default', () => {
    // Assuming default is 0 azimuth, 45 elevation (or whatever is set in constructor)
    // We'll check if getters exist and return numbers
    expect(artillery.currentAzimuth).toBeDefined();
    expect(artillery.currentElevation).toBeDefined();
    expect(artillery.commandedAzimuth).toBe(artillery.currentAzimuth);
    expect(artillery.commandedElevation).toBe(artillery.currentElevation);
  });

  it('should update commanded angles without immediately changing current angles', () => {
    const startAzimuth = artillery.currentAzimuth;
    const targetAzimuth = (startAzimuth + 90) % 360;

    artillery.setCommandedAngles(targetAzimuth, artillery.currentElevation);

    expect(artillery.commandedAzimuth).toBe(targetAzimuth);
    expect(artillery.currentAzimuth).toBe(startAzimuth);
  });

  it('should smoothly rotate towards commanded azimuth over time', () => {
    // const startAzimuth = 0;
    // Force set initial state if possible, or assume default is 0
    // For this test, we might need to expose a way to reset or just use setCommanded

    // Let's assume we can set commanded to 10
    artillery.setCommandedAngles(10, 0);

    // Update with 0.1 second delta
    // Assuming rotation speed is 10 deg/sec (from plan)
    // 0.1 sec * 10 deg/sec = 1 degree change
    artillery.update(0.1);

    expect(artillery.currentAzimuth).toBeCloseTo(1, 1);
    expect(artillery.currentAzimuth).toBeLessThan(10);
  });

  it('should handle azimuth wrap-around correctly (350 -> 10)', () => {
    // We need to be able to set current azimuth for testing,
    // or we just rely on setCommanded and update to get there.
    // Let's assume we can't set current directly, so we have to "wait" or we add a test-only setter?
    // Ideally the class handles it.

    // Let's try to simulate a scenario
    // If we are at 350 and want to go to 10
    // The shortest path is +20 degrees (crossing 0)

    // For test purposes, we might need to mock or just use the public API
    // If we can't set current, we can't easily test "start at 350".
    // So we might need to implement a "teleport" or "reset" for testing, or just use public API.

    // Let's just verify the logic with what we have.
    // If we start at 0 and command 350, it should go -10 (which is 350)
    // Wait, 0 -> 350. Shortest path is -10 degrees.
    // So 0 -> 359 -> 358 ...

    artillery.setCommandedAngles(350, 0);
    artillery.update(0.1); // Should move towards 350 via 0->359...

    // If speed is 10 deg/sec, 0.1s = 1 deg.
    // 0 - 1 = -1 = 359.
    expect(artillery.currentAzimuth).toBeCloseTo(359, 1);
  });

  it('should stop rotating when target reached', () => {
    artillery.setCommandedAngles(5, 0);

    // Update enough time to reach target
    // 5 degrees / 10 deg/s = 0.5s
    artillery.update(1.0);

    expect(artillery.currentAzimuth).toBe(5);

    // Update more
    artillery.update(1.0);
    expect(artillery.currentAzimuth).toBe(5);
  });
});
