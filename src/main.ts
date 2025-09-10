/**
 * Browser Artillery - Main Entry Point
 * A real-time artillery simulation game with realistic physics
 */

import { GameManager } from './game/GameManager';

/**
 * Main initialization
 */
function main(): void {
  console.log('Browser Artillery - Initializing...');

  try {
    // Initialize game manager with the main canvas
    const gameManager = new GameManager('horizontal-radar');

    // Start the main game loop
    function gameLoop(): void {
      gameManager.update();
      gameManager.render();
      window.requestAnimationFrame(gameLoop);
    }

    gameLoop();

    console.log('Browser Artillery - Ready!');
  } catch (error) {
    console.error('Failed to initialize:', error);
  }
}

// Start the application
main();
