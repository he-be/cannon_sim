import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
  CircularScopeRenderer,
  CircularScopeTarget,
} from './CircularScopeRenderer';
import { CanvasManager } from '../../rendering/CanvasManager';
import { Vector2 } from '../../math/Vector2';

describe('CircularScopeRenderer', () => {
  let canvasManager: CanvasManager;
  let mockContext: any;
  let renderer: CircularScopeRenderer;
  let bounds: any;

  beforeEach(() => {
    // Mock CanvasManager and Context
    mockContext = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      fillRect: vi.fn(),
      arc: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      fillText: vi.fn(),
      clip: vi.fn(),
      rect: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 10 }),
      setLineDash: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: '',
      textBaseline: '',
      globalAlpha: 1.0,
    };

    const mockCanvas = {
      getContext: vi.fn().mockReturnValue(mockContext),
      width: 800,
      height: 600,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getBoundingClientRect: vi.fn().mockReturnValue({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
      }),
    };

    canvasManager = {
      context: mockContext,
      getCanvas: vi.fn().mockReturnValue(mockCanvas),
      width: 800,
      height: 600,
    } as any;

    bounds = {
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      center: new Vector2(100, 100),
      radius: 100,
    };

    renderer = new CircularScopeRenderer(canvasManager, bounds);
  });

  test('should render targets within beam width', () => {
    const targets: CircularScopeTarget[] = [
      { id: '1', azimuth: 0, distance: 5000, elevation: 0 }, // North, 0 deg elevation
    ];

    // Radar pointing North (0 degrees), 0 deg elevation
    renderer.render(targets, 0, 0, 10000, [], [], Date.now());

    // Should draw target (arc call)
    expect(mockContext.fill).toHaveBeenCalled();
    expect(mockContext.arc).toHaveBeenCalledWith(100, 50, 4, 0, Math.PI * 2);
  });

  test('should NOT render targets outside beam width (Azimuth)', () => {
    const targets: CircularScopeTarget[] = [
      { id: '1', azimuth: 180, distance: 5000, elevation: 0 }, // South
    ];

    // Radar pointing North (0 degrees), 0 deg elevation
    renderer.render(targets, 0, 0, 10000, [], [], Date.now());

    // Filter calls to arc that might be the target
    const targetCalls = mockContext.arc.mock.calls.filter((call: any[]) => {
      const x = call[0];
      const y = call[1];
      return Math.abs(x - 100) < 1 && Math.abs(y - 150) < 1;
    });

    expect(targetCalls.length).toBe(0);
  });

  test('should NOT render targets outside beam width (Elevation)', () => {
    const targets: CircularScopeTarget[] = [
      { id: '1', azimuth: 0, distance: 5000, elevation: 20 }, // 20 deg elevation
    ];

    // Radar pointing North (0 degrees), 0 deg elevation
    // Beam width is 10 degrees (+/- 5)
    renderer.render(targets, 0, 0, 10000, [], [], Date.now());

    // Should NOT draw target
    const targetCalls = mockContext.arc.mock.calls.filter((call: any[]) => {
      const x = call[0];
      const y = call[1];
      return Math.abs(x - 100) < 1 && Math.abs(y - 50) < 1;
    });

    expect(targetCalls.length).toBe(0);
  });

  test('should render afterimage for recently scanned targets', () => {
    const targets: CircularScopeTarget[] = [
      { id: '1', azimuth: 0, distance: 5000, elevation: 0 },
    ];
    const now = Date.now();

    // 1. Scan target (Radar at 0, Target at 0) -> Should be visible
    renderer.render(targets, 0, 0, 10000, [], [], now);

    // 2. Move radar away (Radar at 90) -> Target should still be visible as afterimage
    mockContext.arc.mockClear();
    renderer.render(targets, 90, 0, 10000, [], [], now + 500);

    // Should still draw target at North (100, 50)
    const targetCalls = mockContext.arc.mock.calls.filter((call: any[]) => {
      const x = call[0];
      const y = call[1];
      return Math.abs(x - 100) < 1 && Math.abs(y - 50) < 1;
    });

    expect(targetCalls.length).toBeGreaterThan(0);
  });

  test('should NOT render afterimage after persistence duration', () => {
    const targets: CircularScopeTarget[] = [
      { id: '1', azimuth: 0, distance: 5000, elevation: 0 },
    ];
    const now = Date.now();

    // 1. Scan target
    renderer.render(targets, 0, 0, 10000, [], [], now);

    // 2. Move radar away and wait long time (3000ms > 2500ms duration)
    mockContext.arc.mockClear();
    renderer.render(targets, 90, 0, 10000, [], [], now + 3000);

    // Should NOT draw target
    const targetCalls = mockContext.arc.mock.calls.filter((call: any[]) => {
      const x = call[0];
      const y = call[1];
      return Math.abs(x - 100) < 1 && Math.abs(y - 50) < 1;
    });

    expect(targetCalls.length).toBe(0);
  });
});
