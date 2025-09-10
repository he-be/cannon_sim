/**
 * CanvasManager - Canvas初期化・管理・座標変換を担当
 * プロトタイプ手法で実装（視覚的確認が重要）
 */

import { Vector2 } from '../math/Vector2';

/**
 * Canvas描画コンテキストの管理クラス
 */
export class CanvasManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private _width: number = 0;
  private _height: number = 0;

  constructor(canvasId: string) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      throw new Error(`Canvas element with id '${canvasId}' not found`);
    }

    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not get 2D rendering context');
    }

    this.ctx = context;
    this.resize();

    // リサイズイベントリスナーを追加
    window.addEventListener('resize', () => this.resize());
  }

  /**
   * Canvas描画コンテキストを取得
   */
  get context(): CanvasRenderingContext2D {
    return this.ctx;
  }

  /**
   * Canvas要素を取得
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Canvasの幅を取得
   */
  get width(): number {
    return this._width;
  }

  /**
   * Canvasの高さを取得
   */
  get height(): number {
    return this._height;
  }

  /**
   * Canvas中心座標を取得
   */
  get center(): Vector2 {
    return new Vector2(this._width / 2, this._height / 2);
  }

  /**
   * Canvasのサイズを親要素に合わせて調整
   */
  resize(): void {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // タイトル画面とステージセレクト画面では全画面サイズを使用
    let newWidth: number;
    let newHeight: number;

    if (parent === document.body) {
      // 全画面モード（タイトル・ステージセレクト）
      newWidth = window.innerWidth;
      newHeight = window.innerHeight;
    } else {
      // 通常モード（ゲーム内レーダー）
      const padding = 4; // 2px border * 2
      newWidth = rect.width - padding;
      newHeight = rect.height - padding;
    }

    // Canvas要素のサイズを設定
    this.canvas.style.width = `${newWidth}px`;
    this.canvas.style.height = `${newHeight}px`;

    // 内部解像度を設定（高DPI対応）
    this.canvas.width = newWidth * dpr;
    this.canvas.height = newHeight * dpr;

    // コンテキストのスケールを調整
    this.ctx.scale(dpr, dpr);

    this._width = newWidth;
    this._height = newHeight;
  }

  /**
   * Canvas全体をクリア
   */
  clear(color = '#001100'): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this._width, this._height);
  }

  /**
   * スクリーン座標からゲーム座標への変換
   * @param screenPos スクリーン座標
   * @returns ゲーム座標
   */
  screenToGame(screenPos: Vector2): Vector2 {
    const rect = this.canvas.getBoundingClientRect();
    return new Vector2(screenPos.x - rect.left, screenPos.y - rect.top);
  }

  /**
   * ゲーム座標からスクリーン座標への変換
   * @param gamePos ゲーム座標
   * @returns スクリーン座標
   */
  gameToScreen(gamePos: Vector2): Vector2 {
    const rect = this.canvas.getBoundingClientRect();
    return new Vector2(gamePos.x + rect.left, gamePos.y + rect.top);
  }

  /**
   * 基本的な描画プリミティブ: 線
   */
  drawLine(from: Vector2, to: Vector2, color = '#00ff00', width = 1): void {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.beginPath();
    this.ctx.moveTo(from.x, from.y);
    this.ctx.lineTo(to.x, to.y);
    this.ctx.stroke();
  }

  /**
   * 基本的な描画プリミティブ: 円
   */
  drawCircle(
    center: Vector2,
    radius: number,
    color = '#00ff00',
    fill = false
  ): void {
    this.ctx.beginPath();
    this.ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);

    if (fill) {
      this.ctx.fillStyle = color;
      this.ctx.fill();
    } else {
      this.ctx.strokeStyle = color;
      this.ctx.stroke();
    }
  }

  /**
   * 基本的な描画プリミティブ: 矩形
   */
  drawRect(pos: Vector2, size: Vector2, color = '#00ff00', fill = false): void {
    if (fill) {
      this.ctx.fillStyle = color;
      this.ctx.fillRect(pos.x, pos.y, size.x, size.y);
    } else {
      this.ctx.strokeStyle = color;
      this.ctx.strokeRect(pos.x, pos.y, size.x, size.y);
    }
  }

  /**
   * テキスト描画
   */
  drawText(
    text: string,
    pos: Vector2,
    color = '#00ff00',
    font = '12px Consolas',
    align: CanvasTextAlign = 'left'
  ): void {
    this.ctx.fillStyle = color;
    this.ctx.font = font;
    this.ctx.textAlign = align;
    this.ctx.fillText(text, pos.x, pos.y);
  }

  /**
   * デバッグ用グリッド描画
   */
  drawDebugGrid(spacing = 50, color = '#003300'): void {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1;

    // 垂直線
    for (let x = 0; x <= this._width; x += spacing) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this._height);
      this.ctx.stroke();
    }

    // 水平線
    for (let y = 0; y <= this._height; y += spacing) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this._width, y);
      this.ctx.stroke();
    }
  }

  /**
   * デバッグ用十字線描画（中心点表示）
   */
  drawDebugCrosshair(center: Vector2, size = 20, color = '#ffff00'): void {
    this.drawLine(
      new Vector2(center.x - size, center.y),
      new Vector2(center.x + size, center.y),
      color,
      2
    );
    this.drawLine(
      new Vector2(center.x, center.y - size),
      new Vector2(center.x, center.y + size),
      color,
      2
    );
  }

  /**
   * Canvas状態の保存
   */
  save(): void {
    this.ctx.save();
  }

  /**
   * Canvas状態の復元
   */
  restore(): void {
    this.ctx.restore();
  }

  /**
   * 座標系の移動
   */
  translate(offset: Vector2): void {
    this.ctx.translate(offset.x, offset.y);
  }

  /**
   * 座標系の回転
   */
  rotate(angle: number): void {
    this.ctx.rotate(angle);
  }

  /**
   * 座標系のスケール
   */
  scale(scale: Vector2): void {
    this.ctx.scale(scale.x, scale.y);
  }
}
