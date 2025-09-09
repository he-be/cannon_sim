/**
 * ControlPanelManager - Manages control panel UI interactions for T019
 * Handles azimuth/elevation sliders, buttons, and real-time updates
 */

export interface ControlPanelState {
  azimuth: number; // degrees (0-360)
  elevation: number; // degrees (0-90)
  isLocked: boolean; // target lock state
  leadAngle: { azimuth: number; elevation: number } | null;
  gameTime: number; // seconds
}

export interface ControlPanelEvents {
  onAzimuthChange: (value: number) => void;
  onElevationChange: (value: number) => void;
  onFireClick: () => void;
  onUnlockClick: () => void;
}

/**
 * Manages control panel UI elements and their interactions
 */
export class ControlPanelManager {
  private _state: ControlPanelState;
  private _events: ControlPanelEvents;

  // UI Elements
  private _azimuthSlider!: HTMLInputElement;
  private _elevationSlider!: HTMLInputElement;
  private _fireButton!: HTMLButtonElement;
  private _unlockButton!: HTMLButtonElement;

  // Display Elements
  private _azimuthValue!: HTMLElement;
  private _elevationValue!: HTMLElement;
  private _leadAzimuth!: HTMLElement;
  private _leadElevation!: HTMLElement;
  private _gameTime!: HTMLElement;

  constructor(events: ControlPanelEvents) {
    this._events = events;
    this._state = this.createInitialState();
    this.initializeElements();
    this.setupEventListeners();
    this.updateDisplay();
  }

  /**
   * Create initial control panel state
   */
  private createInitialState(): ControlPanelState {
    return {
      azimuth: 180, // Default pointing south
      elevation: 45, // Default 45 degree elevation
      isLocked: false,
      leadAngle: null,
      gameTime: 0,
    };
  }

  /**
   * Initialize DOM elements
   */
  private initializeElements(): void {
    // Input elements
    this._azimuthSlider = this.getElement('azimuth-slider') as HTMLInputElement;
    this._elevationSlider = this.getElement(
      'elevation-slider'
    ) as HTMLInputElement;
    this._fireButton = this.getElement('fire-button') as HTMLButtonElement;
    this._unlockButton = this.getElement('unlock-button') as HTMLButtonElement;

    // Display elements
    this._azimuthValue = this.getElement('azimuth-value');
    this._elevationValue = this.getElement('elevation-value');
    this._leadAzimuth = this.getElement('lead-azimuth');
    this._leadElevation = this.getElement('lead-elevation');
    this._gameTime = this.getElement('game-time');

    // Set initial slider values
    this._azimuthSlider.value = this._state.azimuth.toString();
    this._elevationSlider.value = this._state.elevation.toString();
  }

  /**
   * Get DOM element by ID with error handling
   */
  private getElement(id: string): HTMLElement {
    const element = document.getElementById(id);
    if (!element) {
      throw new Error(`Control panel element '${id}' not found`);
    }
    return element;
  }

  /**
   * Setup event listeners for UI interactions
   */
  private setupEventListeners(): void {
    // Azimuth slider
    this._azimuthSlider.addEventListener('input', event => {
      const value = parseInt((event.target as HTMLInputElement).value);
      this.setAzimuth(value);
      this._events.onAzimuthChange(value);
    });

    // Elevation slider
    this._elevationSlider.addEventListener('input', event => {
      const value = parseInt((event.target as HTMLInputElement).value);
      this.setElevation(value);
      this._events.onElevationChange(value);
    });

    // Fire button
    this._fireButton.addEventListener('click', () => {
      this._events.onFireClick();
    });

    // Unlock button
    this._unlockButton.addEventListener('click', () => {
      this.setLockState(false);
      this._events.onUnlockClick();
    });
  }

  /**
   * Set azimuth value and update display
   */
  setAzimuth(value: number): void {
    // Clamp value to valid range
    value = Math.max(0, Math.min(360, value));

    this._state.azimuth = value;
    this._azimuthSlider.value = value.toString();
    this.updateAzimuthDisplay();
  }

  /**
   * Set elevation value and update display
   */
  setElevation(value: number): void {
    // Clamp value to valid range
    value = Math.max(0, Math.min(90, value));

    this._state.elevation = value;
    this._elevationSlider.value = value.toString();
    this.updateElevationDisplay();
  }

  /**
   * Set target lock state
   */
  setLockState(isLocked: boolean): void {
    this._state.isLocked = isLocked;
    this.updateLockDisplay();
  }

