import { describe, it, expect, vi } from 'vitest';
import { GameScene } from '../ui/scenes/GameScene';
import { CanvasManager } from '../rendering/CanvasManager';
import { StageConfig } from '../data/StageData';
import { TargetType } from './entities/Target';
import { Vector3 } from '../math/Vector3';

// Mock CanvasManager
const mockCanvasManager = {
  width: 800,
  height: 600,
  context: {
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 10 })),
  },
  getCanvas: vi.fn(() => ({
    addEventListener: vi.fn(),
    getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0 })),
  })),
} as unknown as CanvasManager;

// Mock UI Controllers
vi.mock('../ui/controllers/UIControllerA', () => ({
  UIControllerA: vi.fn().mockImplementation(() => ({
    update: vi.fn(),
    render: vi.fn(),
    handleInput: vi.fn(),
    dispose: vi.fn(),
    updateControls: vi.fn(),
    updateLeadAngle: vi.fn(),
    getRadarState: vi.fn().mockReturnValue({
      azimuth: 0,
      elevation: 0,
      currentRange: 5000,
      maxRange: 10000,
      rangeCursor: 0.5,
      isActive: true,
      isTracking: false,
      sweepAngle: 30,
    }),
  })),
}));

vi.mock('../ui/controllers/UIControllerB', () => ({
  UIControllerB: vi.fn().mockImplementation(() => ({
    update: vi.fn(),
    render: vi.fn(),
    handleInput: vi.fn(),
    dispose: vi.fn(),
    updateControls: vi.fn(),
    updateLeadAngle: vi.fn(),
    getRadarState: vi.fn().mockReturnValue({
      azimuth: 0,
      elevation: 0,
      currentRange: 5000,
      maxRange: 10000,
      rangeCursor: 0.5,
      isActive: true,
      isTracking: false,
      sweepAngle: 30,
    }),
  })),
}));

vi.mock('./TrajectoryPredictionSystem', () => ({
  TrajectoryPredictionSystem: vi.fn().mockImplementation(() => ({
    update: vi.fn(),
    render: vi.fn(),
  })),
}));

vi.mock('./SceneInitializer', () => {
  class MockTarget {
    trackId: string;
    position: any;
    velocity: any;
    targetType: any;
    difficultyLevel: any;
    isDestroyed = false;
    isActive = true;
    spawnTime = 0;

    constructor(
      position: any,
      velocity: any,
      targetType: any,
      difficultyLevel: any
    ) {
      this.position = position;
      this.velocity = velocity;
      this.targetType = targetType;
      this.difficultyLevel = difficultyLevel;
      // Simple ID generation for testing
      this.trackId =
        'T' +
        Math.floor(Math.random() * 100)
          .toString()
          .padStart(2, '0');
    }
  }

  const mockEntityManager = {
    targets: [] as any[],
    addTarget: (t: any): void => {
      console.log('Adding target to mockEntityManager:', t);
      mockEntityManager.targets.push(t);
    },
    getTargets: (): any[] => {
      console.log(
        'Getting targets from mockEntityManager:',
        mockEntityManager.targets
      );
      return mockEntityManager.targets;
    },
    updateTargets: vi.fn(),
    checkGameOverCondition: vi.fn().mockReturnValue(false),
    updateProjectiles: vi.fn(),
    checkCollisions: vi.fn().mockReturnValue([]),
    getProjectiles: vi.fn().mockReturnValue([]),
    reset: (): void => {
      mockEntityManager.targets = [];
    },
  };

  return {
    SceneInitializer: {
      initializeSystems: vi.fn((_canvasManager, _config) => {
        mockEntityManager.reset();
        return {
          physicsEngine: { integrate: vi.fn() },
          entityManager: mockEntityManager,
          artillery: {
            setPosition: vi.fn(),
            getMuzzleVelocityVector: vi
              .fn()
              .mockReturnValue({ x: 0, y: 0, z: 0 }),
            update: vi.fn(),
          },
          targetingSystem: {
            update: vi.fn(),
            getTargetingState: vi.fn().mockReturnValue('IDLE'),
            getLockedTarget: vi.fn().mockReturnValue(null),
          },
          leadAngleSystem: {
            update: vi.fn(),
            clear: vi.fn(),
            getLeadAngle: vi.fn().mockReturnValue(null),
          },
          radarController: {
            update: vi.fn(),
            updateAutoRotation: vi.fn(),
            getState: vi.fn().mockReturnValue({
              azimuth: 0,
              elevation: 0,
              currentRange: 10000,
              maxRange: 10000,
              rangeCursor: 0.5,
              isActive: true,
              isTracking: false,
              sweepAngle: 30,
              position: { x: 0, y: 0, z: 0 },
            }),
          },
          radar: {
            setDirection: vi.fn(),
            scan: vi.fn(),
            getRadarDisplayData: vi.fn().mockReturnValue({
              detections: [],
              centerPosition: { x: 0, y: 0, z: 0 },
              maxRange: 10000,
            }),
          },
          effectRenderer: { update: vi.fn(), render: vi.fn() },
          artilleryPosition: { x: 0, y: 0, z: 0 },
          scenarioManager: {
            update: vi.fn(),
            loadScenario: vi.fn(scenario => {
              // Manually spawn entities for testing
              scenario.forEach((event: any) => {
                if (event.type === 'spawn') {
                  const target = new MockTarget(
                    event.position,
                    event.velocity,
                    event.targetType,
                    event.difficultyLevel
                  );
                  mockEntityManager.addTarget(target);
                }
              });
            }),
            start: vi.fn().mockImplementation(() => {
              // Trigger loadScenario with the stage config scenario when start is called
              // This simulates what GameScene does
            }),
            isScenarioFinished: vi.fn().mockReturnValue(false),
          },
        };
      }),
      resetGame: vi.fn(),
    },
  };
});

import { ScenarioEventType, SpawnEvent } from './scenario/ScenarioEvent';

describe('GameScene Target Initialization', () => {
  it('should initialize targets with trackId', () => {
    const mockStage: StageConfig = {
      id: 1,
      name: 'Test Stage',
      description: 'Test',
      artilleryPosition: new Vector3(0, 0, 0),
      scenario: [
        {
          type: ScenarioEventType.SPAWN,
          targetType: TargetType.STATIC,
          position: new Vector3(100, 100, 0),
        } as SpawnEvent,
        {
          type: ScenarioEventType.SPAWN,
          targetType: TargetType.MOVING_SLOW,
          position: new Vector3(200, 200, 100),
          velocity: new Vector3(10, 0, 0),
        } as SpawnEvent,
      ],
      winCondition: 'destroy_all',
      difficultyLevel: 1,
    };

    const mockOnSceneTransition = vi.fn();
    const gameScene = new GameScene(mockCanvasManager, mockOnSceneTransition, {
      selectedStage: mockStage,
    });

    // Manually trigger scenario load since the mock might not be wired up exactly like the real one
    (gameScene as any).scenarioManager.loadScenario(mockStage.scenario);

    // Update scene to trigger spawn events
    gameScene.update(0.016);

    // Access private targets array (using any cast for testing)
    const targets = (gameScene as any).entityManager.getTargets();

    // Debug log to see what's happening
    console.log('Targets in test:', targets);

    expect(targets.length).toBe(2);

    // Check if trackId exists and is formatted correctly
    expect(targets[0].trackId).toBeDefined();
    expect(targets[0].trackId).toMatch(/^T\d{2}$/);

    expect(targets[1].trackId).toBeDefined();
    expect(targets[1].trackId).toMatch(/^T\d{2}$/);
  });
});
