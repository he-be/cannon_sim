# Browser Artillery 開発計画書

## 1. 開発戦略

### 1.1 ハイブリッドアプローチの採用

本プロジェクトでは **TDD（テスト駆動開発）** と **プロトタイピング** を組み合わせたハイブリッドアプローチを採用します。

#### **TDDで実装する領域**

- **物理・数学計算**: 期待値が明確で検証可能
  - ベクトル演算（Vector2, Vector3）
  - 物理演算（重力、空気抵抗、コリオリ力）
  - 弾道計算（軌跡予測、リード角計算）
  - 衝突判定アルゴリズム
- **ビジネスロジック**: ゲームルール、状態管理
  - ゲーム状態遷移
  - ターゲティングシステムのロジック
  - プロジェクタイル管理システム
- **アルゴリズム**: 確定的な計算処理
  - 数値積分法（RK4）
  - 座標変換
  - ゲームループのタイムステップ制御

#### **プロトタイプ主導で実装する領域**

- **UI/UX**: 視覚的確認と操作感の調整が必要
  - レイアウト設計（3ペイン構成）
  - レーダー表示（水平・垂直）
  - コントロールパネルUI
- **Canvas描画**: ピクセル単位の結果検証は困難
  - 描画システム全般
  - エフェクト表現
  - 視覚フィードバック
- **入力システム**: 操作感の確認が重要
  - マウス操作の応答性
  - ドラッグ操作の調整
  - インタラクションの最適化

### 1.2 技術スタック

- **開発言語**: TypeScript
- **テストフレームワーク**: Vitest
- **ビルドツール**: Vite
- **品質管理**: ESLint + Prettier + Husky
- **描画API**: HTML5 Canvas 2D API

### 1.3 品質管理体制

- **Pre-commit Hook**: Huskyによる自動化
  - ESLint（コード品質チェック）
  - TypeScriptコンパイル（型チェック）
  - Prettier（コードフォーマット）
- **テストカバレッジ**: TDD対象領域は90%以上を目標
- **コミット単位**: 各タスク完了時に細かい粒度でコミット

## 2. 詳細タスクリスト

### **フェーズ1: 基盤構築**

#### T001. プロジェクト初期設定

**手法**: セットアップ  
**内容**:

- TypeScript設定（tsconfig.json）
- Vite設定（vite.config.ts）
- Vitest設定（テスト環境）
- ESLint + Prettier設定
- Husky pre-commit hook設定
- package.json依存関係

**成果物**: 開発環境の完全セットアップ
**推定時間**: 2時間

#### T002. 基本Canvas環境とHTML構造

**手法**: プロトタイプ  
**内容**:

- index.htmlファイル作成
- Canvas要素と基本CSSレイアウト
- 3ペイン構成の骨格
- 基本描画テスト（Hello World）

**成果物**: 基本HTML構造とCanvas描画確認
**推定時間**: 1時間

#### T003. Vector3クラス

**手法**: TDD  
**内容**:

- 3Dベクトル演算（加算、減算、スカラー倍）
- 内積、外積計算
- 正規化、長さ計算
- 等価判定

**テストケース**:

- 基本演算の結果検証
- エッジケース（ゼロベクトル等）の処理

**成果物**: `src/core/math/Vector3.ts` + テスト
**推定時間**: 2時間

#### T004. Vector2クラス

**手法**: TDD  
**内容**:

- 2Dベクトル演算（UI座標計算用）
- 回転、角度計算
- スクリーン座標変換

**成果物**: `src/core/math/Vector2.ts` + テスト
**推定時間**: 1.5時間

#### T005. MathUtilsライブラリ

**手法**: TDD  
**内容**:

- 三角関数ユーティリティ
- 角度変換（度 ⇔ ラジアン）
- 補間関数（lerp、slerp）
- 数値範囲クランプ

**成果物**: `src/core/math/MathUtils.ts` + テスト
**推定時間**: 1.5時間

### **フェーズ2: 物理エンジン**

#### T006. Forcesクラス

**手法**: TDD  
**内容**:

- 重力計算（F = mg）
- 空気抵抗計算（F = 0.5ρCdAv²）
- コリオリ力計算（F = -2m(Ω×v)）

**テストケース**:

- 各力の計算結果が物理法則通り
- 異なる条件での力の組み合わせ

**成果物**: `src/physics/Forces.ts` + テスト
**推定時間**: 3時間

#### T007. PhysicsEngine基本機能

**手法**: TDD  
**内容**:

- 4次ルンゲ=クッタ法（RK4）数値積分
- 砲弾の位置・速度更新
- 力の統合計算

**テストケース**:

- 既知解との比較（自由落下等）
- 積分精度の検証

**成果物**: `src/physics/PhysicsEngine.ts` + テスト
**推定時間**: 4時間

#### T008. CanvasManager基礎機能

**手法**: プロトタイプ  
**内容**:

- Canvas初期化・リサイズ処理
- 座標変換ヘルパー
- 基本描画プリミティブ
- デバッグ用描画機能

**成果物**: `src/rendering/CanvasManager.ts`
**推定時間**: 2時間

#### T009. GameLoop固定タイムステップ

**手法**: TDD  
**内容**:

- 固定60Hz物理ステップ
- 可変描画フレームレート
- タイムアキュムレータ管理

**テストケース**:

- タイムステップの一貫性
- フレームドロップ時の挙動

**成果物**: `src/core/GameLoop.ts` + テスト
**推定時間**: 2時間

### **フェーズ3: ゲームエンティティ**

#### T010. Projectileエンティティ

**手法**: TDD  
**内容**:

- 砲弾の状態管理（位置、速度、生存状態）
- 軌跡履歴の記録
- 境界条件チェック

**テストケース**:

- 状態更新の正確性
- 軌跡記録の一貫性

**成果物**: `src/physics/Projectile.ts` + テスト
**推定時間**: 2時間

#### T011. Targetエンティティ

**手法**: TDD  
**内容**:

- 目標の移動パターン（静止、等速、変速）
- 当たり判定領域管理
- 撃破状態管理

**成果物**: `src/game/entities/Target.ts` + テスト
**推定時間**: 2時間

#### T012. Artilleryエンティティ

**手法**: TDD  
**内容**:

- 砲台の照準管理（方位角、仰角）
- 砲弾発射処理
- 初速計算

**成果物**: `src/game/entities/Artillery.ts` + テスト
**推定時間**: 1.5時間

#### T013. Radarエンティティ

**手法**: TDD  
**内容**:

- レーダー方向管理
- 探知範囲計算
- ターゲット追跡状態管理

**成果物**: `src/game/entities/Radar.ts` + テスト
**推定時間**: 2時間

#### T014. Trajectory弾道計算

**手法**: TDD  
**内容**:

- 予測弾道の算出
- 着弾点予測
- 飛行時間計算

**テストケース**:

- 既知条件での弾道検証
- エッジケースの処理

**成果物**: `src/physics/Trajectory.ts` + テスト
**推定時間**: 3時間

