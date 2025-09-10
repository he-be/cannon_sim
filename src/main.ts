/**
 * Browser Artillery - Main Entry Point
 * A real-time artillery simulation game with realistic physics
 */

import { GameManager } from './game/GameManager';

// Control elements
const azimuthSlider = document.getElementById(
  'azimuth-slider'
) as HTMLInputElement;
const elevationSlider = document.getElementById(
  'elevation-slider'
) as HTMLInputElement;
const azimuthValue = document.getElementById('azimuth-value') as HTMLElement;
const elevationValue = document.getElementById(
  'elevation-value'
) as HTMLElement;
const fireButton = document.getElementById('fire-button') as HTMLButtonElement;

/**
 * Update control value displays
 */
function updateControlDisplays(): void {
  if (azimuthValue && azimuthSlider) {
    azimuthValue.textContent = `${azimuthSlider.value}°`;
  }
  if (elevationValue && elevationSlider) {
    elevationValue.textContent = `${elevationSlider.value}°`;
  }
}

/**
 * Initialize game time display
 */
function initializeGameTime(): void {
  const gameTimeElement = document.getElementById('game-time');
  if (!gameTimeElement) return;

  const startTime = Date.now();

  function updateTime(): void {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    gameTimeElement!.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  setInterval(updateTime, 1000);
  updateTime();
}

/**
 * Setup event listeners
 */
function setupEventListeners(): void {
  if (azimuthSlider && elevationSlider) {
    azimuthSlider.addEventListener('input', updateControlDisplays);
    elevationSlider.addEventListener('input', updateControlDisplays);
  }

  if (fireButton) {
    fireButton.addEventListener('click', () => {
      console.log(
        `Fire! Az: ${azimuthSlider?.value}°, El: ${elevationSlider?.value}°`
      );
      // TODO: Implement firing logic
    });
  }
}

/**
 * Main initialization
 */
function main(): void {
  console.log('Browser Artillery - Initializing...');

  try {
    // Initialize game manager with the main canvas
    const gameManager = new GameManager('horizontal-radar');

    // Setup UI event listeners
    updateControlDisplays();
    initializeGameTime();
    setupEventListeners();

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
