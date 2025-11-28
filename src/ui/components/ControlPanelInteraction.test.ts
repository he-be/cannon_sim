import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ControlPanelRenderer } from './ControlPanelRenderer';
import { CanvasManager } from '../../rendering/CanvasManager';
import { Vector2 } from '../../math/Vector2';

// Mock CanvasManager
const mockCanvasManager = {
  context: {
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    fillStyle: '',
    fillRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 10 }),
    strokeRect: vi.fn(),
    strokeStyle: '',
    lineWidth: 1,
    stroke: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
  },
  width: 800,
  height: 600,
} as unknown as CanvasManager;

describe('ControlPanelRenderer Interaction', () => {
  let renderer: ControlPanelRenderer;
  let events: any;

  beforeEach(() => {
    events = {
      onAzimuthChange: vi.fn(),
      onElevationChange: vi.fn(),
      onFireClick: vi.fn(),
      onLockToggle: vi.fn(),
      onAutoToggle: vi.fn(),
      onRadarRotateToggle: vi.fn(),
      onMenuClick: vi.fn(),
    };

    renderer = new ControlPanelRenderer(mockCanvasManager, events, 300);
  });

  it('should handle fire button click', () => {
    // Force layout calculation
    (renderer as any).calculateAllLayouts();

    // Get fire button
    const fireButton = (renderer as any).fireButton;

    // Since VBoxContainer uses global coordinates (innerBounds.x/y),
    // fireButton.bounds should be in global coordinates.
    // We can use them directly.
    const bounds = fireButton.bounds;

    // Click in the middle of the button
    const clickPos = new Vector2(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2
    );

    renderer.handleMouseEvent(clickPos, 'click');

    expect(events.onFireClick).toHaveBeenCalled();
  });
});