#### T015. ProjectileManager

**手法**: TDD  
**内容**:

- 複数砲弾の同時管理
- アクティブ砲弾リスト
- 自動クリーンアップ

**成果物**: `src/physics/ProjectileManager.ts` + テスト
**推定時間**: 2時間

### **フェーズ4: UI・インタラクション**

#### T016. 3ペインレイアウトプロトタイプ

**手法**: プロトタイプ  
**内容**:

- CSS Grid/Flexboxによるレイアウト
- 左25%（コントロール）、中央50%（水平レーダー）、右25%（垂直レーダー・情報）
- レスポンシブ対応

**成果物**: レイアウトプロトタイプ
**推定時間**: 1.5時間

#### T017. レーダー表示プロトタイプ

**手法**: プロトタイプ  
**内容**:

- 水平レーダー（トップダウンビュー）
- 垂直レーダー（サイドビュー）
- グリッド表示、スケール表示

**成果物**: レーダー描画プロトタイプ
**推定時間**: 3時間

#### T018. 基本マウス入力処理

**手法**: 実装  
**内容**:

- マウスイベントハンドリング
- 座標変換（スクリーン→ゲーム）
- ドラッグ状態管理

**成果物**: `src/input/MouseHandler.ts`
**推定時間**: 2時間

#### T019. コントロールパネルUI

**手法**: プロトタイプ  
**内容**:

- 方位角・仰角スライダー
- リード角表示
- 発射ボタン、ロックオン解除ボタン
- 時計表示

**成果物**: コントロールパネルUI
**推定時間**: 3時間

#### T020. レーダー操作

**手法**: プロトタイプ  
**内容**:

- マウスドラッグによるレーダー方向制御
- 距離カーソルの操作
- リアルタイムフィードバック

**成果物**: レーダー操作システム
**推定時間**: 3時間

### **フェーズ5: ゲームシステム**

#### T021. ターゲティングシステム

**手法**: TDD + プロトタイプ  
**内容**:

- ターゲット探知（TRACKING状態）
- ロックオン処理（LOCKED ON状態）
- 自動追尾機能

**TDD部分**: ロジック
**プロトタイプ部分**: 視覚フィードバック

**成果物**: `src/game/systems/TargetingSystem.ts` + テスト
**推定時間**: 4時間

#### T022. LeadCalculatorリード角計算

**手法**: TDD  
**内容**:

- 移動目標の未来位置予測
- 砲弾到達時間計算
- 推奨照準角算出

**テストケース**:

- 等速移動目標での計算検証
- 複雑な移動パターンでの精度

**成果物**: `src/game/systems/LeadCalculator.ts` + テスト
**推定時間**: 4時間

#### T023. 砲弾・軌跡描画システム

**手法**: プロトタイプ  
**内容**:

- リアルタイム砲弾シンボル描画
- 軌跡線の描画とフェードアウト
- 複数砲弾の同時表示

**成果物**: `src/rendering/renderers/ProjectileRenderer.ts`
**推定時間**: 3時間

#### T024. 衝突判定システム

**手法**: TDD  
**内容**:

- 球体同士の距離判定
- 継続的衝突検出
- 衝突応答処理

**テストケース**:

- 各種衝突シナリオの検証
- 高速移動時の検出精度

**成果物**: 衝突判定システム + テスト
**推定時間**: 3時間

#### T025. エフェクトシステム

**手法**: プロトタイプ  
**内容**:

- 爆発エフェクト
- 撃破フィードバック
- パーティクルシステム基礎

**成果物**: `src/rendering/renderers/EffectRenderer.ts`
**推定時間**: 2時間

#### T025-2. エフェクトシステム完全再実装

**手法**: 全面再実装  
**内容**:

- 既存EffectRendererとテストの完全削除
- 最新のコンポーネントアーキテクチャに基づく再実装
- 適切なCanvasManager統合とVector演算の活用
- 包括的テストスイートの新規作成

**成果物**: 新規実装 `src/rendering/renderers/EffectRenderer.ts` + テスト
**推定時間**: 3時間

#### T025-1. EffectRendererレビューと修正

**手法**: レビューと修正  
**内容**:

**適合性確認**:

- ✅ 要件準拠: GS-08, GS-09, GS-10の爆発エフェクト要件を正しく実装
- ✅ Canvas 2D API使用: TR-02要件に準拠
- ✅ 仕様書準拠: design.mdの撃破エフェクト仕様を実装

**問題の特定**:

- **コンポーネント再利用不備**: worldToScreen座標変換をCanvasManager(T008)の機能を使わず再実装
- **依存関係問題**: Vector2/Vector3クラス(T003/T004)の適切なインポート不備
- **ハードコーディング**: 魔法数値をConstants.tsで管理すべき

**修正方針**:

- CanvasManagerの座標変換ヘルパーメソッドを活用
- 適切なimport文の追加
- 設定可能な定数の外部化

**期待効果**:

- 既存コンポーネントの有効活用
- コード重複の削減
- 保守性の向上

**成果物**: 修正されたEffectRenderer
**推定時間**: 1時間

### **フェーズ6: ゲーム統合**

#### T026. ステージデータ

**手法**: 実装  
**内容**:

- 3種類のステージ設定
- ターゲット配置データ
- 難易度バランス調整

**成果物**: `src/data/StageData.ts`
**推定時間**: 2時間

#### T026-2. ステージデータ完全再実装

**手法**: 全面再実装  
**内容**:

- 既存StageDataとテストの完全削除
- 型安全で拡張性の高いデータ構造の新規設計
- Constants.tsとの適切な統合
- バランス調整を考慮したパラメータ設定

**成果物**: 新規実装 `src/data/StageData.ts` + テスト
**推定時間**: 2.5時間

#### T026-1. StageDataレビューと修正

**手法**: レビューと修正  
**内容**:

**適合性確認**:

- ✅ 要件準拠: UI-02の3ステージ仕様(静止目標/動目標(低速)/動目標(高速))を正しく実装
- ✅ 既存コンポーネント活用: Target(T011), Vector3(T003)を適切に使用
- ✅ 技術設計準拠: technical-design.mdのStageConfig構造に準拠

**問題の特定**:

- **インポート文不備**: Target、Vector3、TargetTypeの適切なインポート文が不足
- **ハードコーディング**: 座標値、速度値をConstants.tsで管理すべき
- **型安全性**: TypeScriptの型チェックでエラーが発生する可能性

**修正方針**:

- 適切なインポート文の追加
- ステージ設定定数の外部化
- 型定義の整備

**期待効果**:

- TypeScriptコンパイラエラーの解消
- 設定変更の容易性向上
- 型安全性の確保

**成果物**: 修正されたStageData
**推定時間**: 0.5時間

#### T027. タイトルシーン

**手法**: プロトタイプ  
**内容**:

- タイトル画面UI
- STARTボタン
- CRTスタイル適用

**成果物**: `src/ui/scenes/TitleScene.ts`
**推定時間**: 2時間

