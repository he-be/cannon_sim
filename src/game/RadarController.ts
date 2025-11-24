/**
 * RadarController - Manages radar state and control logic
 * Single source of truth for radar position and auto-rotation
 */

export interface RadarState {
  azimuth: number; // 0-360 degrees
  elevation: number; // 0-90 degrees
}

export class RadarController {
  private azimuth: number = 0;
  private elevation: number = 0;
  private isAutoRotating: boolean = false;
  private readonly rotationSpeed: number = 30; // degrees per second

  /**
   * Update radar position manually (from keyboard input)
   * Cancels auto-rotation when azimuth is changed
   */
  updateManual(
    deltaAzimuth: number,
    deltaElevation: number
  ): RadarState | null {
    let changed = false;

    if (deltaAzimuth !== 0) {
      this.azimuth = (this.azimuth + deltaAzimuth + 360) % 360;
      this.isAutoRotating = false; // Cancel auto-rotation
      changed = true;
    }

    if (deltaElevation !== 0) {
      this.elevation = Math.max(
        0,
        Math.min(90, this.elevation + deltaElevation)
      );
      changed = true;
    }

    return changed ? this.getState() : null;
  }

  /**
   * Update radar position from auto-rotation
   */
  updateAutoRotation(deltaTime: number): RadarState | null {
    if (!this.isAutoRotating) return null;

    this.azimuth = (this.azimuth + this.rotationSpeed * deltaTime) % 360;
    return this.getState();
  }

  /**
   * Set radar to track a specific position (e.g., locked target)
   */
  trackPosition(azimuth: number, elevation: number): RadarState {
    this.azimuth = azimuth;
    this.elevation = elevation;
    return this.getState();
  }

  /**
   * Toggle auto-rotation on/off
   */
  toggleAutoRotation(): boolean {
    this.isAutoRotating = !this.isAutoRotating;
    return this.isAutoRotating;
  }

  /**
   * Get current auto-rotation state
   */
  isRotating(): boolean {
    return this.isAutoRotating;
  }

  /**
   * Set auto-rotation state directly
   */
  setAutoRotating(value: boolean): void {
    this.isAutoRotating = value;
  }

  /**
   * Get current radar state
   */
  getState(): RadarState {
    return {
      azimuth: this.azimuth,
      elevation: this.elevation,
    };
  }

  /**
   * Set azimuth directly (for initialization or sync)
   */
  setAzimuth(value: number): void {
    this.azimuth = (value + 360) % 360;
  }

  /**
   * Set elevation directly (for initialization or sync)
   */
  setElevation(value: number): void {
    this.elevation = Math.max(0, Math.min(90, value));
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.azimuth = 0;
    this.elevation = 45;
    this.isAutoRotating = false;
  }
}
