import { describe, it, expect, beforeEach } from 'vitest';
import { Radar, RadarState } from './Radar';
import { Target, TargetType } from './Target';
import { Vector3 } from '../../math/Vector3';

describe('Radar (spec-compliant)', () => {
  let radar: Radar;
  const radarPosition = new Vector3(0, 0, 0);

  beforeEach(() => {
    radar = new Radar(radarPosition);
  });

  describe('constructor', () => {
    it('should create radar with position', () => {
      expect(radar.position.equals(radarPosition)).toBe(true);
      expect(radar.state).toBe(RadarState.SCANNING);
    });
  });

  describe('target detection (UI-04)', () => {
    it('should detect targets within range', () => {
      const target1 = new Target(new Vector3(0, 500, 10), TargetType.STATIC);
      const target2 = new Target(new Vector3(2000, 0, 10), TargetType.STATIC); // Out of range
      const targets = [target1, target2];

      radar.scan(targets);
      const detectedTargets = radar.getDetectedTargets();

      expect(detectedTargets).toHaveLength(1);
      expect(detectedTargets[0]).toBe(target1);
    });

    it('should not detect destroyed targets', () => {
      const target = new Target(new Vector3(0, 500, 10), TargetType.STATIC);
      target.destroy();

      radar.scan([target]);
      const detectedTargets = radar.getDetectedTargets();

      expect(detectedTargets).toHaveLength(0);
    });
  });

  describe('target selection (UI-05)', () => {
    it('should allow selecting detected target', () => {
      const target = new Target(new Vector3(0, 500, 10), TargetType.STATIC);
      radar.scan([target]);

      radar.selectTarget(target);

      expect(radar.selectedTarget).toBe(target);
    });

    it('should not allow selecting non-detected target', () => {
      const target = new Target(new Vector3(500, 0, 10), TargetType.STATIC);

      expect(() => radar.selectTarget(target)).toThrow();
    });
  });

  describe('radar information (UI-18)', () => {
    it('should provide target information', () => {
      const target = new Target(
        new Vector3(0, 1000, 20),
        TargetType.MOVING_SLOW,
        new Vector3(0, 10, 0)
      );
      radar.scan([target]);
      radar.selectTarget(target);

      const info = radar.getTargetInfo();

      expect(info.range).toBeCloseTo(target.distanceFrom(radarPosition));
      expect(info.bearing).toBeDefined();
      expect(info.altitude).toBe(20);
      expect(info.speed).toBe(10);
      expect(info.type).toBe(TargetType.MOVING_SLOW);
    });
  });

  describe('radar display (UI-13-1)', () => {
    it('should provide radar display data', () => {
      const target1 = new Target(new Vector3(0, 500, 10), TargetType.STATIC);
      const target2 = new Target(
        new Vector3(0, 800, 15),
        TargetType.MOVING_SLOW
      );
      radar.scan([target1, target2]);

      const displayData = radar.getRadarDisplayData();

      expect(displayData.detections).toHaveLength(2);
      expect(displayData.centerPosition.equals(radarPosition)).toBe(true);
      expect(displayData.maxRange).toBe(15000); // Default range
    });
  });
});
