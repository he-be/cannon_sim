import { CircularScopeTarget } from '../components/CircularScopeRenderer';
import { AScopeTarget } from '../components/AScopeRenderer';

/**
 * UIStateManager
 * Manages the state of the UI, including radar settings and target lists.
 */
export class UIStateManager {
  // Radar State
  private _radarAzimuth: number = 0;
  private _radarElevation: number = 0;
  private _radarRange: number = 15000;
  private _rangeGate: number = 5000;

  // Target Lists
  private _circularTargets: CircularScopeTarget[] = [];
  private _aScopeTargets: AScopeTarget[] = [];

  // Getters
  get radarAzimuth(): number {
    return this._radarAzimuth;
  }
  get radarElevation(): number {
    return this._radarElevation;
  }
  get radarRange(): number {
    return this._radarRange;
  }
  get rangeGate(): number {
    return this._rangeGate;
  }
  get circularTargets(): CircularScopeTarget[] {
    return this._circularTargets;
  }
  get aScopeTargets(): AScopeTarget[] {
    return this._aScopeTargets;
  }

  // Setters
  setRadarDirection(azimuth: number, elevation: number): void {
    this._radarAzimuth = azimuth;
    this._radarElevation = elevation;
  }

  setRadarRange(range: number): void {
    this._radarRange = range;
  }

  setRangeGate(gate: number): void {
    this._rangeGate = gate;
  }

  // Target Management
  updateCircularTarget(target: CircularScopeTarget): void {
    const index = this._circularTargets.findIndex(t => t.id === target.id);
    if (index !== -1) {
      this._circularTargets[index] = target;
    } else {
      this._circularTargets.push(target);
    }
  }

  removeCircularTarget(targetId: string): void {
    this._circularTargets = this._circularTargets.filter(
      t => t.id !== targetId
    );
  }

  updateAScopeTarget(target: AScopeTarget): void {
    const index = this._aScopeTargets.findIndex(t => t.id === target.id);
    if (index !== -1) {
      this._aScopeTargets[index] = target;
    } else {
      this._aScopeTargets.push(target);
    }
  }

  removeAScopeTarget(targetId: string): void {
    this._aScopeTargets = this._aScopeTargets.filter(t => t.id !== targetId);
  }

  // Clear all targets (e.g., on reset)
  clearTargets(): void {
    this._circularTargets = [];
    this._aScopeTargets = [];
  }
}
