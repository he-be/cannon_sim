/**
 * Browser Artillery - Main Entry Point
 * A real-time artillery simulation game with realistic physics
 */

// Canvas elements
const horizontalRadar = document.getElementById(
  'horizontal-radar'
) as HTMLCanvasElement;
const verticalRadar = document.getElementById(
  'vertical-radar'
) as HTMLCanvasElement;

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
 * Initialize canvas contexts and setup basic drawing
 */
function initializeCanvases(): void {
  // Setup horizontal radar canvas
  const hCtx = horizontalRadar.getContext('2d');
  if (!hCtx) throw new Error('Could not get horizontal radar context');

  // Setup vertical radar canvas
  const vCtx = verticalRadar.getContext('2d');
  if (!vCtx) throw new Error('Could not get vertical radar context');

  // Resize canvases to fit their containers
  resizeCanvases();

  // Initial drawing
  drawHorizontalRadar(hCtx);
  drawVerticalRadar(vCtx);
}

/**
 * Resize canvases to match their container size
 */
function resizeCanvases(): void {
  // Horizontal radar
  const hParent = horizontalRadar.parentElement!;
  horizontalRadar.width = hParent.clientWidth - 4; // Account for border
  horizontalRadar.height = hParent.clientHeight - 4;

  // Vertical radar
  const vParent = verticalRadar.parentElement!;
  verticalRadar.width = vParent.clientWidth - 4;
  verticalRadar.height = vParent.clientHeight - 4;
}

/**
 * Draw horizontal radar display (rectangular: horizontal=bearing, vertical=distance)
 */
function drawHorizontalRadar(ctx: CanvasRenderingContext2D): void {
  const { width, height } = ctx.canvas;

  // Clear and set background
  ctx.fillStyle = '#001100';
  ctx.fillRect(0, 0, width, height);

  // Draw radar grid
  ctx.strokeStyle = '#00ff00';
  ctx.lineWidth = 1;

  const centerX = width / 2;
  const gunY = height - 20; // Gun position at bottom center
  const maxRange = height - 40; // Maximum distance range

  // Draw distance lines (horizontal - representing distance ranges)
  for (let i = 1; i <= 4; i++) {
    const y = gunY - (maxRange / 4) * i;
    ctx.beginPath();
    ctx.moveTo(20, y);
    ctx.lineTo(width - 20, y);
    ctx.stroke();

    // Distance labels
    ctx.fillStyle = '#00ff00';
    ctx.font = '10px Consolas';
    ctx.fillText(`${i * 5}km`, 2, y - 2);
  }

  // Draw bearing lines (vertical - representing bearing angles)
  // Show -180° to +180° range (or 0° to 360°), centered at 0°/360°
  const bearingRange = 120; // Show ±60° range for visibility
  const degreesPerPixel = bearingRange / (width - 40);

  for (let bearing = -60; bearing <= 60; bearing += 30) {
    const x = centerX + bearing / degreesPerPixel;
    if (x >= 20 && x <= width - 20) {
      ctx.beginPath();
      ctx.moveTo(x, 20);
      ctx.lineTo(x, gunY);
      ctx.stroke();

      // Bearing labels
      ctx.fillStyle = '#00ff00';
      ctx.font = '10px Consolas';
      const label =
        bearing === 0 ? '0°' : `${bearing > 0 ? '+' : ''}${bearing}°`;
      ctx.fillText(label, x - 10, gunY + 15);
    }
  }

  // Draw radar center line (vertical line at center bearing)
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ffff00';
  ctx.beginPath();
  ctx.moveTo(centerX, 20);
  ctx.lineTo(centerX, gunY);
  ctx.stroke();

  // Draw distance cursor (horizontal line - will be controllable later)
  const cursorY = gunY - maxRange / 2; // Default at mid-range
  ctx.strokeStyle = '#ffff00';
  ctx.beginPath();
  ctx.moveTo(20, cursorY);
  ctx.lineTo(width - 20, cursorY);
  ctx.stroke();

  // Draw gun position
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(centerX, gunY, 3, 0, Math.PI * 2);
  ctx.fill();

  // Gun label
  ctx.fillStyle = '#00ff00';
  ctx.font = '12px Consolas';
  ctx.fillText('GUN', centerX - 15, gunY + 15);

  // Add axis labels
  ctx.fillStyle = '#00ff00';
  ctx.font = '11px Consolas';
  ctx.fillText('方位 (Bearing)', width - 80, 15);
  ctx.save();
  ctx.translate(10, height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('距離 (Distance)', -30, 0);
  ctx.restore();

  // UI-14: Display current radar bearing and elevation angles
  ctx.fillStyle = '#ffff00';
  ctx.font = '12px Consolas';
  const radarAzimuth = 0; // TODO: Make this dynamic when radar control is implemented
  const radarElevation = 0; // TODO: Make this dynamic when radar control is implemented
  ctx.fillText(`Radar Az: ${radarAzimuth.toFixed(1)}°`, 10, 35);
  ctx.fillText(`Radar El: ${radarElevation.toFixed(1)}°`, 10, 50);
}

/**
 * Draw vertical radar display (side view)
 */
function drawVerticalRadar(ctx: CanvasRenderingContext2D): void {
  const { width, height } = ctx.canvas;

  // Clear and set background
  ctx.fillStyle = '#001100';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#00ff00';
  ctx.lineWidth = 1;

  const groundLevel = height - 20;
  const gunX = 20;

  // Draw ground line
  ctx.beginPath();
  ctx.moveTo(0, groundLevel);
  ctx.lineTo(width, groundLevel);
  ctx.stroke();

  // Draw range grid (horizontal lines for altitude)
  for (let i = 1; i <= 4; i++) {
    const y = groundLevel - (groundLevel / 5) * i;
    ctx.beginPath();
    ctx.moveTo(gunX, y);
    ctx.lineTo(width, y);
    ctx.stroke();

    // Altitude labels
    ctx.fillStyle = '#00ff00';
    ctx.font = '10px Consolas';
    ctx.fillText(`${i}km`, 2, y - 2);
  }

  // Draw range grid (vertical lines for distance)
  for (let i = 1; i <= 4; i++) {
    const x = gunX + ((width - gunX) / 4) * i;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, groundLevel);
    ctx.stroke();

    // Range labels
    ctx.fillStyle = '#00ff00';
    ctx.font = '10px Consolas';
    ctx.fillText(`${i * 5}km`, x - 15, groundLevel + 15);
  }

  // Draw gun position
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(gunX, groundLevel, 3, 0, Math.PI * 2);
  ctx.fill();

  // Gun label
  ctx.fillStyle = '#00ff00';
  ctx.font = '12px Consolas';
  ctx.fillText('GUN', gunX - 10, groundLevel - 10);
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
    gameTimeElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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
    const hCtx = horizontalRadar.getContext('2d')!;
    const vCtx = verticalRadar.getContext('2d')!;
    drawHorizontalRadar(hCtx);
    drawVerticalRadar(vCtx);
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
