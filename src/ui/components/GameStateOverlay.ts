import { CanvasManager } from '../../rendering/CanvasManager';
import { GameState } from '../../game/GameState';
import { CRT_COLORS } from '../../data/Constants';

/**
 * Renders game state overlays (Mission Success / Mission Failed)
 */
export class GameStateOverlay {
  private canvasManager: CanvasManager;

  constructor(canvasManager: CanvasManager) {
    this.canvasManager = canvasManager;
  }

  render(gameState: GameState): void {
    if (gameState === GameState.PLAYING) return;

    const ctx = this.canvasManager.context;
    const centerX = this.canvasManager.width / 2;
    const centerY = this.canvasManager.height / 2;

    ctx.save();

    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, this.canvasManager.width, this.canvasManager.height);

    // State text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (gameState === GameState.GAME_OVER) {
      ctx.fillStyle = CRT_COLORS.CRITICAL_TEXT;
      ctx.font = 'bold 48px monospace';
      ctx.fillText('MISSION FAILED', centerX, centerY - 30);

      ctx.fillStyle = CRT_COLORS.SECONDARY_TEXT;
      ctx.font = '20px monospace';
      ctx.fillText('Press R to restart', centerX, centerY + 30);
    } else if (gameState === GameState.STAGE_CLEAR) {
      ctx.fillStyle = CRT_COLORS.PRIMARY_TEXT;
      ctx.font = 'bold 48px monospace';
      ctx.fillText('MISSION SUCCESS', centerX, centerY - 30);

      ctx.fillStyle = CRT_COLORS.SECONDARY_TEXT;
      ctx.font = '20px monospace';
      ctx.fillText('Press SPACE to continue', centerX, centerY + 30);
    }

    ctx.restore();
  }
}
