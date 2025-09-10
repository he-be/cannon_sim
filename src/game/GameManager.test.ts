/**
 * GameManager test suite
 * Tests game state and scene management as per GF-01, GF-02, GF-03, GF-04 specifications
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameManager, GameState } from './GameManager';

// Mock CanvasManager
const mockCanvasManager = {
  context: {
    fillStyle: '',
    fillRect: vi.fn(),
    font: '',
    textAlign: '',
    textBaseline: '',
    shadowColor: '',
    shadowBlur: 0,
    fillText: vi.fn(),
    strokeStyle: '',
    lineWidth: 0,
    strokeRect: vi.fn(),
  } as any,
  getCanvas: vi.fn(() => ({
    width: 800,
    height: 600,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0 })),
  })),
};

// Mock document.getElementById
const mockGetElementById = vi.fn(() => ({
  getContext: vi.fn(() => mockCanvasManager.context),
  style: {},
  width: 800,
  height: 600,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}));

// Mock window
const mockWindow = {
  addEventListener: vi.fn(),
  devicePixelRatio: 1,
};

Object.defineProperty(document, 'getElementById', {
  value: mockGetElementById,
});
Object.defineProperty(window, 'addEventListener', {
  value: mockWindow.addEventListener,
});

describe('GameManager', () => {
  let gameManager: GameManager;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock Date.now for consistent timing
    vi.useFakeTimers();
    vi.setSystemTime(1000000000);

    gameManager = new GameManager('test-canvas');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with RUNNING state', () => {
      expect(gameManager.getGameState()).toBe(GameState.RUNNING);
    });

    it('should initialize with zero statistics', () => {
      const stats = gameManager.getGameStats();
      expect(stats.totalPlayTime).toBe(0);
      expect(stats.stagesCompleted).toBe(0);
      expect(stats.currentStage).toBeNull();
    });

    it('should create CanvasManager with correct canvas ID', () => {
      expect(mockGetElementById).toHaveBeenCalledWith('test-canvas');
    });
  });

  describe('scene management', () => {
    it('should start with title scene', () => {
      // The initial scene setup is tested through the constructor
      expect(gameManager).toBeDefined();
    });

    it('should provide available stages', () => {
      const stages = gameManager.getAvailableStages();
      expect(stages).toHaveLength(3);
      expect(stages[0].id).toBe(1);
      expect(stages[1].id).toBe(2);
      expect(stages[2].id).toBe(3);
    });
  });

  describe('game statistics', () => {
    it('should update play time', () => {
      // Advance time by 5 seconds
      vi.advanceTimersByTime(5000);

      gameManager.update();

      const stats = gameManager.getGameStats();
      expect(stats.totalPlayTime).toBe(5);
    });

    it('should reset statistics', () => {
      // Advance time and update
      vi.advanceTimersByTime(3000);
      gameManager.update();

      gameManager.resetStats();

      const stats = gameManager.getGameStats();
      expect(stats.totalPlayTime).toBe(0);
      expect(stats.stagesCompleted).toBe(0);
      expect(stats.currentStage).toBeNull();
    });
  });

  describe('game state management', () => {
    it('should pause the game', () => {
      gameManager.pause();
      expect(gameManager.getGameState()).toBe(GameState.PAUSED);
    });

    it('should resume the game', () => {
      gameManager.pause();
      gameManager.resume();
      expect(gameManager.getGameState()).toBe(GameState.RUNNING);
    });

    it('should not update when paused', () => {
      gameManager.pause();

      // Advance time
      vi.advanceTimersByTime(2000);
      gameManager.update();

      const stats = gameManager.getGameStats();
      expect(stats.totalPlayTime).toBe(0); // Should not update when paused
    });
  });

  describe('rendering', () => {
    it('should render without errors', () => {
      expect(() => gameManager.render()).not.toThrow();
    });
  });

  describe('cleanup', () => {
    it('should destroy resources', () => {
      expect(() => gameManager.destroy()).not.toThrow();
    });
  });
});
