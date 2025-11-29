import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RadarController, RadarEvents, RadarTarget } from './RadarController';
import { Vector3 } from '../math/Vector3';

describe('RadarController (T020 - Radar Operation System)', () => {
  let radarController: RadarController;
  let mockEvents: RadarEvents;
  let mockCanvases: { [key: string]: any };

  beforeEach(() => {
    // Create mock events
    mockEvents = {
      onDirectionChange: vi.fn(),
      onRangeChange: vi.fn(),
      onTargetDetected: vi.fn(),
      onTargetLost: vi.fn(),
      onSweepComplete: vi.fn(),
    };

    // Create mock canvas contexts
    const mockContext = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
    };

    // Create mock canvas elements
    mockCanvases = {
      'horizontal-radar': {
        width: 400,
        height: 400,
        getContext: vi.fn(() => mockContext),
        getBoundingClientRect: vi.fn(() => ({
          left: 100,
          top: 50,
          width: 400,
          height: 400,
        })),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
      'vertical-radar': {
        width: 400,
        height: 300,
        getContext: vi.fn(() => mockContext),
        getBoundingClientRect: vi.fn(() => ({
          left: 500,
          top: 50,
          width: 400,
          height: 300,
        })),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    };

    // Mock document.getElementById
    vi.spyOn(document, 'getElementById').mockImplementation(
      (id: string) => mockCanvases[id] || null
    );

    // Mock requestAnimationFrame and cancelAnimationFrame
    let animationId = 1;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(
      (_callback: FrameRequestCallback) => {
        // Don't actually schedule the callback to avoid test timing issues
        return animationId++;
      }
    );

    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    radarController = new RadarController(mockEvents);
  });

  describe('initialization', () => {
    it('should initialize with default radar state', () => {
      const state = radarController.getState();

      expect(state.azimuth).toBe(0); // North
      expect(state.elevation).toBe(0); // Horizontal
      expect(state.currentRange).toBe(5000); // 5km
      expect(state.maxRange).toBe(10000); // 10km
      expect(state.rangeCursor).toBe(0.5); // 50%
      expect(state.isActive).toBe(true);
      expect(state.isTracking).toBe(false);
      expect(state.sweepAngle).toBe(30); // 30 degrees
    });

    it('should initialize canvas elements', () => {
      expect(document.getElementById).toHaveBeenCalledWith('horizontal-radar');
      expect(document.getElementById).toHaveBeenCalledWith('vertical-radar');
      expect(mockCanvases['horizontal-radar'].getContext).toHaveBeenCalledWith(
        '2d'
      );
      expect(mockCanvases['vertical-radar'].getContext).toHaveBeenCalledWith(
        '2d'
      );
    });

    it('should throw error for missing canvas elements', () => {
      vi.mocked(document.getElementById).mockReturnValue(null);

      expect(() => new RadarController(mockEvents)).toThrow(
        "Radar canvas 'horizontal-radar' not found"
      );
    });

    it('should start radar sweep animation', () => {
      expect(globalThis.requestAnimationFrame).toHaveBeenCalled();
    });
  });

  describe('radar direction control', () => {
    it('should set radar direction programmatically', () => {
      radarController.setDirection(90, 15);

      const state = radarController.getState();
      expect(state.azimuth).toBe(90);
      expect(state.elevation).toBe(15);
      expect(mockEvents.onDirectionChange).toHaveBeenCalledWith(90, 15);
    });

    it('should normalize azimuth to 0-360 range', () => {
      radarController.setDirection(-45, 0);
      expect(radarController.getState().azimuth).toBe(315);

      radarController.setDirection(450, 0);
      expect(radarController.getState().azimuth).toBe(90);
    });

    it('should clamp elevation to 0-90 range', () => {
      radarController.setDirection(0, -10);
      expect(radarController.getState().elevation).toBe(0);

      radarController.setDirection(0, 100);
      expect(radarController.getState().elevation).toBe(90);
    });
  });

  describe('radar range control', () => {
    it('should set radar range programmatically', () => {
      radarController.setRange(7500);

      const state = radarController.getState();
      expect(state.currentRange).toBe(7500);
      expect(state.rangeCursor).toBe(0.75); // 75% of max range
      expect(mockEvents.onRangeChange).toHaveBeenCalledWith(7500);
    });

    it('should clamp range to valid bounds', () => {
      radarController.setRange(-1000);
      expect(radarController.getState().currentRange).toBe(0);

      radarController.setRange(15000);
      expect(radarController.getState().currentRange).toBe(10000);
    });

    it('should update range cursor correctly', () => {
      radarController.setRange(2500);
      expect(radarController.getState().rangeCursor).toBe(0.25);

      radarController.setRange(10000);
      expect(radarController.getState().rangeCursor).toBe(1.0);
    });
  });

  describe('target management', () => {
    const mockTarget: RadarTarget = {
      id: 'target-001',
      position: new Vector3(1000, 2000, 100),
      velocity: new Vector3(50, -30, 0),
      distance: 2236, // sqrt(1000^2 + 2000^2)
      bearing: 63.43, // atan2(1000, 2000) * 180/π
      elevation: 2.56, // atan(100/2236) * 180/π
      targetType: 'MOVING_FAST',
      strength: 0.8,
    };

    it('should add detected targets', () => {
      radarController.addTarget(mockTarget);

      const targets = radarController.getTargets();
      expect(targets).toHaveLength(1);
      expect(targets[0]).toEqual(mockTarget);
      expect(mockEvents.onTargetDetected).toHaveBeenCalledWith(mockTarget);
    });

    it('should remove targets', () => {
      radarController.addTarget(mockTarget);
      radarController.removeTarget('target-001');

      const targets = radarController.getTargets();
      expect(targets).toHaveLength(0);
      expect(mockEvents.onTargetLost).toHaveBeenCalledWith('target-001');
    });

    it('should update existing targets', () => {
      radarController.addTarget(mockTarget);

      const updatedTarget: RadarTarget = {
        ...mockTarget,
        position: new Vector3(1100, 1950, 110),
        distance: 2200,
      };

      radarController.updateTarget(updatedTarget);

      const targets = radarController.getTargets();
      expect(targets[0].position.x).toBe(1100);
      expect(targets[0].distance).toBe(2200);
    });

    it('should handle multiple targets', () => {
      const target1: RadarTarget = { ...mockTarget, id: 'target-001' };
      const target2: RadarTarget = {
        ...mockTarget,
        id: 'target-002',
        targetType: 'STATIONARY',
      };

      radarController.addTarget(target1);
      radarController.addTarget(target2);

      const targets = radarController.getTargets();
      expect(targets).toHaveLength(2);
      expect(targets.map(t => t.id)).toContain('target-001');
      expect(targets.map(t => t.id)).toContain('target-002');
    });

    it('should not trigger onTargetLost for non-existent targets', () => {
      radarController.removeTarget('non-existent');
      expect(mockEvents.onTargetLost).not.toHaveBeenCalled();
    });
  });

  describe('radar active state', () => {
    it('should control radar active state', () => {
      radarController.setActive(false);
      expect(radarController.getState().isActive).toBe(false);
      expect(globalThis.cancelAnimationFrame).toHaveBeenCalled();

      radarController.setActive(true);
      expect(radarController.getState().isActive).toBe(true);
      expect(globalThis.requestAnimationFrame).toHaveBeenCalled();
    });

    it('should stop animation when deactivated', () => {
      radarController.setActive(false);
      expect(globalThis.cancelAnimationFrame).toHaveBeenCalled();
    });

    it('should restart animation when reactivated', () => {
      radarController.setActive(false);
      vi.clearAllMocks();

      radarController.setActive(true);
      expect(globalThis.requestAnimationFrame).toHaveBeenCalled();
    });
  });

  describe('mouse interaction simulation', () => {
    beforeEach(() => {
      // Mock mouse events by directly calling the internal methods
      (radarController as any).handleMouseDown = vi.fn();
      (radarController as any).handleMouseMove = vi.fn();
      (radarController as any).handleMouseUp = vi.fn();
      (radarController as any).handleDragStart = vi.fn();
      (radarController as any).handleDragEnd = vi.fn();
    });

    it('should handle direction control interaction', () => {
      // Test that the event would be processed
      expect(() => {
        (radarController as any).setupEventListeners();
      }).not.toThrow();
    });

    it('should handle range control interaction', () => {
      // Test that the radar controller handles edge interactions
      expect((radarController as any)._dragType).toBeNull();
    });
  });

  describe('coordinate conversion', () => {
    it('should convert game coordinates to canvas coordinates correctly', () => {
      const gameCoords = { x: 10000, y: 10000 }; // Center of game world for radar
      const canvasCoords = (radarController as any).gameToCanvasCoords(
        gameCoords
      );

      // Should map to center of canvas (radar center at 10km, 10km in game world)
      expect(canvasCoords.x).toBeCloseTo(200, 0); // Canvas width / 2
      expect(canvasCoords.y).toBeCloseTo(200, 0); // Canvas height / 2
    });

    it('should handle edge coordinates correctly', () => {
      const gameCoords = { x: 15000, y: 15000 }; // Edge of game world
      const canvasCoords = (radarController as any).gameToCanvasCoords(
        gameCoords
      );

      // Should map beyond center of canvas area
      expect(canvasCoords.x).toBeGreaterThan(200);
      expect(canvasCoords.y).toBeGreaterThan(200);
    });
  });

  describe('radar display rendering', () => {
    it('should update radar display', () => {
      // Test that display update doesn't throw errors
      expect(() => {
        (radarController as any).updateRadarDisplay();
      }).not.toThrow();
    });

    it('should draw horizontal radar elements', () => {
      const ctx = mockCanvases['horizontal-radar'].getContext();

      (radarController as any).drawHorizontalRadar();

      // Verify basic drawing operations
      expect(ctx.fillRect).toHaveBeenCalled(); // Canvas clear
      expect(ctx.arc).toHaveBeenCalled(); // Range rings
      expect(ctx.stroke).toHaveBeenCalled(); // Lines
    });

    it('should draw vertical radar elements', () => {
      const ctx = mockCanvases['vertical-radar'].getContext();

      (radarController as any).drawVerticalRadar();

      // Verify basic drawing operations
      expect(ctx.fillRect).toHaveBeenCalled(); // Canvas clear
      expect(ctx.moveTo).toHaveBeenCalled(); // Lines
      expect(ctx.lineTo).toHaveBeenCalled(); // Lines
    });

    it('should draw targets with appropriate colors', () => {
      const mockTarget: RadarTarget = {
        id: 'test-target',
        position: new Vector3(1000, 1000, 0),
        velocity: new Vector3(0, 0, 0),
        distance: 1414,
        bearing: 45,
        elevation: 0,
        targetType: 'MOVING_FAST',
        strength: 0.8,
      };

      radarController.addTarget(mockTarget);

      const color = (radarController as any).getTargetColor(mockTarget);
      expect(color).toContain('rgba(255, 0, 0'); // Red for MOVING_FAST
    });

    it('should assign correct colors for different target types', () => {
      const fastTarget: RadarTarget = {
        id: 'fast',
        position: new Vector3(0, 0, 0),
        velocity: new Vector3(0, 0, 0),
        distance: 0,
        bearing: 0,
        elevation: 0,
        targetType: 'MOVING_FAST',
        strength: 1.0,
      };

      const slowTarget: RadarTarget = {
        ...fastTarget,
        id: 'slow',
        targetType: 'MOVING_SLOW',
      };

      const stationaryTarget: RadarTarget = {
        ...fastTarget,
        id: 'stationary',
        targetType: 'STATIONARY',
      };

      expect((radarController as any).getTargetColor(fastTarget)).toContain(
        'rgba(255, 0, 0'
      ); // Red
      expect((radarController as any).getTargetColor(slowTarget)).toContain(
        'rgba(255, 165, 0'
      ); // Orange
      expect(
        (radarController as any).getTargetColor(stationaryTarget)
      ).toContain('rgba(0, 255, 0'); // Green
    });
  });

  describe('cleanup and resource management', () => {
    it('should cleanup resources on destroy', () => {
      radarController.destroy();

      expect(globalThis.cancelAnimationFrame).toHaveBeenCalled();
      expect(radarController.getTargets()).toHaveLength(0);
    });

    it('should handle destroy when no animation is running', () => {
      radarController.setActive(false);
      vi.clearAllMocks();

      expect(() => {
        radarController.destroy();
      }).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle zero range correctly', () => {
      radarController.setRange(0);

      const state = radarController.getState();
      expect(state.currentRange).toBe(0);
      expect(state.rangeCursor).toBe(0);
    });

    it('should handle maximum range correctly', () => {
      radarController.setRange(10000);

      const state = radarController.getState();
      expect(state.currentRange).toBe(10000);
      expect(state.rangeCursor).toBe(1.0);
    });

    it('should handle targets beyond radar range', () => {
      const distantTarget: RadarTarget = {
        id: 'distant',
        position: new Vector3(15000, 15000, 0),
        velocity: new Vector3(0, 0, 0),
        distance: 21213, // Beyond max range
        bearing: 45,
        elevation: 0,
        targetType: 'UNKNOWN',
        strength: 0.5,
      };

      radarController.addTarget(distantTarget);

      // Target should be added but not visible on display
      expect(radarController.getTargets()).toHaveLength(1);
    });

    it('should handle rapid direction changes', () => {
      radarController.setDirection(0, 0);
      radarController.setDirection(180, 45);
      radarController.setDirection(360, 90);

      const state = radarController.getState();
      expect(state.azimuth).toBe(0); // 360 normalizes to 0
      expect(state.elevation).toBe(90);
    });

    it('should handle custom canvas IDs', () => {
      mockCanvases['custom-h'] = mockCanvases['horizontal-radar'];
      mockCanvases['custom-v'] = mockCanvases['vertical-radar'];

      expect(() => {
        new RadarController(mockEvents, 'custom-h', 'custom-v');
      }).not.toThrow();
    });
  });
});
