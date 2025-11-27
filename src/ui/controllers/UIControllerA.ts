/**
 * UIControllerA - UI controller for existing UI (MODE_A)
 * Handles keyboard input and radar controls for horizontal + vertical radar layout
 */

import { CanvasManager } from '../../rendering/CanvasManager';
import { UIManager, UIEvents } from '../UIManager';
import { UIController, RadarState } from './UIController';
import { GAME_CONSTANTS } from '../../data/Constants';
import { Target } from '../../game/entities/Target';
import { ExtendedLeadAngle } from '../../game/LeadAngleSystem';

/**
 * UIControllerA implements the existing UI behavior (UI A)
 * - Arrow Left/Right: Radar azimuth
 * - Arrow Up/Down: Radar range
 */
export class UIControllerA implements UIController {
  private uiManager: UIManager;

  // Radar state
  private radarAzimuth: number = 0;
  private radarElevation: number = 0;
  private radarRange: number = GAME_CONSTANTS.DEFAULT_RADAR_RANGE;
  private readonly maxRadarRange: number = GAME_CONSTANTS.MAX_RADAR_RANGE;

  // Keyboard state
  private keyState: {
    ArrowLeft: boolean;
    ArrowRight: boolean;
    ArrowUp: boolean;
    ArrowDown: boolean;
  } = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    ArrowDown: false,
  };

  // Control speed constants
  private readonly RADAR_ROTATION_SPEED = 60; // degrees per second
  private readonly RADAR_ZOOM_SPEED = 5000; // meters per second

  constructor(canvasManager: CanvasManager, events: UIEvents) {
    this.uiManager = new UIManager(canvasManager, events);
  }

  /**
   * Handle keyboard key down events
   */
  handleKeyDown(event: KeyboardEvent): void {
    const key = event.key;

    if (key === 'ArrowLeft') {
      this.keyState.ArrowLeft = true;
    } else if (key === 'ArrowRight') {
      this.keyState.ArrowRight = true;
    } else if (key === 'ArrowUp') {
      this.keyState.ArrowUp = true;
    } else if (key === 'ArrowDown') {
      this.keyState.ArrowDown = true;
    }
  }

  /**
   * Handle keyboard key up events
   */
  handleKeyUp(event: KeyboardEvent): void {
    const key = event.key;

    if (key === 'ArrowLeft') {
      this.keyState.ArrowLeft = false;
    } else if (key === 'ArrowRight') {
      this.keyState.ArrowRight = false;
    } else if (key === 'ArrowUp') {
      this.keyState.ArrowUp = false;
    } else if (key === 'ArrowDown') {
      this.keyState.ArrowDown = false;
    }
  }

  /**
   * Update radar controls based on current key states
   * This is called every frame from GameScene.update()
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

    if (directionChanged) {
      this.uiManager.setRadarDirection(this.radarAzimuth, this.radarElevation);
    }

    let rangeChanged = false;

    // Update radar range based on arrow up/down
    if (this.keyState.ArrowUp) {
      this.radarRange = Math.min(
        this.radarRange + this.RADAR_ZOOM_SPEED * deltaTime,
        this.maxRadarRange
      );
      rangeChanged = true;
    }
    if (this.keyState.ArrowDown) {
      this.radarRange = Math.max(
        this.radarRange - this.RADAR_ZOOM_SPEED * deltaTime,
        1000
      );
      rangeChanged = true;
    }

    if (rangeChanged) {
      this.uiManager.setRadarRange(this.radarRange);
    }
  }

  /**
   * Get the UI manager instance
   */
  getUIManager(): UIManager {
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
   * Update lead angle display
   */
  updateLeadAngle(leadAngle: ExtendedLeadAngle): void {
    this.uiManager.updateLeadAngle(
      leadAngle.azimuth,
      leadAngle.elevation,
      leadAngle.confidence
    );
  }

  /**
   * Update targeting info display
   */
  updateTargetingInfo(
    state: string,
    trackedTarget: Target | null,
    lockedTarget: Target | null
  ): void {
    this.uiManager.updateTargetingInfo(state, trackedTarget, lockedTarget);
  }

  /**
   * Update radar azimuth display
   */
  updateRadarAzimuth(azimuth: number): void {
    this.uiManager.updateRadarAzimuth(azimuth);
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

    // Update UI to reflect new radar state
    this.uiManager.setRadarDirection(this.radarAzimuth, this.radarElevation);
    this.uiManager.setRadarRange(this.radarRange);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    // UIManager cleanup is handled by GameScene
  }
}
