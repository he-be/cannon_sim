/**
 * UIControllerB - UI controller for new UI (MODE_B)
 * Handles keyboard input and radar controls for circular scope + A-scope layout
 */

import { CanvasManager } from '../../rendering/CanvasManager';
import { UIManager, UIEvents } from '../UIManager';
import { UIManagerB } from '../UIManagerB';
import { UIController, RadarState } from './UIController';
import { GAME_CONSTANTS } from '../../data/Constants';
import { RadarController } from '../../game/RadarController';
import { Target } from '../../game/entities/Target';
import { ExtendedLeadAngle } from '../../game/LeadAngleSystem';

/**
 * UIControllerB implements the new UI behavior (UI B)
 * - Arrow Left/Right: Radar azimuth
 * - Arrow Up/Down: Radar elevation (different from UI A!)
 * - O key: Increase distance gate
 * - I key: Decrease distance gate
 */
export class UIControllerB implements UIController {
  private uiManager: UIManagerB;
  private events: UIEvents;
  private radarController: RadarController;

  // Range gate state (not part of RadarController)
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

  constructor(
    canvasManager: CanvasManager,
    events: UIEvents,
    radarController: RadarController
  ) {
    // Store events for firing
    this.events = events;
    this.radarController = radarController;

    // Create UIManagerB instance
    this.uiManager = new UIManagerB(canvasManager, events);

    // Initialize UI with correct radar state
    this.uiManager.setRadarRange(this.maxRadarRange);
    this.uiManager.setRangeGate(this.rangeGate);
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
   */
  updateControls(deltaTime: number): void {
    // Calculate radar deltas from keyboard input
    let deltaAzimuth = 0;
    let deltaElevation = 0;

    if (this.keyState.ArrowLeft) {
      deltaAzimuth -= this.RADAR_ROTATION_SPEED * deltaTime;
    }
    if (this.keyState.ArrowRight) {
      deltaAzimuth += this.RADAR_ROTATION_SPEED * deltaTime;
    }
    if (this.keyState.ArrowUp) {
      deltaElevation += this.RADAR_ELEVATION_SPEED * deltaTime;
    }
    if (this.keyState.ArrowDown) {
      deltaElevation -= this.RADAR_ELEVATION_SPEED * deltaTime;
    }

    // Update radar controller
    const newState = this.radarController.updateManual(
      deltaAzimuth,
      deltaElevation
    );

    if (newState) {
      // Fire events to sync with GameScene
      if (deltaAzimuth !== 0) {
        this.events.onAzimuthChange(newState.azimuth);
      }
      if (deltaElevation !== 0) {
        this.events.onElevationChange(newState.elevation);
      }

      // Update UI
      this.uiManager.setRadarDirection(newState.azimuth, newState.elevation);
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
      this.uiManager.setRangeGate(this.rangeGate);
    }
  }

  /**
   * Get the UI manager instance
   */
  getUIManager(): UIManager {
    // UIManagerB implements same interface as UIManager
    return this.uiManager as unknown as UIManager;
  }

  /**
   * Get current radar state
   */
  getRadarState(): RadarState {
    const radarState = this.radarController.getState();
    return {
      azimuth: radarState.azimuth,
      elevation: radarState.elevation,
      range: this.rangeGate, // Return rangeGate for locking logic (GameScene expects cursor distance)
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
    this.uiManager.setLeadAngle(leadAngle);
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
      this.radarController.setAzimuth(state.azimuth);
    }
    if (state.elevation !== undefined) {
      this.radarController.setElevation(state.elevation);
    }
    if (state.range !== undefined) {
      this.rangeGate = state.range;
      this.uiManager.setRangeGate(this.rangeGate);
    }

    const radarState = this.radarController.getState();
    this.uiManager.setRadarDirection(radarState.azimuth, radarState.elevation);
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