#### T027-2. タイトルシーン完全再実装

**手法**: 全面再実装  
**内容**:

- 既存TitleSceneとテストの完全削除
- 適切なMouseHandler統合による入力処理の統一
- Canvas 2D API完全準拠の描画実装
- 保守性の高いコンポーネント設計

**成果物**: 新規実装 `src/ui/scenes/TitleScene.ts` + テスト
**推定時間**: 2.5時間

#### T027-1. TitleSceneレビューと修正

**手法**: レビューと修正  
**内容**:

**適合性確認**:

- ✅ 要件準拠: UI-01(ゲームタイトル・STARTボタン), UI-03(CRTスタイル)を正しく実装
- ✅ Canvas 2D API使用: TR-02要件に準拠したCanvas描画
- ✅ 既存コンポーネント活用: CanvasManager(T008)を適切に使用

**問題の特定**:

- **入力処理の重複実装**: MouseHandler(T018)を使わず手動でクリックイベント処理を実装
- **座標変換の重複**: CanvasManagerのヘルパー機能を使わず手動で座標計算
- **ハードコーディング**: ボタン寸法、フォントサイズをConstants.tsで管理すべき

**修正方針**:

- MouseHandlerコンポーネントの活用による入力処理の統一
- CanvasManagerの座標変換ヘルパーの活用
- UI定数の外部化

**期待効果**:

- 入力処理の一貫性確保
- コード重複の削減（約30行削減）
- 設定変更の容易性向上

**成果物**: 修正されたTitleScene
**推定時間**: 1時間

#### T028. ステージセレクトシーン

**手法**: プロトタイプ  
**内容**:

- ステージ選択UI
- 3つのステージボタン
- ステージ情報表示

**成果物**: `src/ui/scenes/StageSelectScene.ts`
**推定時間**: 2時間

#### T028-2. ステージセレクトシーン完全再実装

**手法**: 全面再実装  
**内容**:

- 既存StageSelectSceneとテストの完全削除
- MouseHandler統合による統一的な入力処理
- StageDataとの型安全な連携
- コンポーネント分離による保守性向上

**成果物**: 新規実装 `src/ui/scenes/StageSelectScene.ts` + テスト
**推定時間**: 2.5時間

#### T028-1. StageSelectSceneレビューと修正

**手法**: レビューと修正  
**内容**:

**適合性確認**:

- ✅ 要件準拠: UI-02(3ステージ選択), UI-03(CRTスタイル)を正しく実装
- ✅ Canvas 2D API使用: TR-02要件に準拠したCanvas描画
- ✅ 既存コンポーネント活用: CanvasManager(T008), StageData(T026)を適切に使用

**問題の特定**:

- **入力処理の重複実装**: MouseHandler(T018)を使わず手動でクリックイベント処理を実装
- **プロパティ宣言不備**: handleClick プロパティの適切な型宣言が不足
- **ハードコーディング**: ボタン寸法、間隔をConstants.tsで管理すべき

**修正方針**:

- MouseHandlerコンポーネントの活用による入力処理の統一
- TypeScript型宣言の修正
- UI定数の外部化

**期待効果**:

- TitleSceneとの入力処理統一性確保
- 型安全性の向上
- コード重複の削減（約25行削減）

**成果物**: 修正されたStageSelectScene
**推定時間**: 1時間

#### T029. メインゲームシーン

**手法**: 統合  
**内容**:

- 全システムの統合
- ゲームプレイフロー
- ゲームオーバー・クリア処理

**成果物**: `src/ui/scenes/GameScene.ts`
**推定時間**: 4時間

#### T029-2. GameScene完全再実装

**手法**: 全面再実装  
**内容**:

- 既存GameScene.ts（1521行）の完全削除
- 既存テストの完全削除
- 適切なコンポーネント分離による新規実装（目標300行）
- TargetTracker、EffectRenderer等の既存コンポーネント活用
- Canvas 2D API完全準拠（HTML DOM操作完全除去）
- 包括的テストスイートの新規作成

**成果物**: 新規実装 `src/ui/scenes/GameScene.ts` + テスト
**推定時間**: 5時間

#### T029-1. GameSceneリファクタリング

**手法**: リファクタリング  
**内容**:

**問題の特定**:

- GameScene.ts が1521行に肥大化
- 仕様違反: HTML DOM操作の使用（Canvas 2D API要件に反する）
- 既存コンポーネントの重複実装（MouseHandler、ControlPanelManager、TargetingSystem等）
- 要件外機能の追加（Time to Intercept、Target Heading表示）
- technical-design.mdで定義されたモジュラー構造への不適合

**リファクタリング戦略**:

**Phase 1: 既存コンポーネント活用（最優先）**

- MouseHandler への入力処理の委譲（約100行削減）
- ControlPanelManager への UI管理の委譲（約80行削減）
- TargetingSystem への照準システムの委譲（約150行削減）
- ProjectileRenderer への砲弾描画の委譲（約100行削減）
- EffectRenderer へのエフェクト処理の委譲（約50行削減）

**Phase 2: Canvas API準拠（高優先）**

- HTML DOM操作の完全除去（lines 265-489）
- Canvas 2D API による描画への変換
- requirements.md TR-02 準拠の実装

**Phase 3: 要件準拠（中優先）**

- 要件外機能の除去（Time to Intercept、Target Heading）
- requirements.md、design.md との整合性確保
- 仕様書に定義された機能のみの実装

**Phase 4: アーキテクチャ準拠（中優先）**

- technical-design.md の分離原則の適用
- 責任分散による保守性向上
- モジュラー設計への準拠

**期待効果**:

- ファイルサイズ約80%削減（1521行 → 約300行）
- 仕様準拠の確保
- 保守性・拡張性の向上
- 既存コンポーネントの有効活用

**成果物**: リファクタリングされた `src/ui/scenes/GameScene.ts`
**推定時間**: 6時間

#### T030. GameManager統合・状態管理

**手法**: TDD + 統合  
**内容**:

- シーン遷移管理
- ゲーム状態の永続化
- スコア管理

**成果物**: `src/game/GameManager.ts` + テスト
**推定時間**: 3時間

#### T030-2. GameManager完全再実装

**手法**: 全面再実装  
**内容**:

- 既存GameManagerとテストの完全削除
- Canvas 2D API完全準拠（HTML DOM操作完全除去）
- 適切な責任分離（UI制御をSceneに委譲）
- シーン管理に特化したクリーンな実装
- 包括的テストスイートの新規作成

**成果物**: 新規実装 `src/game/GameManager.ts` + テスト
**推定時間**: 3.5時間

#### T030-1. GameManagerレビューと修正

**手法**: レビューと修正  
**内容**:

**適合性確認**:

- ✅ 既存コンポーネント活用: CanvasManager(T008), TitleScene(T027), StageSelectScene(T028), StageData(T026)を適切に使用
- ✅ シーン遷移管理: 要件に基づくゲームフロー実装

**重大な問題の特定**:

