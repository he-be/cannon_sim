/**
 * Radar - Spec-compliant radar entity for Browser Artillery
 * Implements only features specified in design.md and requirements.md
 */

import { Vector3 } from '../../math/Vector3';
import { Target, TargetType } from './Target';
import { RadarSystem, RadarParameters } from '../systems/RadarSystem';

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

export interface RadarDetection {
  target: Target;
  snr: number;
  signalStrength: number; // 0-1 normalized for UI
}

export interface RadarDisplayData {
  detections: RadarDetection[];
  centerPosition: Vector3;
  maxRange: number;
}

/**
 * Radar entity for target detection and tracking
 * Implements radar functionality as per UI-04, UI-05, UI-13-1, UI-18
 */

/**
 * Radar entity for target detection and tracking
 * Implements radar functionality as per UI-04, UI-05, UI-13-1, UI-18
 */
export class Radar {
  private _position: Vector3;
  private _state: RadarState = RadarState.SCANNING;
  private _detections: RadarDetection[] = [];
  private _selectedTarget: Target | null = null;
  private _maxRange: number = 15000; // meters (updated to match constants)

  // Physics-based Radar System
  private _radarSystem: RadarSystem;
  private _currentAzimuth: number = 0;
  private _currentElevation: number = 0;

  constructor(position: Vector3) {
    this._position = position.copy();

    // Initialize Radar System with X-band parameters
    const params: RadarParameters = {
      transmitPower: 10000, // 10 kW
      frequency: 10e9, // 10 GHz
      antennaGain: 30, // 30 dBi
      beamWidth: 2.0, // 2.0 degrees
      noiseFigure: 4.0, // 4.0 dB
      systemLoss: 5.0, // 5.0 dB
    };
    this._radarSystem = new RadarSystem(params);
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
   * Update radar direction (called by controller)
   */
  setDirection(azimuth: number, elevation: number): void {
    this._currentAzimuth = azimuth;
    this._currentElevation = elevation;
  }

  /**
   * Scan for targets within range (UI-04)
   * Uses physics-based RadarSystem
   */
  scan(targets: Target[]): void {
    if (this._state !== RadarState.SCANNING) return;

    // Convert Az/El to Direction Vector
    // Azimuth: 0 is North (Y+), 90 is East (X+)
    // Elevation: 0 is Horizon, 90 is Zenith
    const elRad = this._currentElevation * (Math.PI / 180);

    // x = cos(el) * cos(az)
    // y = cos(el) * sin(az)
    // z = sin(el)
    // Note: Azimuth in game might be different convention.
    // Usually Az 0 = North (Y+), 90 = East (X+).
    // So X = sin(az), Y = cos(az).

    const dirX =
      Math.cos(elRad) * Math.sin((this._currentAzimuth * Math.PI) / 180);
    const dirY =
      Math.cos(elRad) * Math.cos((this._currentAzimuth * Math.PI) / 180);
    const dirZ = Math.sin(elRad);
    const radarDir = new Vector3(dirX, dirY, dirZ);

    this._detections = [];

    targets.forEach(target => {
      // 1. Broadphase check (max range)
      if (target.isDestroyed) return;
      const distance = target.distanceFrom(this._position);
      if (distance > this._maxRange) return;

      // 2. Physics check
      const bandwidth = 1e6;
      const power = this._radarSystem.calculateReceivedPower(
        target,
        this._position,
        radarDir
      );
      const snr = this._radarSystem.calculateSNR(power, bandwidth);

      if (this._radarSystem.isDetected(snr)) {
        // Map SNR to 0-1 signal strength for UI
        // Assume 13dB is min (0.1), 30dB is max (1.0)
        const minSnr = 13;
        const maxSnr = 40;
        const strength = Math.max(
          0.1,
          Math.min(1.0, (snr - minSnr) / (maxSnr - minSnr))
        );

        this._detections.push({
          target,
          snr,
          signalStrength: strength,
        });
      }
    });
  }

  /**
   * Get currently detected targets (UI-04)
   */
  getDetectedTargets(): Target[] {
    return this._detections.map(d => d.target);
  }

  /**
   * Select a target for detailed information (UI-05)
   */
  selectTarget(target: Target): void {
    const isDetected = this._detections.some(d => d.target === target);
    if (!isDetected) {
      // Allow selecting if it WAS detected but momentarily lost?
      // For now, strict check.
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
      detections: [...this._detections],
      centerPosition: this._position.copy(),
      maxRange: this._maxRange,
    };
  }

  /**
   * Set radar offline/online
   */
  setOffline(): void {
    this._state = RadarState.OFFLINE;
    this._detections = [];
    this._selectedTarget = null;
  }

  setOnline(): void {
    this._state = RadarState.SCANNING;
  }
}
