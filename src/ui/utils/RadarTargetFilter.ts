import { RadarTarget } from '../components/RadarRenderer';
import { CircularScopeTarget } from '../components/CircularScopeRenderer';
import { AScopeTarget } from '../components/AScopeRenderer';

/**
 * RadarTargetFilter
 * Handles conversion of RadarTargets to UI-specific target formats
 * and filtering logic for A-Scope display.
 */
export class RadarTargetFilter {
  /**
   * Convert a RadarTarget to a CircularScopeTarget
   */
  toCircularScopeTarget(target: RadarTarget): CircularScopeTarget {
    return {
      id: target.id,
      azimuth: target.bearing,
      distance: target.distance,
      elevation: target.elevation,
      strength: target.strength,
    };
  }

  /**
   * Determine if a target should be shown on the A-Scope
   * based on radar beam width and direction.
   */
  shouldShowOnAScope(
    target: RadarTarget,
    radarAzimuth: number,
    radarElevation: number
  ): boolean {
    // Use elevation from RadarTarget
    const elevationDiff = Math.abs(target.elevation - radarElevation);

    // Calculate shortest azimuth difference (0-180)
    const azDiff = Math.abs(target.bearing - radarAzimuth) % 360;
    const shortestAzDiff = azDiff > 180 ? 360 - azDiff : azDiff;

    // Beam width approx 5 degrees (both horizontal and vertical)
    return shortestAzDiff < 2.5 && elevationDiff < 2.5;
  }

  /**
   * Convert a RadarTarget to an AScopeTarget
   */
  toAScopeTarget(target: RadarTarget): AScopeTarget {
    return {
      id: target.id,
      distance: target.distance,
      strength: target.strength,
    };
  }
}
