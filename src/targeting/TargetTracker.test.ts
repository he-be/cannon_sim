import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  TargetTracker,
  TargetTrackingEvents,
  TrackingOptions,
} from './TargetTracker';
import { Target, TargetType } from '../game/entities/Target';
import { Radar } from '../game/entities/Radar';
import { Vector3 } from '../math/Vector3';

describe('TargetTracker (T022 - Target Tracking System)', () => {
  let targetTracker: TargetTracker;
  let mockRadar: Radar;
  let mockEvents: TargetTrackingEvents;
  let testTargets: Target[];

  beforeEach(() => {
    vi.useFakeTimers();

    // Mock Radar
    mockRadar = {
      position: new Vector3(0, 0, 100), // 100m elevation
    } as any;

    // Mock events
    mockEvents = {
      onTargetDetected: vi.fn(),
      onTargetLost: vi.fn(),
      onLockAcquired: vi.fn(),
      onLockLost: vi.fn(),
      onTrackingUpdate: vi.fn(),
    };

    // Create test targets
    testTargets = [
      new Target(
        new Vector3(1000, 2000, 0),
        TargetType.MOVING_FAST,
        new Vector3(50, -20, 0)
      ),
      new Target(
        new Vector3(-1500, 1000, 100),
        TargetType.MOVING_SLOW,
        new Vector3(-30, 10, 5)
      ),
      new Target(
        new Vector3(5000, 0, 50),
        TargetType.STATIC,
        new Vector3(0, 100, 0)
      ),
    ];

    targetTracker = new TargetTracker(mockRadar, mockEvents);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const state = targetTracker.getState();

      expect(state.isTracking).toBe(false);
      expect(state.isLocked).toBe(false);
      expect(state.lockedTarget).toBeNull();
      expect(state.lockStartTime).toBeNull();
      expect(state.lockStrength).toBe(0);
    });

    it('should initialize with default options', () => {
      const options = targetTracker.getOptions();

      expect(options.maxDetectionRange).toBe(15000);
      expect(options.minSignalStrength).toBe(0.1);
      expect(options.lockRequiredTime).toBe(2000);
      expect(options.trackingHistoryLength).toBe(10);
      expect(options.maxTrackingTargets).toBe(8);
    });

    it('should accept custom options', () => {
      const customOptions: Partial<TrackingOptions> = {
        maxDetectionRange: 20000,
        lockRequiredTime: 3000,
        maxTrackingTargets: 5,
      };

      const customTracker = new TargetTracker(
        mockRadar,
        mockEvents,
        customOptions
      );
      const options = customTracker.getOptions();

      expect(options.maxDetectionRange).toBe(20000);
      expect(options.lockRequiredTime).toBe(3000);
      expect(options.maxTrackingTargets).toBe(5);
    });
  });

  describe('target detection', () => {
    it('should detect targets within radar range', () => {
      targetTracker.update(testTargets);

      expect(targetTracker.getDetectedTargetCount()).toBeGreaterThan(0);
      expect(mockEvents.onTargetDetected).toHaveBeenCalled();
    });

    it('should not detect targets outside radar range', () => {
      // Create targets far outside detection range
      const distantTargets = [
        new Target(
          new Vector3(20000, 20000, 0),
          TargetType.STATIC,
          new Vector3(0, 0, 0)
        ),
        new Target(
          new Vector3(-25000, 10000, 0),
          TargetType.STATIC,
          new Vector3(0, 0, 0)
        ),
      ];

      targetTracker.update(distantTargets);

      expect(targetTracker.getDetectedTargetCount()).toBe(0);
      expect(mockEvents.onTargetDetected).not.toHaveBeenCalled();
    });

    it('should calculate signal strength correctly', () => {
      targetTracker.update(testTargets);

      const detectedTargets = targetTracker.getDetectedTargets();
      expect(detectedTargets.length).toBeGreaterThan(0);

      // Closer targets should have stronger signals
      detectedTargets.forEach(detected => {
        expect(detected.signalStrength).toBeGreaterThan(0);
        expect(detected.signalStrength).toBeLessThanOrEqual(1);
      });
    });

    it('should track target position history', () => {
      // Update multiple times to build history
      for (let i = 0; i < 5; i++) {
        // Move targets slightly
        testTargets.forEach(target => {
          target.update(0.016); // ~60fps
        });
        targetTracker.update(testTargets);
      }

      const detectedTargets = targetTracker.getDetectedTargets();
      detectedTargets.forEach(detected => {
        expect(detected.trackingHistory.length).toBeGreaterThan(1);
      });
    });

    it('should limit tracking history length', () => {
      const customOptions: Partial<TrackingOptions> = {
        trackingHistoryLength: 3,
      };
      const limitedTracker = new TargetTracker(
        mockRadar,
        mockEvents,
        customOptions
      );

      // Update many times
      for (let i = 0; i < 10; i++) {
        testTargets.forEach(target => {
          target.update(0.016);
        });
        limitedTracker.update(testTargets);
      }

      const detectedTargets = limitedTracker.getDetectedTargets();
      detectedTargets.forEach(detected => {
        expect(detected.trackingHistory.length).toBeLessThanOrEqual(3);
      });
    });
  });

  describe('target tracking and lock-on', () => {
    beforeEach(() => {
      // Ensure we have detected targets
      targetTracker.update(testTargets);
    });

    it('should start tracking a target', () => {
      const detectedTargets = targetTracker.getDetectedTargets();
      if (detectedTargets.length > 0) {
        const success = targetTracker.startTracking(detectedTargets[0].target);
        expect(success).toBe(true);

        const state = targetTracker.getState();
        expect(state.isTracking).toBe(true);
        expect(state.lockedTarget).not.toBeNull();
      }
    });

    it('should not track targets outside lock range', () => {
      // Create target too close
      const closeTarget = new Target(
        new Vector3(100, 0, 0),
        TargetType.STATIC,
        new Vector3(0, 0, 0)
      );
      targetTracker.update([closeTarget]);

      const success = targetTracker.startTracking(closeTarget);
      expect(success).toBe(false);
    });

    it('should build lock strength over time', () => {
      const detectedTargets = targetTracker.getDetectedTargets();
      if (detectedTargets.length > 0) {
        targetTracker.startTracking(detectedTargets[0].target);

        // Simulate time passing
        vi.advanceTimersByTime(1000); // 1 second
        targetTracker.update(testTargets);

        const state = targetTracker.getState();
        expect(state.lockStrength).toBeGreaterThan(0);
        expect(state.lockStrength).toBeLessThan(1);
      }
    });

    it('should achieve full lock after required time', () => {
      const detectedTargets = targetTracker.getDetectedTargets();
      if (detectedTargets.length > 0) {
        targetTracker.startTracking(detectedTargets[0].target);

        // Simulate full lock time
        vi.advanceTimersByTime(2500); // More than 2 seconds
        targetTracker.update(testTargets);

        const state = targetTracker.getState();
        expect(state.isLocked).toBe(true);
        expect(state.lockStrength).toBe(1);
        expect(mockEvents.onLockAcquired).toHaveBeenCalled();
      }
    });

    it('should release lock on command', () => {
      const detectedTargets = targetTracker.getDetectedTargets();
      if (detectedTargets.length > 0) {
        targetTracker.startTracking(detectedTargets[0].target);
        targetTracker.releaseLock();

        const state = targetTracker.getState();
        expect(state.isTracking).toBe(false);
        expect(state.isLocked).toBe(false);
        expect(state.lockedTarget).toBeNull();
        expect(mockEvents.onLockLost).toHaveBeenCalled();
      }
    });
  });

  describe('target management', () => {
    beforeEach(() => {
      targetTracker.update(testTargets);
    });

    it('should update existing targets', () => {
      const initialCount = targetTracker.getDetectedTargetCount();

      // Move targets and update again
      testTargets.forEach(target => {
        target.update(0.016);
      });

      targetTracker.update(testTargets);

      expect(targetTracker.getDetectedTargetCount()).toBe(initialCount);
      expect(mockEvents.onTrackingUpdate).toHaveBeenCalled();
    });

    it('should remove destroyed targets', () => {
      const initialCount = targetTracker.getDetectedTargetCount();

      // Destroy a target
      testTargets[0].destroy();
      targetTracker.update(testTargets);

      // Should eventually be removed after timeout
      vi.advanceTimersByTime(4000); // More than lostTargetTimeout
      targetTracker.update(testTargets.slice(1)); // Remove destroyed target from update

      expect(targetTracker.getDetectedTargetCount()).toBeLessThan(initialCount);
    });

    it('should handle maximum target limit', () => {
      const maxTargets = 3;
      const limitedTracker = new TargetTracker(mockRadar, mockEvents, {
        maxTrackingTargets: maxTargets,
      });

      // Create more targets than the limit
      const manyTargets = Array.from(
        { length: maxTargets + 2 },
        (_, i) =>
          new Target(
            new Vector3(1000 + i * 100, 1000, 0),
            TargetType.STATIC,
            new Vector3(0, 0, 0)
          )
      );

      limitedTracker.update(manyTargets);

      expect(limitedTracker.getDetectedTargetCount()).toBeLessThanOrEqual(
        maxTargets
      );
    });

    it('should find best target for automatic lock-on', () => {
      const bestTarget = targetTracker.getBestTarget();

      if (bestTarget) {
        expect(bestTarget.signalStrength).toBeGreaterThan(0);
        expect(bestTarget.distance).toBeGreaterThan(0);
      }
    });
  });

  describe('radar integration', () => {
    it('should calculate bearing correctly', () => {
      targetTracker.update(testTargets);

      const detectedTargets = targetTracker.getDetectedTargets();
      detectedTargets.forEach(detected => {
        expect(detected.bearing).toBeGreaterThanOrEqual(0);
        expect(detected.bearing).toBeLessThan(360);
      });
    });

    it('should calculate elevation correctly', () => {
      // Create target at different altitudes
      const highTarget = new Target(
        new Vector3(1000, 0, 1000),
        TargetType.STATIC,
        new Vector3(0, 0, 0)
      );
      targetTracker.update([highTarget]);

      const detectedTargets = targetTracker.getDetectedTargets();
      if (detectedTargets.length > 0) {
        expect(detectedTargets[0].elevation).toBeGreaterThan(0); // Should be positive for target above radar
      }
    });
  });

  describe('velocity calculation', () => {
    it('should calculate target velocity from history', () => {
      // Update multiple times to build velocity data
      for (let i = 0; i < 5; i++) {
        testTargets.forEach(target => {
          target.update(0.016);
        });
        targetTracker.update(testTargets);
      }

      const detectedTargets = targetTracker.getDetectedTargets();
      detectedTargets.forEach(detected => {
        // Moving targets should have velocity greater than 0
        // Static targets may have 0 velocity
        if (detected.target.type !== TargetType.STATIC) {
          expect(detected.velocity.magnitude()).toBeGreaterThan(0);
        } else {
          expect(detected.velocity.magnitude()).toBeGreaterThanOrEqual(0);
        }
      });
    });

    it('should handle stationary targets', () => {
      const stationaryTarget = new Target(
        new Vector3(2000, 2000, 0),
        TargetType.STATIC,
        new Vector3(0, 0, 0)
      );
      targetTracker.update([stationaryTarget]);

      for (let i = 0; i < 3; i++) {
        targetTracker.update([stationaryTarget]);
      }

      const detectedTargets = targetTracker.getDetectedTargets();
      if (detectedTargets.length > 0) {
        expect(detectedTargets[0].velocity.magnitude()).toBeCloseTo(0, 1);
      }
    });
  });

  describe('signal strength calculation', () => {
    it('should calculate stronger signals for closer targets', () => {
      const closeTarget = new Target(
        new Vector3(2000, 0, 0),
        TargetType.STATIC,
        new Vector3(0, 0, 0)
      );
      const farTarget = new Target(
        new Vector3(8000, 0, 0),
        TargetType.STATIC,
        new Vector3(0, 0, 0)
      );

      targetTracker.update([closeTarget, farTarget]);

      const detected = targetTracker.getDetectedTargets();
      if (detected.length === 2) {
        const closeDetected = detected.find(d => d.target === closeTarget);
        const farDetected = detected.find(d => d.target === farTarget);

        if (closeDetected && farDetected) {
          expect(closeDetected.signalStrength).toBeGreaterThan(
            farDetected.signalStrength
          );
        }
      }
    });

    it('should calculate stronger signals for moving targets', () => {
      const staticTarget = new Target(
        new Vector3(3000, 0, 0),
        TargetType.STATIC,
        new Vector3(0, 0, 0)
      );
      const movingTarget = new Target(
        new Vector3(3000, 100, 0),
        TargetType.MOVING_FAST,
        new Vector3(100, 0, 0)
      );

      targetTracker.update([staticTarget, movingTarget]);

      const detected = targetTracker.getDetectedTargets();
      if (detected.length === 2) {
        const staticDetected = detected.find(d => d.target === staticTarget);
        const movingDetected = detected.find(d => d.target === movingTarget);

        if (staticDetected && movingDetected) {
          expect(movingDetected.signalStrength).toBeGreaterThan(
            staticDetected.signalStrength
          );
        }
      }
    });

    // Removed duplicate test - already covered above
  });

  describe('state management', () => {
    it('should return state as copy', () => {
      const state1 = targetTracker.getState();
      const state2 = targetTracker.getState();

      expect(state1).toEqual(state2);
      expect(state1).not.toBe(state2);
    });

    it('should return options as copy', () => {
      const options1 = targetTracker.getOptions();
      const options2 = targetTracker.getOptions();

      expect(options1).toEqual(options2);
      expect(options1).not.toBe(options2);
    });

    it('should update options correctly', () => {
      const newOptions: Partial<TrackingOptions> = {
        maxDetectionRange: 18000,
        lockRequiredTime: 1500,
      };

      targetTracker.setOptions(newOptions);
      const options = targetTracker.getOptions();

      expect(options.maxDetectionRange).toBe(18000);
      expect(options.lockRequiredTime).toBe(1500);
    });

    it('should get tracked target by reference', () => {
      targetTracker.update(testTargets);
      const detectedTargets = targetTracker.getDetectedTargets();

      if (detectedTargets.length > 0) {
        const target = detectedTargets[0].target;
        const retrieved = targetTracker.getTrackedTarget(target);

        expect(retrieved).not.toBeNull();
        expect(retrieved!.target).toBe(target);
      }
    });

    it('should return null for non-tracked target', () => {
      const nonExistent = new Target(new Vector3(0, 0, 0), TargetType.STATIC);
      const result = targetTracker.getTrackedTarget(nonExistent);
      expect(result).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle empty target list', () => {
      expect(() => {
        targetTracker.update([]);
      }).not.toThrow();

      expect(targetTracker.getDetectedTargetCount()).toBe(0);
    });

    it('should handle radar position changes', () => {
      // Change radar position by creating a new radar mock
      const newPosition = new Vector3(1000, 1000, 100);
      Object.defineProperty(mockRadar, 'position', {
        value: newPosition,
        configurable: true,
      });

      targetTracker.update(testTargets);

      // Should recalculate distances and bearings
      const detected = targetTracker.getDetectedTargets();
      detected.forEach(d => {
        expect(d.distance).toBeGreaterThan(0);
        expect(d.bearing).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle rapid target movement', () => {
      const fastTarget = new Target(
        new Vector3(2000, 0, 0),
        TargetType.MOVING_FAST,
        new Vector3(500, 200, 0)
      );

      for (let i = 0; i < 10; i++) {
        fastTarget.update(0.016); // Use the target's update method to move it
        targetTracker.update([fastTarget]);
      }

      const detected = targetTracker.getDetectedTargets();
      if (detected.length > 0) {
        expect(detected[0].velocity.magnitude()).toBeGreaterThan(100);
        expect(detected[0].trackingHistory.length).toBeGreaterThan(1);
      }
    });
  });
});
