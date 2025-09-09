import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LayoutManager } from './LayoutManager';

describe('LayoutManager', () => {
  let layoutManager: LayoutManager;
  let mockContainer: any;
  let mockGetElementById: any;

  beforeEach(() => {
    // Fresh mock for each test
    mockContainer = {
      style: {},
      getBoundingClientRect: vi.fn(() => ({ width: 1200, height: 800 })),
    };

    mockGetElementById = vi.fn((id: string) => {
      if (id === 'game-container') return mockContainer;
      if (id.includes('radar')) return { style: {} };
      return { textContent: '', className: '' };
    });

    // Mock DOM
    Object.defineProperty(globalThis, 'document', {
      value: { getElementById: mockGetElementById },
      configurable: true,
    });

    Object.defineProperty(globalThis, 'window', {
      value: {
        innerWidth: 1200,
        addEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      },
      configurable: true,
    });

    layoutManager = new LayoutManager();
  });

  describe('initialization', () => {
    it('should initialize 3-pane layout (UI-04)', () => {
      expect(mockContainer.style.display).toBe('grid');
      expect(mockContainer.style.gridTemplateColumns).toBe('25% 50% 25%');
      expect(mockContainer.style.height).toBe('100vh');
    });

    it('should throw error for missing container', () => {
      mockGetElementById.mockReturnValue(null);
      expect(() => new LayoutManager('missing-container')).toThrow();
    });
  });

  describe('layout dimensions', () => {
    it('should calculate correct dimensions', () => {
      const dimensions = layoutManager.getDimensions();

      expect(dimensions.controlPanel.width).toBeCloseTo(298, 0); // 25% of 1200 minus gap
      expect(dimensions.horizontalRadar.width).toBeCloseTo(598, 0); // 50% of 1200 minus gap
      expect(dimensions.verticalRadar.width).toBeCloseTo(298, 0); // 25% of 1200 minus gap
      expect(dimensions.verticalRadar.height).toBe(480); // 60% of 800
      expect(dimensions.targetInfo.height).toBe(320); // 40% of 800
    });
  });

  describe('pane size adjustment', () => {
    it('should adjust pane sizes correctly', () => {
      layoutManager.setPaneSizes({ left: 30, center: 40, right: 30 });

      expect(mockContainer.style.gridTemplateColumns).toBe('30% 40% 30%');
    });

    it('should validate pane size totals', () => {
      expect(() => {
        layoutManager.setPaneSizes({ left: 30, center: 40, right: 40 }); // Sums to 110%
      }).toThrow('Pane sizes must sum to 100%');
    });
  });

  describe('target info updates (UI-18)', () => {
    it('should update target info display', () => {
      const mockElements = {
        status: { textContent: '', className: '' },
        type: { textContent: '' },
        range: { textContent: '' },
        speed: { textContent: '' },
        altitude: { textContent: '' },
      };

      mockGetElementById.mockImplementation((id: string) => {
        if (id === 'game-container') return mockContainer;
        if (id === 'target-status') return mockElements.status;
        if (id === 'target-type') return mockElements.type;
        if (id === 'target-range') return mockElements.range;
        if (id === 'target-speed') return mockElements.speed;
        if (id === 'target-altitude') return mockElements.altitude;
        return null;
      });

      layoutManager.updateTargetInfo({
        status: 'LOCKED_ON',
        type: 'MOVING_FAST',
        range: 1250,
        speed: 85,
        altitude: 150,
      });

      expect(mockElements.status.textContent).toBe('LOCKED ON');
      expect(mockElements.status.className).toBe('info-value status-locked-on');
      expect(mockElements.type.textContent).toBe('MOVING_FAST');
      expect(mockElements.range.textContent).toBe('1250 m');
      expect(mockElements.speed.textContent).toBe('85 m/s');
      expect(mockElements.altitude.textContent).toBe('150 m');
    });

    it('should handle empty target info', () => {
      const mockElements = {
        status: { textContent: '', className: '' },
        type: { textContent: '' },
        range: { textContent: '' },
        speed: { textContent: '' },
        altitude: { textContent: '' },
      };

      mockGetElementById.mockImplementation((id: string) => {
        if (id === 'game-container') return mockContainer;
        if (id.startsWith('target-'))
          return mockElements[
            id.replace('target-', '') as keyof typeof mockElements
          ];
        return null;
      });

      layoutManager.updateTargetInfo({ status: 'NO_TARGET' });

      expect(mockElements.status.textContent).toBe('NO TARGET');
      expect(mockElements.type.textContent).toBe('---');
      expect(mockElements.range.textContent).toBe('--- m');
    });
  });

  describe('lead angle display (UI-06)', () => {
    it('should update lead angle values', () => {
      const mockElements = {
        leadAzimuth: { textContent: '' },
        leadElevation: { textContent: '' },
      };

      mockGetElementById.mockImplementation((id: string) => {
        if (id === 'game-container') return mockContainer;
        if (id === 'lead-azimuth') return mockElements.leadAzimuth;
        if (id === 'lead-elevation') return mockElements.leadElevation;
        return null;
      });

      layoutManager.updateLeadAngle({ azimuth: 127, elevation: 38 });

      expect(mockElements.leadAzimuth.textContent).toBe('127');
      expect(mockElements.leadElevation.textContent).toBe('38');
    });

    it('should handle null lead angle', () => {
      const mockElements = {
        leadAzimuth: { textContent: '' },
        leadElevation: { textContent: '' },
      };

      mockGetElementById.mockImplementation((id: string) => {
        if (id === 'game-container') return mockContainer;
        if (id === 'lead-azimuth') return mockElements.leadAzimuth;
        if (id === 'lead-elevation') return mockElements.leadElevation;
        return null;
      });

      layoutManager.updateLeadAngle(null);

      expect(mockElements.leadAzimuth.textContent).toBe('---');
      expect(mockElements.leadElevation.textContent).toBe('---');
    });
  });

  describe('game time display (UI-09)', () => {
    it('should format game time correctly', () => {
      const mockGameTime = { textContent: '' };

      mockGetElementById.mockImplementation((id: string) => {
        if (id === 'game-container') return mockContainer;
        if (id === 'game-time') return mockGameTime;
        return null;
      });

      layoutManager.updateGameTime(125); // 2:05

      expect(mockGameTime.textContent).toBe('02:05');
    });

    it('should handle times under one minute', () => {
      const mockGameTime = { textContent: '' };

      mockGetElementById.mockImplementation((id: string) => {
        if (id === 'game-container') return mockContainer;
        if (id === 'game-time') return mockGameTime;
        return null;
      });

      layoutManager.updateGameTime(42);

      expect(mockGameTime.textContent).toBe('00:42');
    });
  });
});