- **🚨 重大な仕様違反**: HTML DOM操作を使用（TR-02違反）
  - `document.getElementById('game-ui')`、`document.getElementById('horizontal-radar')`
  - `style.display`プロパティの操作
  - **要件違反**: TR-02「すべてのゲーム要素の描画にHTML5 Canvas 2D APIを使用したい」
- **アーキテクチャ違反**: GameManagerがUI要素を直接操作（technical-design.mdの分離原則に反する）
- **責任範囲逸脱**: GameManagerはゲーム状態管理に集中すべき

**修正方針**:

- HTML DOM操作の完全除去
- UI表示制御をUIManagerまたは各Sceneコンポーネントに委譲
- Canvas 2D APIのみを使用した実装への変更
- GameManagerの責任範囲をゲーム状態管理に限定

**期待効果**:

- TR-02要件の完全準拠
- アーキテクチャ設計の遵守
- UIとロジックの適切な分離
- 保守性・拡張性の向上

**成果物**: 修正されたGameManager（仕様準拠版）
**推定時間**: 3時間

#### T030-2. 核心レーダー操作システム実装

**手法**: TDD + プロトタイプ統合  
**内容**:

**Phase 1: 基本マウス操作 (最優先)**

- マウスドラッグによるレーダー方位角制御の実装
- マウスホイールによる距離カーソル制御の実装
- レーダー座標変換システムの実装
- 方位角・仰角の数値表示の実装

**Phase 2: ターゲティングシステム (高優先)**

- カーソル⇔ターゲット衝突判定の実装
- TRACKING状態の視覚フィードバックの実装
- 右クリックによるLOCKED_ON遷移の実装
- 自動追尾機能（レーダー・カーソル）の実装

**Phase 3: UI統合・情報表示 (中優先)**

- リード角計算結果の表示連携
- ターゲット詳細情報パネルの実装
- ロックオンステータス表示の実装
- 垂直レーダーの完全実装

**Phase 4: 拡張・最適化 (低優先)**

- マウス感度設定
- キーボードショートカット
- パフォーマンス最適化
- エラーハンドリング強化

**技術要件**:

- RadarCoordinateConverter クラス実装
- TargetingSystem クラス拡張
- UIUpdateManager クラス実装
- GameScene のマウスイベントハンドラー完全実装

**TDD部分**: 座標変換、衝突判定、状態管理ロジック
**プロトタイプ部分**: マウス操作感、視覚フィードバック

**成果物**: 完全なレーダー操作システム + テスト
**推定時間**: 8時間

### **フェーズ7: 最終調整**

#### T031. UIポリッシュ

**手法**: プロトタイプ  
**内容**:

- CRTモニター風スタイル
- 緑色のレーダー表示
- グレー基調のコントロールパネル
- フォント・色調の統一

**成果物**: 完成度の高いUI
**推定時間**: 3時間

#### T031-2. UIシステム完全再実装

**手法**: 全面再実装  
**内容**:

- 既存UI関連コードとテストの完全削除
- UIManagerコンポーネントの新規実装
- Canvas 2D API統一による一貫したレンダリング
- CRT/レーダーテーマの体系的な実装
- レスポンシブ対応とパフォーマンス最適化

**成果物**: 新規実装 UIシステム + テスト
**推定時間**: 4時間

#### T032. パフォーマンス最適化

**手法**: 実装  
**内容**:

- オブジェクトプール実装
- 描画最適化
- メモリリーク対策

**成果物**: パフォーマンス改善
**推定時間**: 3時間

#### T033. 統合テストとバグ修正

**手法**: テスト  
**内容**:

- 全機能の動作確認
- ブラウザ互換性テスト
- バグ修正とリファクタリング

**成果物**: 安定動作版
**推定時間**: 4時間

#### T034. 最終調整とゲームバランス調整

**手法**: 調整  
**内容**:

- ゲームバランスの微調整
- 操作性の最終確認
- ドキュメント整備

**成果物**: リリース版
**推定時間**: 2時間

## 3. 開発スケジュール

**総推定時間**: 82時間
**想定期間**: 3-4週間（週20-25時間想定）

### 週次計画

- **Week 1**: フェーズ1-2（基盤構築・物理エンジン）
- **Week 2**: フェーズ3-4（エンティティ・UI）
- **Week 3**: フェーズ5-6（ゲームシステム・統合）
- **Week 4**: フェーズ7（最終調整・ポリッシュ）

## 4. 品質保証

### 4.1 テスト戦略

- **単体テスト**: TDD対象クラスは90%以上のカバレッジ
- **統合テスト**: 主要なゲームフロー
- **手動テスト**: UI・UXの操作感確認

### 4.2 コード品質管理

- **TypeScript strict mode**: 型安全性の保証
- **ESLint**: コード品質ルールの強制
- **Prettier**: 一貫したコードフォーマット
- **Husky pre-commit**: 自動品質チェック

### 4.3 リスク管理

- **技術リスク**: 物理演算の精度問題 → 段階的な検証と調整
- **スコープリスク**: 機能過多 → MVP優先、段階的拡張
- **品質リスク**: バグ混入 → TDDとテスト自動化で予防

このタスクリストに従って段階的に開発を進め、各フェーズで動作確認を行いながら品質の高い砲撃シミュレーションゲームを構築します。

---

## 5. 緊急修正計画 (2025-09-13)

### 5.1 FIREボタン砲弾飛翔問題の修正

**問題**: FIREボタン押下時の砲弾が放物線軌道で飛翔しない

**根本原因**: GameScene.tsで簡易重力のみ適用されており、T007 PhysicsEngineが未統合

### 5.2 修正タスク優先度

#### T035. 緊急物理エンジン統合

**優先度**: 🔴 最高  
**手法**: 既存コンポーネント統合  
**内容**:

- 既存T007 PhysicsEngineをGameSceneに統合
- 簡易重力処理(updateProjectiles 291-323行目)をRK4数値積分に置換
- 正しい放物線軌道の実現

**成果物**: 物理法則に基づく砲弾飛翔  
**推定時間**: 2時間

#### T036. 弾道予測線表示

**優先度**: 🟡 高  
**手法**: 既存コンポーネント統合  
**内容**:

- TrajectoryRendererをGameSceneに統合
- UI-13: 水平レーダーでの弾道予測線表示
- UI-16: 垂直レーダーでの放物線弾道予測

**成果物**: リアルタイム弾道予測システム  
**推定時間**: 1.5時間

#### T037. 砲弾軌跡線表示

**優先度**: 🟡 中  
**手法**: T023の完全実装  
**内容**:

- 砲弾軌跡の履歴記録
- 軌跡線の描画とフェードアウト
- 複数砲弾の同時軌跡表示

**成果物**: 視覚的な砲弾軌跡フィードバック  
**推定時間**: 1時間

#### T038. 完全物理法則適用

**優先度**: 🟢 低  
**手法**: T006の完全実装  
**内容**:

