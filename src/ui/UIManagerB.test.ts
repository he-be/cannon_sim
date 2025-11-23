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

describe('UIManagerB', () => {
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
    };

    uiManager = new UIManagerB(mockCanvasManager, mockEvents);
  });

  describe('updateRadarTarget with RadarTarget', () => {
    it('should update circular targets with mapped properties', () => {
      const radarTarget: RadarTarget = {
        id: 't1',
        position: new Vector3(100, 0, 100),
        velocity: new Vector3(0, 0, 0),
        type: 'HOSTILE',
        bearing: 45,
        distance: 1000,
        elevation: 0,
        strength: 0.8,
      };

      uiManager.updateRadarTarget(radarTarget);

      // Access private property for testing
      const circularTargets = (uiManager as any).circularTargets;
      expect(circularTargets).toHaveLength(1);
      expect(circularTargets[0]).toEqual(
        expect.objectContaining({
          id: 't1',
          azimuth: 45,
          distance: 1000,
        })
      );
    });

    it('should add to A-Scope if within beam width', () => {
      // Set radar azimuth to 45
      uiManager.setRadarDirection(45, 0);

      const radarTarget: RadarTarget = {
        id: 't1',
        position: new Vector3(0, 0, 0),
        velocity: new Vector3(0, 0, 0),
        type: 'HOSTILE',
        bearing: 46, // 1 degree difference (within 5 degree beam)
        distance: 1000,
        elevation: 0,
        strength: 0.8,
      };

      uiManager.updateRadarTarget(radarTarget);

      const aScopeTargets = (uiManager as any).aScopeTargets;
      expect(aScopeTargets).toHaveLength(1);
      expect(aScopeTargets[0]).toEqual(
        expect.objectContaining({
          id: 't1',
          distance: 1000,
          strength: 0.8,
        })
      );
    });

    it('should NOT add to A-Scope if outside beam width', () => {
      // Set radar azimuth to 45
      uiManager.setRadarDirection(45, 0);

      const radarTarget: RadarTarget = {
        id: 't1',
        position: new Vector3(0, 0, 0),
        velocity: new Vector3(0, 0, 0),
        type: 'HOSTILE',
        bearing: 60, // 15 degrees difference (outside 5 degree beam)
        distance: 1000,
        elevation: 0,
        strength: 0.8,
      };

      uiManager.updateRadarTarget(radarTarget);

      const aScopeTargets = (uiManager as any).aScopeTargets;
      expect(aScopeTargets).toHaveLength(0);
    });

    it('should remove from A-Scope if it moves out of beam width', () => {
      // Set radar azimuth to 45
      uiManager.setRadarDirection(45, 0);

      // First update: inside beam
      const targetInside: RadarTarget = {
        id: 't1',
        position: new Vector3(0, 0, 0),
        velocity: new Vector3(0, 0, 0),
        type: 'HOSTILE',
        bearing: 45,
        distance: 1000,
        elevation: 0,
        strength: 0.8,
      };
      uiManager.updateRadarTarget(targetInside);

      expect((uiManager as any).aScopeTargets).toHaveLength(1);

      // Second update: outside beam
      const targetOutside: RadarTarget = {
        ...targetInside,
        bearing: 60,
      };
      uiManager.updateRadarTarget(targetOutside);

      expect((uiManager as any).aScopeTargets).toHaveLength(0);
    });
  });
});
