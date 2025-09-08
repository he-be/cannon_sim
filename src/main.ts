/**
 * Browser Artillery - Main Entry Point
 * A real-time artillery simulation game with realistic physics
 */

import { CanvasManager } from './rendering/CanvasManager';
import { Vector2 } from './math/Vector2';

// Canvas managers
let horizontalRadarManager: CanvasManager;
let verticalRadarManager: CanvasManager;

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
 * Initialize canvas managers and setup basic drawing
 */
function initializeCanvases(): void {
  // Initialize canvas managers
  horizontalRadarManager = new CanvasManager('horizontal-radar');
  verticalRadarManager = new CanvasManager('vertical-radar');

  // Initial drawing
  drawHorizontalRadar();
  drawVerticalRadar();
}

/**
 * Resize canvases (handled automatically by CanvasManager)
 */
function resizeCanvases(): void {
  // Canvas managers handle resizing automatically
  if (horizontalRadarManager && verticalRadarManager) {
    horizontalRadarManager.resize();
    verticalRadarManager.resize();

    // Redraw after resize
    drawHorizontalRadar();
    drawVerticalRadar();
  }
}

/**
 * Draw horizontal radar display (rectangular: horizontal=bearing, vertical=distance)
 */
function drawHorizontalRadar(): void {
  const canvas = horizontalRadarManager;
  const width = canvas.width;
  const height = canvas.height;

  // Clear canvas
  canvas.clear('#001100');

  const centerX = width / 2;
  const gunY = height - 20; // Gun position at bottom center
  const maxRange = height - 40; // Maximum distance range

  // Draw distance lines (horizontal - representing distance ranges)
  for (let i = 1; i <= 4; i++) {
    const y = gunY - (maxRange / 4) * i;
    canvas.drawLine(new Vector2(20, y), new Vector2(width - 20, y), '#00ff00');

    // Distance labels
    canvas.drawText(
      `${i * 5}km`,
      new Vector2(2, y - 2),
      '#00ff00',
      '10px Consolas'
    );
  }

  // Draw bearing lines (vertical - representing bearing angles)
  const bearingRange = 120; // Show ±60° range for visibility
  const degreesPerPixel = bearingRange / (width - 40);

  for (let bearing = -60; bearing <= 60; bearing += 30) {
    const x = centerX + bearing / degreesPerPixel;
    if (x >= 20 && x <= width - 20) {
      canvas.drawLine(new Vector2(x, 20), new Vector2(x, gunY), '#00ff00');

      // Bearing labels
      const label =
        bearing === 0 ? '0°' : `${bearing > 0 ? '+' : ''}${bearing}°`;
      canvas.drawText(
        label,
        new Vector2(x - 10, gunY + 15),
        '#00ff00',
        '10px Consolas'
      );
    }
  }

  // Draw radar center line (vertical line at center bearing)
  canvas.drawLine(
    new Vector2(centerX, 20),
    new Vector2(centerX, gunY),
    '#ffff00',
    2
  );

  // Draw distance cursor (horizontal line - will be controllable later)
  const cursorY = gunY - maxRange / 2; // Default at mid-range
  canvas.drawLine(
    new Vector2(20, cursorY),
    new Vector2(width - 20, cursorY),
    '#ffff00'
  );

  // Draw gun position
  canvas.drawCircle(new Vector2(centerX, gunY), 3, '#ffffff', true);

  // Gun label
  canvas.drawText(
    'GUN',
    new Vector2(centerX - 15, gunY + 15),
    '#00ff00',
    '12px Consolas'
  );

  // Add axis labels
  canvas.drawText(
    '方位 (Bearing)',
    new Vector2(width - 80, 15),
    '#00ff00',
    '11px Consolas'
  );

  // Vertical text for distance axis
  canvas.save();
  canvas.translate(new Vector2(10, height / 2));
  canvas.rotate(-Math.PI / 2);
  canvas.drawText(
    '距離 (Distance)',
    new Vector2(-30, 0),
    '#00ff00',
    '11px Consolas'
  );
  canvas.restore();

  // UI-14: Display current radar bearing and elevation angles
  const radarAzimuth = 0; // TODO: Make this dynamic when radar control is implemented
  const radarElevation = 0; // TODO: Make this dynamic when radar control is implemented
  canvas.drawText(
    `Radar Az: ${radarAzimuth.toFixed(1)}°`,
    new Vector2(10, 35),
    '#ffff00',
    '12px Consolas'
  );
  canvas.drawText(
    `Radar El: ${radarElevation.toFixed(1)}°`,
    new Vector2(10, 50),
    '#ffff00',
    '12px Consolas'
  );
}

/**
 * Draw vertical radar display (side view)
 */
function drawVerticalRadar(): void {
  const canvas = verticalRadarManager;
  const width = canvas.width;
  const height = canvas.height;

  // Clear canvas
  canvas.clear('#001100');

  const groundLevel = height - 20;
  const gunX = 20;

  // Draw ground line
  canvas.drawLine(
    new Vector2(0, groundLevel),
    new Vector2(width, groundLevel),
    '#00ff00'
  );

  // Draw range grid (horizontal lines for altitude)
  for (let i = 1; i <= 4; i++) {
    const y = groundLevel - (groundLevel / 5) * i;
    canvas.drawLine(new Vector2(gunX, y), new Vector2(width, y), '#00ff00');

    // Altitude labels
    canvas.drawText(
      `${i}km`,
      new Vector2(2, y - 2),
      '#00ff00',
      '10px Consolas'
    );
  }

  // Draw range grid (vertical lines for distance)
  for (let i = 1; i <= 4; i++) {
    const x = gunX + ((width - gunX) / 4) * i;
    canvas.drawLine(new Vector2(x, 0), new Vector2(x, groundLevel), '#00ff00');

    // Range labels
    canvas.drawText(
      `${i * 5}km`,
      new Vector2(x - 15, groundLevel + 15),
      '#00ff00',
      '10px Consolas'
    );
  }

  // Draw gun position
  canvas.drawCircle(new Vector2(gunX, groundLevel), 3, '#ffffff', true);

  // Gun label
  canvas.drawText(
    'GUN',
    new Vector2(gunX - 10, groundLevel - 10),
    '#00ff00',
    '12px Consolas'
  );
}

/**
 * Update control value displays
 */
function updateControlDisplays(): void {
  azimuthValue.textContent = `${azimuthSlider.value}°`;
  elevationValue.textContent = `${elevationSlider.value}°`;
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
  // Slider controls
  azimuthSlider.addEventListener('input', updateControlDisplays);
  elevationSlider.addEventListener('input', updateControlDisplays);

  // Fire button
  fireButton.addEventListener('click', () => {
    console.log(
      `Fire! Az: ${azimuthSlider.value}°, El: ${elevationSlider.value}°`
    );
    // TODO: Implement firing logic
  });

  // Window resize handler
  window.addEventListener('resize', () => {
    resizeCanvases();
  });
}

/**
 * Main initialization
 */
function main(): void {
  console.log('Browser Artillery - Initializing...');

  try {
    initializeCanvases();
    updateControlDisplays();
    initializeGameTime();
    setupEventListeners();

    console.log('Browser Artillery - Ready!');
  } catch (error) {
    console.error('Failed to initialize:', error);
  }
}

// Start the application
main();
