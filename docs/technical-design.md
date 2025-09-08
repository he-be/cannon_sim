# Browser Artillery 技術設計書

## 1. 概要

本ドキュメントは、Webブラウザベースのリアルタイム砲撃シミュレーションゲーム「Browser Artillery」の技術設計を定義します。

- **開発言語**: TypeScript
- **描画API**: HTML5 Canvas 2D API
- **アーキテクチャパターン**: MVC（Model-View-Controller）

## 2. システムアーキテクチャ

```
┌─────────────────────────────────────────┐
│              Application                │
├─────────────────────────────────────────┤
│           Game Controller               │
├─────────────┬───────────┬───────────────┤
│    Scene    │   Input   │   Renderer    │
│  Manager    │  Manager  │   Manager     │
├─────────────┼───────────┼───────────────┤
│   Physics   │   Audio   │      UI       │
│   Engine    │  Manager  │   Manager     │
├─────────────┼───────────┼───────────────┤
│            Core Engine                  │
└─────────────────────────────────────────┘
```

### 2.1 レイヤー構成

#### アプリケーション層（Application Layer）
- エントリーポイント
- 初期化処理
- グローバル状態管理

#### ゲームコントローラー層（Game Controller Layer）
- ゲームループの制御
- シーン遷移管理
- タイムステップ管理

#### システム管理層（System Management Layer）
- **Scene Manager**: ゲーム状態とシーンの管理
- **Input Manager**: マウス・キーボード入力の統一的処理
- **Renderer Manager**: Canvas描画の統括

#### エンジン層（Engine Layer）
- **Physics Engine**: 砲弾の物理シミュレーション
- **Audio Manager**: 効果音管理（将来拡張）
- **UI Manager**: UI要素の管理と描画

#### コア層（Core Engine）
- 数学ライブラリ（Vector3, Matrix等）
- ユーティリティ関数
- 定数定義

## 3. モジュール構造

```
src/
├── core/
│   ├── Engine.ts           # メインエンジンクラス
│   ├── GameLoop.ts         # ゲームループ制御
│   ├── TimeManager.ts      # 時間管理
│   └── math/
│       ├── Vector3.ts      # 3Dベクトル演算
│       ├── Vector2.ts      # 2Dベクトル演算
│       └── MathUtils.ts    # 数学ユーティリティ
├── physics/
│   ├── PhysicsEngine.ts    # 物理エンジン本体
│   ├── Projectile.ts       # 砲弾の物理オブジェクト
│   ├── ProjectileManager.ts # 複数砲弾の管理
│   ├── Forces.ts           # 力の計算（重力、空気抵抗、コリオリ力）
│   └── Trajectory.ts       # 弾道計算
├── game/
│   ├── GameManager.ts      # ゲーム状態管理
│   ├── entities/
│   │   ├── Artillery.ts    # 砲台クラス
│   │   ├── Target.ts       # 目標クラス
│   │   └── Radar.ts        # レーダーシステム
│   └── systems/
│       ├── TargetingSystem.ts  # 照準・ロックオンシステム
│       └── LeadCalculator.ts   # リード角計算
├── rendering/
│   ├── Renderer.ts         # メイン描画クラス
│   ├── CanvasManager.ts    # Canvas操作管理
│   └── renderers/
│       ├── RadarRenderer.ts      # レーダー画面描画
│       ├── ProjectileRenderer.ts # 砲弾・軌跡描画
│       ├── UIRenderer.ts         # UI描画
│       └── EffectRenderer.ts     # エフェクト描画
├── input/
│   ├── InputManager.ts     # 入力統合管理
│   ├── MouseHandler.ts     # マウス操作処理
│   └── KeyboardHandler.ts  # キーボード操作処理
├── ui/
│   ├── UIManager.ts        # UI管理
│   ├── components/
│   │   ├── ControlPanel.ts     # 左ペイン操作パネル
│   │   ├── RadarDisplay.ts     # レーダー表示
│   │   └── TargetInfo.ts       # ターゲット情報
│   └── scenes/
│       ├── TitleScene.ts       # タイトル画面
│       ├── StageSelectScene.ts # ステージ選択
│       └── GameScene.ts        # メインゲーム画面
├── data/
│   ├── GameData.ts         # ゲームデータ定義
│   ├── StageData.ts        # ステージ設定
│   └── Constants.ts        # 定数定義
└── main.ts                 # エントリーポイント
```

