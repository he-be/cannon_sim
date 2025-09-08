import { describe, it, expect, beforeEach } from 'vitest';
import { Radar, RadarType, RadarState } from './Radar';
import { Vector3 } from '../../math/Vector3';
import { Target, TargetType } from './Target';

describe('Radar', () => {
  let radar: Radar;
  let target: Target;
  const radarPosition = new Vector3(0, 0, 0);

  beforeEach(() => {
    radar = new Radar(radarPosition, RadarType.STANDARD);
    target = new Target(new Vector3(5000, 0, 100), TargetType.STATIC);
  });

  describe('constructor', () => {
    it('should create radar with initial position and type', () => {
      expect(radar.position.equals(radarPosition)).toBe(true);
      expect(radar.type).toBe(RadarType.STANDARD);
      expect(radar.state).toBe(RadarState.SCANNING);
      expect(radar.isActive).toBe(true);
    });

    it('should have appropriate range and resolution for type', () => {
      const shortRangeRadar = new Radar(radarPosition, RadarType.SHORT_RANGE);
      const standardRadar = new Radar(radarPosition, RadarType.STANDARD);
      const longRangeRadar = new Radar(radarPosition, RadarType.LONG_RANGE);

      expect(standardRadar.maxRange).toBe(20000); // 20km
      expect(shortRangeRadar.maxRange).toBeLessThan(standardRadar.maxRange);
      expect(longRangeRadar.maxRange).toBeGreaterThan(standardRadar.maxRange);

      expect(shortRangeRadar.resolution).toBeGreaterThan(
        standardRadar.resolution
      );
      expect(longRangeRadar.resolution).toBeLessThan(standardRadar.resolution);
    });

    it('should initialize with default scan parameters', () => {
      expect(radar.scanAzimuth).toBe(0);
      expect(radar.scanElevation).toBe(0);
      expect(radar.scanPattern).toBe('sector');
      expect(radar.trackedTargets).toHaveLength(0);
    });

    it('should allow custom scan parameters', () => {
      const customRadar = new Radar(radarPosition, RadarType.STANDARD, {
        scanSectorWidth: 90,
        scanSectorHeight: 45,
        scanSpeed: 180, // deg/sec
      });

      expect(customRadar.scanSectorWidth).toBe(90);
      expect(customRadar.scanSectorHeight).toBe(45);
      expect(customRadar.scanSpeed).toBe(180);
    });
  });

  describe('scan patterns', () => {
    it('should support sector scanning', () => {
      radar.setScanPattern('sector', { azimuthCenter: 45, azimuthWidth: 60 });

      expect(radar.scanPattern).toBe('sector');
      expect(radar.scanSectorWidth).toBe(60);
    });

    it('should support 360-degree scanning', () => {
      radar.setScanPattern('full_360');

      expect(radar.scanPattern).toBe('full_360');
      expect(radar.scanSectorWidth).toBe(360);
    });

    it('should support focused scanning on specific target', () => {
      radar.setScanPattern('focused', { target: new Vector3(1000, 1000, 0) });

      expect(radar.scanPattern).toBe('focused');
    });

    it('should update scan position based on pattern during update', () => {
      radar.setScanPattern('full_360');
      const initialAzimuth = radar.scanAzimuth;

      radar.update(1.0); // 1 second

      expect(radar.scanAzimuth).not.toBe(initialAzimuth);
    });
  });

  describe('target detection', () => {
    it('should detect targets within range and scan beam', () => {
      // Target directly ahead within range
      const nearbyTarget = new Target(
        new Vector3(0, 5000, 100),
        TargetType.STATIC
      );

      radar.setScanPattern('sector', { azimuthCenter: 0, azimuthWidth: 30 });
      radar.scanForTargets([nearbyTarget]);

      const detections = radar.getDetections();
      expect(detections).toHaveLength(1);
      expect(detections[0].target).toBe(nearbyTarget);
    });

    it('should not detect targets outside scan range', () => {
      const farTarget = new Target(
        new Vector3(0, 50000, 100),
        TargetType.STATIC
      ); // 50km away

      radar.scanForTargets([farTarget]);

      const detections = radar.getDetections();
      expect(detections).toHaveLength(0);
    });

    it('should not detect targets outside scan beam', () => {
      const sideTarget = new Target(
        new Vector3(5000, 0, 100),
        TargetType.STATIC
      ); // 90° off

      radar.setScanPattern('sector', { azimuthCenter: 0, azimuthWidth: 30 });
      radar.scanForTargets([sideTarget]);

      const detections = radar.getDetections();
      expect(detections).toHaveLength(0);
    });

    it('should calculate accurate range and bearing for detections', () => {
      const testTarget = new Target(
        new Vector3(3000, 4000, 100),
        TargetType.STATIC
      );

      radar.setScanPattern('full_360');
      radar.scanForTargets([testTarget]);

      const detections = radar.getDetections();
      expect(detections).toHaveLength(1);

      const detection = detections[0];
      expect(detection.range).toBeCloseTo(5000, 1); // 3-4-5 triangle
      expect(detection.azimuth).toBeCloseTo(53.13, 0.1); // arctan(4/3)
    });

    it('should include target velocity in detection data', () => {
      const movingTarget = new Target(
        new Vector3(0, 5000, 100),
        TargetType.MOVING_SLOW,
        { velocity: new Vector3(10, 20, 0) }
      );

      radar.setScanPattern('full_360');
      radar.scanForTargets([movingTarget]);

      const detections = radar.getDetections();
      expect(detections).toHaveLength(1);

      const detection = detections[0];
      expect(detection.velocity.equals(new Vector3(10, 20, 0), 0.001)).toBe(
        true
      );
      expect(detection.radialVelocity).toBeDefined();
    });
  });

  describe('target tracking', () => {
    it('should initiate tracking on detected targets', () => {
      const trackingTarget = new Target(
        new Vector3(0, 10000, 100),
        TargetType.MOVING_SLOW
      );

      radar.setScanPattern('full_360');
      radar.scanForTargets([trackingTarget]);
      radar.initiateTracking(trackingTarget);

      expect(radar.trackedTargets).toHaveLength(1);
      expect(radar.isTracking(trackingTarget)).toBe(true);
    });

    it('should predict target future positions', () => {
      const movingTarget = new Target(
        new Vector3(0, 5000, 100),
        TargetType.MOVING_SLOW,
        { velocity: new Vector3(0, 100, 0) }
      );

      radar.scanForTargets([movingTarget]);
      radar.initiateTracking(movingTarget);

      const prediction = radar.predictTargetPosition(movingTarget, 10.0); // 10 seconds ahead
      const expectedPosition = new Vector3(0, 6000, 100); // moved 1000m north

      expect(prediction.equals(expectedPosition, 10)).toBe(true);
    });

    it('should maintain tracking history for targets', () => {
      const trackedTarget = new Target(
        new Vector3(0, 5000, 100),
        TargetType.MOVING_SLOW
      );

      radar.scanForTargets([trackedTarget]);
      radar.initiateTracking(trackedTarget);

      // Simulate multiple scans
      trackedTarget.update(1.0);
      radar.scanForTargets([trackedTarget]);
      radar.update(1.0);

      trackedTarget.update(1.0);
      radar.scanForTargets([trackedTarget]);
      radar.update(1.0);

      const trackData = radar.getTrackingData(trackedTarget);
      expect(trackData.positionHistory).toHaveLength(3);
      expect(trackData.velocityEstimate).toBeDefined();
    });

    it('should drop tracking when targets leave range', () => {
      const leavingTarget = new Target(
        new Vector3(0, 5000, 100),
        TargetType.STATIC
      );

      radar.initiateTracking(leavingTarget);
      expect(radar.isTracking(leavingTarget)).toBe(true);

      // Move target out of range
      leavingTarget.reset(new Vector3(0, 50000, 100));
      radar.scanForTargets([leavingTarget]);
      radar.update(1.0);

      expect(radar.isTracking(leavingTarget)).toBe(false);
    });
  });

  describe('radar characteristics', () => {
    it('should have detection accuracy that varies with range', () => {
      const closeTarget = new Target(
        new Vector3(0, 1000, 100),
        TargetType.STATIC
      );
      const farTarget = new Target(
        new Vector3(0, 15000, 100),
        TargetType.STATIC
      );

      radar.setScanPattern('full_360');
      radar.scanForTargets([closeTarget, farTarget]);

      const detections = radar.getDetections();
      const closeDetection = detections.find(d => d.target === closeTarget);
      const farDetection = detections.find(d => d.target === farTarget);

      expect(closeDetection!.accuracy).toBeGreaterThan(farDetection!.accuracy);
    });

    it('should have reduced performance in jamming conditions', () => {
      radar.setJammingIntensity(0.8); // Heavy jamming

      const testTarget = new Target(
        new Vector3(0, 5000, 100),
        TargetType.STATIC
      );
      radar.scanForTargets([testTarget]);

      const detections = radar.getDetections();
      if (detections.length > 0) {
        expect(detections[0].accuracy).toBeLessThan(0.9); // Reduced accuracy
      }
    });

    it('should consume power during operation', () => {
      const initialPower = radar.powerLevel;

      radar.update(10.0); // 10 seconds of operation

      expect(radar.powerLevel).toBeLessThan(initialPower);
    });

    it('should support different power modes', () => {
      radar.setPowerMode('low');
      const lowPowerRange = radar.effectiveRange;

      radar.setPowerMode('high');
      const highPowerRange = radar.effectiveRange;

      expect(highPowerRange).toBeGreaterThan(lowPowerRange);
    });
  });

  describe('radar data processing', () => {
    it('should filter false positives and noise', () => {
      radar.setNoiseLevel(0.3);

      const realTarget = new Target(
        new Vector3(0, 8000, 100),
        TargetType.STATIC
      );
      radar.setScanPattern('full_360');
      radar.scanForTargets([realTarget]);

      const rawReturns = radar.getRawReturns();
      const filteredDetections = radar.getDetections();

      // Should have fewer filtered detections than raw returns due to noise filtering
      expect(filteredDetections.length).toBeLessThanOrEqual(rawReturns.length);
    });

    it('should classify target types based on radar signature', () => {
      const staticTarget = new Target(
        new Vector3(0, 5000, 100),
        TargetType.STATIC
      );
      const movingTarget = new Target(
        new Vector3(0, 6000, 100),
        TargetType.MOVING_FAST,
        { velocity: new Vector3(50, 0, 0) }
      );

      radar.setScanPattern('full_360');
      radar.scanForTargets([staticTarget, movingTarget]);

      const detections = radar.getDetections();
      const staticDetection = detections.find(d => d.target === staticTarget);
      const movingDetection = detections.find(d => d.target === movingTarget);

      expect(staticDetection!.targetClassification).toBe('static');
      expect(movingDetection!.targetClassification).toBe('moving');
    });

    it('should provide threat assessment for detected targets', () => {
      const threatTarget = new Target(
        new Vector3(0, 3000, 100),
        TargetType.MOVING_FAST,
        { velocity: new Vector3(0, -100, 0) } // Approaching
      );

      radar.scanForTargets([threatTarget]);
      radar.update(1.0);

      const detections = radar.getDetections();
      expect(detections[0].threatLevel).toBeGreaterThan(0.5); // High threat
    });
  });

  describe('system status and health', () => {
    it('should track system health and performance', () => {
      expect(radar.systemHealth).toBe(100);
      expect(radar.performance).toBeGreaterThan(0.9);
    });

    it('should degrade performance when damaged', () => {
      const initialPerformance = radar.performance;

      radar.takeDamage(50);

      expect(radar.systemHealth).toBe(50);
      expect(radar.performance).toBeLessThan(initialPerformance);
    });

    it('should shut down when critically damaged', () => {
      radar.takeDamage(100);

      expect(radar.state).toBe(RadarState.OFFLINE);
      expect(radar.isActive).toBe(false);
    });

    it('should support maintenance and repair', () => {
      radar.takeDamage(30);
      const damagedHealth = radar.systemHealth;

      radar.performMaintenance(20);

      expect(radar.systemHealth).toBeGreaterThan(damagedHealth);
    });
  });

  describe('serialization and state', () => {
    it('should provide comprehensive state snapshot', () => {
      radar.setScanPattern('sector', { azimuthCenter: 45, azimuthWidth: 90 });
      radar.scanForTargets([target]);

      const snapshot = radar.getStateSnapshot();

      expect(snapshot.position.equals(radar.position)).toBe(true);
      expect(snapshot.type).toBe(RadarType.STANDARD);
      expect(snapshot.state).toBe(RadarState.SCANNING);
      expect(snapshot.scanAzimuth).toBe(radar.scanAzimuth);
      expect(snapshot.detectionCount).toBe(radar.getDetections().length);
    });

    it('should support state restoration', () => {
      radar.setScanPattern('sector', { azimuthCenter: 90, azimuthWidth: 60 });
      radar.takeDamage(25);

      radar.reset();

      expect(radar.scanAzimuth).toBe(0);
      expect(radar.systemHealth).toBe(100);
      expect(radar.trackedTargets).toHaveLength(0);
      expect(radar.getDetections()).toHaveLength(0);
    });
  });
});
