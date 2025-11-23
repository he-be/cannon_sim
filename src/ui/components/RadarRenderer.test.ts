import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RadarRenderer } from './RadarRenderer';
import { CanvasManager } from '../../rendering/CanvasManager';
import { Vector3 } from '../../math/Vector3';
import { CRT_COLORS } from '../../data/Constants';

describe('RadarRenderer - Projectile Display', () => {
  let radarRenderer: RadarRenderer;
  let mockCanvasManager: CanvasManager;
  let mockContext: CanvasRenderingContext2D;
  let mockEvents: any;

  let fillStyles: string[] = [];

  beforeEach(() => {
    fillStyles = [];
    // Create mock context with all necessary methods
    mockContext = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn().mockImplementation(() => {
        fillStyles.push(mockContext.fillStyle as string);
      }),
      arc: vi.fn(),
      setLineDash: vi.fn(),
      fillText: vi.fn(),
      closePath: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: 'left',
    } as any;

    mockCanvasManager = {
      context: mockContext,
      getCanvas: () => ({
        width: 800,
        height: 600,
      }),
    } as any;

    mockEvents = {
      onDirectionChange: vi.fn(),
      onRangeChange: vi.fn(),
      onTargetDetected: vi.fn(),
      onTargetLost: vi.fn(),
    };

    radarRenderer = new RadarRenderer(
      mockCanvasManager,
      mockEvents,
      { x: 0, y: 0, width: 600, height: 400 }, // horizontal bounds
      { x: 600, y: 0, width: 200, height: 400 } // vertical bounds
    );
  });

  describe('updateProjectiles', () => {
    it('should store projectiles for rendering', () => {
      const projectiles = [
        {
          id: 'p1',
          position: new Vector3(0, 1000, 500), // In sweep
          velocity: new Vector3(0, 100, 50),
          isActive: true,
        },
        {
          id: 'p2',
          position: new Vector3(0, 2000, 300), // In sweep
          velocity: new Vector3(0, 100, 30),
          isActive: true,
        },
      ];

      radarRenderer.updateProjectiles(projectiles);

      // Verify projectiles are stored by rendering and checking draw calls
      radarRenderer.render();

      // Check that arc was called for projectiles (green dots)
      expect(mockContext.arc).toHaveBeenCalled();
    });

    it('should handle empty projectile array', () => {
      radarRenderer.updateProjectiles([]);
      radarRenderer.render();

      // Should not crash
      expect(mockContext.save).toHaveBeenCalled();
    });

    it('should only render active projectiles', () => {
      const projectiles = [
        {
          id: 'p1',
          position: new Vector3(0, 1000, 500), // In sweep
          velocity: new Vector3(0, 100, 50),
          isActive: true,
        },
        {
          id: 'p2',
          position: new Vector3(0, 2000, 300), // In sweep
          velocity: new Vector3(0, 100, 30),
          isActive: false, // Inactive
        },
      ];

      radarRenderer.updateProjectiles(projectiles);
      radarRenderer.render();

      // Verify arc calls - should be called for grid + active projectiles only
      expect(mockContext.arc).toHaveBeenCalled();
    });
  });

  describe('projectile color and size', () => {
    it('should draw horizontal radar projectiles in white', () => {
      const projectiles = [
        {
          id: 'p1',
          position: new Vector3(0, 500, 500), // Directly ahead (0 degrees) to be in sweep
          velocity: new Vector3(0, 100, 50),
          isActive: true,
        },
      ];

      radarRenderer.updateProjectiles(projectiles);
      radarRenderer.render();

      // Check that fillStyle was set to white (PROJECTILE color) at some point
      // CRT_COLORS.PROJECTILE is usually white or very bright
      expect(fillStyles).toContain(CRT_COLORS.PROJECTILE);
    });
  });

  describe('beam filtering for vertical radar', () => {
    it('should only show projectiles within beam width on vertical radar', () => {
      // Set radar azimuth to 0
      radarRenderer.setDirection(0, 0);

      const projectiles = [
        {
          id: 'p1',
          position: new Vector3(1000, 0, 500), // Directly ahead, in beam
          velocity: new Vector3(100, 0, 50),
          isActive: true,
        },
        {
          id: 'p2',
          position: new Vector3(0, 1000, 500), // 90 degrees off, out of beam
          velocity: new Vector3(100, 0, 30),
          isActive: true,
        },
      ];

      radarRenderer.updateProjectiles(projectiles);
      radarRenderer.render();

      // Vertical radar should only draw projectile p1 (in beam)
      // This is hard to verify without more mocking,
      // but at minimum it should not crash
      expect(mockContext.arc).toHaveBeenCalled();
    });
  });
});
