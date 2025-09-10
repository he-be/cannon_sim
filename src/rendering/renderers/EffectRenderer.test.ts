import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EffectRenderer } from './EffectRenderer';
import { Vector3 } from '../../math/Vector3';

describe('EffectRenderer (T025 - Effect System)', () => {
  let effectRenderer: EffectRenderer;
  let mockCanvas: HTMLCanvasElement;
  let mockCtx: CanvasRenderingContext2D;

  beforeEach(() => {
    // Create mock canvas and context
    mockCanvas = {
      width: 800,
      height: 600,
    } as HTMLCanvasElement;

    mockCtx = {
      canvas: mockCanvas,
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      globalAlpha: 1,
      strokeStyle: '',
      fillStyle: '',
      lineWidth: 1,
    } as any;

    effectRenderer = new EffectRenderer(mockCtx);
  });

  describe('initialization', () => {
    it('should initialize with default options', () => {
      const stats = effectRenderer.getStats();
      expect(stats.particleCount).toBe(0);
      expect(stats.explosionCount).toBe(0);
    });

    it('should accept custom options', () => {
      const customRenderer = new EffectRenderer(mockCtx, {
        maxParticles: 100,
        explosionDuration: 2.0,
      });

      expect(customRenderer).toBeDefined();
    });
  });

  describe('explosion effects', () => {
    it('should create projectile impact explosion', () => {
      const position = new Vector3(100, 200, 0);

      effectRenderer.createExplosion(position, 'projectile_impact');

      const stats = effectRenderer.getStats();
      expect(stats.explosionCount).toBe(1);
      expect(stats.particleCount).toBeGreaterThan(0);
    });

    it('should create target destruction explosion', () => {
      const position = new Vector3(500, -300, 50);

      effectRenderer.createExplosion(position, 'target_destruction');

      const stats = effectRenderer.getStats();
      expect(stats.explosionCount).toBe(1);
      expect(stats.particleCount).toBeGreaterThan(0);
    });

    it('should create different particle counts for different explosion types', () => {
      const position = new Vector3(0, 0, 0);

      effectRenderer.createExplosion(position, 'projectile_impact');
      const impactStats = effectRenderer.getStats();

      effectRenderer.clearAll();

      effectRenderer.createExplosion(position, 'target_destruction');
      const destructionStats = effectRenderer.getStats();

      // Target destruction should have more particles than projectile impact
      expect(destructionStats.particleCount).toBeGreaterThan(
        impactStats.particleCount
      );
    });

    it('should respect maximum particle limit', () => {
      const limitedRenderer = new EffectRenderer(mockCtx, { maxParticles: 10 });
      const position = new Vector3(0, 0, 0);

      // Create multiple explosions
      for (let i = 0; i < 5; i++) {
        limitedRenderer.createExplosion(position, 'target_destruction');
      }

      const stats = limitedRenderer.getStats();
      expect(stats.particleCount).toBeLessThanOrEqual(10);
    });
  });

  describe('particle simulation', () => {
    beforeEach(() => {
      const position = new Vector3(0, 0, 0);
      effectRenderer.createExplosion(position, 'projectile_impact');
    });

    it('should update particle positions over time', () => {
      const initialStats = effectRenderer.getStats();
      const initialParticleCount = initialStats.particleCount;

      // Update with small time step
      effectRenderer.update(0.016); // ~60 FPS

      const stats = effectRenderer.getStats();
      expect(stats.particleCount).toBe(initialParticleCount);
    });

    it('should remove expired particles', () => {
      const initialStats = effectRenderer.getStats();

      // Update with very large time step to expire particles
      effectRenderer.update(5.0);

      const finalStats = effectRenderer.getStats();
      expect(finalStats.particleCount).toBeLessThan(initialStats.particleCount);
    });

    it('should apply physics to particles', () => {
      // Update multiple times to ensure physics is working
      for (let i = 0; i < 10; i++) {
        effectRenderer.update(0.1);
      }

      // Particles should still exist (not all expired immediately)
      const stats = effectRenderer.getStats();
      expect(stats.particleCount).toBeGreaterThan(0);
    });
  });

  describe('effect lifecycle', () => {
    it('should clean up expired explosions', () => {
      const position = new Vector3(100, 100, 0);
      effectRenderer.createExplosion(position, 'projectile_impact');

      // Update with time longer than explosion duration
      effectRenderer.update(3.0); // Longer than default 1.5s duration

      const stats = effectRenderer.getStats();
      expect(stats.explosionCount).toBe(0);
    });

    it('should maintain active explosions within duration', () => {
      const position = new Vector3(200, 200, 0);
      effectRenderer.createExplosion(position, 'target_destruction');

      // Update with time shorter than explosion duration
      effectRenderer.update(0.5); // Shorter than 1.5s duration

      const stats = effectRenderer.getStats();
      expect(stats.explosionCount).toBe(1);
    });
  });

  describe('rendering', () => {
    beforeEach(() => {
      const position = new Vector3(0, 0, 0);
      effectRenderer.createExplosion(position, 'projectile_impact');
    });

    it('should render without errors', () => {
      expect(() => {
        effectRenderer.render();
      }).not.toThrow();
    });

    it('should call canvas drawing methods', () => {
      effectRenderer.render();

      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
      expect(mockCtx.beginPath).toHaveBeenCalled();
    });

    it('should render both explosions and particles', () => {
      effectRenderer.render();

      // Should draw circles (arc method called)
      expect(mockCtx.arc).toHaveBeenCalled();
    });
  });

  describe('utility methods', () => {
    it('should clear all effects', () => {
      const position = new Vector3(0, 0, 0);
      effectRenderer.createExplosion(position, 'target_destruction');

      let stats = effectRenderer.getStats();
      expect(stats.particleCount).toBeGreaterThan(0);
      expect(stats.explosionCount).toBeGreaterThan(0);

      effectRenderer.clearAll();

      stats = effectRenderer.getStats();
      expect(stats.particleCount).toBe(0);
      expect(stats.explosionCount).toBe(0);
    });

    it('should update options correctly', () => {
      effectRenderer.updateOptions({
        maxParticles: 200,
        explosionDuration: 3.0,
      });

      // Verify options are updated (test by creating effects with new limits)
      const position = new Vector3(0, 0, 0);
      effectRenderer.createExplosion(position, 'projectile_impact');

      expect(() => {
        effectRenderer.update(2.5); // Should not expire with 3.0s duration
      }).not.toThrow();
    });

    it('should provide accurate statistics', () => {
      const position = new Vector3(100, 200, 0);

      // Create multiple effects
      effectRenderer.createExplosion(position, 'projectile_impact');
      effectRenderer.createExplosion(position, 'target_destruction');

      const stats = effectRenderer.getStats();
      expect(stats.explosionCount).toBe(2);
      expect(stats.particleCount).toBeGreaterThan(0);
      expect(typeof stats.particleCount).toBe('number');
      expect(typeof stats.explosionCount).toBe('number');
    });
  });

  describe('coordinate conversion', () => {
    it('should handle various world positions', () => {
      const positions = [
        new Vector3(0, 0, 0), // Origin
        new Vector3(1000, 2000, 0), // Positive coordinates
        new Vector3(-500, -1000, 0), // Negative coordinates
        new Vector3(0, 0, 100), // With altitude
      ];

      positions.forEach(pos => {
        expect(() => {
          effectRenderer.createExplosion(pos, 'projectile_impact');
          effectRenderer.render();
        }).not.toThrow();
      });
    });
  });

  describe('performance characteristics', () => {
    it('should handle multiple simultaneous effects', () => {
      const positions = [
        new Vector3(100, 100, 0),
        new Vector3(-200, 300, 0),
        new Vector3(500, -400, 0),
        new Vector3(0, 0, 100),
      ];

      // Create multiple explosions
      positions.forEach(pos => {
        effectRenderer.createExplosion(pos, 'target_destruction');
      });

      expect(() => {
        effectRenderer.update(0.016);
        effectRenderer.render();
      }).not.toThrow();

      const stats = effectRenderer.getStats();
      expect(stats.explosionCount).toBe(positions.length);
    });

    it('should maintain performance with particle limit', () => {
      const position = new Vector3(0, 0, 0);

      // Try to create excessive particles
      for (let i = 0; i < 20; i++) {
        effectRenderer.createExplosion(position, 'target_destruction');
      }

      const stats = effectRenderer.getStats();
      expect(stats.particleCount).toBeLessThanOrEqual(500); // Default max particles
    });
  });
});
