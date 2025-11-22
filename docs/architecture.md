# アーキテクチャ詳細 (Architecture Details)

## コアコンポーネント

### 1. ShootingMethodSolver (`src/game/ShootingMethodSolver.ts`)

本シミュレーションの核となる弾道計算クラスです。

- **役割**: 移動する目標に対して、命中するための初期方位角（Azimuth）と仰角（Elevation）を算出します。
- **アルゴリズム**:
  - **Shooting Method**: 境界値問題（始点と終点が決まっている問題）を初期値問題（始点と角度が決まっている問題）の反復として解く手法。
  - **Newton-Raphson法**: 誤差（目標位置と着弾点のズレ）を最小化するために角度を修正。
  - **Broyden法**: Jacobian行列（角度の変化に対する誤差の変化率）の計算コストを削減するため、反復ごとに近似更新を行う準ニュートン法の一種。
  - **CPA (Closest Point of Approach)**: 弾丸と目標の距離が最小になる時点・位置を特定し、その誤差ベクトルを用いて収束判定を行う。

### 2. PhysicsEngine (`src/physics/PhysicsEngine.ts`)

物理法則に基づく運動計算を担当します。

- **役割**: 物体の位置と速度を時間発展させる。
- **数値積分**: Runge-Kutta 4次法 (RK4) を採用し、オイラー法よりも高い精度を実現。
- **考慮する力**:
  - 重力 ($F_g = mg$)
  - 空気抵抗 ($F_d = \frac{1}{2} \rho v^2 C_d A$)

### 3. GameManager (`src/game/GameManager.ts`)

ゲーム全体のループと状態を管理します。

- **役割**:
  - 入力イベントの処理
  - ゲームループの駆動（update, render）
  - 各コンポーネント（Physics, Renderer, UI）の連携

### 4. LeadAngleCalculator (`src/game/LeadAngleCalculator.ts`)

ShootingMethodSolverのラッパーとして機能し、より高レベルなインターフェースを提供します。
以前の実装の名残を含みますが、現在は主にShootingMethodSolverへの委譲を行っています。

## データフロー

1.  **入力**: ユーザーが目標位置やパラメータを指定。
2.  **計算**: `GameManager` が `ShootingMethodSolver` を呼び出し。
    - `ShootingMethodSolver` は `PhysicsEngine` を使用して何度も弾道シミュレーションを実行（試射）。
    - 最適な角度が求まるまで反復。
3.  **実行**: 決定された角度で `ProjectileManager` が弾丸を生成。
4.  **更新**: `PhysicsEngine` が毎フレーム弾丸の位置を更新。
5.  **描画**: `SceneRenderer` が現在の状態を画面に描画。

## 最適化技術

- **Broyden法**: Jacobian行列の再計算（重い処理）を回避し、計算時間を約50%削減。
- **早期終了 (Early Exit)**: シミュレーション中、弾丸が目標への最接近点（CPA）を通過して遠ざかり始めた時点で計算を打ち切り、無駄な計算を省略。
