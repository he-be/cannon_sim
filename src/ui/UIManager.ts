/**
 * Canvas-based UI Manager
 * Coordinates layout and rendering of UI components
 * Implements TR-02: Canvas 2D API compliance
 */

import { CanvasManager } from '../rendering/CanvasManager';
import { Vector2 } from '../math/Vector2';
import { Vector3 } from '../math/Vector3';
import {
  ControlPanelRenderer,
  ControlPanelEvents,
  ControlPanelState,
} from './components/ControlPanelRenderer';
import {
  RadarRenderer,
  RadarEvents,
  RadarTarget,
  RadarState,
} from './components/RadarRenderer';
import { CRT_COLORS } from '../data/Constants';

export interface UIEvents extends ControlPanelEvents, RadarEvents {}

export interface UILayoutConfig {
  controlPanelWidth: number;
  verticalRadarWidth: number;
}

export class UIManager {
  private canvasManager: CanvasManager;
  private events: UIEvents;

  // UI Components
  private controlPanel!: ControlPanelRenderer;
  private radarRenderer!: RadarRenderer;

  // Layout configuration
  private layout: UILayoutConfig;
  private bounds!: {
    controlPanel: { x: number; y: number; width: number; height: number };
    horizontalRadar: { x: number; y: number; width: number; height: number };
    verticalRadar: { x: number; y: number; width: number; height: number };
  };

  constructor(
    canvasManager: CanvasManager,
    events: UIEvents,
    layoutConfig: UILayoutConfig = {
      controlPanelWidth: 300,
      verticalRadarWidth: 250,
    }
  ) {
    this.canvasManager = canvasManager;
    this.events = events;
    this.layout = layoutConfig;

    this.calculateBounds();
    this.initializeComponents();
  }

  private calculateBounds(): void {
    const canvasWidth = this.canvasManager.width;
    const canvasHeight = this.canvasManager.height;

    // Calculate layout bounds based on 3-pane design (UI-04)
    this.bounds = {
      controlPanel: {
        x: 0,
        y: 0,
        width: this.layout.controlPanelWidth,
        height: canvasHeight,
      },
      horizontalRadar: {
        x: this.layout.controlPanelWidth,
        y: 0,
        width:
          canvasWidth -
          this.layout.controlPanelWidth -
          this.layout.verticalRadarWidth,
        height: canvasHeight,
      },
      verticalRadar: {
        x: canvasWidth - this.layout.verticalRadarWidth,
        y: 0,
        width: this.layout.verticalRadarWidth,
        height: Math.floor(canvasHeight * 0.65), // 65% of height for radar, rest for target info
      },
    };
  }

  private initializeComponents(): void {
    // Initialize control panel
    this.controlPanel = new ControlPanelRenderer(
      this.canvasManager,
      {
        onAzimuthChange: this.events.onAzimuthChange,
        onElevationChange: this.events.onElevationChange,
        onFireClick: this.events.onFireClick,
        onLockToggle: this.events.onLockToggle,
        onMenuClick: this.events.onMenuClick,
      },
      this.layout.controlPanelWidth
    );

    // Initialize radar renderer
    this.radarRenderer = new RadarRenderer(
      this.canvasManager,
      {
        onDirectionChange: this.events.onDirectionChange,
        onRangeChange: this.events.onRangeChange,
        onTargetDetected: this.events.onTargetDetected,
        onTargetLost: this.events.onTargetLost,
      },
      this.bounds.horizontalRadar,
      this.bounds.verticalRadar
    );
  }

  /**
   * Render all UI components
   */
  render(): void {
    this.clearCanvas();
    this.renderLayout();
    this.renderControlPanel();
    this.renderRadars();
    this.renderTargetInfoPanel();
    this.renderScanLines();
  }

  private clearCanvas(): void {
    const ctx = this.canvasManager.context;
    ctx.fillStyle = CRT_COLORS.BACKGROUND;
    ctx.fillRect(0, 0, this.canvasManager.width, this.canvasManager.height);
  }

