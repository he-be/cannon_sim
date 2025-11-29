import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScenarioManager } from './ScenarioManager';
import { EntityManager } from '../EntityManager';
import { ScenarioEvent, ScenarioEventType } from './ScenarioEvent';
import { TargetType } from '../entities/Target';
import { Vector3 } from '../../math/Vector3';

describe('ScenarioManager', () => {
  let scenarioManager: ScenarioManager;
  let mockEntityManager: EntityManager;

  beforeEach(() => {
    mockEntityManager = {
      addTarget: vi.fn(),
    } as unknown as EntityManager;
    scenarioManager = new ScenarioManager(mockEntityManager);
  });

  it('should process spawn events', () => {
    const events: ScenarioEvent[] = [
      {
        type: ScenarioEventType.SPAWN,
        targetType: TargetType.BALLOON,
        position: new Vector3(100, 200, 300),
      },
    ];

    scenarioManager.loadScenario(events);
    scenarioManager.update(1);

    expect(mockEntityManager.addTarget).toHaveBeenCalledTimes(1);
    const addedTarget = (mockEntityManager.addTarget as any).mock.calls[0][0];
    expect(addedTarget.type).toBe(TargetType.BALLOON);
    expect(addedTarget.position.x).toBe(100);
  });

  it('should wait for specified duration', () => {
    const events: ScenarioEvent[] = [
      {
        type: ScenarioEventType.WAIT,
        duration: 2,
      },
      {
        type: ScenarioEventType.SPAWN,
        targetType: TargetType.BALLOON,
        position: new Vector3(0, 0, 0),
      },
    ];

    scenarioManager.loadScenario(events);

    // Update 1s: Should be waiting
    scenarioManager.update(1);
    expect(mockEntityManager.addTarget).not.toHaveBeenCalled();

    // Update 1.1s (Total 2.1s): Should trigger spawn
    scenarioManager.update(1.1);
    expect(mockEntityManager.addTarget).toHaveBeenCalledTimes(1);
  });

  it('should handle flags', () => {
    const events: ScenarioEvent[] = [
      {
        type: ScenarioEventType.WAIT_FLAG,
        flagName: 'test_flag',
      },
      {
        type: ScenarioEventType.SPAWN,
        targetType: TargetType.BALLOON,
        position: new Vector3(0, 0, 0),
      },
    ];

    scenarioManager.loadScenario(events);

    // Update: Should wait for flag
    scenarioManager.update(1);
    expect(mockEntityManager.addTarget).not.toHaveBeenCalled();

    // Set flag
    scenarioManager.setFlag('test_flag', true);

    // Update: Should proceed
    scenarioManager.update(1);
    expect(mockEntityManager.addTarget).toHaveBeenCalledTimes(1);
  });

  it('should handle jumps and labels', () => {
    const events: ScenarioEvent[] = [
      {
        type: ScenarioEventType.JUMP,
        label: 'marker',
      },
      {
        type: ScenarioEventType.SPAWN,
        targetType: TargetType.BALLOON,
        position: new Vector3(0, 0, 0),
      },
      {
        type: ScenarioEventType.LABEL,
        name: 'marker',
      },
      {
        type: ScenarioEventType.SET_FLAG,
        flagName: 'jumped',
        value: true,
      },
    ];

    scenarioManager.loadScenario(events);
    scenarioManager.update(1);

    // Should have skipped the spawn and set the flag
    expect(mockEntityManager.addTarget).not.toHaveBeenCalled();
    // We can't check internal flags directly, but we can verify behavior
    // If we add a wait_flag check after, it should pass
  });

  it('should finish scenario', () => {
    const events: ScenarioEvent[] = [
      {
        type: ScenarioEventType.STOP,
      },
    ];

    scenarioManager.loadScenario(events);
    expect(scenarioManager.isScenarioFinished()).toBe(false);

    scenarioManager.update(1);
    expect(scenarioManager.isScenarioFinished()).toBe(true);
  });
});