## 4. 主要クラス設計

### 4.1 コアクラス

#### Engine
```typescript
class Engine {
  private gameLoop: GameLoop;
  private sceneManager: SceneManager;
  private inputManager: InputManager;
  private renderer: Renderer;
  
  public initialize(): void;
  public start(): void;
  public stop(): void;
}
```

#### GameLoop
```typescript
class GameLoop {
  private readonly PHYSICS_TIMESTEP = 1/60; // 固定60Hz
  private lastTime: number;
  private accumulator: number;
  
  public update(deltaTime: number): void;
  private fixedUpdate(timestep: number): void;
}
```

### 4.2 物理システム

#### PhysicsEngine
```typescript
class PhysicsEngine {
  public simulateProjectile(
    initialPosition: Vector3,
    initialVelocity: Vector3,
    timestep: number
  ): Vector3[];
  
  public updateProjectile(projectile: Projectile, timestep: number): void;
  
  private calculateForces(
    position: Vector3,
    velocity: Vector3
  ): Vector3;
}
```

#### ProjectileManager
```typescript
class ProjectileManager {
  private activeProjectiles: Projectile[];
  private maxTrajectoryLength: number;
  
  public addProjectile(projectile: Projectile): void;
  public updateAll(deltaTime: number): void;
  public removeInactive(): void;
  public getActiveProjectiles(): Projectile[];
  public checkCollisions(targets: Target[]): void;
}
```

#### Forces
```typescript
class Forces {
  public static gravity(mass: number): Vector3;
  public static airResistance(velocity: Vector3, dragCoeff: number): Vector3;
  public static coriolisForce(velocity: Vector3, latitude: number): Vector3;
}
```

### 4.3 ゲームエンティティ

#### Artillery
```typescript
class Artillery {
  public position: Vector3;
  public azimuth: number;    // 方位角
  public elevation: number;  // 仰角
  
  public setAiming(azimuth: number, elevation: number): void;
  public fire(): Projectile;
}
```

#### Projectile
```typescript
class Projectile {
  public position: Vector3;
  public velocity: Vector3;
  public isActive: boolean;
  public trajectory: Vector3[];      // 軌跡記録用
  public timeAlive: number;
  
  public update(deltaTime: number): void;
  public checkCollision(targets: Target[]): Target | null;
  public isOutOfBounds(): boolean;
}
```

#### Target
```typescript
class Target {
  public position: Vector3;
  public velocity: Vector3;
  public isDestroyed: boolean;
  public hitRadius: number;
  
  public update(deltaTime: number): void;
  public checkHit(projectilePosition: Vector3): boolean;
}
```

#### Radar
```typescript
class Radar {
  public azimuth: number;
  public elevation: number;
  public range: number;
  public lockedTarget: Target | null;
  
  public setDirection(azimuth: number, elevation: number): void;
  public lockTarget(target: Target): void;
  public unlockTarget(): void;
}
```

## 5. データ構造

### 5.1 ゲーム状態
```typescript
interface GameState {
  currentScene: SceneType;
  selectedStage: number;
  gameTime: number;
  score: number;
  isGameOver: boolean;
  isPaused: boolean;
}
```

### 5.2 ステージ設定
```typescript
interface StageConfig {
  id: number;
  name: string;
  targets: TargetConfig[];
  timeLimit?: number;
}

interface TargetConfig {
  type: 'static' | 'moving_slow' | 'moving_fast';
  initialPosition: Vector3;
  velocity?: Vector3;
  spawnDelay: number;
}
```

