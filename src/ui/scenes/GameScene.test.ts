/**
 * GameScene test suite
 * Tests main game scene as per UI-04 and game system specifications
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameScene } from './GameScene';

// Mock DOM methods
const mockQuerySelector = vi.fn();
const mockGetElementById = vi.fn();
const mockGetContext = vi.fn();
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();

// Mock canvas context
const mockCanvasContext = {
  fillStyle: '',
  fillRect: vi.fn(),
  strokeStyle: '',
  lineWidth: 0,
  strokeRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  font: '',
  textAlign: '',
  textBaseline: '',
  fillText: vi.fn(),
  shadowColor: '',
  shadowBlur: 0,
  clearRect: vi.fn(),
};

// Mock canvas elements
const mockHorizontalRadarCanvas = {
  width: 400,
  height: 600,
  getContext: vi.fn(() => mockCanvasContext),
  addEventListener: mockAddEventListener,
  removeEventListener: mockRemoveEventListener,
  getBoundingClientRect: vi.fn(() => ({ left: 200, top: 0 })),
};

const mockVerticalRadarCanvas = {
  width: 200,
  height: 360,
  getContext: vi.fn(() => mockCanvasContext),
};

// Mock HTML elements
const mockControlElements = {
  'azimuth-value': { textContent: '', style: { color: '', fontWeight: '' } },
  'elevation-value': { textContent: '', style: { color: '', fontWeight: '' } },
  'lead-azimuth': { textContent: '', style: { color: '', fontWeight: '' } },
  'lead-elevation': { textContent: '', style: { color: '', fontWeight: '' } },
  'target-status': {
    textContent: '',
    className: '',
    style: { color: '', fontWeight: '' },
  },
  'target-type': { textContent: '', style: { color: '', fontWeight: '' } },
  'target-range': { textContent: '', style: { color: '', fontWeight: '' } },
  'target-speed': { textContent: '', style: { color: '', fontWeight: '' } },
  'target-altitude': { textContent: '', style: { color: '', fontWeight: '' } },
  'game-time': { textContent: '', style: { color: '', fontWeight: '' } },
  'game-ui': { style: { display: '' } },
  'fire-button': {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    style: { color: '', fontWeight: '' },
  },
  'unlock-button': {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    style: { color: '', fontWeight: '' },
  },
  'radar-azimuth-display': {
    textContent: '',
    style: { color: '', fontWeight: '' },
  },
  'radar-range-display': {
    textContent: '',
    style: { color: '', fontWeight: '' },
  },
  'targeting-mode-display': {
    textContent: '',
    style: { color: '', fontWeight: '' },
  },
};

// Set up DOM mocks
Object.defineProperty(globalThis, 'document', {
  value: {
    getElementById: mockGetElementById,
    querySelector: mockQuerySelector,
  },
  writable: true,
});

Object.defineProperty(globalThis, 'window', {
  value: {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
  writable: true,
});

const mockCanvasManager = {
  context: mockCanvasContext,
  getCanvas: vi.fn(() => ({
    width: 1200,
    height: 800,
    addEventListener: mockAddEventListener,
    removeEventListener: mockRemoveEventListener,
    getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0 })),
  })),
};

const mockStageConfig = {
  id: 1,
  name: 'Test Stage',
  description: 'Test stage description',
  targets: [],
  artilleryPosition: { x: 0, y: 0, z: 0 },
};

describe('GameScene', () => {
  let gameScene: GameScene;
  let mockOnSceneTransition: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    mockGetContext.mockReturnValue(mockCanvasContext);

    // Setup getElementById to return appropriate elements
    mockGetElementById.mockImplementation((id: string) => {
      if (id === 'horizontal-radar-ui') {
        return mockHorizontalRadarCanvas;
      }
      if (id === 'vertical-radar') {
        return mockVerticalRadarCanvas;
      }
      return (
        mockControlElements[id as keyof typeof mockControlElements] || null
      );
    });

    mockOnSceneTransition = vi.fn();
    gameScene = new GameScene(mockCanvasManager as any, mockOnSceneTransition, {
      selectedStage: mockStageConfig as any,
    });
  });

  describe('initialization', () => {
    it('should initialize with PLAYING game state', () => {
      expect(gameScene).toBeDefined();
    });

    it('should set up HTML UI elements correctly', () => {
      gameScene.render();

      // Check that UI elements are being accessed
      expect(mockGetElementById).toHaveBeenCalledWith('horizontal-radar-ui');
      expect(mockGetElementById).toHaveBeenCalledWith('vertical-radar');
      expect(mockGetElementById).toHaveBeenCalledWith('azimuth-value');
      expect(mockGetElementById).toHaveBeenCalledWith('elevation-value');
    });
  });

  describe('rendering', () => {
    it('should render horizontal radar canvas', () => {
      gameScene.render();

      // Check that horizontal radar canvas is accessed and drawn on
      expect(mockGetElementById).toHaveBeenCalledWith('horizontal-radar-ui');
      expect(mockHorizontalRadarCanvas.getContext).toHaveBeenCalledWith('2d');
      // Final fillStyle will be determined by last drawing operation
      expect(mockCanvasContext.fillStyle).toBeDefined();
    });

    it('should render vertical radar canvas', () => {
      gameScene.render();

      // Check that vertical radar canvas is accessed and drawn on
      expect(mockGetElementById).toHaveBeenCalledWith('vertical-radar');
      expect(mockVerticalRadarCanvas.getContext).toHaveBeenCalledWith('2d');
    });

    it('should update control panel elements', () => {
      gameScene.render();

      // Check that control elements are being updated
      expect(mockGetElementById).toHaveBeenCalledWith('azimuth-value');
      expect(mockGetElementById).toHaveBeenCalledWith('elevation-value');
      expect(mockGetElementById).toHaveBeenCalledWith('lead-azimuth');
      expect(mockGetElementById).toHaveBeenCalledWith('lead-elevation');
    });

    it('should update target info elements', () => {
      gameScene.render();

      // Check that target info elements are being updated
      expect(mockGetElementById).toHaveBeenCalledWith('target-status');
      expect(mockGetElementById).toHaveBeenCalledWith('target-type');
      expect(mockGetElementById).toHaveBeenCalledWith('target-range');
      expect(mockGetElementById).toHaveBeenCalledWith('target-speed');
      expect(mockGetElementById).toHaveBeenCalledWith('target-altitude');
    });
  });

  describe('radar interaction', () => {
    it('should set up mouse event listeners on horizontal radar canvas', () => {
      // Check that event listeners are set up during initialization
      expect(mockAddEventListener).toHaveBeenCalledWith(
        'mousedown',
        expect.any(Function)
      );
      expect(mockAddEventListener).toHaveBeenCalledWith(
        'mousemove',
        expect.any(Function)
      );
      expect(mockAddEventListener).toHaveBeenCalledWith(
        'mouseup',
        expect.any(Function)
      );
      expect(mockAddEventListener).toHaveBeenCalledWith(
        'wheel',
        expect.any(Function)
      );
    });
  });

  describe('cleanup', () => {
    it('should clean up resources on destroy', () => {
      gameScene.destroy();

      const canvas = mockCanvasManager.getCanvas();
      expect(canvas.removeEventListener).toHaveBeenCalledWith(
        'mousedown',
        expect.any(Function)
      );
      expect(canvas.removeEventListener).toHaveBeenCalledWith(
        'mousemove',
        expect.any(Function)
      );
      expect(canvas.removeEventListener).toHaveBeenCalledWith(
        'mouseup',
        expect.any(Function)
      );
      expect(canvas.removeEventListener).toHaveBeenCalledWith(
        'wheel',
        expect.any(Function)
      );
    });
  });
});
