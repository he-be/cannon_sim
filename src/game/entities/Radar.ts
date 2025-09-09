/**
 * Radar - Spec-compliant radar entity for Browser Artillery
 * Implements only features specified in design.md and requirements.md
 */

import { Vector3 } from '../../math/Vector3';
import { Target, TargetType } from './Target';

export enum RadarState {
  SCANNING = 'scanning',
  OFFLINE = 'offline',
}

export interface TargetInfo {
  range: number;
  bearing: number;
  altitude: number;
  speed: number;
  type: TargetType;
}

export interface RadarDisplayData {
  detectedTargets: Target[];
  centerPosition: Vector3;
  maxRange: number;
}

/**
 * Radar entity for target detection and tracking
 * Implements radar functionality as per UI-04, UI-05, UI-13-1, UI-18
 */
export class Radar {
  private _position: Vector3;
  private _state: RadarState = RadarState.SCANNING;
  private _detectedTargets: Target[] = [];
  private _selectedTarget: Target | null = null;
  private _maxRange: number = 1500; // meters

  constructor(position: Vector3) {
    this._position = position.copy();
  }

  get position(): Vector3 {
    return this._position.copy();
  }

  get state(): RadarState {
    return this._state;
  }

  get selectedTarget(): Target | null {
    return this._selectedTarget;
  }

  /**
   * Scan for targets within range (UI-04)
   */
  scan(targets: Target[]): void {
    if (this._state !== RadarState.SCANNING) return;

    this._detectedTargets = targets.filter(target => {
      // Only detect active targets within range
      if (target.isDestroyed) return false;

      const distance = target.distanceFrom(this._position);
      return distance <= this._maxRange;
    });
  }

  /**
   * Get currently detected targets (UI-04)
   */
  getDetectedTargets(): Target[] {
    return [...this._detectedTargets];
  }

  /**
   * Select a target for detailed information (UI-05)
   */
  selectTarget(target: Target): void {
    if (!this._detectedTargets.includes(target)) {
      throw new Error('Cannot select target that is not detected');
    }

    this._selectedTarget = target;
  }

  /**
   * Get detailed information about selected target (UI-18)
   */
  getTargetInfo(): TargetInfo {
    if (!this._selectedTarget) {
      throw new Error('No target selected');
    }

    const target = this._selectedTarget;
    const delta = target.position.subtract(this._position);
    const range = delta.magnitude();
    const bearing = Math.atan2(delta.y, delta.x) * (180 / Math.PI);

    return {
      range,
      bearing: bearing < 0 ? bearing + 360 : bearing,
      altitude: target.altitude,
      speed: target.speed,
      type: target.type,
    };
  }

  /**
   * Get radar display data for UI rendering (UI-13-1)
   */
  getRadarDisplayData(): RadarDisplayData {
    return {
      detectedTargets: [...this._detectedTargets],
      centerPosition: this._position.copy(),
      maxRange: this._maxRange,
    };
  }

  /**
   * Set radar offline/online
   */
  setOffline(): void {
    this._state = RadarState.OFFLINE;
    this._detectedTargets = [];
    this._selectedTarget = null;
  }

  setOnline(): void {
    this._state = RadarState.SCANNING;
  }
}
