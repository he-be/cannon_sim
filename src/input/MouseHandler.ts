/**
 * MouseHandler - Basic mouse input processing for T018
 * Handles mouse events, coordinate conversion, and drag state management
 */

import { Vector2 } from '../math/Vector2';

export interface MousePosition {
  screen: Vector2; // Screen coordinates (pixels)
  canvas: Vector2; // Canvas-relative coordinates
  game: Vector2; // Game world coordinates
}

export interface MouseState {
  isDown: boolean;
  button: number; // 0=left, 1=middle, 2=right
  position: MousePosition;
  isDragging: boolean;
  dragStart: MousePosition | null;
  dragDistance: Vector2;
}

export interface MouseEventData {
  type:
    | 'mousedown'
    | 'mouseup'
    | 'mousemove'
    | 'click'
    | 'dragstart'
    | 'dragend';
  position: MousePosition;
  button: number;
  state: MouseState;
}

/**
 * Handles mouse input events and coordinate transformations for canvas-based game
 */
export class MouseHandler {
  private _canvas: HTMLCanvasElement;
  private _currentState: MouseState;
  private _listeners: Array<(event: MouseEventData) => void> = [];

  // Coordinate transformation parameters
  private _gameWorldBounds = {
    width: 10000, // meters
    height: 10000, // meters
    centerX: 5000,
    centerY: 5000,
  };

  private _dragThreshold = 5; // pixels before drag starts

  constructor(canvas: HTMLCanvasElement) {
    this._canvas = canvas;
    this._currentState = this.createInitialState();
    this.setupEventListeners();
  }

  /**
   * Create initial mouse state
   */
  private createInitialState(): MouseState {
    const initialPosition: MousePosition = {
      screen: new Vector2(0, 0),
      canvas: new Vector2(0, 0),
      game: new Vector2(0, 0),
    };

    return {
      isDown: false,
      button: -1,
      position: initialPosition,
      isDragging: false,
      dragStart: null,
      dragDistance: new Vector2(0, 0),
    };
  }

  /**
   * Setup mouse event listeners on canvas
   */
  private setupEventListeners(): void {
    this._canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this._canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this._canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this._canvas.addEventListener('click', this.handleClick.bind(this));

    // Prevent context menu on right click
    this._canvas.addEventListener('contextmenu', e => e.preventDefault());
  }

  /**
   * Convert screen coordinates to all coordinate systems
   */
  private convertCoordinates(screenX: number, screenY: number): MousePosition {
    // Get canvas bounding rect for accurate positioning
    const rect = this._canvas.getBoundingClientRect();

    // Screen coordinates (absolute)
    const screen = new Vector2(screenX, screenY);

    // Canvas-relative coordinates
    const canvas = new Vector2(screenX - rect.left, screenY - rect.top);

    // Game world coordinates (screen→game conversion)
    const gameX = (canvas.x / rect.width) * this._gameWorldBounds.width;
    const gameY = (canvas.y / rect.height) * this._gameWorldBounds.height;
    const game = new Vector2(gameX, gameY);

    return { screen, canvas, game };
  }

  /**
   * Handle mouse down events
   */
  private handleMouseDown(event: MouseEvent): void {
    const position = this.convertCoordinates(event.clientX, event.clientY);

    this._currentState.isDown = true;
    this._currentState.button = event.button;
    this._currentState.position = position;
    this._currentState.dragStart = position;
    this._currentState.dragDistance = new Vector2(0, 0);

    this.dispatchEvent({
      type: 'mousedown',
      position,
      button: event.button,
      state: { ...this._currentState },
    });
  }

