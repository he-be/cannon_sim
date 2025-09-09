import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  TrajectoryRenderer,
  TrajectoryRenderOptions,
} from './TrajectoryRenderer';
import { Vector3 } from '../math/Vector3';
import { CanvasManager } from './CanvasManager';

describe('TrajectoryRenderer (T021 - Projectile Tracking Rendering)', () => {
  let renderer: TrajectoryRenderer;
  let mockCanvas: CanvasManager;

  beforeEach(() => {
    // Mock CanvasManager
    mockCanvas = {
      width: 400,
      height: 400,
      drawLine: vi.fn(),
      drawCircle: vi.fn(),
      drawText: vi.fn(),
      clear: vi.fn(),
    } as any;

    renderer = new TrajectoryRenderer();
  });

  describe('initialization', () => {
    it('should initialize with default options', () => {
      const options = renderer.getOptions();

      expect(options.maxTrailLength).toBe(100);
      expect(options.trailFadeTime).toBe(5000);
      expect(options.projectileSize).toBe(2);
      expect(options.trailWidth).toBe(1);
      expect(options.showVelocityVector).toBe(false);
      expect(options.showPredictedPath).toBe(false);
    });

    it('should accept custom options', () => {
      const customOptions: Partial<TrajectoryRenderOptions> = {
        maxTrailLength: 50,
        trailFadeTime: 3000,
        projectileSize: 4,
        colors: {
          active: '#ff0000',
          fading: '#660000',
          impact: '#ffffff',
          predicted: '#0000ff',
        },
      };

      const customRenderer = new TrajectoryRenderer(customOptions);
      const options = customRenderer.getOptions();

      expect(options.maxTrailLength).toBe(50);
      expect(options.trailFadeTime).toBe(3000);
      expect(options.projectileSize).toBe(4);
      expect(options.colors.active).toBe('#ff0000');
    });
  });

  describe('game world bounds', () => {
    it('should set game world bounds', () => {
      renderer.setGameWorldBounds(30000, 25000, 15000, 12500);

      // Test coordinate conversion by checking it doesn't throw
      expect(() => {
        renderer.updateTrajectory(
          'test',
          [new Vector3(15000, 12500, 0)],
          new Vector3(0, 0, 0)
        );
        renderer.renderOnHorizontalRadar(mockCanvas);
      }).not.toThrow();
    });
  });

  describe('trajectory management', () => {
    it('should update projectile trajectory', () => {
      const trajectory = [
        new Vector3(0, 0, 0),
        new Vector3(100, 50, 25),
        new Vector3(200, 100, 45),
      ];
      const velocity = new Vector3(50, 25, 15);

      renderer.updateTrajectory('projectile-1', trajectory, velocity);

      expect(renderer.getActiveTrailCount()).toBe(1);
    });

    it('should handle multiple projectiles', () => {
      const trajectory1 = [new Vector3(0, 0, 0), new Vector3(100, 100, 50)];
      const trajectory2 = [
        new Vector3(1000, 1000, 0),
        new Vector3(1100, 1100, 60),
      ];
      const velocity = new Vector3(50, 50, 25);

      renderer.updateTrajectory('projectile-1', trajectory1, velocity);
      renderer.updateTrajectory('projectile-2', trajectory2, velocity);

      expect(renderer.getActiveTrailCount()).toBe(2);
    });

    it('should limit trail length to maxTrailLength', () => {
      const options: Partial<TrajectoryRenderOptions> = {
        maxTrailLength: 5,
      };
      const limitedRenderer = new TrajectoryRenderer(options);

      const longTrajectory = Array.from(
        { length: 20 },
        (_, i) => new Vector3(i * 10, i * 5, i * 2)
      );
      const velocity = new Vector3(10, 5, 2);

      limitedRenderer.updateTrajectory('test', longTrajectory, velocity);

      // Should truncate to maxTrailLength
      limitedRenderer.renderOnHorizontalRadar(mockCanvas);

      // Verify that drawing operations were called (indicates trajectory was processed)
      expect(mockCanvas.drawLine).toHaveBeenCalled();
    });

    it('should remove trajectory when requested', () => {
      const trajectory = [new Vector3(0, 0, 0), new Vector3(100, 100, 50)];
      const velocity = new Vector3(50, 50, 25);

      renderer.updateTrajectory('test', trajectory, velocity);
      expect(renderer.getActiveTrailCount()).toBe(1);

      renderer.removeTrajectory('test');

      // Should still exist but marked for fade-out
      expect(renderer.getActiveTrailCount()).toBe(1);
    });

    it('should clear all trajectories', () => {
      const trajectory = [new Vector3(0, 0, 0), new Vector3(100, 100, 50)];
      const velocity = new Vector3(50, 50, 25);

      renderer.updateTrajectory('test-1', trajectory, velocity);
      renderer.updateTrajectory('test-2', trajectory, velocity);
      expect(renderer.getActiveTrailCount()).toBe(2);

      renderer.clearAll();
      expect(renderer.getActiveTrailCount()).toBe(0);
    });
  });

  describe('rendering on horizontal radar', () => {
    beforeEach(() => {
      const trajectory = [
        new Vector3(10000, 10000, 0), // Center
        new Vector3(10100, 10050, 25),
        new Vector3(10200, 10100, 45),
      ];
      const velocity = new Vector3(50, 25, 15);

      renderer.updateTrajectory('test', trajectory, velocity);
    });

    it('should render trajectory on horizontal radar', () => {
      renderer.renderOnHorizontalRadar(mockCanvas);

      // Should draw trail lines and projectile
      expect(mockCanvas.drawLine).toHaveBeenCalled();
      expect(mockCanvas.drawCircle).toHaveBeenCalled();
    });

    it('should render velocity vector when enabled', () => {
      renderer.setOptions({ showVelocityVector: true });
      renderer.renderOnHorizontalRadar(mockCanvas);

      // Should draw additional line for velocity vector
      expect(mockCanvas.drawLine).toHaveBeenCalledTimes(3); // 2 trail segments + 1 velocity vector
    });

    it('should handle empty trajectory gracefully', () => {
      renderer.updateTrajectory('empty', [], new Vector3(0, 0, 0));

      expect(() => {
        renderer.renderOnHorizontalRadar(mockCanvas);
      }).not.toThrow();
    });
  });

  describe('rendering on vertical radar', () => {
    beforeEach(() => {
      const trajectory = [
        new Vector3(10000, 10000, 0), // Ground level at center
        new Vector3(10100, 10050, 100), // Rising
        new Vector3(10200, 10100, 150), // Higher
      ];
      const velocity = new Vector3(50, 25, 30);

      renderer.updateTrajectory('test', trajectory, velocity);
    });

    it('should render trajectory on vertical radar', () => {
      renderer.renderOnVerticalRadar(mockCanvas);

      // Should draw trail lines and projectile
      expect(mockCanvas.drawLine).toHaveBeenCalled();
      expect(mockCanvas.drawCircle).toHaveBeenCalled();
    });

    it('should render velocity vector in side view when enabled', () => {
      renderer.setOptions({ showVelocityVector: true });
      renderer.renderOnVerticalRadar(mockCanvas);

      // Should draw additional line for velocity vector
      expect(mockCanvas.drawLine).toHaveBeenCalledTimes(3); // 2 trail segments + 1 velocity vector
    });

    it('should handle altitude correctly in side view', () => {
      const highTrajectory = [
        new Vector3(10000, 10000, 0),
        new Vector3(10500, 10000, 1000), // 1km altitude
      ];

      renderer.updateTrajectory('high', highTrajectory, new Vector3(100, 0, 0));

      expect(() => {
        renderer.renderOnVerticalRadar(mockCanvas);
      }).not.toThrow();
    });
  });

  describe('coordinate conversion', () => {
    it('should convert world coordinates to canvas coordinates correctly', () => {
      renderer.setGameWorldBounds(20000, 20000, 10000, 10000);

      // Test center of world should map to center of canvas
      const centerTrajectory = [new Vector3(10000, 10000, 0)];
      renderer.updateTrajectory(
        'center',
        centerTrajectory,
        new Vector3(0, 0, 0)
      );

      expect(() => {
        renderer.renderOnHorizontalRadar(mockCanvas);
      }).not.toThrow();
    });

    it('should handle edge coordinates without errors', () => {
      renderer.setGameWorldBounds(20000, 20000, 10000, 10000);

      // Test world edge coordinates
      const edgeTrajectory = [
        new Vector3(0, 0, 0), // Far corner
        new Vector3(20000, 20000, 0), // Opposite corner
      ];
      renderer.updateTrajectory(
        'edge',
        edgeTrajectory,
        new Vector3(100, 100, 0)
      );

      expect(() => {
        renderer.renderOnHorizontalRadar(mockCanvas);
        renderer.renderOnVerticalRadar(mockCanvas);
      }).not.toThrow();
    });
  });

  describe('fade effects', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should apply fade effects over time', () => {
      const trajectory = [new Vector3(0, 0, 0), new Vector3(100, 100, 50)];
      renderer.updateTrajectory(
        'fade-test',
        trajectory,
        new Vector3(50, 50, 25)
      );

      // Remove trajectory to start fade-out
      renderer.removeTrajectory('fade-test');

      // Advance time
      vi.advanceTimersByTime(2500); // Half fade time

      renderer.renderOnHorizontalRadar(mockCanvas);
      expect(mockCanvas.drawLine).toHaveBeenCalled();

      // Clean up after full fade time
      vi.advanceTimersByTime(5000);
      renderer.cleanup();

      expect(renderer.getActiveTrailCount()).toBe(0);
    });

    it('should clean up fully faded trails', () => {
      const trajectory = [new Vector3(0, 0, 0), new Vector3(100, 100, 50)];
      renderer.updateTrajectory(
        'cleanup-test',
        trajectory,
        new Vector3(50, 50, 25)
      );

      renderer.removeTrajectory('cleanup-test');
      expect(renderer.getActiveTrailCount()).toBe(1);

      // Advance time past fade duration
      vi.advanceTimersByTime(6000);
      renderer.cleanup();

      expect(renderer.getActiveTrailCount()).toBe(0);
    });
  });

  describe('options management', () => {
    it('should update options correctly', () => {
      const newOptions: Partial<TrajectoryRenderOptions> = {
        maxTrailLength: 200,
        trailFadeTime: 8000,
        projectileSize: 5,
      };

      renderer.setOptions(newOptions);
      const options = renderer.getOptions();

      expect(options.maxTrailLength).toBe(200);
      expect(options.trailFadeTime).toBe(8000);
      expect(options.projectileSize).toBe(5);

      // Should preserve unchanged options
      expect(options.trailWidth).toBe(1);
    });

    it('should return options as copy', () => {
      const options1 = renderer.getOptions();
      const options2 = renderer.getOptions();

      expect(options1).toEqual(options2);
      expect(options1).not.toBe(options2);
    });
  });

  describe('performance considerations', () => {
    it('should handle many trajectories efficiently', () => {
      const startTime = performance.now();

      // Create many trajectories
      for (let i = 0; i < 50; i++) {
        const trajectory = Array.from(
          { length: 10 },
          (_, j) => new Vector3(i * 100 + j * 10, i * 50 + j * 5, j * 10)
        );
        renderer.updateTrajectory(
          `projectile-${i}`,
          trajectory,
          new Vector3(10, 5, 1)
        );
      }

      renderer.renderOnHorizontalRadar(mockCanvas);
      renderer.renderOnVerticalRadar(mockCanvas);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (less than 100ms)
      expect(duration).toBeLessThan(100);
      expect(renderer.getActiveTrailCount()).toBe(50);
    });

    it('should limit memory usage with maxTrailLength', () => {
      renderer.setOptions({ maxTrailLength: 10 });

      const longTrajectory = Array.from(
        { length: 1000 },
        (_, i) => new Vector3(i, i, i % 100)
      );

      renderer.updateTrajectory('long', longTrajectory, new Vector3(1, 1, 0));

      // Should not store more points than maxTrailLength
      renderer.renderOnHorizontalRadar(mockCanvas);

      // Verify it renders without performance issues
      expect(mockCanvas.drawLine).toHaveBeenCalled();
    });
  });
});
