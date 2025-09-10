import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ProjectileRenderer,
  ProjectileSymbolType,
  ProjectileRenderOptions,
} from './ProjectileRenderer';
import { Vector3 } from '../../math/Vector3';
import { CanvasManager } from '../CanvasManager';

describe('ProjectileRenderer (T023 - Projectile Display System)', () => {
  let renderer: ProjectileRenderer;
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

    renderer = new ProjectileRenderer();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with default options', () => {
      const options = renderer.getOptions();

      expect(options.showVelocityDirection).toBe(true);
      expect(options.rotateWithVelocity).toBe(true);
      expect(options.scaleWithSpeed).toBe(false);
      expect(options.minSize).toBe(2);
      expect(options.maxSize).toBe(8);
      expect(options.colors.active).toBe('#00ff00');
      expect(options.colors.inactive).toBe('#666666');
      expect(options.colors.friendly).toBe('#0080ff');
      expect(options.colors.enemy).toBe('#ff4000');
    });

    it('should accept custom options', () => {
      const customOptions: Partial<ProjectileRenderOptions> = {
        showVelocityDirection: false,
        minSize: 1,
        maxSize: 10,
        colors: {
          active: '#ffffff',
          inactive: '#333333',
          friendly: '#00ff00',
          enemy: '#ff0000',
        },
      };

      const customRenderer = new ProjectileRenderer(customOptions);
      const options = customRenderer.getOptions();

      expect(options.showVelocityDirection).toBe(false);
      expect(options.minSize).toBe(1);
      expect(options.maxSize).toBe(10);
      expect(options.colors.active).toBe('#ffffff');
      expect(options.colors.enemy).toBe('#ff0000');
    });
  });

  describe('game world bounds', () => {
    it('should set game world bounds', () => {
      renderer.setGameWorldBounds(30000, 25000, 15000, 12500);

      // Test coordinate conversion by checking it doesn't throw
      expect(() => {
        renderer.updateProjectile(
          'test',
          new Vector3(15000, 12500, 0),
          new Vector3(100, 50, 0)
        );
        renderer.renderOnHorizontalRadar(mockCanvas);
      }).not.toThrow();
    });
  });

  describe('projectile management', () => {
    it('should add new projectile', () => {
      renderer.updateProjectile(
        'projectile-1',
        new Vector3(1000, 2000, 100),
        new Vector3(50, 25, 15)
      );

      expect(renderer.getProjectileCount()).toBe(1);
      expect(renderer.getActiveProjectileCount()).toBe(1);

      const projectile = renderer.getProjectile('projectile-1');
      expect(projectile).not.toBeNull();
      expect(projectile!.id).toBe('projectile-1');
      expect(projectile!.position.x).toBe(1000);
      expect(projectile!.velocity.x).toBe(50);
      expect(projectile!.isActive).toBe(true);
    });

    it('should update existing projectile', () => {
      // Add initial projectile
      renderer.updateProjectile(
        'projectile-1',
        new Vector3(1000, 2000, 100),
        new Vector3(50, 25, 15)
      );

      // Update position
      renderer.updateProjectile(
        'projectile-1',
        new Vector3(1100, 2050, 110),
        new Vector3(55, 30, 20)
      );

      expect(renderer.getProjectileCount()).toBe(1);

      const projectile = renderer.getProjectile('projectile-1');
      expect(projectile!.position.x).toBe(1100);
      expect(projectile!.velocity.x).toBe(55);
    });

    it('should handle multiple projectiles', () => {
      renderer.updateProjectile(
        'projectile-1',
        new Vector3(1000, 2000, 100),
        new Vector3(50, 25, 15)
      );

      renderer.updateProjectile(
        'projectile-2',
        new Vector3(2000, 1000, 200),
        new Vector3(-30, 40, 5)
      );

      renderer.updateProjectile(
        'projectile-3',
        new Vector3(0, 0, 50),
        new Vector3(100, 0, 25)
      );

      expect(renderer.getProjectileCount()).toBe(3);
      expect(renderer.getActiveProjectileCount()).toBe(3);

      const allProjectiles = renderer.getAllProjectiles();
      expect(allProjectiles).toHaveLength(3);
    });

    it('should remove projectile', () => {
      renderer.updateProjectile(
        'projectile-1',
        new Vector3(1000, 2000, 100),
        new Vector3(50, 25, 15)
      );

      expect(renderer.getProjectileCount()).toBe(1);

      renderer.removeProjectile('projectile-1');
      expect(renderer.getProjectileCount()).toBe(0);
      expect(renderer.getProjectile('projectile-1')).toBeNull();
    });

    it('should deactivate projectile', () => {
      renderer.updateProjectile(
        'projectile-1',
        new Vector3(1000, 2000, 100),
        new Vector3(50, 25, 15)
      );

      expect(renderer.getActiveProjectileCount()).toBe(1);

      renderer.deactivateProjectile('projectile-1');
      expect(renderer.getProjectileCount()).toBe(1);
      expect(renderer.getActiveProjectileCount()).toBe(0);

      const projectile = renderer.getProjectile('projectile-1');
      expect(projectile!.isActive).toBe(false);
    });

    it('should clear all projectiles', () => {
      renderer.updateProjectile(
        'projectile-1',
        new Vector3(1000, 2000, 100),
        new Vector3(50, 25, 15)
      );
      renderer.updateProjectile(
        'projectile-2',
        new Vector3(2000, 1000, 200),
        new Vector3(-30, 40, 5)
      );

      expect(renderer.getProjectileCount()).toBe(2);

      renderer.clearAll();
      expect(renderer.getProjectileCount()).toBe(0);
    });
  });

  describe('projectile symbol types', () => {
    it('should handle different symbol types', () => {
      const symbolTypes = [
        ProjectileSymbolType.CIRCLE,
        ProjectileSymbolType.TRIANGLE,
        ProjectileSymbolType.SQUARE,
        ProjectileSymbolType.CROSS,
        ProjectileSymbolType.DIAMOND,
      ];

      symbolTypes.forEach((symbolType, index) => {
        renderer.updateProjectile(
          `projectile-${index}`,
          new Vector3(1000 + index * 100, 2000, 100),
          new Vector3(50, 25, 15),
          { symbolType }
        );
      });

      expect(renderer.getProjectileCount()).toBe(5);

      // Render should not throw with different symbol types
      expect(() => {
        renderer.renderOnHorizontalRadar(mockCanvas);
      }).not.toThrow();
    });

    it('should set custom colors for projectiles', () => {
      renderer.updateProjectile(
        'friendly',
        new Vector3(1000, 2000, 100),
        new Vector3(50, 25, 15),
        { color: '#0080ff' }
      );

      renderer.updateProjectile(
        'enemy',
        new Vector3(2000, 1000, 200),
        new Vector3(-30, 40, 5),
        { color: '#ff4000' }
      );

      const friendly = renderer.getProjectile('friendly');
      const enemy = renderer.getProjectile('enemy');

      expect(friendly!.color).toBe('#0080ff');
      expect(enemy!.color).toBe('#ff4000');
    });

    it('should set custom sizes for projectiles', () => {
      renderer.updateProjectile(
        'small',
        new Vector3(1000, 2000, 100),
        new Vector3(50, 25, 15),
        { size: 1 }
      );

      renderer.updateProjectile(
        'large',
        new Vector3(2000, 1000, 200),
        new Vector3(-30, 40, 5),
        { size: 10 }
      );

      const small = renderer.getProjectile('small');
      const large = renderer.getProjectile('large');

      expect(small!.size).toBe(1);
      expect(large!.size).toBe(10);
    });
  });

  describe('rendering on horizontal radar', () => {
    beforeEach(() => {
      renderer.updateProjectile(
        'test-projectile',
        new Vector3(10000, 10000, 100), // Center position
        new Vector3(50, 25, 15)
      );
    });

    it('should render projectile on horizontal radar', () => {
      renderer.renderOnHorizontalRadar(mockCanvas);

      // Should draw at least one shape (circle by default)
      expect(mockCanvas.drawCircle).toHaveBeenCalled();
    });

    it('should render velocity indicator when enabled', () => {
      renderer.setOptions({ showVelocityDirection: true });
      renderer.renderOnHorizontalRadar(mockCanvas);

      // Should draw velocity line
      expect(mockCanvas.drawLine).toHaveBeenCalled();
    });

    it('should not render velocity indicator when disabled', () => {
      renderer.setOptions({ showVelocityDirection: false });
      renderer.renderOnHorizontalRadar(mockCanvas);

      // Should not draw velocity line
      expect(mockCanvas.drawLine).not.toHaveBeenCalled();
    });

    it('should handle rotation with velocity', () => {
      renderer.setOptions({ rotateWithVelocity: true });

      const velocity = new Vector3(100, 0, 0); // Moving east
      renderer.updateProjectile(
        'rotating',
        new Vector3(10000, 10000, 100),
        velocity,
        { symbolType: ProjectileSymbolType.TRIANGLE }
      );

      renderer.renderOnHorizontalRadar(mockCanvas);

      const projectile = renderer.getProjectile('rotating');
      expect(projectile!.rotation).toBeCloseTo(0, 2); // 0 radians for east
    });

    it('should handle different symbol types rendering', () => {
      const symbolTypes = [
        ProjectileSymbolType.CIRCLE,
        ProjectileSymbolType.TRIANGLE,
        ProjectileSymbolType.SQUARE,
        ProjectileSymbolType.CROSS,
        ProjectileSymbolType.DIAMOND,
      ];

      symbolTypes.forEach((symbolType, index) => {
        renderer.updateProjectile(
          `symbol-${index}`,
          new Vector3(10000 + index * 100, 10000, 100),
          new Vector3(50, 25, 15),
          { symbolType }
        );
      });

      expect(() => {
        renderer.renderOnHorizontalRadar(mockCanvas);
      }).not.toThrow();

      // Should have drawn multiple shapes
      expect(mockCanvas.drawCircle).toHaveBeenCalled();
      expect(mockCanvas.drawLine).toHaveBeenCalled();
    });
  });

  describe('rendering on vertical radar', () => {
    beforeEach(() => {
      renderer.updateProjectile(
        'test-projectile',
        new Vector3(10000, 10000, 100), // Center position, 100m altitude
        new Vector3(50, 25, 15)
      );
    });

    it('should render projectile on vertical radar', () => {
      renderer.renderOnVerticalRadar(mockCanvas);

      // Should draw at least one shape
      expect(mockCanvas.drawCircle).toHaveBeenCalled();
    });

    it('should handle altitude correctly in side view', () => {
      const highProjectile = new Vector3(10000, 10000, 1000); // 1km altitude
      renderer.updateProjectile('high', highProjectile, new Vector3(100, 0, 0));

      expect(() => {
        renderer.renderOnVerticalRadar(mockCanvas);
      }).not.toThrow();
    });
  });

  describe('cleanup functionality', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should clean up old inactive projectiles', () => {
      renderer.updateProjectile(
        'old-projectile',
        new Vector3(1000, 2000, 100),
        new Vector3(50, 25, 15)
      );

      // Deactivate projectile
      renderer.deactivateProjectile('old-projectile');
      expect(renderer.getProjectileCount()).toBe(1);

      // Advance time past cleanup threshold
      vi.advanceTimersByTime(2000); // 2 seconds
      renderer.cleanup(1000); // 1 second max age

      expect(renderer.getProjectileCount()).toBe(0);
    });

    it('should not clean up recent inactive projectiles', () => {
      renderer.updateProjectile(
        'recent-projectile',
        new Vector3(1000, 2000, 100),
        new Vector3(50, 25, 15)
      );

      renderer.deactivateProjectile('recent-projectile');

      // Advance time but not past cleanup threshold
      vi.advanceTimersByTime(500); // 0.5 seconds
      renderer.cleanup(1000); // 1 second max age

      expect(renderer.getProjectileCount()).toBe(1);
    });

    it('should not clean up active projectiles', () => {
      renderer.updateProjectile(
        'active-projectile',
        new Vector3(1000, 2000, 100),
        new Vector3(50, 25, 15)
      );

      // Advance time well past cleanup threshold
      vi.advanceTimersByTime(5000); // 5 seconds
      renderer.cleanup(1000); // 1 second max age

      // Active projectile should remain
      expect(renderer.getProjectileCount()).toBe(1);
    });
  });

  describe('size scaling', () => {
    it('should scale size with speed when enabled', () => {
      renderer.setOptions({ scaleWithSpeed: true, minSize: 2, maxSize: 8 });

      // Slow projectile
      renderer.updateProjectile(
        'slow',
        new Vector3(1000, 2000, 100),
        new Vector3(10, 5, 0) // Low speed
      );

      // Fast projectile
      renderer.updateProjectile(
        'fast',
        new Vector3(2000, 1000, 200),
        new Vector3(500, 250, 0) // High speed
      );

      const slow = renderer.getProjectile('slow');
      const fast = renderer.getProjectile('fast');

      expect(slow!.size).toBeGreaterThanOrEqual(2);
      expect(fast!.size).toBeGreaterThan(slow!.size);
      expect(fast!.size).toBeLessThanOrEqual(8);
    });

    it('should not scale size with speed when disabled', () => {
      renderer.setOptions({ scaleWithSpeed: false, minSize: 3 });

      renderer.updateProjectile(
        'constant-size',
        new Vector3(1000, 2000, 100),
        new Vector3(500, 250, 0) // High speed
      );

      const projectile = renderer.getProjectile('constant-size');
      expect(projectile!.size).toBe(3); // Should be minSize
    });
  });

  describe('coordinate conversion', () => {
    it('should convert world coordinates to canvas coordinates correctly', () => {
      renderer.setGameWorldBounds(20000, 20000, 10000, 10000);

      // Test center of world should map to center of canvas
      renderer.updateProjectile(
        'center',
        new Vector3(10000, 10000, 0), // World center
        new Vector3(0, 0, 0)
      );

      expect(() => {
        renderer.renderOnHorizontalRadar(mockCanvas);
        renderer.renderOnVerticalRadar(mockCanvas);
      }).not.toThrow();
    });

    it('should handle edge coordinates without errors', () => {
      renderer.setGameWorldBounds(20000, 20000, 10000, 10000);

      // Test world edge coordinates
      renderer.updateProjectile(
        'edge1',
        new Vector3(0, 0, 0), // Far corner
        new Vector3(100, 100, 0)
      );

      renderer.updateProjectile(
        'edge2',
        new Vector3(20000, 20000, 5000), // Opposite corner, high altitude
        new Vector3(-100, -100, -50)
      );

      expect(() => {
        renderer.renderOnHorizontalRadar(mockCanvas);
        renderer.renderOnVerticalRadar(mockCanvas);
      }).not.toThrow();
    });
  });

  describe('options management', () => {
    it('should update options correctly', () => {
      const newOptions: Partial<ProjectileRenderOptions> = {
        showVelocityDirection: false,
        rotateWithVelocity: false,
        minSize: 5,
        maxSize: 15,
      };

      renderer.setOptions(newOptions);
      const options = renderer.getOptions();

      expect(options.showVelocityDirection).toBe(false);
      expect(options.rotateWithVelocity).toBe(false);
      expect(options.minSize).toBe(5);
      expect(options.maxSize).toBe(15);

      // Should preserve unchanged options
      expect(options.scaleWithSpeed).toBe(false); // original default
    });

    it('should return options as copy', () => {
      const options1 = renderer.getOptions();
      const options2 = renderer.getOptions();

      expect(options1).toEqual(options2);
      expect(options1).not.toBe(options2);
    });
  });

  describe('performance considerations', () => {
    it('should handle many projectiles efficiently', () => {
      const startTime = performance.now();

      // Create many projectiles
      for (let i = 0; i < 100; i++) {
        renderer.updateProjectile(
          `projectile-${i}`,
          new Vector3(5000 + i * 100, 5000 + (i % 10) * 200, 100 + i * 5),
          new Vector3(50 + i, 25, 10),
          { symbolType: ProjectileSymbolType.CIRCLE }
        );
      }

      renderer.renderOnHorizontalRadar(mockCanvas);
      renderer.renderOnVerticalRadar(mockCanvas);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (less than 50ms)
      expect(duration).toBeLessThan(50);
      expect(renderer.getProjectileCount()).toBe(100);
    });

    it('should clean up efficiently with many projectiles', () => {
      vi.useFakeTimers();

      // Create many projectiles and deactivate them
      for (let i = 0; i < 50; i++) {
        renderer.updateProjectile(
          `old-projectile-${i}`,
          new Vector3(i * 100, i * 100, 100),
          new Vector3(50, 25, 15)
        );
        renderer.deactivateProjectile(`old-projectile-${i}`);
      }

      expect(renderer.getProjectileCount()).toBe(50);

      // Advance time and cleanup
      vi.advanceTimersByTime(2000);
      renderer.cleanup(1000);

      expect(renderer.getProjectileCount()).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle zero velocity without errors', () => {
      renderer.updateProjectile(
        'stationary',
        new Vector3(10000, 10000, 100),
        new Vector3(0, 0, 0) // Zero velocity
      );

      expect(() => {
        renderer.renderOnHorizontalRadar(mockCanvas);
        renderer.renderOnVerticalRadar(mockCanvas);
      }).not.toThrow();

      const projectile = renderer.getProjectile('stationary');
      expect(projectile!.rotation).toBe(0);
    });

    it('should handle negative coordinates', () => {
      renderer.updateProjectile(
        'negative',
        new Vector3(-5000, -3000, -100), // Negative coordinates
        new Vector3(-50, -25, -15)
      );

      expect(() => {
        renderer.renderOnHorizontalRadar(mockCanvas);
        renderer.renderOnVerticalRadar(mockCanvas);
      }).not.toThrow();
    });

    it('should handle very large coordinates', () => {
      renderer.setGameWorldBounds(100000, 100000, 50000, 50000);

      renderer.updateProjectile(
        'distant',
        new Vector3(90000, 90000, 10000), // Very large coordinates
        new Vector3(1000, 500, 100)
      );

      expect(() => {
        renderer.renderOnHorizontalRadar(mockCanvas);
        renderer.renderOnVerticalRadar(mockCanvas);
      }).not.toThrow();
    });

    it('should handle updating non-existent projectile options', () => {
      expect(() => {
        renderer.deactivateProjectile('non-existent');
      }).not.toThrow();

      expect(renderer.getProjectile('non-existent')).toBeNull();
    });
  });
});