- 空気抵抗計算の適用
- コリオリ力計算の適用
- 高精度物理シミュレーション

**成果物**: フル物理シミュレーション  
**推定時間**: 2時間

### 5.3 修正スケジュール

**即時着手**: T035 物理エンジン統合  
**第2段階**: T036 弾道予測線表示  
**第3段階**: T037 砲弾軌跡線表示  
**最終段階**: T038 完全物理法則適用

**総推定時間**: 6.5時間

---

## 6. 空中戦艦タイプターゲット実装計画 (2025-09-14)

### 6.1 設計方針

既存のコンポーネント構造を最大限活用し、段階的に空中戦艦タイプのターゲット特性を追加します。

### 6.2 既存コンポーネント分析と再利用戦略

**再利用可能な既存コンポーネント**:

- `Target` クラス: 基本構造はそのまま活用
- `TargetType` enum: 新しい艦船タイプを追加
- `TargetConfig` interface: 艦船特性パラメータを拡張
- `StageData` システム: 艦船配置データを拡張
- `Constants.ts` システム: 艦船パラメータを統一管理

### 6.3 実装タスク

#### T039. 空中戦艦タイプ定義

**手法**: 既存コンポーネント拡張  
**内容**:

**Step 1: TargetType拡張**

```typescript
export enum TargetType {
  // 既存のタイプを維持（後方互換性）
  STATIC = 'static',
  MOVING_SLOW = 'moving_slow',
  MOVING_FAST = 'moving_fast',

  // 新しい空中戦艦タイプ
  BALLOON = 'balloon', // 気球（固定目標）
  FRIGATE = 'frigate', // フリゲート（低速移動目標）
  CRUISER = 'cruiser', // 巡洋艦（高速移動目標）
}
```

**Step 2: 艦船特性インターface追加**

```typescript
export interface VesselCharacteristics {
  size: number; // 当たり判定半径
  durability: number; // 耐久力（将来の拡張用）
  maxSpeed: number; // 最大速度
  altitude: number; // 標準高度
  displayName: string; // UI表示名
}
```

**Step 3: Constants.ts拡張**

- `VESSEL_CHARACTERISTICS` オブジェクトを追加
- 各艦船タイプの詳細パラメータ定義

**成果物**: 拡張された型定義システム  
**推定時間**: 1時間

#### T040. Target クラス機能拡張

**手法**: 既存クラス非破壊的拡張  
**内容**:

**Step 1: Targetクラスに艦船特性アクセサ追加**

```typescript
export class Target {
  // 既存のプロパティとメソッドは維持

  get vesselCharacteristics(): VesselCharacteristics {
    return getVesselCharacteristics(this._type);
  }

  get displayName(): string {
    return this.vesselCharacteristics.displayName;
  }

  get hitRadius(): number {
    return this.vesselCharacteristics.size;
  }
}
```

**Step 2: ユーティリティ関数追加**

```typescript
export function getVesselCharacteristics(
  type: TargetType
): VesselCharacteristics {
  // 艦船タイプに基づく特性返却
}

export function isAirVessel(type: TargetType): boolean {
  // 空中戦艦判定
}
```

**Step 3: 後方互換性確保**

- 既存の `STATIC`, `MOVING_SLOW`, `MOVING_FAST` は従来通り動作
- 新しい艦船タイプは追加の特性を持つ

**成果物**: 機能拡張されたTarget システム  
**推定時間**: 2時間

#### T041. StageData 艦船配置設定

**手法**: 既存データ構造拡張  
**内容**:

**Step 1: TargetConfig 拡張**

```typescript
export interface TargetConfig {
  position: Vector3;
  type: TargetType;
  velocity?: Vector3;
  spawnDelay: number;
  // 新規追加（オプショナル）
  customAltitude?: number; // 個別高度設定
  patrolRoute?: Vector3[]; // 巡航ルート（将来拡張用）
}
```

**Step 2: 各ステージの艦船配置再定義**

**STAGE_1_CONFIG (気球ステージ)**:

```typescript
targets: [
  {
    position: new Vector3(0, -5000, 1000), // 高度1000mの気球
    type: TargetType.BALLOON,
    spawnDelay: 0,
  },
  // 複数の気球を段階的配置
];
```

**STAGE_2_CONFIG (フリゲートステージ)**:

```typescript
targets: [
  {
    position: new Vector3(-3000, -6000, 800),
    type: TargetType.FRIGATE,
    velocity: new Vector3(60, 0, 0), // 60m/s横移動
    spawnDelay: 0,
  },
  // 複数のフリゲートを配置
];
```

**STAGE_3_CONFIG (巡洋艦ステージ)**:

```typescript
targets: [
  {
    position: new Vector3(-4000, -8000, 1200),
    type: TargetType.CRUISER,
    velocity: new Vector3(120, 30, 0), // 複雑な移動
    spawnDelay: 0,
  },
  // 複数の巡洋艦を配置
];
```

**Step 3: バランス調整用定数追加**

```typescript
VESSEL_DEPLOYMENT: {
  BALLOON: {
    ALTITUDE_RANGE: [800, 1200],
    COUNT_PER_STAGE: [3, 4, 5],
  },
  FRIGATE: {
    ALTITUDE_RANGE: [600, 1000],
    SPEED_RANGE: [50, 80],
    COUNT_PER_STAGE: [2, 3, 4],
  },
  CRUISER: {
    ALTITUDE_RANGE: [800, 1400],
    SPEED_RANGE: [100, 150],
    COUNT_PER_STAGE: [1, 2, 3],
  },
}
```

**成果物**: 艦船配置データシステム  
**推定時間**: 1.5時間

#### T042. 描画システム統合

**手法**: 既存レンダラー拡張  
**内容**:

**Step 1: 艦船別シンボル定義**

- 気球: 円形シンボル
- フリゲート: 小型船舶シンボル
- 巡洋艦: 大型船舶シンボル

**Step 2: サイズ差別化**

- `hitRadius` に基づく動的サイズ調整
- 距離に応じたスケーリング

**Step 3: 既存レンダラーとの統合**

- GameScene での艦船タイプ判別描画
- レーダー表示での艦船情報表示

**成果物**: 艦船対応描画システム  
**推定時間**: 2時間

#### T043. UI情報表示拡張

**手法**: 既存UI拡張  
**内容**:

**Step 1: ターゲット情報パネル拡張**

```typescript
// ロックオン時の表示情報
- Target Type: "気球" / "フリゲート" / "巡洋艦"
- Size: "Small" / "Medium" / "Large"
- Speed: [現在の速度]
- Altitude: [現在高度]
- Range: [現在距離]
```

**Step 2: コントロールパネル表示調整**

- 艦船タイプに応じた推奨照準角の調整
- ターゲットサイズを考慮したリード角計算

**成果物**: 艦船対応UI システム  
**推定時間**: 1時間

#### T044. 衝突判定システム更新

**手法**: 既存システム拡張  
**内容**:

**Step 1: 可変当たり判定半径**

