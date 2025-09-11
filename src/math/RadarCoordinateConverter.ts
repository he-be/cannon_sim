/**
 * Radar coordinate conversion utilities
 * Handles conversions between mouse input, screen coordinates, and radar coordinates
 */

import { Vector3 } from './Vector3.js';

export interface RadarCoordinates {
  azimuth: number; // 方位角 (degrees, 0-360)
  range: number; // 距離 (meters)
  elevation?: number; // 仰角 (degrees, for vertical radar)
}

export interface ScreenCoordinates {
  x: number; // Canvas X coordinate
  y: number; // Canvas Y coordinate
}

export interface Size {
  width: number;
  height: number;
}

/**
 * Radar coordinate conversion utilities
 * Implements coordinate transformations for radar display and mouse interaction
 *
 * Note: Using static-only class pattern for namespace-like functionality
 * while maintaining type safety and avoiding global namespace pollution.
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class RadarCoordinateConverter {
  /**
   * Convert mouse horizontal movement to azimuth angle change
   * @param deltaX Mouse movement in pixels (positive = right)
   * @param sensitivity Sensitivity factor (degrees per pixel)
   * @returns Azimuth change in degrees
   */
  static mouseToAzimuthDelta(
    deltaX: number,
    sensitivity: number = 0.1
  ): number {
    return deltaX * sensitivity;
  }

  /**
   * Convert mouse vertical movement to range cursor change
   * @param deltaY Mouse movement in pixels (positive = down)
   * @param maxRange Maximum radar range in meters
   * @param canvasHeight Canvas height in pixels
   * @returns Range change in meters
   */
  static mouseToRangeDelta(
    deltaY: number,
    maxRange: number,
    canvasHeight: number
  ): number {
    const pixelsPerMeter = (canvasHeight - 40) / maxRange; // 40px padding
    return deltaY / pixelsPerMeter;
  }

  /**
   * Convert world position to horizontal radar screen coordinates
   * @param worldPos World position of the object
   * @param radarCenter Radar center position
   * @param radarAzimuth Current radar azimuth in degrees
   * @param canvasSize Canvas dimensions
   * @param maxRange Maximum radar range
   * @returns Screen coordinates on horizontal radar
   */
  static worldToHorizontalRadarScreen(
    worldPos: Vector3,
    radarCenter: Vector3,
    radarAzimuth: number,
    canvasSize: Size,
    maxRange: number
  ): ScreenCoordinates {
    // Calculate relative position
    const dx = worldPos.x - radarCenter.x;
    const dy = worldPos.y - radarCenter.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Calculate angle from radar center (from X-axis)
    const worldAngle = Math.atan2(dy, dx) * (180 / Math.PI);

    // Convert to radar-relative angle (radar azimuth is rotation from north/Y-axis)
    const relativeAngle = worldAngle - radarAzimuth + 90;
    const angleRad = relativeAngle * (Math.PI / 180);

    // Convert to screen coordinates
    const centerX = canvasSize.width / 2;
    const gunY = canvasSize.height - 20;
    const maxRenderRange = canvasSize.height - 40;
    const scale = maxRenderRange / maxRange;

    const x = centerX + distance * Math.sin(angleRad) * scale;
    const y = gunY - distance * Math.cos(angleRad) * scale;

    return { x, y };
  }

  /**
   * Convert world position to vertical radar screen coordinates
   * @param worldPos World position of the object
   * @param radarCenter Radar center position
   * @param radarAzimuth Current radar azimuth in degrees
   * @param canvasSize Canvas dimensions
   * @param maxRange Maximum radar range
   * @returns Screen coordinates on vertical radar
   */
  static worldToVerticalRadarScreen(
    worldPos: Vector3,
    radarCenter: Vector3,
    radarAzimuth: number,
    canvasSize: Size,
    maxRange: number
  ): ScreenCoordinates {
    // Calculate relative position in radar direction
    const dx = worldPos.x - radarCenter.x;
    const dy = worldPos.y - radarCenter.y;

    // Project onto radar azimuth direction
    const azimuthRad = radarAzimuth * (Math.PI / 180);
    const rangeDistance = dx * Math.cos(azimuthRad) + dy * Math.sin(azimuthRad);

    // Height difference
    const altitude = worldPos.z - radarCenter.z;

    // Convert to screen coordinates
    const scale = (canvasSize.width - 40) / maxRange;
    const x = 20 + Math.max(0, rangeDistance * scale);

    // Altitude scaling (assuming reasonable altitude range)
    const maxAltitude = 1000; // meters
    const altitudeScale = (canvasSize.height - 40) / (maxAltitude * 2);
    const centerY = canvasSize.height / 2;
    const y = centerY - altitude * altitudeScale;

    return { x, y };
  }

  /**
   * Convert screen coordinates to radar coordinates (horizontal radar)
   * @param screenPos Screen position
   * @param canvasSize Canvas dimensions
   * @param maxRange Maximum radar range
   * @returns Radar coordinates
   */
  static screenToHorizontalRadarCoordinates(
    screenPos: ScreenCoordinates,
    canvasSize: Size,
    maxRange: number
  ): RadarCoordinates {
    const centerX = canvasSize.width / 2;
    const gunY = canvasSize.height - 20;
    const maxRenderRange = canvasSize.height - 40;

    // Calculate relative position from gun
    const dx = screenPos.x - centerX;
    const dy = gunY - screenPos.y;

    // Calculate range and azimuth
    const range = Math.sqrt(dx * dx + dy * dy) / (maxRenderRange / maxRange);
    const azimuth = Math.atan2(dx, dy) * (180 / Math.PI);

    return {
      azimuth: azimuth < 0 ? azimuth + 360 : azimuth,
      range: Math.min(range, maxRange),
    };
  }

  /**
   * Check if a target is within cursor tolerance
   * @param targetScreenPos Target position on screen
   * @param cursorScreenPos Cursor position on screen
   * @param tolerance Tolerance in pixels
   * @returns True if target is within cursor tolerance
   */
  static isTargetUnderCursor(
    targetScreenPos: ScreenCoordinates,
    cursorScreenPos: ScreenCoordinates,
    tolerance: number = 10
  ): boolean {
    const dx = targetScreenPos.x - cursorScreenPos.x;
    const dy = targetScreenPos.y - cursorScreenPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance <= tolerance;
  }

  /**
   * Normalize azimuth angle to 0-360 range
   * @param azimuth Azimuth in degrees
   * @returns Normalized azimuth (0-360)
   */
  static normalizeAzimuth(azimuth: number): number {
    let normalized = azimuth % 360;
    if (normalized < 0) {
      normalized += 360;
    }
    return normalized;
  }

  /**
   * Calculate azimuth from one position to another
   * @param from Source position
   * @param to Target position
   * @returns Azimuth in degrees (0-360)
   */
  static calculateAzimuth(from: Vector3, to: Vector3): number {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const azimuth = Math.atan2(dy, dx) * (180 / Math.PI);
    return this.normalizeAzimuth(azimuth);
  }
}
