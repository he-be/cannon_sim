import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ControlPanelManager, ControlPanelEvents } from './ControlPanelManager';

describe('ControlPanelManager (T019 - Control Panel UI)', () => {
  let controlPanel: ControlPanelManager;
  let mockEvents: ControlPanelEvents;
  let mockElements: { [key: string]: any };

  beforeEach(() => {
    // Create mock events
    mockEvents = {
      onAzimuthChange: vi.fn(),
      onElevationChange: vi.fn(),
      onFireClick: vi.fn(),
      onUnlockClick: vi.fn(),
    };

    // Create mock DOM elements
    mockElements = {
      'azimuth-slider': {
        value: '180',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
      'elevation-slider': {
        value: '45',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
      'fire-button': {
        disabled: false,
        style: {},
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
      'unlock-button': {
        style: {},
        textContent: '',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
      'azimuth-value': { textContent: '' },
      'elevation-value': { textContent: '' },
      'lead-azimuth': { textContent: '' },
      'lead-elevation': { textContent: '' },
      'game-time': { textContent: '' },
    };

    // Mock document.getElementById
    Object.defineProperty(globalThis, 'document', {
      value: {
        getElementById: vi.fn((id: string) => mockElements[id] || null),
      },
      configurable: true,
    });

    // Mock requestAnimationFrame
    Object.defineProperty(globalThis, 'requestAnimationFrame', {
      value: vi.fn((callback: FrameRequestCallback) => {
        globalThis.setTimeout(callback, 16); // 60fps simulation
        return 1;
      }),
      configurable: true,
    });

    controlPanel = new ControlPanelManager(mockEvents);
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const state = controlPanel.getState();

      expect(state.azimuth).toBe(180);
      expect(state.elevation).toBe(45);
      expect(state.isLocked).toBe(false);
      expect(state.leadAngle).toBeNull();
      expect(state.gameTime).toBe(0);
    });

    it('should initialize DOM elements', () => {
      expect(document.getElementById).toHaveBeenCalledWith('azimuth-slider');
      expect(document.getElementById).toHaveBeenCalledWith('elevation-slider');
      expect(document.getElementById).toHaveBeenCalledWith('fire-button');
      expect(document.getElementById).toHaveBeenCalledWith('unlock-button');
    });

    it('should setup event listeners', () => {
      expect(
        mockElements['azimuth-slider'].addEventListener
      ).toHaveBeenCalledWith('input', expect.any(Function));
      expect(
        mockElements['elevation-slider'].addEventListener
      ).toHaveBeenCalledWith('input', expect.any(Function));
      expect(mockElements['fire-button'].addEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function)
      );
      expect(
        mockElements['unlock-button'].addEventListener
      ).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('should throw error for missing elements', () => {
      const mockGetElementById = vi.fn(() => null);
      Object.defineProperty(globalThis, 'document', {
        value: { getElementById: mockGetElementById },
        configurable: true,
      });

      expect(() => new ControlPanelManager(mockEvents)).toThrow(
        "Control panel element 'azimuth-slider' not found"
      );
    });
  });

  describe('azimuth control', () => {
    it('should set azimuth value correctly', () => {
      controlPanel.setAzimuth(270);

      const state = controlPanel.getState();
      expect(state.azimuth).toBe(270);
      expect(mockElements['azimuth-slider'].value).toBe('270');
      expect(mockElements['azimuth-value'].textContent).toBe('270°');
    });

    it('should clamp azimuth to valid range (0-360)', () => {
      controlPanel.setAzimuth(-10);
      expect(controlPanel.getState().azimuth).toBe(0);

      controlPanel.setAzimuth(400);
      expect(controlPanel.getState().azimuth).toBe(360);
    });

    it('should trigger azimuth change event on slider input', () => {
      const inputHandler = mockElements[
        'azimuth-slider'
      ].addEventListener.mock.calls.find(
        (call: any[]) => call[0] === 'input'
      )[1];

      const mockEvent = {
        target: { value: '315' },
      };

      inputHandler(mockEvent);

      expect(mockEvents.onAzimuthChange).toHaveBeenCalledWith(315);
      expect(controlPanel.getState().azimuth).toBe(315);
    });

    it('should convert azimuth to radians correctly', () => {
      controlPanel.setAzimuth(90);
      expect(controlPanel.getAzimuthRadians()).toBeCloseTo(Math.PI / 2, 5);

      controlPanel.setAzimuth(180);
      expect(controlPanel.getAzimuthRadians()).toBeCloseTo(Math.PI, 5);
    });
  });

  describe('elevation control', () => {
    it('should set elevation value correctly', () => {
      controlPanel.setElevation(60);

      const state = controlPanel.getState();
      expect(state.elevation).toBe(60);
      expect(mockElements['elevation-slider'].value).toBe('60');
      expect(mockElements['elevation-value'].textContent).toBe('60°');
    });

    it('should clamp elevation to valid range (0-90)', () => {
      controlPanel.setElevation(-5);
      expect(controlPanel.getState().elevation).toBe(0);

      controlPanel.setElevation(100);
      expect(controlPanel.getState().elevation).toBe(90);
    });

    it('should trigger elevation change event on slider input', () => {
      const inputHandler = mockElements[
        'elevation-slider'
      ].addEventListener.mock.calls.find(
        (call: any[]) => call[0] === 'input'
      )[1];

      const mockEvent = {
        target: { value: '30' },
      };

      inputHandler(mockEvent);

      expect(mockEvents.onElevationChange).toHaveBeenCalledWith(30);
      expect(controlPanel.getState().elevation).toBe(30);
    });

    it('should convert elevation to radians correctly', () => {
      controlPanel.setElevation(45);
      expect(controlPanel.getElevationRadians()).toBeCloseTo(Math.PI / 4, 5);

      controlPanel.setElevation(90);
      expect(controlPanel.getElevationRadians()).toBeCloseTo(Math.PI / 2, 5);
    });
  });

  describe('button events', () => {
    it('should handle fire button click', () => {
      const clickHandler = mockElements[
        'fire-button'
      ].addEventListener.mock.calls.find(
        (call: any[]) => call[0] === 'click'
      )[1];

      clickHandler();

      expect(mockEvents.onFireClick).toHaveBeenCalled();
    });

    it('should handle unlock button click', () => {
      const clickHandler = mockElements[
        'unlock-button'
      ].addEventListener.mock.calls.find(
        (call: any[]) => call[0] === 'click'
      )[1];

      clickHandler();

      expect(mockEvents.onUnlockClick).toHaveBeenCalled();
      expect(controlPanel.getState().isLocked).toBe(false);
    });

    it('should enable/disable fire button', () => {
      controlPanel.setFireEnabled(false);

      expect(mockElements['fire-button'].disabled).toBe(true);
      expect(mockElements['fire-button'].style.opacity).toBe('0.5');
      expect(mockElements['fire-button'].style.cursor).toBe('not-allowed');

      controlPanel.setFireEnabled(true);

      expect(mockElements['fire-button'].disabled).toBe(false);
      expect(mockElements['fire-button'].style.opacity).toBe('1');
      expect(mockElements['fire-button'].style.cursor).toBe('pointer');
    });
  });

  describe('lock state management', () => {
    it('should update lock state and display', () => {
      controlPanel.setLockState(true);

      const state = controlPanel.getState();
      expect(state.isLocked).toBe(true);
      expect(mockElements['unlock-button'].style.backgroundColor).toBe(
        '#ff6600'
      );
      expect(mockElements['unlock-button'].textContent).toBe('ロックオン中');
    });

    it('should display unlocked state correctly', () => {
      controlPanel.setLockState(false);

      const state = controlPanel.getState();
      expect(state.isLocked).toBe(false);
      expect(mockElements['unlock-button'].style.backgroundColor).toBe('#666');
      expect(mockElements['unlock-button'].textContent).toBe('ロックオン解除');
    });
  });

  describe('lead angle display', () => {
    it('should display lead angle values', () => {
      const leadAngle = { azimuth: 127, elevation: 38 };
      controlPanel.setLeadAngle(leadAngle);

      expect(controlPanel.getState().leadAngle).toEqual(leadAngle);
      expect(mockElements['lead-azimuth'].textContent).toBe('127');
      expect(mockElements['lead-elevation'].textContent).toBe('38');
    });

    it('should display placeholder when no lead angle', () => {
      controlPanel.setLeadAngle(null);

      expect(controlPanel.getState().leadAngle).toBeNull();
      expect(mockElements['lead-azimuth'].textContent).toBe('---');
      expect(mockElements['lead-elevation'].textContent).toBe('---');
    });

    it('should apply lead angle to sliders', () => {
      const leadAngle = { azimuth: 225, elevation: 55 };
      controlPanel.setLeadAngle(leadAngle);

      controlPanel.applyLeadAngle();

      expect(controlPanel.getState().azimuth).toBe(225);
      expect(controlPanel.getState().elevation).toBe(55);
      expect(mockEvents.onAzimuthChange).toHaveBeenCalledWith(225);
      expect(mockEvents.onElevationChange).toHaveBeenCalledWith(55);
    });

    it('should not apply lead angle when none is set', () => {
      const originalAzimuth = controlPanel.getState().azimuth;
      const originalElevation = controlPanel.getState().elevation;

      controlPanel.setLeadAngle(null);
      controlPanel.applyLeadAngle();

      expect(controlPanel.getState().azimuth).toBe(originalAzimuth);
      expect(controlPanel.getState().elevation).toBe(originalElevation);
    });
  });

  describe('game time display', () => {
    it('should format game time correctly', () => {
      controlPanel.setGameTime(125); // 2:05

      expect(controlPanel.getState().gameTime).toBe(125);
      expect(mockElements['game-time'].textContent).toBe('02:05');
    });

    it('should handle times under one minute', () => {
      controlPanel.setGameTime(42);

      expect(mockElements['game-time'].textContent).toBe('00:42');
    });

    it('should handle zero time', () => {
      controlPanel.setGameTime(0);

      expect(mockElements['game-time'].textContent).toBe('00:00');
    });

    it('should handle large times', () => {
      controlPanel.setGameTime(3725); // 62:05

      expect(mockElements['game-time'].textContent).toBe('62:05');
    });
  });

  describe('animation', () => {
    it('should call animateToPosition without errors', () => {
      const startAzimuth = 180;
      const startElevation = 45;
      const targetAzimuth = 270;
      const targetElevation = 60;

      expect(controlPanel.getState().azimuth).toBe(startAzimuth);
      expect(controlPanel.getState().elevation).toBe(startElevation);

      // Should not throw errors when calling animation
      expect(() => {
        controlPanel.animateToPosition(targetAzimuth, targetElevation, 100);
      }).not.toThrow();
    });
  });

  describe('utility methods', () => {
    it('should return current state as copy', () => {
      const state1 = controlPanel.getState();
      const state2 = controlPanel.getState();

      expect(state1).toEqual(state2);
      expect(state1).not.toBe(state2); // Different objects
    });

    it('should clean up event listeners on destroy', () => {
      controlPanel.destroy();

      expect(
        mockElements['azimuth-slider'].removeEventListener
      ).toHaveBeenCalled();
      expect(
        mockElements['elevation-slider'].removeEventListener
      ).toHaveBeenCalled();
      expect(
        mockElements['fire-button'].removeEventListener
      ).toHaveBeenCalled();
      expect(
        mockElements['unlock-button'].removeEventListener
      ).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle fractional azimuth values', () => {
      controlPanel.setAzimuth(123.7);
      expect(controlPanel.getState().azimuth).toBe(123.7);
      expect(mockElements['azimuth-value'].textContent).toBe('123.7°');
    });

    it('should handle fractional elevation values', () => {
      controlPanel.setElevation(67.3);
      expect(controlPanel.getState().elevation).toBe(67.3);
      expect(mockElements['elevation-value'].textContent).toBe('67.3°');
    });

    it('should handle lead angle with rounded display', () => {
      const leadAngle = { azimuth: 123.7, elevation: 67.3 };
      controlPanel.setLeadAngle(leadAngle);

      expect(mockElements['lead-azimuth'].textContent).toBe('124');
      expect(mockElements['lead-elevation'].textContent).toBe('67');
    });

    it('should handle negative game time', () => {
      controlPanel.setGameTime(-30);

      // Should display negative minutes correctly
      expect(mockElements['game-time'].textContent).toBe('-1:-30');
    });
  });
});
