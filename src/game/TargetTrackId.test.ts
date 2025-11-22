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

describe('GameScene Target Initialization', () => {
  it('should initialize targets with trackId', () => {
    const mockStage: StageConfig = {
      id: 'test_stage',
      name: 'Test Stage',
      description: 'Test',
      artilleryPosition: new Vector3(0, 0, 0),
      targets: [
        {
          type: TargetType.STATIC,
          position: new Vector3(100, 100, 0),
          spawnDelay: 0,
        },
        {
          type: TargetType.MOVING_SLOW,
          position: new Vector3(200, 200, 100),
          velocity: new Vector3(10, 0, 0),
          spawnDelay: 0,
        },
      ],
    };

    const mockOnSceneTransition = vi.fn();
    const gameScene = new GameScene(mockCanvasManager, mockOnSceneTransition, {
      selectedStage: mockStage,
    });

    // Access private targets array (using any cast for testing)
    const targets = (gameScene as any).targets;

    expect(targets.length).toBe(2);

    // Check if trackId exists and is formatted correctly
    expect(targets[0].trackId).toBeDefined();
    expect(targets[0].trackId).toMatch(/^T\d{2}$/);

    expect(targets[1].trackId).toBeDefined();
    expect(targets[1].trackId).toMatch(/^T\d{2}$/);
  });
});
