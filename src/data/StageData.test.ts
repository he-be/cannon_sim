import { describe, it, expect } from 'vitest';
import {
  STAGES,
  getStageById,
  getAllStages,
  validateStageConfig,
  getStagesByDifficulty,
  StageDataConstants,
  type StageConfig,
} from './StageData';
import { Vector3 } from '../math/Vector3';
import { TargetType } from '../game/entities/Target';

describe('StageData (T026-2 - Complete Rewrite)', () => {
  describe('stage configuration constants', () => {
    it('should have correct number of stages', () => {
      expect(STAGES).toHaveLength(3);
      expect(StageDataConstants.TOTAL_STAGES).toBe(3);
    });

    it('should have valid difficulty levels', () => {
      expect(StageDataConstants.MIN_DIFFICULTY).toBe(1);
      expect(StageDataConstants.MAX_DIFFICULTY).toBe(3);
    });

    it('should have proper artillery position', () => {
      const artilleryPos = StageDataConstants.ARTILLERY_POSITION;
      expect(artilleryPos).toBeInstanceOf(Vector3);
      expect(artilleryPos.y).toBeLessThan(0); // South of origin
    });
  });

  describe('individual stage configurations', () => {
    it('should have Stage 1 as static targets', () => {
      const stage1 = getStageById(1);
      expect(stage1).not.toBeNull();
      expect(stage1!.name).toBe('Training Range');
      expect(stage1!.difficultyLevel).toBe(1);

      // All targets should be static
      stage1!.targets.forEach(target => {
        expect(target.type).toBe(TargetType.STATIC);
        expect(target.velocity).toBeUndefined();
      });
    });

    it('should have Stage 2 as slow moving targets', () => {
      const stage2 = getStageById(2);
      expect(stage2).not.toBeNull();
      expect(stage2!.name).toBe('Moving Targets');
      expect(stage2!.difficultyLevel).toBe(2);

      // All targets should be moving slow
      stage2!.targets.forEach(target => {
        expect(target.type).toBe(TargetType.MOVING_SLOW);
        expect(target.velocity).toBeInstanceOf(Vector3);
      });
    });

    it('should have Stage 3 as fast moving targets', () => {
      const stage3 = getStageById(3);
      expect(stage3).not.toBeNull();
      expect(stage3!.name).toBe('Combat Scenario');
      expect(stage3!.difficultyLevel).toBe(3);
      expect(stage3!.timeLimit).toBe(300); // 5 minutes

      // All targets should be moving fast
      stage3!.targets.forEach(target => {
        expect(target.type).toBe(TargetType.MOVING_FAST);
        expect(target.velocity).toBeInstanceOf(Vector3);
      });
    });
  });

  describe('stage retrieval functions', () => {
    it('should get stage by ID correctly', () => {
      const stage1 = getStageById(1);
      const stage2 = getStageById(2);
      const stage3 = getStageById(3);
      const invalidStage = getStageById(999);

      expect(stage1?.id).toBe(1);
      expect(stage2?.id).toBe(2);
      expect(stage3?.id).toBe(3);
      expect(invalidStage).toBeNull();
    });

    it('should get all stages as copy', () => {
      const allStages = getAllStages();
      expect(allStages).toHaveLength(3);

      // Should be a copy, not reference
      expect(allStages).not.toBe(STAGES);
      expect(allStages).toEqual(STAGES);

      // Modifying returned array should not affect original
      allStages.pop();
      expect(STAGES).toHaveLength(3);
    });

    it('should get stages by difficulty level', () => {
      const level1Stages = getStagesByDifficulty(1);
      const level2Stages = getStagesByDifficulty(2);
      const level3Stages = getStagesByDifficulty(3);

      expect(level1Stages).toHaveLength(1);
      expect(level1Stages[0].difficultyLevel).toBe(1);

      expect(level2Stages).toHaveLength(1);
      expect(level2Stages[0].difficultyLevel).toBe(2);

      expect(level3Stages).toHaveLength(1);
      expect(level3Stages[0].difficultyLevel).toBe(3);
    });
  });

  describe('stage validation', () => {
    it('should validate correct stage configurations', () => {
      STAGES.forEach(stage => {
        expect(validateStageConfig(stage)).toBe(true);
      });
    });

    it('should reject stage with invalid ID', () => {
      const invalidStage: StageConfig = {
        ...STAGES[0],
        id: 0, // Invalid ID
      };

      expect(validateStageConfig(invalidStage)).toBe(false);
    });

    it('should reject stage with empty name', () => {
      const invalidStage: StageConfig = {
        ...STAGES[0],
        name: '', // Empty name
      };

      expect(validateStageConfig(invalidStage)).toBe(false);
    });

    it('should reject stage with no targets', () => {
      const invalidStage: StageConfig = {
        ...STAGES[0],
        targets: [], // No targets
      };

      expect(validateStageConfig(invalidStage)).toBe(false);
    });

    it('should reject stage with invalid difficulty', () => {
      const invalidStage: StageConfig = {
        ...STAGES[0],
        difficultyLevel: 4 as any, // Invalid difficulty
      };

      expect(validateStageConfig(invalidStage)).toBe(false);
    });

    it('should reject moving target without velocity', () => {
      const invalidStage: StageConfig = {
        ...STAGES[0],
        targets: [
          {
            position: new Vector3(100, 100, 0),
            type: TargetType.MOVING_SLOW,
            // Missing velocity for moving target
            spawnDelay: 0,
          },
        ],
      };

      expect(validateStageConfig(invalidStage)).toBe(false);
    });

    it('should reject target with negative spawn delay', () => {
      const invalidStage: StageConfig = {
        ...STAGES[0],
        targets: [
          {
            position: new Vector3(100, 100, 0),
            type: TargetType.STATIC,
            spawnDelay: -1, // Negative spawn delay
          },
        ],
      };

      expect(validateStageConfig(invalidStage)).toBe(false);
    });
  });

  describe('target configuration details', () => {
    it('should have proper spawn delay progression', () => {
      STAGES.forEach(stage => {
        const delays = stage.targets
          .map(t => t.spawnDelay)
          .sort((a, b) => a - b);

        // Delays should be non-negative
        delays.forEach(delay => {
          expect(delay).toBeGreaterThanOrEqual(0);
        });

        // Should have some variation in spawn timing
        if (delays.length > 1) {
          expect(delays[0]).toBeLessThan(delays[delays.length - 1]);
        }
      });
    });

    it('should have targets positioned within reasonable range', () => {
      STAGES.forEach(stage => {
        stage.targets.forEach(target => {
          const distance = target.position
            .subtract(stage.artilleryPosition)
            .magnitude();

          // Targets should be within 15km range (reasonable artillery range)
          expect(distance).toBeLessThan(15000);
          expect(distance).toBeGreaterThan(1000); // But not too close
        });
      });
    });

    it('should have appropriate velocities for moving targets', () => {
      const stage2 = getStageById(2)!; // Slow moving
      const stage3 = getStageById(3)!; // Fast moving

      stage2.targets.forEach(target => {
        if (target.velocity) {
          const speed = target.velocity.magnitude();
          expect(speed).toBeLessThan(100); // Slow targets
        }
      });

      stage3.targets.forEach(target => {
        if (target.velocity) {
          const speed = target.velocity.magnitude();
          expect(speed).toBeGreaterThan(100); // Fast targets
        }
      });
    });
  });

  describe('stage progression and balance', () => {
    it('should have increasing difficulty progression', () => {
      const stage1 = getStageById(1)!;
      const stage2 = getStageById(2)!;
      const stage3 = getStageById(3)!;

      // Stage 1: Only static targets
      expect(stage1.targets.every(t => t.type === TargetType.STATIC)).toBe(
        true
      );

      // Stage 2: Only slow moving targets
      expect(stage2.targets.every(t => t.type === TargetType.MOVING_SLOW)).toBe(
        true
      );

      // Stage 3: Only fast moving targets + time limit
      expect(stage3.targets.every(t => t.type === TargetType.MOVING_FAST)).toBe(
        true
      );
      expect(stage3.timeLimit).toBeGreaterThan(0);
    });

    it('should have appropriate number of targets per stage', () => {
      STAGES.forEach(stage => {
        expect(stage.targets.length).toBeGreaterThanOrEqual(3);
        expect(stage.targets.length).toBeLessThanOrEqual(6);
      });
    });

    it('should have all required properties', () => {
      STAGES.forEach(stage => {
        expect(stage.id).toBeGreaterThan(0);
        expect(stage.name).toBeTruthy();
        expect(stage.description).toBeTruthy();
        expect(stage.artilleryPosition).toBeInstanceOf(Vector3);
        expect(stage.targets).toBeInstanceOf(Array);
        expect(stage.winCondition).toBeTruthy();
        expect([1, 2, 3]).toContain(stage.difficultyLevel);
      });
    });
  });

  describe('data integrity', () => {
    it('should maintain consistent artillery position across stages', () => {
      const basePosition = STAGES[0].artilleryPosition;

      STAGES.forEach(stage => {
        expect(stage.artilleryPosition).toEqual(basePosition);
      });
    });

    it('should have unique stage IDs', () => {
      const ids = STAGES.map(stage => stage.id);
      const uniqueIds = [...new Set(ids)];

      expect(ids).toHaveLength(uniqueIds.length);
    });

    it('should have meaningful stage names and descriptions', () => {
      STAGES.forEach(stage => {
        expect(stage.name.length).toBeGreaterThan(5);
        expect(stage.description.length).toBeGreaterThan(10);
        expect(stage.name).not.toEqual(stage.description);
      });
    });
  });
});
