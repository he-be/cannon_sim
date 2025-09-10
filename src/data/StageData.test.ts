/**
 * StageData test suite
 * Tests stage configuration data as per UI-02 specification
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StageData, StageConfig } from './StageData';
import { TargetType } from '../game/entities/Target';
import { Vector3 } from '../math/Vector3';

describe('StageData', () => {
  describe('getStage', () => {
    it('should return Stage 1 configuration', () => {
      const stage = StageData.getStage(1);

      expect(stage).not.toBeNull();
      expect(stage!.id).toBe(1);
      expect(stage!.name).toBe('Stage 1: Static Targets');
      expect(stage!.description).toBe(
        'Defeat static targets approaching from the front'
      );
      expect(stage!.artilleryPosition).toEqual(new Vector3(0, 0, 0));
    });

    it('should return Stage 2 configuration', () => {
      const stage = StageData.getStage(2);

      expect(stage).not.toBeNull();
      expect(stage!.id).toBe(2);
      expect(stage!.name).toBe('Stage 2: Slow Moving Targets');
      expect(stage!.description).toBe('Defeat slow moving targets');
      expect(stage!.artilleryPosition).toEqual(new Vector3(0, 0, 0));
    });

    it('should return Stage 3 configuration', () => {
      const stage = StageData.getStage(3);

      expect(stage).not.toBeNull();
      expect(stage!.id).toBe(3);
      expect(stage!.name).toBe('Stage 3: Fast Moving Targets');
      expect(stage!.description).toBe('Defeat fast moving targets');
      expect(stage!.artilleryPosition).toEqual(new Vector3(0, 0, 0));
    });

    it('should return null for invalid stage ID', () => {
      const stage = StageData.getStage(99);
      expect(stage).toBeNull();
    });
  });

  describe('Stage 1: Static Targets', () => {
    let stage: StageConfig;

    beforeEach(() => {
      stage = StageData.getStage(1)!;
    });

    it('should have 5 static targets', () => {
      expect(stage.targets).toHaveLength(5);
    });

    it('should have only static target types', () => {
      stage.targets.forEach(target => {
        expect(target.type).toBe(TargetType.STATIC);
      });
    });

    it('should have targets at various positions', () => {
      const positions = stage.targets.map(t => t.position);
      expect(positions).toContainEqual(new Vector3(0, 500, 0));
      expect(positions).toContainEqual(new Vector3(100, 600, 0));
      expect(positions).toContainEqual(new Vector3(-100, 600, 0));
      expect(positions).toContainEqual(new Vector3(200, 700, 0));
      expect(positions).toContainEqual(new Vector3(-200, 700, 0));
    });
  });

  describe('Stage 2: Slow Moving Targets', () => {
    let stage: StageConfig;

    beforeEach(() => {
      stage = StageData.getStage(2)!;
    });

    it('should have 4 slow moving targets', () => {
      expect(stage.targets).toHaveLength(4);
    });

    it('should have only slow moving target types', () => {
      stage.targets.forEach(target => {
        expect(target.type).toBe(TargetType.MOVING_SLOW);
      });
    });

    it('should have targets with appropriate velocities', () => {
      stage.targets.forEach(target => {
        expect(target.velocity.magnitude()).toBeGreaterThan(0);
        expect(target.velocity.magnitude()).toBeLessThan(15); // Slow speed
      });
    });
  });

  describe('Stage 3: Fast Moving Targets', () => {
    let stage: StageConfig;

    beforeEach(() => {
      stage = StageData.getStage(3)!;
    });

    it('should have 5 fast moving targets', () => {
      expect(stage.targets).toHaveLength(5);
    });

    it('should have only fast moving target types', () => {
      stage.targets.forEach(target => {
        expect(target.type).toBe(TargetType.MOVING_FAST);
      });
    });

    it('should have targets with higher velocities', () => {
      stage.targets.forEach(target => {
        expect(target.velocity.magnitude()).toBeGreaterThan(15); // Fast speed
      });
    });
  });

  describe('Target positioning', () => {
    it('should have targets positioned in front of artillery', () => {
      for (let stageId = 1; stageId <= 3; stageId++) {
        const stage = StageData.getStage(stageId)!;
        stage.targets.forEach(target => {
          expect(target.position.y).toBeGreaterThan(0); // Positive Y is forward
        });
      }
    });

    it('should have targets at reasonable distances', () => {
      for (let stageId = 1; stageId <= 3; stageId++) {
        const stage = StageData.getStage(stageId)!;
        stage.targets.forEach(target => {
          const distance = target.distanceFrom(stage.artilleryPosition);
          expect(distance).toBeGreaterThan(400); // Minimum distance
          expect(distance).toBeLessThan(800); // Maximum distance
        });
      }
    });
  });
});