  /**
   * Update lead angle display
   */
  setLeadAngle(leadAngle: { azimuth: number; elevation: number } | null): void {
    this._state.leadAngle = leadAngle;
    this.updateLeadAngleDisplay();
  }

  /**
   * Update game time display
   */
  setGameTime(seconds: number): void {
    this._state.gameTime = seconds;
    this.updateGameTimeDisplay();
  }

  /**
   * Get current control panel state
   */
  getState(): ControlPanelState {
    return { ...this._state };
  }

  /**
   * Update all display elements
   */
  private updateDisplay(): void {
    this.updateAzimuthDisplay();
    this.updateElevationDisplay();
    this.updateLockDisplay();
    this.updateLeadAngleDisplay();
    this.updateGameTimeDisplay();
  }

  /**
   * Update azimuth value display
   */
  private updateAzimuthDisplay(): void {
    this._azimuthValue.textContent = `${this._state.azimuth}°`;
  }

  /**
   * Update elevation value display
   */
  private updateElevationDisplay(): void {
    this._elevationValue.textContent = `${this._state.elevation}°`;
  }

  /**
   * Update lock state display
   */
  private updateLockDisplay(): void {
    if (this._state.isLocked) {
      this._unlockButton.style.backgroundColor = '#ff6600';
      this._unlockButton.textContent = 'ロックオン中';
    } else {
      this._unlockButton.style.backgroundColor = '#666';
      this._unlockButton.textContent = 'ロックオン解除';
    }
  }

  /**
   * Update lead angle display
   */
  private updateLeadAngleDisplay(): void {
    if (this._state.leadAngle) {
      this._leadAzimuth.textContent = Math.round(
        this._state.leadAngle.azimuth
      ).toString();
      this._leadElevation.textContent = Math.round(
        this._state.leadAngle.elevation
      ).toString();
    } else {
      this._leadAzimuth.textContent = '---';
      this._leadElevation.textContent = '---';
    }
  }

  /**
   * Update game time display
   */
  private updateGameTimeDisplay(): void {
    const minutes = Math.floor(this._state.gameTime / 60);
    const seconds = Math.floor(this._state.gameTime % 60);
    this._gameTime.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Enable/disable fire button
   */
  setFireEnabled(enabled: boolean): void {
    this._fireButton.disabled = !enabled;
    this._fireButton.style.opacity = enabled ? '1' : '0.5';
    this._fireButton.style.cursor = enabled ? 'pointer' : 'not-allowed';
  }

  /**
   * Set artillery position to recommended lead angle
   */
  applyLeadAngle(): void {
    if (this._state.leadAngle) {
      this.setAzimuth(this._state.leadAngle.azimuth);
      this.setElevation(this._state.leadAngle.elevation);

      // Trigger events to notify game logic
      this._events.onAzimuthChange(this._state.leadAngle.azimuth);
      this._events.onElevationChange(this._state.leadAngle.elevation);
    }
  }

  /**
   * Animate slider to target value
   */
  animateToPosition(
    azimuth: number,
    elevation: number,
    duration: number = 1000
  ): void {
    const startAzimuth = this._state.azimuth;
    const startElevation = this._state.elevation;
    const startTime = Date.now();

    const animate = (): void => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out animation
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      const currentAzimuth =
        startAzimuth + (azimuth - startAzimuth) * easeProgress;
      const currentElevation =
        startElevation + (elevation - startElevation) * easeProgress;

      this.setAzimuth(Math.round(currentAzimuth));
      this.setElevation(Math.round(currentElevation));

      if (progress < 1) {
        globalThis.requestAnimationFrame(animate);
      } else {
        // Final values and trigger events
        this.setAzimuth(azimuth);
        this.setElevation(elevation);
        this._events.onAzimuthChange(azimuth);
        this._events.onElevationChange(elevation);
      }
    };

    globalThis.requestAnimationFrame(animate);
  }

  /**
   * Get azimuth in radians for calculations
   */
  getAzimuthRadians(): number {
    return (this._state.azimuth * Math.PI) / 180;
  }

  /**
   * Get elevation in radians for calculations
   */
  getElevationRadians(): number {
    return (this._state.elevation * Math.PI) / 180;
  }

  /**
   * Cleanup event listeners
   */
  destroy(): void {
    // Remove event listeners to prevent memory leaks
    this._azimuthSlider.removeEventListener('input', () => {});
    this._elevationSlider.removeEventListener('input', () => {});
    this._fireButton.removeEventListener('click', () => {});
    this._unlockButton.removeEventListener('click', () => {});
  }
}
