/**
 * GameManager - Game state and scene management for Browser Artillery
 * Implements scene transitions as per GF-01, GF-02, GF-03, GF-04 specifications
 */

import { CanvasManager } from '../rendering/CanvasManager';
import {
  TitleScene,
  SceneType,
  SceneTransition,
} from '../ui/scenes/TitleScene';
import { StageSelectScene } from '../ui/scenes/StageSelectScene';
import { GameScene, GameSceneConfig } from '../ui/scenes/GameScene';
import { StageData, StageConfig } from '../data/StageData';

export enum GameState {
  INITIALIZING = 'initializing',
  RUNNING = 'running',
  PAUSED = 'paused',
}

export interface GameStats {
  totalPlayTime: number;
  stagesCompleted: number;
  currentStage: number | null;
}

/**
 * GameManager handles overall game state and scene management
 * Implements scene transitions and game flow management
 */
export class GameManager {
  private canvasManager: CanvasManager;
  private currentScene: TitleScene | StageSelectScene | GameScene | null = null;
  private gameState: GameState = GameState.INITIALIZING;
  private gameStats: GameStats = {
    totalPlayTime: 0,
    stagesCompleted: 0,
    currentStage: null,
  };
  private startTime: number = 0;

  constructor(canvasId: string) {
    this.canvasManager = new CanvasManager(canvasId);
    this.initializeGame();
  }

  /**
   * Initialize the game and start with title scene
   */
  private initializeGame(): void {
    this.startTime = Date.now();
    this.gameState = GameState.RUNNING;
    this.showTitleScene();
  }

  /**
   * Handle scene transitions
   */
  private handleSceneTransition = (transition: SceneTransition): void => {
    // Clean up current scene
    if (this.currentScene) {
      this.currentScene.destroy();
    }

    switch (transition.type) {
      case SceneType.TITLE:
        this.showTitleScene();
        break;
      case SceneType.STAGE_SELECT:
        this.showStageSelectScene();
        break;
      case SceneType.GAME:
        if (
          transition.data &&
          typeof transition.data === 'object' &&
          'selectedStage' in transition.data
        ) {
          const data = transition.data as { selectedStage: StageConfig };
          this.showGameScene(data.selectedStage);
        }
        break;
    }
  };

  /**
   * Show title scene
   */
  private showTitleScene(): void {
    this.currentScene = new TitleScene(
      this.canvasManager,
      this.handleSceneTransition
    );
    this.gameStats.currentStage = null;
  }

  /**
   * Show stage select scene
   */
  private showStageSelectScene(): void {
    this.currentScene = new StageSelectScene(
      this.canvasManager,
      this.handleSceneTransition
    );
    this.gameStats.currentStage = null;
  }

  /**
   * Show game scene with selected stage
   */
  private showGameScene(stageConfig: StageConfig): void {
    const gameConfig: GameSceneConfig = {
      selectedStage: stageConfig,
    };
    this.currentScene = new GameScene(
      this.canvasManager,
      this.handleSceneTransition,
      gameConfig
    );
    this.gameStats.currentStage = stageConfig.id;

    // Show game UI when entering game scene
    const gameUI = document.getElementById('game-ui');
    if (gameUI) {
      gameUI.style.display = 'block';
    }
  }

  /**
   * Update game state
   */
  update(): void {
    if (this.gameState !== GameState.RUNNING) return;

    // Update game statistics
    this.gameStats.totalPlayTime = (Date.now() - this.startTime) / 1000;

    // Scene-specific updates are handled by individual scenes
  }

  /**
   * Render current scene
   */
  render(): void {
    if (this.currentScene) {
      this.currentScene.render();
    }
  }

  /**
   * Get current game statistics
   */
  getGameStats(): GameStats {
    return { ...this.gameStats };
  }

  /**
   * Get current game state
   */
  getGameState(): GameState {
    return this.gameState;
  }

  /**
   * Pause the game
   */
  pause(): void {
    this.gameState = GameState.PAUSED;
  }

  /**
   * Resume the game
   */
  resume(): void {
    this.gameState = GameState.RUNNING;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.currentScene) {
      this.currentScene.destroy();
    }
    // CanvasManager cleanup is handled automatically
  }

  /**
   * Get available stages for selection
   */
  getAvailableStages(): StageConfig[] {
    return [1, 2, 3].map(id => StageData.getStage(id)!).filter(Boolean);
  }

  /**
   * Reset game statistics
   */
  resetStats(): void {
    this.gameStats = {
      totalPlayTime: 0,
      stagesCompleted: 0,
      currentStage: null,
    };
    this.startTime = Date.now();
  }
}
