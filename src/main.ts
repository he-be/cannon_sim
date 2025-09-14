/**
 * Browser Artillery - Clean Canvas 2D API Implementation
 * Implements TR-02: Canvas 2D API compliance (no DOM manipulation)
 * Implements proper game architecture with clean separation of concerns
 */

import { GameManager } from './game/GameManager';

/**
 * Application entry point with Canvas 2D API compliance
 */
class BrowserArtillery {
  private gameManager: GameManager;
  private isInitialized: boolean = false;

  constructor() {
    this.initializeCanvas();
    this.gameManager = new GameManager('game-canvas');
  }

  /**
   * Initialize the main game canvas
   */
  private initializeCanvas(): void {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Game canvas element not found');
    }

    // Set canvas to full viewport size
    this.resizeCanvas(canvas);

    // Handle window resize
    window.addEventListener('resize', () => this.resizeCanvas(canvas));
  }

  /**
   * Resize canvas to match viewport
   */
  private resizeCanvas(canvas: HTMLCanvasElement): void {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  /**
   * Initialize the game application
   */
  async initialize(): Promise<void> {
    try {
      console.log('Browser Artillery - Initializing...');

      // Setup error handling
      this.setupErrorHandling();

      // Start the game manager
      this.gameManager.start();

      this.isInitialized = true;
      console.log('Browser Artillery - Ready!');
    } catch (error) {
      console.error('Failed to initialize Browser Artillery:', error);
      throw error;
    }
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    window.addEventListener('error', event => {
      console.error('Runtime error:', event.error);
    });

    window.addEventListener('unhandledrejection', event => {
      console.error('Unhandled promise rejection:', event.reason);
    });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.gameManager) {
      this.gameManager.destroy();
    }
    this.isInitialized = false;
    console.log('Browser Artillery - Shutdown complete');
  }

  /**
   * Get initialization status
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}

/**
 * Application instance
 */
let app: BrowserArtillery | null = null;

/**
 * Initialize the application
 */
async function main(): Promise<void> {
  try {
    app = new BrowserArtillery();
    await app.initialize();
  } catch (error) {
    console.error('Application startup failed:', error);
  }
}

/**
 * Cleanup on page unload
 */
window.addEventListener('beforeunload', () => {
  if (app) {
    app.destroy();
  }
});

// Start the application
document.addEventListener('DOMContentLoaded', main);
