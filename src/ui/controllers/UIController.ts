/**
 * UIController - Interface for UI mode-specific control logic
 * Separates UI A and UI B input handling and rendering logic
 */

import { UIManager } from '../UIManager';

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
   */
  updateControls(deltaTime: number): void;

  /**
   * Get the UI manager for this controller
   */
  getUIManager(): UIManager;

  /**
   * Get current radar state (azimuth, elevation, range)
   */
  getRadarState(): RadarState;

  /**
   * Get range gate setting (UI B only, optional)
   */
  getRangeGate?(): number;

  /**
   * Cleanup resources
   */
  destroy(): void;
}