  private renderLayout(): void {
    const ctx = this.canvasManager.context;

    ctx.save();
    ctx.strokeStyle = CRT_COLORS.GRID_LINE;
    ctx.lineWidth = 2;

    // Vertical divider between control panel and center radar
    ctx.beginPath();
    ctx.moveTo(this.bounds.controlPanel.width, 0);
    ctx.lineTo(this.bounds.controlPanel.width, this.canvasManager.height);
    ctx.stroke();

    // Vertical divider between center radar and vertical radar
    ctx.beginPath();
    ctx.moveTo(this.bounds.verticalRadar.x, 0);
    ctx.lineTo(this.bounds.verticalRadar.x, this.canvasManager.height);
    ctx.stroke();

    // Horizontal divider in right pane (between radar and target info)
    const verticalRadarBottom =
      this.bounds.verticalRadar.y + this.bounds.verticalRadar.height;
    ctx.beginPath();
    ctx.moveTo(this.bounds.verticalRadar.x, verticalRadarBottom);
    ctx.lineTo(
      this.bounds.verticalRadar.x + this.bounds.verticalRadar.width,
      verticalRadarBottom
    );
    ctx.stroke();

    ctx.restore();
  }

  private renderControlPanel(): void {
    const ctx = this.canvasManager.context;

    ctx.save();

    // Clip to control panel bounds
    ctx.beginPath();
    ctx.rect(
      this.bounds.controlPanel.x,
      this.bounds.controlPanel.y,
      this.bounds.controlPanel.width,
      this.bounds.controlPanel.height
    );
    ctx.clip();

    // Translate context for control panel rendering
    ctx.translate(this.bounds.controlPanel.x, this.bounds.controlPanel.y);

    this.controlPanel.render();

    ctx.restore();
  }

  private renderRadars(): void {
    this.radarRenderer.render();
  }

  private renderTargetInfoPanel(): void {
    const ctx = this.canvasManager.context;
    const bounds = {
      x: this.bounds.verticalRadar.x,
      y: this.bounds.verticalRadar.y + this.bounds.verticalRadar.height,
      width: this.bounds.verticalRadar.width,
      height:
        this.canvasManager.height -
        (this.bounds.verticalRadar.y + this.bounds.verticalRadar.height),
    };

    ctx.save();

    // Panel background
    ctx.fillStyle = 'rgba(0, 50, 0, 0.3)';
    ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);

    // Panel border
    ctx.strokeStyle = CRT_COLORS.GRID_LINE;
    ctx.lineWidth = 1;
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

    // This will be populated by the control panel's target info
    // The target info display is handled by the ControlPanelRenderer

