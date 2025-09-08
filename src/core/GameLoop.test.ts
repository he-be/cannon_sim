import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameLoop } from './GameLoop';

describe('GameLoop', () => {
  let gameLoop: GameLoop;
  let mockUpdateCallback: ReturnType<typeof vi.fn>;
  let mockRenderCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock performance.now()
    vi.spyOn(performance, 'now').mockImplementation(() => 0);

    mockUpdateCallback = vi.fn();
    mockRenderCallback = vi.fn();

    gameLoop = new GameLoop(mockUpdateCallback, mockRenderCallback);
  });

  describe('constructor', () => {
    it('should create GameLoop with default 60Hz physics timestep', () => {
      expect(gameLoop.physicsTimestep).toBe(1000 / 60); // 16.67ms
      expect(gameLoop.isRunning).toBe(false);
    });

    it('should create GameLoop with custom physics timestep', () => {
      const customLoop = new GameLoop(
        mockUpdateCallback,
        mockRenderCallback,
        1000 / 30
      );
      expect(customLoop.physicsTimestep).toBe(1000 / 30); // 33.33ms
    });
  });

  describe('start and stop', () => {
    it('should start the game loop', () => {
      gameLoop.start();
      expect(gameLoop.isRunning).toBe(true);
    });

    it('should stop the game loop', () => {
      gameLoop.start();
      gameLoop.stop();
      expect(gameLoop.isRunning).toBe(false);
    });

    it('should not start if already running', () => {
      gameLoop.start();
      const firstStart = gameLoop.isRunning;
      gameLoop.start(); // Try to start again
      expect(firstStart).toBe(true);
      expect(gameLoop.isRunning).toBe(true);
    });
  });

  describe('fixed timestep physics', () => {
    it('should call update callback with fixed timestep when enough time has accumulated', () => {
      // Mock time progression
      let currentTime = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => currentTime);

      gameLoop.start();

      // Advance time by exactly one physics timestep
      currentTime = gameLoop.physicsTimestep;
      gameLoop.tick();

      expect(mockUpdateCallback).toHaveBeenCalledTimes(1);
      expect(mockUpdateCallback).toHaveBeenCalledWith(gameLoop.physicsTimestep);
    });

    it('should call update multiple times for large time deltas', () => {
      let currentTime = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => currentTime);

      gameLoop.start();

      // Advance time by 2.5 physics timesteps
      currentTime = gameLoop.physicsTimestep * 2.5;
      gameLoop.tick();

      // Should call update 2 times (not 2.5)
      expect(mockUpdateCallback).toHaveBeenCalledTimes(2);
      expect(mockUpdateCallback).toHaveBeenNthCalledWith(
        1,
        gameLoop.physicsTimestep
      );
      expect(mockUpdateCallback).toHaveBeenNthCalledWith(
        2,
        gameLoop.physicsTimestep
      );
    });

    it('should not call update callback if insufficient time has accumulated', () => {
      let currentTime = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => currentTime);

      gameLoop.start();

      // Advance time by less than one timestep
      currentTime = gameLoop.physicsTimestep * 0.5;
      gameLoop.tick();

      expect(mockUpdateCallback).not.toHaveBeenCalled();
    });
  });

  describe('variable framerate rendering', () => {
    it('should call render callback every tick with interpolation factor', () => {
      let currentTime = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => currentTime);

      gameLoop.start();

      // First tick - no time passed
      gameLoop.tick();
      expect(mockRenderCallback).toHaveBeenCalledTimes(1);
      expect(mockRenderCallback).toHaveBeenLastCalledWith(0); // No interpolation

      // Second tick - half timestep passed
      currentTime = gameLoop.physicsTimestep * 0.5;
      gameLoop.tick();
      expect(mockRenderCallback).toHaveBeenCalledTimes(2);
      expect(mockRenderCallback).toHaveBeenLastCalledWith(0.5); // 50% interpolation

      // Third tick - full timestep passed
      currentTime = gameLoop.physicsTimestep;
      gameLoop.tick();
      expect(mockRenderCallback).toHaveBeenCalledTimes(3);
      expect(mockRenderCallback).toHaveBeenLastCalledWith(0); // Reset after physics update
    });
  });

  describe('time accumulator management', () => {
    it('should properly manage accumulator across multiple ticks', () => {
      let currentTime = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => currentTime);

      gameLoop.start();

      // First tick: 0.3 timesteps
      currentTime = gameLoop.physicsTimestep * 0.3;
      gameLoop.tick();
      expect(mockUpdateCallback).not.toHaveBeenCalled();

      // Second tick: additional 0.4 timesteps (total 0.7)
      currentTime = gameLoop.physicsTimestep * 0.7;
      gameLoop.tick();
      expect(mockUpdateCallback).not.toHaveBeenCalled();

      // Third tick: additional 0.5 timesteps (total 1.2)
      currentTime = gameLoop.physicsTimestep * 1.2;
      gameLoop.tick();
      expect(mockUpdateCallback).toHaveBeenCalledTimes(1);

      // Accumulator should have 0.2 timesteps remaining
      // Next tick: additional 0.9 timesteps (0.2 + 0.9 = 1.1)
      currentTime = gameLoop.physicsTimestep * 2.1; // Total from start
      gameLoop.tick();
      expect(mockUpdateCallback).toHaveBeenCalledTimes(2);
    });

    it('should handle frame drops gracefully with maximum update limit', () => {
      let currentTime = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => currentTime);

      gameLoop.start();

      // Simulate a huge frame drop (10 physics timesteps)
      currentTime = gameLoop.physicsTimestep * 10;
      gameLoop.tick();

      // Should be limited to prevent spiral of death
      // Typical limit is around 5-8 updates per frame
      expect(mockUpdateCallback).toHaveBeenCalled();
      expect(mockUpdateCallback.mock.calls.length).toBeLessThanOrEqual(8);
    });
  });

  describe('statistics and debugging', () => {
    it('should track FPS over time', () => {
      let currentTime = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => currentTime);

      gameLoop.start();

      // Simulate 60 FPS (16.67ms per frame)
      for (let i = 0; i < 60; i++) {
        currentTime += 16.67;
        gameLoop.tick();
      }

      const fps = gameLoop.getCurrentFPS();
      expect(fps).toBeGreaterThan(55); // Allow some tolerance
      expect(fps).toBeLessThan(65);
    });

    it('should provide timing statistics', () => {
      gameLoop.start();
      gameLoop.tick();

      const stats = gameLoop.getStats();
      expect(stats).toHaveProperty('fps');
      expect(stats).toHaveProperty('frameTime');
      expect(stats).toHaveProperty('updateCount');
      expect(stats).toHaveProperty('renderCount');
      expect(typeof stats.fps).toBe('number');
      expect(typeof stats.frameTime).toBe('number');
      expect(typeof stats.updateCount).toBe('number');
      expect(typeof stats.renderCount).toBe('number');
    });
  });

  describe('pause and resume', () => {
    it('should pause and resume game loop without affecting accumulator', () => {
      let currentTime = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => currentTime);

      gameLoop.start();

      // Run for a bit
      currentTime = gameLoop.physicsTimestep * 0.5;
      gameLoop.tick();

      // Pause
      gameLoop.pause();
      expect(gameLoop.isPaused).toBe(true);

      // Time passes while paused
      currentTime = gameLoop.physicsTimestep * 2;
      gameLoop.tick();
      expect(mockUpdateCallback).not.toHaveBeenCalled();

      // Resume
      gameLoop.resume();
      expect(gameLoop.isPaused).toBe(false);

      // Should not have massive time delta after resume
      currentTime += gameLoop.physicsTimestep * 0.6; // Only 0.6 more
      gameLoop.tick();
      expect(mockUpdateCallback).toHaveBeenCalledTimes(1); // Should only update once
    });
  });
});
