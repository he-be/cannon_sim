/**
 * UIController - Interface for UI mode-specific control logic
 * Separates UI A and UI B input handling and rendering logic
 */

import { UIManager } from '../UIManager';
import { Target } from '../../game/entities/Target';
import { ExtendedLeadAngle } from '../../game/LeadAngleSystem';

export interface RadarState {
  azimuth: number; // degrees
  elevation: number; // degrees
  range: number; // meters
}

/**
 * UIController interface - Strategy Pattern for UI mode separation
 */
export interface UIController {
  /**
   * Handle keyboard key down events
   */
  handleKeyDown(event: KeyboardEvent): void;

  /**
   * Handle keyboard key up events
   */
  handleKeyUp(event: KeyboardEvent): void;

  /**
   * Update controls based on current key states
   * Called every frame with delta time
   * @param deltaTime - Time elapsed since last frame in seconds
   * @param isLocked - Whether targeting is locked (radar should not move when locked)
   */
  updateControls(deltaTime: number, isLocked?: boolean): void;

  /**
   * Get the UI manager for this controller
   */
  getUIManager(): UIManager;

  /**
   * Get current radar state (azimuth, elevation, range)
   */
  getRadarState(): RadarState;

  /**
   * Set radar state from external source (e.g., target tracking)
   * Used when radar should track a locked target
   */
  setRadarState(state: Partial<RadarState>): void;

  /**
   * Update lead angle display
   */
  updateLeadAngle(leadAngle: ExtendedLeadAngle | null): void;

  /**
   * Update targeting info display
   */
  updateTargetingInfo(
    state: string,
    trackedTarget: Target | null,
    lockedTarget: Target | null
  ): void;

  /**
   * Update radar azimuth display
   */
  updateRadarAzimuth(azimuth: number): void;

  /**
   * Get range gate setting (UI B only, optional)
   */
  getRangeGate?(): number;

  /**
   * Cleanup resources
   */
  destroy(): void;
}