    ctx.restore();
  }

  private renderScanLines(): void {
    const ctx = this.canvasManager.context;

    ctx.save();
    ctx.fillStyle = CRT_COLORS.SCAN_LINE;

    // Static horizontal scan lines
    for (let y = 0; y < this.canvasManager.height; y += 3) {
      ctx.fillRect(0, y, this.canvasManager.width, 1);
    }

    ctx.restore();
  }

  /**
   * Handle mouse events and route to appropriate components
   */
  handleMouseEvent(
    mousePos: Vector2,
    eventType:
      | 'mousedown'
      | 'mousemove'
      | 'mouseup'
      | 'click'
      | 'dragstart'
      | 'dragend',
    button: number = 0
  ): boolean {
    // Only handle basic mouse events, ignore drag events for now
    if (eventType === 'dragstart' || eventType === 'dragend') {
      return false;
    }

    // Check control panel first
    if (this.isPointInControlPanel(mousePos)) {
      const localPos = new Vector2(
        mousePos.x - this.bounds.controlPanel.x,
        mousePos.y - this.bounds.controlPanel.y
      );
      return this.controlPanel.handleMouseEvent(localPos, eventType);
    }

    // Then check radar areas
    if (
      this.isPointInHorizontalRadar(mousePos) ||
      this.isPointInVerticalRadar(mousePos)
    ) {
      return this.radarRenderer.handleMouseEvent(mousePos, eventType, button);
    }

    return false;
  }

  private isPointInControlPanel(point: Vector2): boolean {
    const bounds = this.bounds.controlPanel;
    return (
      point.x >= bounds.x &&
      point.x <= bounds.x + bounds.width &&
      point.y >= bounds.y &&
      point.y <= bounds.y + bounds.height
    );
  }

  private isPointInHorizontalRadar(point: Vector2): boolean {
    const bounds = this.bounds.horizontalRadar;
    return (
      point.x >= bounds.x &&
      point.x <= bounds.x + bounds.width &&
      point.y >= bounds.y &&
      point.y <= bounds.y + bounds.height
    );
  }

  private isPointInVerticalRadar(point: Vector2): boolean {
    const bounds = this.bounds.verticalRadar;
    return (
      point.x >= bounds.x &&
      point.x <= bounds.x + bounds.width &&
      point.y >= bounds.y &&
      point.y <= bounds.y + bounds.height
    );
  }

  /**
   * Update control panel state
   */
  updateControlPanel(state: Partial<ControlPanelState>): void {
    this.controlPanel.updateState(state);
  }

  /**
   * Update radar state
   */
  updateRadar(state: Partial<RadarState>): void {
    this.radarRenderer.updateState(state);
  }

  /**
   * Set artillery angles
   */
  setArtilleryAngles(azimuth: number, elevation: number): void {
    this.controlPanel.setAngles(azimuth, elevation);
  }

  /**
   * Set radar direction
   */
  setRadarDirection(azimuth: number, elevation: number): void {
    this.radarRenderer.setDirection(azimuth, elevation);
  }

  /**
   * Set radar range
   */
  setRadarRange(range: number): void {
    this.radarRenderer.setRange(range);
  }

  /**
   * Update lead angle display
   */
  setLeadAngle(leadAngle: ControlPanelState['leadAngle']): void {
    this.controlPanel.setLeadAngle(leadAngle);
  }

  /**
   * Update target information
   */
  setTargetInfo(targetInfo: ControlPanelState['targetInfo']): void {
    this.controlPanel.setTargetInfo(targetInfo);
  }

  /**
   * Update game time
   */
  setGameTime(seconds: number): void {
    this.controlPanel.setGameTime(seconds);
  }

  /**
   * Set lock state
   */
  setLockState(isLocked: boolean): void {
    this.controlPanel.setLockState(isLocked);
  }

  /**
   * Add detected target to radar
   */
  addRadarTarget(target: RadarTarget): void {
    this.radarRenderer.addTarget(target);
  }

  /**
   * Remove target from radar
   */
  removeRadarTarget(targetId: string): void {
    this.radarRenderer.removeTarget(targetId);
  }

  /**
   * Update target on radar
   */
  updateRadarTarget(target: RadarTarget): void {
    this.radarRenderer.updateTarget(target);
  }

  /**
   * Update projectiles for radar display
   */
  updateProjectiles(
    projectiles: Array<{
      id: string;
      position: Vector3;
      velocity: Vector3;
      isActive: boolean;
    }>
  ): void {
    this.radarRenderer.updateProjectiles(projectiles);
  }

  /**
   * Update trajectory prediction
   */
  updateTrajectoryPrediction(trajectory: Vector3[]): void {
    this.radarRenderer.updateTrajectoryPrediction(trajectory);
  }

  /**
   * Get current control panel state
   */
  getControlPanelState(): ControlPanelState {
    return this.controlPanel.getState();
  }

  /**
   * Get current radar state
   */
  getRadarState(): RadarState {
    return this.radarRenderer.getState();
  }

  /**
   * Get detected radar targets
   */
  getRadarTargets(): RadarTarget[] {
    return this.radarRenderer.getTargets();
  }

  /**
   * Resize handler for responsive layout
   */
  onResize(): void {
    this.calculateBounds();
    // Reinitialize components with new bounds
    this.initializeComponents();
  }

  /**
   * Get layout bounds for external access
   */
  getBounds(): typeof this.bounds {
    return { ...this.bounds };
  }
}