```typescript
// Target.hitRadius に基づく動的判定
const hitDistance = projectile.position.distanceTo(target.position);
const collisionThreshold = target.hitRadius;
```

**Step 2: 艦船サイズ別命中精度**

- 気球: 大きな当たり判定（容易）
- フリゲート: 中程度の当たり判定
- 巡洋艦: 大きいが高速のため困難

**成果物**: 艦船対応衝突判定  
**推定時間**: 1時間

### 6.4 段階的実装スケジュール

**Phase 1 (優先度: 最高)**

- T039: 空中戦艦タイプ定義
- T040: Target クラス機能拡張

**Phase 2 (優先度: 高)**

- T041: StageData 艦船配置設定
- T044: 衝突判定システム更新

**Phase 3 (優先度: 中)**

- T042: 描画システム統合
- T043: UI情報表示拡張

### 6.5 品質保証

**後方互換性チェック**:

- 既存の `STATIC`, `MOVING_SLOW`, `MOVING_FAST` タイプが正常動作
- 既存のテストが全て通過
- 既存のステージデータが正常読み込み

**新機能テスト**:

- 各艦船タイプの特性が正しく反映
- 艦船サイズに応じた当たり判定
- UI での艦船情報表示

### 6.6 推定工数

**総推定時間**: 8.5時間

- T039: 1時間
- T040: 2時間
- T041: 1.5時間
- T042: 2時間
- T043: 1時間
- T044: 1時間

**実装優先度**: 中-高（既存機能が正常動作している前提で実装）

---

## 7. UI改善実装計画 (2025-09-14)

### 7.1 設計方針

既存のUI描画システム（GameScene.ts）と入力処理システム（MouseHandler.ts）を最大限活用し、段階的にUI改善を実装します。

### 7.2 UI改善要求分析

**docs/ui-fix-0914.txt の要求内容**:

#### **左ペイン (Artillery制御)**

- **UI-F01**: Az/Elスライダーに微調整用の+/-ボタン追加（0.1度/秒の連続調整）
- **UI-F02**: Cancel trackingボタンを削除

#### **中央ペイン (水平レーダー)**

- **UI-F03**: レーダーのEl表示を追加
- **UI-F04**: 爆発エフェクトの位置修正（砲弾の実際の爆発位置で表示）

#### **右ペイン (垂直レーダー)**

- **UI-F05**: UI-13の要求実装（軌跡予測線表示）
- **UI-F06**: UI-16の要求実装（垂直レーダーでの弾道予測）

### 7.3 既存コンポーネント分析と再利用戦略

**再利用可能な既存コンポーネント**:

- `GameScene.renderControlElements()`: 左ペインUI描画システム
- `GameScene.renderSlider()`: スライダー描画システム
- `GameScene.handleMouseDown/Move/Up()`: マウス入力処理システム
- `GameScene.renderHorizontalRadar()`: 水平レーダー描画システム
- `GameScene.renderVerticalRadar()`: 垂直レーダー描画システム
- `EffectRenderer`: 爆発エフェクト描画システム
- `TrajectoryRenderer`: 軌跡予測描画システム

### 7.4 実装タスク

#### T045. Artillery制御パネル改善

**手法**: 既存コンポーネント拡張  
**内容**:

**Step 1: 微調整ボタンUI追加**

```typescript
// GameScene.renderControlElements() に追加
renderFineControlButtons(ctx: CanvasRenderingContext2D) {
  // Az +/- ボタンを描画
  // El +/- ボタンを描画
  // ボタンの視覚的フィードバック
}
```

**Step 2: 連続調整システム実装**

```typescript
// 長押し検出とタイマー処理
private buttonHoldTimer: number | null = null;
private buttonHoldInterval: number | null = null;

handleButtonHold(buttonType: 'az+' | 'az-' | 'el+' | 'el-') {
  // 0.1度/秒で連続調整
  // マウスリリースで停止
}
```

**Step 3: 既存スライダーとの同期**

```typescript
// updateSliderValue() を拡張
// ボタン操作時もスライダー位置を更新
// 数値表示も連動更新
```

**Step 4: Cancel trackingボタン削除**

```typescript
// uiElements配列からcancel_trackingを除去
// 関連する描画・入力処理コードを削除
```

**成果物**: 改善されたArtillery制御パネル  
**推定時間**: 2.5時間

#### T046. レーダー表示情報拡張

**手法**: 既存描画システム拡張  
**内容**:

**Step 1: レーダーElevation表示追加**

```typescript
// GameScene.renderHorizontalRadar() に追加
renderRadarElevationDisplay(ctx: CanvasRenderingContext2D) {
  // 現在のレーダー仰角を数値表示
  // "EL: XX.X°" 形式での表示
}
```

**Step 2: 既存radarElevation プロパティ活用**

```typescript
// 既存のthis.radarElevation を使用
// マウス操作との連動は既存システムを活用
```

**Step 3: UIレイアウトの調整**

```typescript
// 既存のレーダー情報表示エリアに統合
// 方位角表示と統一したフォーマット
```

**成果物**: Elevation表示機能  
**推定時間**: 1時間

#### T047. 爆発エフェクト位置修正

**手法**: 既存EffectRenderer統合強化  
**内容**:

**Step 1: 爆発位置計算の修正**

```typescript
// GameScene.checkCollisions() での爆発エフェクト生成時
if (result.hasCollision && result.collisionPoint) {
  // 実際の衝突位置を使用
  this.effectRenderer.createExplosion(result.collisionPoint);
}
```

**Step 2: レーダー範囲内判定**

```typescript
isPositionInRadarRange(position: Vector3): boolean {
  const distance = this.artilleryPosition.distanceTo(position);
  return distance <= this.maxRadarRange;
}

// レーダー範囲内の爆発のみ表示
if (this.isPositionInRadarRange(result.collisionPoint)) {
  this.effectRenderer.createExplosion(result.collisionPoint);
}
```

**Step 3: ワールド座標からスクリーン座標への変換**

```typescript
// 既存のworldToRadarScreen()メソッドを活用
// 水平レーダーと垂直レーダーでの正しい位置表示
```

**成果物**: 正確な爆発エフェクト表示  
**推定時間**: 1.5時間

#### T048. 軌跡予測線実装 (UI-13対応)

**手法**: 既存TrajectoryRenderer統合  
**内容**:

**Step 1: TrajectoryRenderer統合**

```typescript
// GameScene constructor で TrajectoryRenderer初期化
// 既存の this.trajectoryRenderer を活用
```

**Step 2: 水平レーダーでの予測線表示**

```typescript
// GameScene.renderHorizontalRadar() に追加
renderTrajectoryPrediction(ctx: CanvasRenderingContext2D) {
  if (this.lockedTarget) {
    // 現在の照準角度での弾道計算
    const trajectory = this.calculateTrajectoryToTarget();
    // 水平面での軌跡線描画
    this.drawTrajectoryOnRadar(ctx, trajectory);
  }
}
```

**Step 3: 既存の物理計算システム活用**

