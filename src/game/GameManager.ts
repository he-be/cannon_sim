/**
 * GameManager - Clean implementation with proper component integration
 * Implements proper scene management and game flow control
 * Implements Canvas 2D API compliance (TR-02)
 * Implements proper game loop with deltaTime calculation
 */

import { CanvasManager } from '../rendering/CanvasManager';
import {
  TitleScene,
  SceneType,
  SceneTransition,
} from '../ui/scenes/TitleScene';
import { StageSelectScene } from '../ui/scenes/StageSelectScene';
import { GameScene, GameSceneConfig } from '../ui/scenes/GameScene';
import { getStageById, StageConfig } from '../data/StageData';

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

interface Scene {
  update(deltaTime: number): void;
  render(): void;
  destroy(): void;
}

/**
 * GameManager handles overall game state and scene management with proper game loop
 */
export class GameManager {
  private canvasManager: CanvasManager;
  private currentScene: Scene | null = null;
  private gameState: GameState = GameState.INITIALIZING;
  private gameStats: GameStats = {
    totalPlayTime: 0,
    stagesCompleted: 0,
    currentStage: null,
  };
  private startTime: number = 0;
  private lastFrameTime: number = 0;
  private animationFrameId: number | null = null;

  constructor(canvasId: string) {
    this.canvasManager = new CanvasManager(canvasId);
    this.initializeGame();
  }

  /**
   * Initialize the game and start with title scene
   */
  private initializeGame(): void {
    this.startTime = Date.now();
    this.lastFrameTime = this.startTime;
    this.gameState = GameState.RUNNING;
    this.showTitleScene();
  }

  /**
   * Start the game loop
   */
  start(): void {
    if (this.animationFrameId !== null) return;

    this.lastFrameTime = Date.now();
    this.gameLoop();
  }

  /**
   * Stop the game loop
   */
  stop(): void {
    if (this.animationFrameId !== null) {
      globalThis.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Main game loop with proper deltaTime calculation
   */
  private gameLoop = (): void => {
    const currentTime = Date.now();
    const deltaTime = Math.min(
      (currentTime - this.lastFrameTime) / 1000,
      1 / 30
    ); // Cap at 30 FPS
    this.lastFrameTime = currentTime;

    this.update(deltaTime);
    this.render();

    this.animationFrameId = globalThis.requestAnimationFrame(this.gameLoop);
  };

  /**
   * Handle scene transitions
   */
  private handleSceneTransition = (transition: SceneTransition): void => {
    // Clean up current scene
    if (this.currentScene) {
      this.currentScene.destroy();
      this.currentScene = null;
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
  }

  /**
   * Update game state with deltaTime
   */
  private update(deltaTime: number): void {
    if (this.gameState !== GameState.RUNNING) return;

    // Update game statistics
    this.gameStats.totalPlayTime = (Date.now() - this.startTime) / 1000;

    // Update current scene
    if (this.currentScene) {
      this.currentScene.update(deltaTime);
    }
  }

  /**
   * Render current scene
   */
  private render(): void {
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
    this.stop();
    if (this.currentScene) {
      this.currentScene.destroy();
      this.currentScene = null;
    }
  }

  /**
   * Get available stages for selection
   */
  getAvailableStages(): StageConfig[] {
    return [1, 2, 3]
      .map(id => getStageById(id))
      .filter((stage): stage is StageConfig => stage !== null);
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

  /**
   * Get canvas manager for external access if needed
   */
  getCanvasManager(): CanvasManager {
    return this.canvasManager;
  }
}
