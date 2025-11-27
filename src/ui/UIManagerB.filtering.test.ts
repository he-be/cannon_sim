import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UIManagerB } from './UIManagerB';
import { CanvasManager } from '../rendering/CanvasManager';
import { UIEvents } from './UIManager';
import { Vector3 } from '../math/Vector3';
import { RadarTarget } from './components/RadarRenderer';

// Mock dependencies
vi.mock('../rendering/CanvasManager');
vi.mock('./components/ControlPanelRenderer');
vi.mock('./components/CircularScopeRenderer');
vi.mock('./components/AScopeRenderer');
vi.mock('./components/TargetListRenderer');

describe('UIManagerB Filtering', () => {
  let uiManager: UIManagerB;
  let mockCanvasManager: CanvasManager;
  let mockEvents: UIEvents;

  beforeEach(() => {
    vi.clearAllMocks();

    mockCanvasManager = {
      width: 800,
      height: 600,
      context: {
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        rect: vi.fn(),
        clip: vi.fn(),
        stroke: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        fillStyle: '',
        fillRect: vi.fn(),
      },
    } as any;

    mockEvents = {
      onAzimuthChange: vi.fn(),
      onElevationChange: vi.fn(),
      onFireClick: vi.fn(),
      onLockToggle: vi.fn(),
      onAutoToggle: vi.fn(),
      onMenuClick: vi.fn(),
      onDirectionChange: vi.fn(),
      onRangeChange: vi.fn(),
      onTargetDetected: vi.fn(),
      onTargetLost: vi.fn(),
      onRadarRotateToggle: vi.fn(),
    };

    uiManager = new UIManagerB(mockCanvasManager, mockEvents);
  });

  it('should add to A-Scope if within azimuth AND elevation beam width', () => {
    // Set radar direction: Azimuth 45, Elevation 30
    uiManager.setRadarDirection(45, 30);

    // Target at Azimuth 45, Elevation 30 (Perfect match)
    // Position calculation:
    // Azimuth 45 deg -> x = z (approx)
    // Elevation 30 deg -> y / dist = tan(30)
    // Let's just mock the position such that it results in approx 45 az and 30 el.
    // x=100, z=100 -> Azimuth 45
    // dist_horiz = 141.4
    // y = 141.4 * tan(30) = 141.4 * 0.577 = 81.6
    const radarTarget: RadarTarget = {
      id: 't1',
      position: new Vector3(100, 81.6, 100),
      velocity: new Vector3(0, 0, 0),
      type: 'HOSTILE',
      bearing: 45,
      distance: 1000,
      elevation: 30, // Perfect match
      strength: 0.8,
    };

    uiManager.updateRadarTarget(radarTarget);

    const aScopeTargets = (uiManager as any).stateManager.aScopeTargets;
    expect(aScopeTargets).toHaveLength(1);
  });

  it('should NOT add to A-Scope if azimuth matches but elevation is outside beam', () => {
    // Set radar direction: Azimuth 45, Elevation 30
    uiManager.setRadarDirection(45, 30);

    // Target at Azimuth 45, Elevation 45 (15 deg diff, outside 5 deg beam)
    // x=100, z=100 -> Azimuth 45
    // dist_horiz = 141.4
    // y = 141.4 * tan(45) = 141.4 * 1 = 141.4
    const radarTarget: RadarTarget = {
      id: 't1',
      position: new Vector3(100, 141.4, 100),
      velocity: new Vector3(0, 0, 0),
      type: 'HOSTILE',
      bearing: 45,
      distance: 1000,
      elevation: 45, // Mismatch
      strength: 0.8,
    };

    uiManager.updateRadarTarget(radarTarget);

    const aScopeTargets = (uiManager as any).stateManager.aScopeTargets;
    expect(aScopeTargets).toHaveLength(0);
  });

  it('should NOT add to A-Scope if elevation matches but azimuth is outside beam', () => {
    // Set radar direction: Azimuth 45, Elevation 30
    uiManager.setRadarDirection(45, 30);

    // Target at Azimuth 60, Elevation 30 (15 deg diff, outside 5 deg beam)
    const radarTarget: RadarTarget = {
      id: 't1',
      position: new Vector3(100, 81.6, 100), // Elevation is correct (approx)
      velocity: new Vector3(0, 0, 0),
      type: 'HOSTILE',
      bearing: 60, // Azimuth mismatch
      distance: 1000,
      elevation: 30, // Match
      strength: 0.8,
    };

    uiManager.updateRadarTarget(radarTarget);

    const aScopeTargets = (uiManager as any).stateManager.aScopeTargets;
    expect(aScopeTargets).toHaveLength(0);
  });

  it('should NOT add to A-Scope if wrap-around difference is large (e.g. 210 vs 300)', () => {
    // User reported issue: Target at 210, Radar at 300 (or any angle in between) showing up.
    // 210 - 300 = -90. If logic was just < 2.5 without abs/normalization, -90 < 2.5 is true.

    uiManager.setRadarDirection(300, 0);

    const radarTarget: RadarTarget = {
      id: 't1',
      position: new Vector3(0, 0, 0),
      velocity: new Vector3(0, 0, 0),
      type: 'HOSTILE',
      bearing: 210,
      distance: 1000,
      elevation: 0,
      strength: 0.8,
    };

    uiManager.updateRadarTarget(radarTarget);

    const aScopeTargets = (uiManager as any).stateManager.aScopeTargets;
    expect(aScopeTargets).toHaveLength(0);
  });
});
