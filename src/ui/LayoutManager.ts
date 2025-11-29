/**
 * LayoutManager - Manages 3-pane layout and responsive behavior
 * Implements UI-04 requirement for game screen layout
 */

export interface PaneSize {
  left: number; // Control panel width percentage
  center: number; // Horizontal radar width percentage
  right: number; // Vertical radar & info width percentage
}

export interface LayoutDimensions {
  controlPanel: { width: number; height: number };
  horizontalRadar: { width: number; height: number };
  verticalRadar: { width: number; height: number };
  targetInfo: { width: number; height: number };
}

/**
 * Manages the 3-pane layout as specified in UI-04
 * Left: Control Panel, Center: Horizontal Radar, Right: Vertical Radar & Target Info
 */
export class LayoutManager {
  private _container: HTMLElement;
  private _currentPaneSize: PaneSize = { left: 25, center: 50, right: 25 };

  constructor(containerId: string = 'game-container') {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Layout container '${containerId}' not found`);
    }
    this._container = container;
    this.initializeLayout();
  }

  /**
   * Initialize the 3-pane layout (UI-04)
   */
  private initializeLayout(): void {
    // Apply CSS Grid layout
    this._container.style.display = 'grid';
    this._container.style.gridTemplateColumns = `${this._currentPaneSize.left}% ${this._currentPaneSize.center}% ${this._currentPaneSize.right}%`;
    this._container.style.height = '100vh';
    this._container.style.gap = '2px';

    // Add resize listener for responsive behavior
    this._lastWidth = window.innerWidth;
    window.addEventListener('resize', () => this.handleResize());
  }

  /**
   * Get current layout dimensions for canvas sizing
   */
  getDimensions(): LayoutDimensions {
    const containerRect = this._container.getBoundingClientRect();
    const gap = 2; // CSS gap between panes

    const leftWidth =
      (containerRect.width * this._currentPaneSize.left) / 100 - gap;
    const centerWidth =
      (containerRect.width * this._currentPaneSize.center) / 100 - gap;
    const rightWidth =
      (containerRect.width * this._currentPaneSize.right) / 100 - gap;

    return {
      controlPanel: {
        width: leftWidth,
        height: containerRect.height,
      },
      horizontalRadar: {
        width: centerWidth,
        height: containerRect.height,
      },
      verticalRadar: {
        width: rightWidth,
        height: containerRect.height * 0.6, // 60% of right pane
      },
      targetInfo: {
        width: rightWidth,
        height: containerRect.height * 0.4, // 40% of right pane
      },
    };
  }

  private _isResizing = false;
  private _lastWidth = 0;

  /**
   * Adjust pane sizes (for responsive behavior)
   */
  setPaneSizes(sizes: PaneSize): void {
    // Validate sizes sum to 100%
    const total = sizes.left + sizes.center + sizes.right;
    if (Math.abs(total - 100) > 0.1) {
      throw new Error(`Pane sizes must sum to 100%, got ${total}`);
    }

    this._currentPaneSize = { ...sizes };
    this._container.style.gridTemplateColumns = `${sizes.left}% ${sizes.center}% ${sizes.right}%`;

    // Dispatch resize event for canvas components
    // Only dispatch if not already handling a resize to avoid infinite loops
    if (!this._isResizing) {
      window.dispatchEvent(new Event('resize'));
    }
  }

  /**
   * Handle window resize for responsive layout
   */
  private handleResize(): void {
    if (this._isResizing) return;

    const width = window.innerWidth;
    if (width === this._lastWidth) return;

    this._isResizing = true;
    this._lastWidth = width;

    try {
      // Responsive breakpoints
      if (width < 800) {
        // Mobile/small screen: Stack vertically or hide some panels
        this.setPaneSizes({ left: 100, center: 0, right: 0 });
      } else if (width < 1200) {
        // Tablet: Adjust proportions
        this.setPaneSizes({ left: 30, center: 45, right: 25 });
      } else {
        // Desktop: Standard layout
        this.setPaneSizes({ left: 25, center: 50, right: 25 });
      }
    } finally {
      this._isResizing = false;
    }
  }

  /**
   * Get canvas elements for initialization
   */
  getCanvasElements(): {
    horizontalRadar: HTMLCanvasElement | null;
    verticalRadar: HTMLCanvasElement | null;
  } {
    return {
      horizontalRadar: document.getElementById(
        'horizontal-radar'
      ) as HTMLCanvasElement,
      verticalRadar: document.getElementById(
        'vertical-radar'
      ) as HTMLCanvasElement,
    };
  }

  /**
   * Get control elements for event binding
   */
  getControlElements(): {
    azimuthSlider: HTMLInputElement | null;
    elevationSlider: HTMLInputElement | null;
    fireButton: HTMLButtonElement | null;
    unlockButton: HTMLButtonElement | null;
    azimuthValue: HTMLElement | null;
    elevationValue: HTMLElement | null;
    leadAzimuth: HTMLElement | null;
    leadElevation: HTMLElement | null;
    gameTime: HTMLElement | null;
  } {
    return {
      azimuthSlider: document.getElementById(
        'azimuth-slider'
      ) as HTMLInputElement,
      elevationSlider: document.getElementById(
        'elevation-slider'
      ) as HTMLInputElement,
      fireButton: document.getElementById('fire-button') as HTMLButtonElement,
      unlockButton: document.getElementById(
        'unlock-button'
      ) as HTMLButtonElement,
      azimuthValue: document.getElementById('azimuth-value'),
      elevationValue: document.getElementById('elevation-value'),
      leadAzimuth: document.getElementById('lead-azimuth'),
      leadElevation: document.getElementById('lead-elevation'),
      gameTime: document.getElementById('game-time'),
    };
  }

  /**
   * Get target info display elements
   */
  getTargetInfoElements(): {
    status: HTMLElement | null;
    type: HTMLElement | null;
    range: HTMLElement | null;
    speed: HTMLElement | null;
    altitude: HTMLElement | null;
  } {
    return {
      status: document.getElementById('target-status'),
      type: document.getElementById('target-type'),
      range: document.getElementById('target-range'),
      speed: document.getElementById('target-speed'),
      altitude: document.getElementById('target-altitude'),
    };
  }

  /**
   * Update target info display (UI-18)
   */
  updateTargetInfo(info: {
    status: 'NO_TARGET' | 'TRACKING' | 'LOCKED_ON';
    type?: string;
    range?: number;
    speed?: number;
    altitude?: number;
  }): void {
    const elements = this.getTargetInfoElements();

    // Update status with appropriate styling
    if (elements.status) {
      elements.status.textContent = info.status.replace('_', ' ');
      elements.status.className = `info-value status-${info.status.toLowerCase().replace('_', '-')}`;
    }

    // Update target data
    if (elements.type) {
      elements.type.textContent = info.type || '---';
    }
    if (elements.range) {
      elements.range.textContent = info.range
        ? `${Math.round(info.range)} m`
        : '--- m';
    }
    if (elements.speed) {
      elements.speed.textContent = info.speed
        ? `${Math.round(info.speed)} m/s`
        : '--- m/s';
    }
    if (elements.altitude) {
      elements.altitude.textContent = info.altitude
        ? `${Math.round(info.altitude)} m`
        : '--- m';
    }
  }

  /**
   * Update lead angle display (UI-06)
   */
  updateLeadAngle(
    leadAngle: { azimuth: number; elevation: number } | null
  ): void {
    const elements = this.getControlElements();

    if (leadAngle) {
      if (elements.leadAzimuth) {
        elements.leadAzimuth.textContent = Math.round(
          leadAngle.azimuth
        ).toString();
      }
      if (elements.leadElevation) {
        elements.leadElevation.textContent = Math.round(
          leadAngle.elevation
        ).toString();
      }
    } else {
      if (elements.leadAzimuth) elements.leadAzimuth.textContent = '---';
      if (elements.leadElevation) elements.leadElevation.textContent = '---';
    }
  }

  /**
   * Update game time display (UI-09)
   */
  updateGameTime(seconds: number): void {
    const elements = this.getControlElements();
    if (elements.gameTime) {
      const minutes = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      elements.gameTime.textContent = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  }
}
