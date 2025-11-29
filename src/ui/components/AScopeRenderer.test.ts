import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AScopeRenderer } from './AScopeRenderer';

describe('AScopeRenderer', () => {
  let renderer: AScopeRenderer;
  let mockCanvasManager: any;
  let mockContext: any;

  beforeEach((): void => {
    mockContext = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      arc: vi.fn(),
      quadraticCurveTo: vi.fn(),
      setLineDash: vi.fn(),
      closePath: vi.fn(),
    };

    mockCanvasManager = {
      context: mockContext,
    };

    renderer = new AScopeRenderer(mockCanvasManager, {
      x: 0,
      y: 0,
      width: 200,
      height: 100,
    });
  });

  it('should render grid and baseline', (): void => {
    renderer.render([], 5000, 20000, [], 0, 0, 1000);

    // Verify basic drawing calls
    expect(mockContext.beginPath).toHaveBeenCalled();
    expect(mockContext.stroke).toHaveBeenCalled();
  });
});