### 5.3 レーダー設定
```typescript
interface RadarConfig {
  maxRange: number;
  scanSpeed: number;
  lockAccuracy: number;
  displayScale: number;
}
```

## 6. レンダリング設計

### 6.1 描画パイプライン
```
Frame Start
    ↓
Clear Canvas
    ↓
Draw Background
    ↓
Draw Radar Displays
    ↓
Draw Prediction Trajectories
    ↓
Draw Active Projectiles
    ↓
Draw Projectile Trails
    ↓
Draw Game Objects
    ↓
Draw UI Elements
    ↓
Draw Effects
    ↓
Frame End
```

### 6.3 砲弾描画仕様

#### 6.3.1 砲弾シンボル
- **水平レーダー**: 小さな円形シンボル（3-5px）
- **垂直レーダー**: 小さな円形シンボル（3-5px）
- **色**: 白色または明るい黄色
- **更新頻度**: 60FPSでリアルタイム更新

#### 6.3.2 軌跡表示
- **描画方式**: 砲弾が通過した点を線で接続
- **色**: 薄い灰色または薄い白色（透明度50%）
- **消去**: 一定時間後に徐々にフェードアウト
- **最大長**: パフォーマンス考慮して最新100-200点まで

#### 6.3.3 複数砲弾対応
- 各砲弾に一意のIDを割り当て
- 同時描画数の制限（最大10発程度）
- 古い砲弾から順次削除

### 6.4 座標系
- **ワールド座標**: 右手座標系（X: 東, Y: 上, Z: 北）
- **スクリーン座標**: Canvas座標系（原点: 左上）
- **レーダー座標**: 極座標系（距離, 方位角）

## 7. 入力システム設計

### 7.1 マウス操作マッピング
- **水平ドラッグ**: レーダー方位角調整
- **垂直ドラッグ**: レーダー距離カーソル調整
- **右クリック**: ターゲットロックオン
- **左クリック**: UI操作

### 7.2 入力状態管理
```typescript
interface InputState {
  mouse: {
    position: Vector2;
    deltaPosition: Vector2;
    buttons: MouseButtons;
    wheel: number;
  };
  keyboard: {
    pressedKeys: Set<string>;
  };
}
```

## 8. 物理演算詳細

### 8.1 数値積分法
- **手法**: 4次ルンゲ=クッタ法（RK4）
- **タイムステップ**: 固定1/60秒
- **精度**: 砲弾軌道の高精度計算を保証

### 8.2 力の計算
```typescript
// 重力
F_gravity = m * g * (0, -1, 0)

// 空気抵抗
F_drag = -0.5 * ρ * Cd * A * |v|² * (v/|v|)

// コリオリ力
F_coriolis = -2 * m * (Ω × v)
```

### 8.3 当たり判定
- **方式**: 球体同士の距離判定
- **判定頻度**: 物理ステップ毎（60Hz）
- **最適化**: 空間分割による高速化

### 8.4 砲弾管理システム
- **ライフサイクル**: 生成→飛翔→命中/着弾→削除
- **メモリ管理**: オブジェクトプールによる効率的な再利用
- **状態管理**: アクティブ砲弾のリスト管理とクリーンアップ

## 9. パフォーマンス要件

### 9.1 フレームレート
- **目標**: 60 FPS維持
- **物理演算**: 60Hz固定タイムステップ
- **描画**: requestAnimationFrame同期

### 9.2 メモリ使用量
- **ヒープ**: 50MB以下
- **ガベージコレクション**: フレーム内での新規オブジェクト生成を最小化

## 10. 拡張性設計

### 10.1 モジュラー設計
- インターフェースベースの疎結合
- 依存性注入による柔軟な構成
- プラグイン機構による機能拡張

### 10.2 設定外部化
- JSON形式の設定ファイル
- ゲームバランス調整の容易性
- ステージ追加の簡素化

このアーキテクチャに基づいて、堅牢で拡張性の高い砲撃シミュレーションゲームを構築します。