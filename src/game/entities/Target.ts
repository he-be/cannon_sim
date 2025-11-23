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
  FALLING = 'falling', // Hit and falling to ground
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
  public spawnTime: number = 0;

  constructor(
    position: Vector3,
    type: TargetType,
    velocity?: Vector3,
    spawnTime: number = 0
  ) {
    this._trackId = Target.nextTrackId++;
    if (Target.nextTrackId > 99) Target.nextTrackId = 1;

    this._position = position.copy();
    this._type = type;
    this.spawnTime = spawnTime;

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

  get isFalling(): boolean {
    return this._state === TargetState.FALLING;
  }

  get isActive(): boolean {
    return this._state === TargetState.ACTIVE;
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
    if (this._state === TargetState.DESTROYED) return;

    // Falling targets: apply gravity
    if (this._state === TargetState.FALLING) {
      // Apply gravity to vertical velocity (z-component)
      const gravity = -9.81; // m/s², downward
      this._velocity = new Vector3(
        this._velocity.x,
        this._velocity.y,
        this._velocity.z + gravity * deltaTime
      );

      // Update position with current velocity
      this._position = this._position.add(this._velocity.multiply(deltaTime));

      // Check if reached ground
      if (this._position.z <= 0) {
        this._state = TargetState.DESTROYED;
      }
      return;
    }

    // Active targets: simple linear movement for moving targets (exclude static and balloon)
    if (this._type !== TargetType.STATIC && this._type !== TargetType.BALLOON) {
      this._position = this._position.add(this._velocity.multiply(deltaTime));
    }
  }

  /**
   * Hit target - transition to falling state (GS-08, GS-09)
   * Target will fall to ground with current velocity vector
   */
  hit(): void {
    if (this._state === TargetState.ACTIVE) {
      this._state = TargetState.FALLING;
      // Velocity is already set, will be affected by gravity in update()
    }
  }

  /**
   * Check if falling target has reached ground
   */
  hasReachedGround(): boolean {
    return this._state === TargetState.FALLING && this._position.z <= 0;
  }

  /**
   * Destroy target immediately (for backward compatibility)
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