  /**
   * Handle mouse up events
   */
  private handleMouseUp(event: MouseEvent): void {
    const position = this.convertCoordinates(event.clientX, event.clientY);

    // If we were dragging, emit dragend
    if (this._currentState.isDragging) {
      this.dispatchEvent({
        type: 'dragend',
        position,
        button: event.button,
        state: { ...this._currentState },
      });
    }

    this._currentState.isDown = false;
    this._currentState.button = -1;
    this._currentState.position = position;
    this._currentState.isDragging = false;
    this._currentState.dragStart = null;
    this._currentState.dragDistance = new Vector2(0, 0);

    this.dispatchEvent({
      type: 'mouseup',
      position,
      button: event.button,
      state: { ...this._currentState },
    });
  }

  /**
   * Handle mouse move events
   */
  private handleMouseMove(event: MouseEvent): void {
    const position = this.convertCoordinates(event.clientX, event.clientY);

    this._currentState.position = position;

    // Check for drag start
    if (
      this._currentState.isDown &&
      !this._currentState.isDragging &&
      this._currentState.dragStart
    ) {
      const dragDistance = position.canvas.subtract(
        this._currentState.dragStart.canvas
      );

      if (dragDistance.magnitude() > this._dragThreshold) {
        this._currentState.isDragging = true;
        this.dispatchEvent({
          type: 'dragstart',
          position,
          button: this._currentState.button,
          state: { ...this._currentState },
        });
      }
    }

    // Update drag distance if dragging
    if (this._currentState.isDragging && this._currentState.dragStart) {
      this._currentState.dragDistance = position.canvas.subtract(
        this._currentState.dragStart.canvas
      );
    }

    this.dispatchEvent({
      type: 'mousemove',
      position,
      button: this._currentState.button,
      state: { ...this._currentState },
    });
  }

  /**
   * Handle click events
   */
  private handleClick(event: MouseEvent): void {
    const position = this.convertCoordinates(event.clientX, event.clientY);

    this.dispatchEvent({
      type: 'click',
      position,
      button: event.button,
      state: { ...this._currentState },
    });
  }

  /**
   * Add event listener for mouse events
   */
  addEventListener(callback: (event: MouseEventData) => void): void {
    this._listeners.push(callback);
  }

  /**
   * Remove event listener
   */
  removeEventListener(callback: (event: MouseEventData) => void): void {
    const index = this._listeners.indexOf(callback);
    if (index > -1) {
      this._listeners.splice(index, 1);
    }
  }

  /**
   * Dispatch event to all listeners
   */
  private dispatchEvent(event: MouseEventData): void {
    this._listeners.forEach(listener => listener(event));
  }

  /**
   * Get current mouse state
   */
  getCurrentState(): MouseState {
    return { ...this._currentState };
  }

  /**
   * Set game world bounds for coordinate conversion
   */
  setGameWorldBounds(
    width: number,
    height: number,
    centerX?: number,
    centerY?: number
  ): void {
    this._gameWorldBounds = {
      width,
      height,
      centerX: centerX ?? width / 2,
      centerY: centerY ?? height / 2,
    };
  }

  /**
   * Set drag threshold (pixels before drag starts)
   */
  setDragThreshold(threshold: number): void {
    this._dragThreshold = threshold;
  }

  /**
   * Cleanup event listeners
   */
  destroy(): void {
    this._canvas.removeEventListener(
      'mousedown',
      this.handleMouseDown.bind(this)
    );
    this._canvas.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    this._canvas.removeEventListener(
      'mousemove',
      this.handleMouseMove.bind(this)
    );
    this._canvas.removeEventListener('click', this.handleClick.bind(this));
    this._listeners = [];
  }

  /**
   * Check if mouse is currently over canvas
   */
  isOverCanvas(): boolean {
    const rect = this._canvas.getBoundingClientRect();
    const pos = this._currentState.position.canvas;

    return (
      pos.x >= 0 && pos.x <= rect.width && pos.y >= 0 && pos.y <= rect.height
    );
  }

  /**
   * Get mouse position in specific coordinate system
   */
  getPosition(
    coordinateSystem: 'screen' | 'canvas' | 'game' = 'game'
  ): Vector2 {
    return this._currentState.position[coordinateSystem];
  }
}