```typescript
// T035で統合済みのPhysicsEngineを使用
// リアルタイム弾道計算
// ターゲットの移動予測も考慮
```

**成果物**: 水平レーダーでの軌跡予測表示  
**推定時間**: 2時間

#### T049. 垂直レーダー弾道予測 (UI-16対応)

**手法**: 既存垂直レーダーシステム拡張  
**内容**:

**Step 1: 垂直断面での弾道計算**

```typescript
// GameScene.renderVerticalRadar() に追加
renderVerticalTrajectoryPrediction(ctx: CanvasRenderingContext2D) {
  if (this.lockedTarget) {
    // 垂直面（高度-距離）での放物線軌道計算
    const verticalTrajectory = this.calculateVerticalTrajectory();
    // 放物線の描画
    this.drawVerticalTrajectory(ctx, verticalTrajectory);
  }
}
```

**Step 2: 3D弾道の2D投影**

```typescript
calculateVerticalTrajectory(): TrajectoryPoint[] {
  // 3D弾道計算結果を垂直断面に投影
  // 重力による放物線軌道の正確な表現
  // 高度情報の正しい表示
}
```

**Step 3: 既存レーダー座標系との統合**

```typescript
// 既存のworldToRadarScreen()系の座標変換を活用
// 垂直レーダーの座標系に適合
```

**成果物**: 垂直レーダーでの弾道予測表示  
**推定時間**: 2時間

### 7.5 段階的実装スケジュール

**Phase 1 (優先度: 最高)**

- T045: Artillery制御パネル改善（+/-ボタン、Cancel tracking削除）
- T046: レーダー表示情報拡張（El表示追加）

**Phase 2 (優先度: 高)**

- T047: 爆発エフェクト位置修正
- T048: 軌跡予測線実装 (UI-13対応)

**Phase 3 (優先度: 中)**

- T049: 垂直レーダー弾道予測 (UI-16対応)

### 7.6 既存システムとの統合点

**入力処理統合**:

- 既存の`handleMouseDown/Move/Up()`システムを拡張
- +/-ボタンの長押し判定を追加
- 既存のスライダーとボタン操作の同期

**描画系統合**:

- 既存の`renderControlElements()`, `renderHorizontalRadar()`, `renderVerticalRadar()`を拡張
- EffectRendererとTrajectoryRendererの既存インスタンスを活用
- 一貫したCanvas 2D API使用

**物理計算統合**:

- T035で統合済みのPhysicsEngineを軌跡予測に活用
- 既存のcollision detection結果を爆発エフェクトに活用

### 7.7 品質保証

**既存機能保持**:

- 現在のUI操作が正常に動作継続
- 既存のマウス操作、スライダー操作が影響を受けない
- Canvas 2D API完全準拠の維持

**新機能テスト**:

- +/-ボタンの連続調整動作
- 爆発エフェクトの正確な位置表示
- 軌跡予測線の物理法則準拠

### 7.8 推定工数

**総推定時間**: 9時間

- T045: 2.5時間
- T046: 1時間
- T047: 1.5時間
- T048: 2時間
- T049: 2時間

**実装優先度**: 高（UI操作性の大幅向上が期待される）

---

## 8. レーダー座標系軌跡表示修正計画 (2025-09-14 追加修正)

### 8.1 問題分析

T048で実装された軌跡予測計算は物理的に正確な弾道シミュレーションを実現しましたが、以下の問題が残存しています：

**現状の問題点**:

- 3D軌跡計算は正確（PhysicsEngine + RK4積分）
- しかし、レーダー座標系での軌跡表示投影が不正確
- 砲座標系からレーダー座標系への適切な変換が不完全

**技術的課題**:

- レーダーAz（方位角）は追尾により自動変化するため、表示座標系が動的
- 3D弾道軌跡を水平レーダー（俯瞰図）と垂直レーダー（側面図）に正しく投影する必要
- 軌跡サンプリング点の座標変換精度向上が必要

### 8.2 実現方法の技術設計

#### **Phase 1: 軌跡サンプリング系の改良**

**既存の問題**:

```typescript
// 現在の実装（不完全）
while (time < maxTime) {
  trajectory.push(
    new Vector3(state.position.x, state.position.y, state.position.z)
  );
  state = physicsEngine.integrate(state, time, dt);
  time += dt;
}
```

**改良版実装**:

```typescript
// 軌跡予測専用の高精度サンプリング
private calculateHighPrecisionTrajectory(): TrajectoryPoint[] {
  const trajectory: TrajectoryPoint[] = [];
  const sampleInterval = PHYSICS_CONSTANTS.PHYSICS_TIMESTEP * 5; // 5フレームごとにサンプリング

  let state: State3D = this.getInitialTrajectoryState();
  let time = 0;

  while (time < PHYSICS_CONSTANTS.MAX_PROJECTILE_LIFETIME) {
    // 砲座標系での3D位置を記録
    const worldPosition = new Vector3(state.position.x, state.position.y, state.position.z);

    trajectory.push({
      time: time,
      worldPosition: worldPosition,
      velocity: new Vector3(state.velocity.x, state.velocity.y, state.velocity.z)
    });

    // 物理状態を高精度で積分
    state = this.physicsEngine.integrate(state, time, sampleInterval);
    time += sampleInterval;

    // 終了条件チェック
    if (state.position.z <= PHYSICS_CONSTANTS.GROUND_LEVEL) {
      break;
    }
  }

  return trajectory;
}
```

#### **Phase 2: レーダー座標変換系の実装**

**新規追加するクラス**:

```typescript
class RadarCoordinateConverter {
  constructor(
    private artilleryPosition: Vector3,
    private currentRadarAzimuth: number, // 動的に変化するレーダー方位角
    private maxRadarRange: number
  ) {}

  // 3D世界座標 → 水平レーダー座標変換
  worldToHorizontalRadar(worldPos: Vector3): Vector2 | null {
    const dx = worldPos.x - this.artilleryPosition.x;
    const dy = worldPos.y - this.artilleryPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > this.maxRadarRange) return null;

    // 絶対方位角を計算
    const absoluteBearing = Math.atan2(dx, dy) * (180 / Math.PI);

    // レーダー基準の相対方位角を計算（重要：レーダーAzを基準とする）
    let relativeBearing = absoluteBearing - this.currentRadarAzimuth;

    // -180° ～ +180°に正規化
    while (relativeBearing > 180) relativeBearing -= 360;
    while (relativeBearing < -180) relativeBearing += 360;

    // レーダー表示範囲チェック（±60°）
    if (Math.abs(relativeBearing) > 60) return null;

    return new Vector2(relativeBearing, distance);
  }

  // 3D世界座標 → 垂直レーダー座標変換
  worldToVerticalRadar(worldPos: Vector3): Vector2 | null {
    const dx = worldPos.x - this.artilleryPosition.x;
    const dy = worldPos.y - this.artilleryPosition.y;
    const dz = worldPos.z - this.artilleryPosition.z;
    const horizontalDistance = Math.sqrt(dx * dx + dy * dy);

    if (horizontalDistance > this.maxRadarRange) return null;

    // レーダー基準での相対方位角チェック（垂直レーダーはビーム幅±2.5°）
    const absoluteBearing = Math.atan2(dx, dy) * (180 / Math.PI);
    let relativeBearing = absoluteBearing - this.currentRadarAzimuth;

    while (relativeBearing > 180) relativeBearing -= 360;
    while (relativeBearing < -180) relativeBearing += 360;

    // 垂直レーダーのビーム幅内チェック
    if (Math.abs(relativeBearing) > 2.5) return null;

    return new Vector2(horizontalDistance, dz); // X=水平距離、Y=高度
  }
}
```

