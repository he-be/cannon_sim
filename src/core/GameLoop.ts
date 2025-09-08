/**
 * GameLoop - Fixed timestep game loop implementation
 * Uses TDD methodology for reliable timing behavior
 */

export interface GameLoopStats {
  fps: number;
  frameTime: number;
  updateCount: number;
  renderCount: number;
}

export type UpdateCallback = (deltaTime: number) => void;
export type RenderCallback = (interpolation: number) => void;

/**
 * Fixed timestep game loop with variable framerate rendering
 * Implements the "Fix Your Timestep!" pattern for consistent physics
 */
export class GameLoop {
  private updateCallback: UpdateCallback;
  private renderCallback: RenderCallback;
  private _physicsTimestep: number;
  private _isRunning = false;
  private _isPaused = false;

  // Timing state
  private lastFrameTime = 0;
  private accumulator = 0;
  private maxUpdatesPerFrame = 8; // Prevent spiral of death

  // Statistics
  private frameCount = 0;
  private updateCount = 0;
  private renderCount = 0;
  private fpsUpdateTime = 0;
  private currentFPS = 0;
  private currentFrameTime = 0;

  constructor(
    updateCallback: UpdateCallback,
    renderCallback: RenderCallback,
    physicsTimestep = 1000 / 60 // Default 60Hz
  ) {
    this.updateCallback = updateCallback;
    this.renderCallback = renderCallback;
    this._physicsTimestep = physicsTimestep;
  }

  get physicsTimestep(): number {
    return this._physicsTimestep;
  }

  get isRunning(): boolean {
    return this._isRunning;
  }

  get isPaused(): boolean {
    return this._isPaused;
  }

  start(): void {
    if (this._isRunning) return;

    this._isRunning = true;
    this._isPaused = false;
    this.lastFrameTime = performance.now();
    this.accumulator = 0;
  }

  stop(): void {
    this._isRunning = false;
    this._isPaused = false;
  }

  pause(): void {
    this._isPaused = true;
  }

  resume(): void {
    if (!this._isPaused) return;

    this._isPaused = false;
    this.lastFrameTime = performance.now(); // Reset timing to prevent time jump
  }

  tick(): void {
    if (!this._isRunning || this._isPaused) return;

    const currentTime = performance.now();
    const frameTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;

    // Update frame time for statistics
    this.currentFrameTime = frameTime;

    // Add frame time to accumulator
    this.accumulator += frameTime;

    // Perform fixed timestep updates
    let updatesThisFrame = 0;
    while (
      this.accumulator >= this._physicsTimestep &&
      updatesThisFrame < this.maxUpdatesPerFrame
    ) {
      this.updateCallback(this._physicsTimestep);
      this.accumulator -= this._physicsTimestep;
      this.updateCount++;
      updatesThisFrame++;
    }

    // Calculate interpolation factor for rendering
    const interpolation = this.accumulator / this._physicsTimestep;

    // Render with interpolation
    this.renderCallback(interpolation);
    this.renderCount++;

    // Update FPS calculation
    this.updateFPSCounter(currentTime);
  }

  private updateFPSCounter(currentTime: number): void {
    this.frameCount++;

    // Update FPS every second
    if (currentTime - this.fpsUpdateTime >= 1000) {
      this.currentFPS =
        (this.frameCount * 1000) / (currentTime - this.fpsUpdateTime);
      this.frameCount = 0;
      this.fpsUpdateTime = currentTime;
    }
  }

  getCurrentFPS(): number {
    return this.currentFPS;
  }

  getStats(): GameLoopStats {
    return {
      fps: this.currentFPS,
      frameTime: this.currentFrameTime,
      updateCount: this.updateCount,
      renderCount: this.renderCount,
    };
  }
}
