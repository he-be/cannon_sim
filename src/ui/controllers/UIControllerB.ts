/**
 * UIControllerB - UI controller for new UI (MODE_B)
 * Handles keyboard input and radar controls for circular scope + A-scope layout
 */

import { CanvasManager } from '../../rendering/CanvasManager';
import { UIEvents } from '../UIManager';
import { UIController, RadarState } from './UIController';
import { GAME_CONSTANTS } from '../../data/Constants';

/**
 * UIControllerB implements the new UI behavior (UI B)
 * - Arrow Left/Right: Radar azimuth
 * - Arrow Up/Down: Radar elevation (different from UI A!)
 * - O key: Increase distance gate
 * - I key: Decrease distance gate
 */
export class UIControllerB implements UIController {
  // Will be UIManagerB when implemented - using unknown for type safety
  private uiManager: unknown;

  // Radar state
  private radarAzimuth: number = 0;
  private radarElevation: number = 0;
  private radarRange: number = GAME_CONSTANTS.DEFAULT_RADAR_RANGE;
  private rangeGate: number = 5000; // Distance gate (initial 5km)
  private readonly maxRadarRange: number = GAME_CONSTANTS.MAX_RADAR_RANGE;

  // Keyboard state
  private keyState: {
    ArrowLeft: boolean;
    ArrowRight: boolean;
    ArrowUp: boolean;
    ArrowDown: boolean;
    o: boolean; // Distance gate increase
    i: boolean; // Distance gate decrease
  } = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    ArrowDown: false,
    o: false,
    i: false,
  };

  // Control speed constants
  private readonly RADAR_ROTATION_SPEED = 60; // degrees per second (azimuth)
  private readonly RADAR_ELEVATION_SPEED = 30; // degrees per second (elevation)
  private readonly RANGE_GATE_SPEED = 2000; // meters per second

  constructor(_canvasManager: CanvasManager, _events: UIEvents) {
    // TODO: Create UIManagerB when implemented
    // For now, throw error to prevent accidental use
    this.uiManager = null;
    throw new Error(
      'UIControllerB not yet fully implemented - UIManagerB required'
    );
  }

  /**
   * Handle keyboard key down events
   */
  handleKeyDown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();

    if (key === 'arrowleft') {
      this.keyState.ArrowLeft = true;
    } else if (key === 'arrowright') {
      this.keyState.ArrowRight = true;
    } else if (key === 'arrowup') {
      this.keyState.ArrowUp = true;
    } else if (key === 'arrowdown') {
      this.keyState.ArrowDown = true;
    } else if (key === 'o') {
      this.keyState.o = true;
    } else if (key === 'i') {
      this.keyState.i = true;
    }
  }

  /**
   * Handle keyboard key up events
   */
  handleKeyUp(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();

    if (key === 'arrowleft') {
      this.keyState.ArrowLeft = false;
    } else if (key === 'arrowright') {
      this.keyState.ArrowRight = false;
    } else if (key === 'arrowup') {
      this.keyState.ArrowUp = false;
    } else if (key === 'arrowdown') {
      this.keyState.ArrowDown = false;
    } else if (key === 'o') {
      this.keyState.o = false;
    } else if (key === 'i') {
      this.keyState.i = false;
    }
  }

  /**
   * Update radar controls based on current key states
   * @param deltaTime - Time elapsed since last frame in seconds
   * @param isLocked - Whether targeting is locked (radar should not move when locked)
   */
  updateControls(deltaTime: number, isLocked: boolean = false): void {
    // When locked on target, radar should not move
    if (isLocked) {
      return;
    }

    let directionChanged = false;

    // Update radar azimuth based on arrow left/right
    if (this.keyState.ArrowLeft) {
      this.radarAzimuth =
        (this.radarAzimuth - this.RADAR_ROTATION_SPEED * deltaTime + 360) % 360;
      directionChanged = true;
    }
    if (this.keyState.ArrowRight) {
      this.radarAzimuth =
        (this.radarAzimuth + this.RADAR_ROTATION_SPEED * deltaTime) % 360;
      directionChanged = true;
    }

    // Update radar elevation based on arrow up/down (DIFFERENT FROM UI A!)
    if (this.keyState.ArrowUp) {
      this.radarElevation = Math.min(
        this.radarElevation + this.RADAR_ELEVATION_SPEED * deltaTime,
        90
      );
      directionChanged = true;
    }
    if (this.keyState.ArrowDown) {
      this.radarElevation = Math.max(
        this.radarElevation - this.RADAR_ELEVATION_SPEED * deltaTime,
        0
      );
      directionChanged = true;
    }

    if (directionChanged) {
      // TODO: Update UI when UIManagerB is implemented
      // this.uiManager.setRadarDirection(this.radarAzimuth, this.radarElevation);
    }

    // Update distance gate based on O/I keys
    let rangeGateChanged = false;

    if (this.keyState.o) {
      this.rangeGate = Math.min(
        this.rangeGate + this.RANGE_GATE_SPEED * deltaTime,
        this.maxRadarRange
      );
      rangeGateChanged = true;
    }
    if (this.keyState.i) {
      this.rangeGate = Math.max(
        this.rangeGate - this.RANGE_GATE_SPEED * deltaTime,
        1000
      );
      rangeGateChanged = true;
    }

    if (rangeGateChanged) {
      // TODO: Update UI when UIManagerB is implemented
      // this.uiManager.setRangeGate(this.rangeGate);
    }
  }

  /**
   * Get the UI manager instance
   */
  getUIManager(): unknown {
    return this.uiManager;
  }

  /**
   * Get current radar state
   */
  getRadarState(): RadarState {
    return {
      azimuth: this.radarAzimuth,
      elevation: this.radarElevation,
      range: this.radarRange,
    };
  }

  /**
   * Set radar state from external source (e.g., target tracking)
   * Used when radar should track a locked target
   */
  setRadarState(state: Partial<RadarState>): void {
    if (state.azimuth !== undefined) {
      this.radarAzimuth = state.azimuth;
    }
    if (state.elevation !== undefined) {
      this.radarElevation = state.elevation;
    }
    if (state.range !== undefined) {
      this.radarRange = state.range;
    }

    // TODO: Update UI when UIManagerB is implemented
    // this.uiManager.setRadarDirection(this.radarAzimuth, this.radarElevation);
    // this.uiManager.setRadarRange(this.radarRange);
  }

  /**
   * Get range gate setting (UI B specific)
   */
  getRangeGate(): number {
    return this.rangeGate;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    // UIManager cleanup is handled by GameScene
  }
}
