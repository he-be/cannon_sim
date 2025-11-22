/**
 * Target - Spec-compliant target entity for Browser Artillery
 * Implements only features specified in design.md and requirements.md
 */

import { Vector3 } from '../../math/Vector3';
import { VESSEL_CHARACTERISTICS } from '../../data/Constants';

export enum TargetType {
  // 既存のタイプを維持（後方互換性）
  STATIC = 'static', // Stage 1: Static targets
  MOVING_SLOW = 'moving_slow', // Stage 2: Slow moving targets
  MOVING_FAST = 'moving_fast', // Stage 3: Fast moving targets

  // 新しい空中戦艦タイプ
  BALLOON = 'balloon', // 気球（固定目標）
  FRIGATE = 'frigate', // フリゲート（低速移動目標）
  CRUISER = 'cruiser', // 巡洋艦（高速移動目標）
}

export enum TargetState {
  ACTIVE = 'active',
  DESTROYED = 'destroyed',
}

/**
 * 艦船特性インターフェース
 * 各艦船タイプの物理的特性を定義
 */
export interface VesselCharacteristics {
  size: number; // 当たり判定半径 (m)
  durability: number; // 耐久力（将来の拡張用）
  maxSpeed: number; // 最大速度 (m/s)
  altitude: number; // 標準高度 (m)
  displayName: string; // UI表示名
}

/**
 * Target entity representing destructible targets with movement
 * Implements target types as per UI-02 specification
 */
export class Target {
  private static nextTrackId = 1;
  private _trackId: number;
  private _position: Vector3;
  private _velocity: Vector3;
  private _type: TargetType;
  private _state: TargetState = TargetState.ACTIVE;

  constructor(position: Vector3, type: TargetType, velocity?: Vector3) {
    this._trackId = Target.nextTrackId++;
    if (Target.nextTrackId > 99) Target.nextTrackId = 1;

    this._position = position.copy();
    this._type = type;

    // Set velocity based on type (UI-02)
    if (velocity) {
      this._velocity = velocity.copy();
    } else {
      this._velocity = new Vector3(0, 0, 0); // Static by default
    }
  }

  get position(): Vector3 {
    return this._position.copy();
  }

  get velocity(): Vector3 {
    return this._velocity.copy();
  }

  get type(): TargetType {
    return this._type;
  }

  get state(): TargetState {
    return this._state;
  }

  get isDestroyed(): boolean {
    return this._state === TargetState.DESTROYED;
  }

  /**
   * Get formatted track ID (e.g., "T01")
   */
  get trackId(): string {
    return `T${this._trackId.toString().padStart(2, '0')}`;
  }

  /**
   * Target information for UI display (UI-18)
   */
  get speed(): number {
    return this._velocity.magnitude();
  }

  get altitude(): number {
    return this._position.z;
  }

  /**
   * Calculate distance from point (UI-18: Range display)
   */
  distanceFrom(point: Vector3): number {
    return this._position.subtract(point).magnitude();
  }

  /**
   * 艦船特性を取得
   */
  get vesselCharacteristics(): VesselCharacteristics {
    return getVesselCharacteristics(this._type);
  }

  /**
   * UI表示用の名前
   */
  get displayName(): string {
    return this.vesselCharacteristics.displayName;
  }

  /**
   * 当たり判定半径
   */
  get hitRadius(): number {
    return this.vesselCharacteristics.size;
  }

  /**
   * Update target position based on movement
   */
  update(deltaTime: number): void {
    if (this._state !== TargetState.ACTIVE) return;

    // Simple linear movement for moving targets (exclude static and balloon)
    if (this._type !== TargetType.STATIC && this._type !== TargetType.BALLOON) {
      this._position = this._position.add(this._velocity.multiply(deltaTime));
    }
  }

  /**
   * Destroy target when hit (GS-08, GS-09)
   */
  destroy(): void {
    this._state = TargetState.DESTROYED;
  }
}

/**
 * 艦船タイプに基づく特性を取得
 */
export function getVesselCharacteristics(
  type: TargetType
): VesselCharacteristics {
  const characteristics =
    VESSEL_CHARACTERISTICS[type as keyof typeof VESSEL_CHARACTERISTICS];
  if (!characteristics) {
    throw new Error(`Unknown target type: ${type}`);
  }
  return characteristics;
}

/**
 * 空中戦艦かどうかを判定
 */
export function isAirVessel(type: TargetType): boolean {
  return (
    type === TargetType.BALLOON ||
    type === TargetType.FRIGATE ||
    type === TargetType.CRUISER
  );
}
