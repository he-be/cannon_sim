import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameScene } from './GameScene';

// Mock dependencies
vi.mock('../../rendering/CanvasManager');
vi.mock('../../rendering/renderers/EffectRenderer');
vi.mock('../../physics/PhysicsEngine');
vi.mock('../../rendering/TrajectoryRenderer');
vi.mock('../../game/LeadAngleCalculator');
vi.mock('../UIManager');

describe('GameScene Keyboard Controls', () => {
  let gameScene: GameScene;
  let mockCanvasManager: any;
  let mockCanvas: any;
  let onSceneTransition: any;
  let config: any;

  beforeEach(() => {
    mockCanvas = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getBoundingClientRect: vi.fn().mockReturnValue({ left: 0, top: 0 }),
    };
    mockCanvasManager = {
      getCanvas: vi.fn().mockReturnValue(mockCanvas),
      width: 800,
      height: 600,
      context: {
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        drawImage: vi.fn(),
        fillRect: vi.fn(),
        fillText: vi.fn(),
        measureText: vi.fn().mockReturnValue({ width: 10 }),
      },
    };
    onSceneTransition = vi.fn();
    config = {
      selectedStage: {
        id: 'test',
        name: 'Test Stage',
        artilleryPosition: { x: 0, y: 0, z: 0 },
        targets: [],
      },
    };

    gameScene = new GameScene(mockCanvasManager, onSceneTransition, config);
  });

  it('should fire projectile on Space key when playing', () => {
    const fireSpy = vi.spyOn(gameScene as any, 'fireProjectile');
    const event = new KeyboardEvent('keydown', { key: ' ' });

    window.dispatchEvent(event);

    expect(fireSpy).toHaveBeenCalled();
  });

  it('should fire projectile on F key', () => {
    const fireSpy = vi.spyOn(gameScene as any, 'fireProjectile');
    const event = new KeyboardEvent('keydown', { key: 'f' });

    window.dispatchEvent(event);

    expect(fireSpy).toHaveBeenCalled();
  });

  it('should toggle lock on L key', () => {
    const lockSpy = vi.spyOn(gameScene as any, 'handleTargetLock');
    const event = new KeyboardEvent('keydown', { key: 'l' });

    window.dispatchEvent(event);

    expect(lockSpy).toHaveBeenCalled();
  });

  it('should toggle auto mode on K key', () => {
    const autoSpy = vi.spyOn(gameScene as any, 'handleAutoToggle');
    const event = new KeyboardEvent('keydown', { key: 'k' });

    window.dispatchEvent(event);

    expect(autoSpy).toHaveBeenCalled();
  });

  it('should adjust radar azimuth continuously when Arrow Left/Right is held', () => {
    const setRadarDirectionSpy = vi.spyOn(
      (gameScene as any).uiController.getUIManager(),
      'setRadarDirection'
    );

    // Initial azimuth is 0

    // Press Arrow Right
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));

    // Simulate 1 second of game time
    gameScene.update(1.0);

    // Should have rotated by RADAR_ROTATION_SPEED (60 degrees/sec)
    const radarState = (gameScene as any).uiController.getRadarState();
    expect(radarState.azimuth).toBe(60);
    expect(setRadarDirectionSpy).toHaveBeenCalledWith(60, expect.any(Number));

    // Release Arrow Right
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight' }));

    // Simulate another second
    gameScene.update(1.0);

    // Should not change
    const radarState2 = (gameScene as any).uiController.getRadarState();
    expect(radarState2.azimuth).toBe(60);

    // Press Arrow Left
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));

    // Simulate 0.5 seconds
    gameScene.update(0.5);

    // Should rotate back by 30 degrees (60 * 0.5) -> 30
    const radarState3 = (gameScene as any).uiController.getRadarState();
    expect(radarState3.azimuth).toBe(30);
  });

  it('should adjust radar elevation continuously when Arrow Up/Down is held', () => {
    const setRadarDirectionSpy = vi.spyOn(
      (gameScene as any).uiController.getUIManager(),
      'setRadarDirection'
    );

    // Initial elevation is 0

    // Press Arrow Up
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));

    // Simulate 1 second
    gameScene.update(1.0);

    // Should increase by RADAR_ELEVATION_SPEED (30 degrees/sec)
    const radarState = (gameScene as any).uiController.getRadarState();
    expect(radarState.elevation).toBe(30);
    expect(setRadarDirectionSpy).toHaveBeenCalledWith(expect.any(Number), 30);

    // Release Arrow Up
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowUp' }));

    // Press Arrow Down
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));

    // Simulate 0.5 seconds
    gameScene.update(0.5);

    // Should decrease by 15 (30 * 0.5) -> 15
    const radarState2 = (gameScene as any).uiController.getRadarState();
    expect(radarState2.elevation).toBe(15);
  });

  it('should adjust radar range continuously when O/I is held', () => {
    const setRangeGateSpy = vi.spyOn(
      (gameScene as any).uiController.getUIManager(),
      'setRangeGate'
    );
    const initialRange = 5000;
    (gameScene as any).uiController.setRadarState({ range: initialRange });

    // Press O (Increase range)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'o' }));

    // Simulate 1 second
    gameScene.update(1.0);

    // Should increase by RANGE_GATE_SPEED (2000 m/s)
    const radarState = (gameScene as any).uiController.getRadarState();
    expect(radarState.range).toBe(initialRange + 2000);
    expect(setRangeGateSpy).toHaveBeenCalledWith(initialRange + 2000);

    // Release O
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'o' }));

    // Press I (Decrease range)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'i' }));

    // Simulate 0.5 seconds
    gameScene.update(0.5);

    // Should decrease by 1000 (2000 * 0.5)
    const radarState2 = (gameScene as any).uiController.getRadarState();
    expect(radarState2.range).toBe(initialRange + 1000);
  });

  it('should delegate O and I keys to UIController', () => {
    const handleKeyDownSpy = vi.spyOn(
      (gameScene as any).uiController,
      'handleKeyDown'
    );
    const handleKeyUpSpy = vi.spyOn(
      (gameScene as any).uiController,
      'handleKeyUp'
    );

    // Test O key
    const eventO = new KeyboardEvent('keydown', { key: 'o' });
    window.dispatchEvent(eventO);
    expect(handleKeyDownSpy).toHaveBeenCalledWith(expect.any(KeyboardEvent));

    const eventOUp = new KeyboardEvent('keyup', { key: 'o' });
    window.dispatchEvent(eventOUp);
    expect(handleKeyUpSpy).toHaveBeenCalledWith(expect.any(KeyboardEvent));

    // Test I key
    const eventI = new KeyboardEvent('keydown', { key: 'i' });
    window.dispatchEvent(eventI);
    expect(handleKeyDownSpy).toHaveBeenCalledWith(expect.any(KeyboardEvent));

    const eventIUp = new KeyboardEvent('keyup', { key: 'i' });
    window.dispatchEvent(eventIUp);
    expect(handleKeyUpSpy).toHaveBeenCalledWith(expect.any(KeyboardEvent));
  });
});