#### **Phase 3: 軌跡描画系の統合**

**水平レーダーでの軌跡表示**:

```typescript
private renderTrajectoryPrediction(
  ctx: CanvasRenderingContext2D,
  radarLeft: number,
  radarTop: number,
  radarWidth: number,
  radarHeight: number
): void {
  if (this.targetingState !== TargetingState.LOCKED_ON) return;

  // 高精度軌跡計算
  const worldTrajectory = this.calculateHighPrecisionTrajectory();

  // レーダー座標変換器の初期化
  const converter = new RadarCoordinateConverter(
    this.artilleryPosition,
    this.radarAzimuth, // 現在のレーダー方位角
    this.maxRadarRange
  );

  // レーダー座標に変換
  const radarTrajectory = worldTrajectory
    .map(point => converter.worldToHorizontalRadar(point.worldPosition))
    .filter(point => point !== null) as Vector2[];

  // 軌跡線描画
  if (radarTrajectory.length > 0) {
    ctx.save();
    ctx.strokeStyle = CRT_COLORS.WARNING_TEXT; // 黄色の予測線
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();

    radarTrajectory.forEach((radarPoint, index) => {
      // レーダー座標をスクリーン座標に変換
      const screenX = radarLeft + radarWidth / 2 +
        (radarPoint.x / 120) * (radarWidth - 20); // relativeBearing (-60° ～ +60°)
      const screenY = radarTop + radarHeight - 10 -
        (radarPoint.y / this.maxRadarRange) * (radarHeight - 20); // distance

      if (index === 0) {
        ctx.moveTo(screenX, screenY);
      } else {
        ctx.lineTo(screenX, screenY);
      }
    });

    ctx.stroke();
    ctx.restore();
  }
}
```

**垂直レーダーでの軌跡表示**:

```typescript
private renderVerticalTrajectoryPrediction(
  ctx: CanvasRenderingContext2D,
  radarLeft: number,
  radarTop: number,
  radarWidth: number,
  radarHeight: number
): void {
  if (this.targetingState !== TargetingState.LOCKED_ON) return;

  // 同じ高精度軌跡データを使用
  const worldTrajectory = this.calculateHighPrecisionTrajectory();

  const converter = new RadarCoordinateConverter(
    this.artilleryPosition,
    this.radarAzimuth,
    this.maxRadarRange
  );

  // 垂直レーダー座標に変換
  const verticalTrajectory = worldTrajectory
    .map(point => converter.worldToVerticalRadar(point.worldPosition))
    .filter(point => point !== null) as Vector2[];

  // 放物線軌跡描画
  if (verticalTrajectory.length > 0) {
    ctx.save();
    ctx.strokeStyle = CRT_COLORS.WARNING_TEXT;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();

    verticalTrajectory.forEach((verticalPoint, index) => {
      // 垂直レーダー座標をスクリーン座標に変換
      const screenX = radarLeft + 10 +
        (verticalPoint.x / this.maxRadarRange) * (radarWidth - 20); // 水平距離
      const screenY = radarTop + radarHeight - 10 -
        (verticalPoint.y / 10000) * (radarHeight - 20); // 高度（10km max）

      if (index === 0) {
        ctx.moveTo(screenX, screenY);
      } else {
        ctx.lineTo(screenX, screenY);
      }
    });

    ctx.stroke();
    ctx.restore();
  }
}
```

### 8.3 実装タスク

#### T050. レーダー座標系軌跡表示修正

**手法**: 既存システム改良  
**内容**:

**Step 1: 高精度軌跡サンプリング実装**

- `calculateHighPrecisionTrajectory()` メソッドの実装
- サンプリング間隔の最適化（精度と性能のバランス）
- TrajectoryPointインターface の定義

**Step 2: RadarCoordinateConverter クラス実装**

- 砲座標系からレーダー座標系への変換ロジック
- 動的レーダー方位角への対応
- 水平/垂直レーダーそれぞれの座標変換

**Step 3: 軌跡描画システム統合**

- `renderTrajectoryPrediction()` メソッドの改良
- `renderVerticalTrajectoryPrediction()` メソッドの改良
- 既存のworldToRadarScreen()メソッドとの統合

**Step 4: パフォーマンス最適化**

- 軌跡計算結果のキャッシング
- レーダー表示範囲外ポイントの早期除外
- 描画負荷の軽減

**成果物**: 正確なレーダー座標系軌跡表示システム  
**推定時間**: 3時間

### 8.4 技術的な重要ポイント

#### **座標変換の精度確保**:

```typescript
// 重要: レーダー基準での相対座標変換
const relativeBearing = absoluteBearing - this.currentRadarAzimuth;

// 360度境界の適切な処理
while (relativeBearing > 180) relativeBearing -= 360;
while (relativeBearing < -180) relativeBearing += 360;
```

#### **追尾レーダーとの同期**:

- レーダーAzが自動追尾により変化する場合の座標変換
- ロックオン時のレーダー向きの動的反映
- 軌跡予測線の実時間更新

#### **表示範囲フィルタリング**:

- 水平レーダー: ±60度の表示範囲
- 垂直レーダー: ±2.5度のビーム幅
- レーダー最大範囲外ポイントの除外

### 8.5 期待効果

**精度向上**:

- レーダー座標系での軌跡表示が物理的に正確
- 追尾レーダーの動きに軌跡予測が正しく追従
- 3D弾道の2D投影が数学的に正確

**操作性向上**:

- ターゲットロック時の軌跡予測が直感的
- レーダー画面上での弾道把握が容易
- 照準調整時の視覚フィードバックが正確

**システム統合**:

- 既存のPhysicsEngineとの完全統合
- レーダー制御システムとの連携
- UI描画システムとの効率的統合

### 8.6 品質保証

**検証項目**:

- 静止目標への軌跡予測精度
- 移動目標への軌跡予測精度
- レーダー追尾時の表示同期
- 360度境界での座標変換正確性

**パフォーマンス要件**:

- 60FPS維持（軌跡計算負荷を考慮）
- メモリ使用量最適化
- リアルタイム更新の応答性

### 8.7 総合推定工数

**T050: レーダー座標系軌跡表示修正**: 3時間

**実装優先度**: 最高（T048の完成度向上に直結）
