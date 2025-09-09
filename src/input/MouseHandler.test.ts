import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MouseHandler } from './MouseHandler';
import { Vector2 } from '../math/Vector2';

describe('MouseHandler (T018 - Basic Mouse Input Processing)', () => {
  let mouseHandler: MouseHandler;
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    // Create mock canvas
    mockCanvas = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({
        left: 100,
        top: 50,
        width: 800,
        height: 600,
      })),
    } as unknown as HTMLCanvasElement;

    mouseHandler = new MouseHandler(mockCanvas);
  });

  describe('initialization', () => {
    it('should create MouseHandler with initial state', () => {
      const state = mouseHandler.getCurrentState();

      expect(state.isDown).toBe(false);
      expect(state.button).toBe(-1);
      expect(state.isDragging).toBe(false);
      expect(state.dragStart).toBeNull();
      expect(state.dragDistance.equals(new Vector2(0, 0))).toBe(true);
    });

    it('should setup event listeners on canvas', () => {
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith(
        'mousedown',
        expect.any(Function)
      );
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith(
        'mouseup',
        expect.any(Function)
      );
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith(
        'mousemove',
        expect.any(Function)
      );
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function)
      );
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith(
        'contextmenu',
        expect.any(Function)
      );
    });
  });

  describe('coordinate conversion (screen→game)', () => {
    it('should convert screen coordinates to canvas coordinates', () => {
      // Mock canvas bounds: left=100, top=50, width=800, height=600
      // Screen coordinates: x=300, y=150
      // Expected canvas coordinates: x=200, y=100

      const mockEvent = {
        clientX: 300,
        clientY: 150,
        button: 0,
      };

      let capturedEvent: any;
      mouseHandler.addEventListener(event => {
        capturedEvent = event;
      });

      // Simulate mousedown to trigger coordinate conversion
      const mouseDownHandler = (
        mockCanvas.addEventListener as any
      ).mock.calls.find((call: any[]) => call[0] === 'mousedown')[1];

      mouseDownHandler(mockEvent);

      expect(capturedEvent.position.screen.equals(new Vector2(300, 150))).toBe(
        true
      );
      expect(capturedEvent.position.canvas.equals(new Vector2(200, 100))).toBe(
        true
      );
    });

    it('should convert canvas coordinates to game world coordinates', () => {
      const mockEvent = {
        clientX: 500, // Screen X
        clientY: 350, // Screen Y
        button: 0,
      };

      // Canvas bounds: left=100, top=50, width=800, height=600
      // Canvas coordinates: x=400, y=300
      // Game coordinates: x=5000, y=5000 (50% of 10000x10000 world)

      let capturedEvent: any;
      mouseHandler.addEventListener(event => {
        capturedEvent = event;
      });

      const mouseDownHandler = (
        mockCanvas.addEventListener as any
      ).mock.calls.find((call: any[]) => call[0] === 'mousedown')[1];

      mouseDownHandler(mockEvent);

      expect(capturedEvent.position.canvas.equals(new Vector2(400, 300))).toBe(
        true
      );
      expect(capturedEvent.position.game.equals(new Vector2(5000, 5000))).toBe(
        true
      );
    });

    it('should handle custom game world bounds', () => {
      mouseHandler.setGameWorldBounds(2000, 1000);

      const mockEvent = {
        clientX: 500, // 50% of canvas width
        clientY: 350, // 50% of canvas height
        button: 0,
      };

      let capturedEvent: any;
      mouseHandler.addEventListener(event => {
        capturedEvent = event;
      });

      const mouseDownHandler = (
        mockCanvas.addEventListener as any
      ).mock.calls.find((call: any[]) => call[0] === 'mousedown')[1];

      mouseDownHandler(mockEvent);

      // 50% of 2000x1000 world = 1000, 500
      expect(capturedEvent.position.game.equals(new Vector2(1000, 500))).toBe(
        true
      );
    });
  });

  describe('mouse event handling', () => {
    it('should handle mousedown events correctly', () => {
      const mockEvent = {
        clientX: 300,
        clientY: 150,
        button: 0,
      };

      let capturedEvent: any;
      mouseHandler.addEventListener(event => {
        capturedEvent = event;
      });

      const mouseDownHandler = (
        mockCanvas.addEventListener as any
      ).mock.calls.find((call: any[]) => call[0] === 'mousedown')[1];

      mouseDownHandler(mockEvent);

      expect(capturedEvent.type).toBe('mousedown');
      expect(capturedEvent.button).toBe(0);
      expect(capturedEvent.state.isDown).toBe(true);
      expect(capturedEvent.state.dragStart).not.toBeNull();
    });

    it('should handle mouseup events correctly', () => {
      const mockEvent = {
        clientX: 300,
        clientY: 150,
        button: 0,
      };

      const capturedEvents: any[] = [];
      mouseHandler.addEventListener(event => {
        capturedEvents.push(event);
      });

      const mouseDownHandler = (
        mockCanvas.addEventListener as any
      ).mock.calls.find((call: any[]) => call[0] === 'mousedown')[1];
      const mouseUpHandler = (
        mockCanvas.addEventListener as any
      ).mock.calls.find((call: any[]) => call[0] === 'mouseup')[1];

      // First mousedown, then mouseup
      mouseDownHandler(mockEvent);
      mouseUpHandler(mockEvent);

      const mouseUpEvent = capturedEvents.find(e => e.type === 'mouseup');
      expect(mouseUpEvent).toBeDefined();
      expect(mouseUpEvent.state.isDown).toBe(false);
      expect(mouseUpEvent.state.button).toBe(-1);
      expect(mouseUpEvent.state.dragStart).toBeNull();
    });

    it('should handle click events', () => {
      const mockEvent = {
        clientX: 300,
        clientY: 150,
        button: 0,
      };

      let capturedEvent: any;
      mouseHandler.addEventListener(event => {
        if (event.type === 'click') capturedEvent = event;
      });

      const clickHandler = (mockCanvas.addEventListener as any).mock.calls.find(
        (call: any[]) => call[0] === 'click'
      )[1];

      clickHandler(mockEvent);

      expect(capturedEvent.type).toBe('click');
      expect(capturedEvent.button).toBe(0);
    });
  });

  describe('drag state management', () => {
    it('should detect drag start when threshold exceeded', () => {
      const capturedEvents: any[] = [];
      mouseHandler.addEventListener(event => {
        capturedEvents.push(event);
      });

      const mouseDownHandler = (
        mockCanvas.addEventListener as any
      ).mock.calls.find((call: any[]) => call[0] === 'mousedown')[1];
      const mouseMoveHandler = (
        mockCanvas.addEventListener as any
      ).mock.calls.find((call: any[]) => call[0] === 'mousemove')[1];

      // Start drag at position
      mouseDownHandler({ clientX: 300, clientY: 150, button: 0 });

      // Move beyond threshold (default 5 pixels)
      mouseMoveHandler({ clientX: 310, clientY: 150, button: 0 });

      const dragStartEvent = capturedEvents.find(e => e.type === 'dragstart');
      expect(dragStartEvent).toBeDefined();
      expect(dragStartEvent.state.isDragging).toBe(true);
    });

    it('should not start drag if movement is below threshold', () => {
      const capturedEvents: any[] = [];
      mouseHandler.addEventListener(event => {
        capturedEvents.push(event);
      });

      const mouseDownHandler = (
        mockCanvas.addEventListener as any
      ).mock.calls.find((call: any[]) => call[0] === 'mousedown')[1];
      const mouseMoveHandler = (
        mockCanvas.addEventListener as any
      ).mock.calls.find((call: any[]) => call[0] === 'mousemove')[1];

      // Start at position
      mouseDownHandler({ clientX: 300, clientY: 150, button: 0 });

      // Move within threshold (2 pixels)
      mouseMoveHandler({ clientX: 302, clientY: 150, button: 0 });

      const dragStartEvent = capturedEvents.find(e => e.type === 'dragstart');
      expect(dragStartEvent).toBeUndefined();
    });

    it('should emit dragend on mouseup after dragging', () => {
      const capturedEvents: any[] = [];
      mouseHandler.addEventListener(event => {
        capturedEvents.push(event);
      });

      const mouseDownHandler = (
        mockCanvas.addEventListener as any
      ).mock.calls.find((call: any[]) => call[0] === 'mousedown')[1];
      const mouseMoveHandler = (
        mockCanvas.addEventListener as any
      ).mock.calls.find((call: any[]) => call[0] === 'mousemove')[1];
      const mouseUpHandler = (
        mockCanvas.addEventListener as any
      ).mock.calls.find((call: any[]) => call[0] === 'mouseup')[1];

      // Start drag
      mouseDownHandler({ clientX: 300, clientY: 150, button: 0 });
      mouseMoveHandler({ clientX: 310, clientY: 150, button: 0 }); // Start dragging
      mouseUpHandler({ clientX: 320, clientY: 160, button: 0 }); // End drag

      const dragEndEvent = capturedEvents.find(e => e.type === 'dragend');
      expect(dragEndEvent).toBeDefined();
    });

    it('should calculate drag distance correctly', () => {
      mouseHandler.setDragThreshold(1); // Low threshold for testing

      const capturedEvents: any[] = [];
      mouseHandler.addEventListener(event => {
        capturedEvents.push(event);
      });

      const mouseDownHandler = (
        mockCanvas.addEventListener as any
      ).mock.calls.find((call: any[]) => call[0] === 'mousedown')[1];
      const mouseMoveHandler = (
        mockCanvas.addEventListener as any
      ).mock.calls.find((call: any[]) => call[0] === 'mousemove')[1];

      // Start at (300, 150) canvas = (200, 100)
      mouseDownHandler({ clientX: 300, clientY: 150, button: 0 });

      // Move to (350, 200) canvas = (250, 150), delta = (50, 50)
      mouseMoveHandler({ clientX: 350, clientY: 200, button: 0 });

      const dragEvent = capturedEvents.find(
        e => e.type === 'mousemove' && e.state.isDragging
      );
      expect(dragEvent).toBeDefined();
      expect(dragEvent.state.dragDistance.equals(new Vector2(50, 50))).toBe(
        true
      );
    });
  });

  describe('utility methods', () => {
    it('should get current position in different coordinate systems', () => {
      const mockEvent = { clientX: 300, clientY: 150, button: 0 };

      const mouseDownHandler = (
        mockCanvas.addEventListener as any
      ).mock.calls.find((call: any[]) => call[0] === 'mousedown')[1];

      mouseDownHandler(mockEvent);

      expect(
        mouseHandler.getPosition('screen').equals(new Vector2(300, 150))
      ).toBe(true);
      expect(
        mouseHandler.getPosition('canvas').equals(new Vector2(200, 100))
      ).toBe(true);

      // Canvas coordinates: x=200, y=100
      // Canvas bounds: width=800, height=600
      // Game coordinates: x = (200/800) * 10000 = 2500, y = (100/600) * 10000 = 1667 (rounded)
      const gamePos = mouseHandler.getPosition('game');
      expect(gamePos.x).toBeCloseTo(2500, 0);
      expect(gamePos.y).toBeCloseTo(1667, 0);
    });

    it('should check if mouse is over canvas', () => {
      // Mock mouse position within canvas bounds
      const mockEvent = { clientX: 300, clientY: 150, button: 0 };

      const mouseMoveHandler = (
        mockCanvas.addEventListener as any
      ).mock.calls.find((call: any[]) => call[0] === 'mousemove')[1];

      mouseMoveHandler(mockEvent);

      expect(mouseHandler.isOverCanvas()).toBe(true);
    });

    it('should allow adding and removing event listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      mouseHandler.addEventListener(listener1);
      mouseHandler.addEventListener(listener2);

      const mockEvent = { clientX: 300, clientY: 150, button: 0 };
      const clickHandler = (mockCanvas.addEventListener as any).mock.calls.find(
        (call: any[]) => call[0] === 'click'
      )[1];

      clickHandler(mockEvent);

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();

      // Remove one listener
      mouseHandler.removeEventListener(listener1);

      listener1.mockClear();
      listener2.mockClear();

      clickHandler(mockEvent);

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it('should clean up event listeners on destroy', () => {
      mouseHandler.destroy();

      expect(mockCanvas.removeEventListener).toHaveBeenCalledWith(
        'mousedown',
        expect.any(Function)
      );
      expect(mockCanvas.removeEventListener).toHaveBeenCalledWith(
        'mouseup',
        expect.any(Function)
      );
      expect(mockCanvas.removeEventListener).toHaveBeenCalledWith(
        'mousemove',
        expect.any(Function)
      );
      expect(mockCanvas.removeEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function)
      );
    });
  });

  describe('edge cases', () => {
    it('should handle right-click events', () => {
      const mockEvent = { clientX: 300, clientY: 150, button: 2 }; // Right button

      let capturedEvent: any;
      mouseHandler.addEventListener(event => {
        capturedEvent = event;
      });

      const mouseDownHandler = (
        mockCanvas.addEventListener as any
      ).mock.calls.find((call: any[]) => call[0] === 'mousedown')[1];

      mouseDownHandler(mockEvent);

      expect(capturedEvent.button).toBe(2);
      expect(capturedEvent.state.button).toBe(2);
    });

    it('should handle middle-click events', () => {
      const mockEvent = { clientX: 300, clientY: 150, button: 1 }; // Middle button

      let capturedEvent: any;
      mouseHandler.addEventListener(event => {
        capturedEvent = event;
      });

      const mouseDownHandler = (
        mockCanvas.addEventListener as any
      ).mock.calls.find((call: any[]) => call[0] === 'mousedown')[1];

      mouseDownHandler(mockEvent);

      expect(capturedEvent.button).toBe(1);
      expect(capturedEvent.state.button).toBe(1);
    });

    it('should allow custom drag threshold', () => {
      mouseHandler.setDragThreshold(10);

      const capturedEvents: any[] = [];
      mouseHandler.addEventListener(event => {
        capturedEvents.push(event);
      });

      const mouseDownHandler = (
        mockCanvas.addEventListener as any
      ).mock.calls.find((call: any[]) => call[0] === 'mousedown')[1];
      const mouseMoveHandler = (
        mockCanvas.addEventListener as any
      ).mock.calls.find((call: any[]) => call[0] === 'mousemove')[1];

      mouseDownHandler({ clientX: 300, clientY: 150, button: 0 });
      mouseMoveHandler({ clientX: 305, clientY: 150, button: 0 }); // 5 pixel move

      // Should not start drag with 10 pixel threshold
      const dragStartEvent = capturedEvents.find(e => e.type === 'dragstart');
      expect(dragStartEvent).toBeUndefined();

      mouseMoveHandler({ clientX: 315, clientY: 150, button: 0 }); // 15 pixel move

      // Should start drag now
      const dragStartEvent2 = capturedEvents.find(e => e.type === 'dragstart');
      expect(dragStartEvent2).toBeDefined();
    });
  });
});
