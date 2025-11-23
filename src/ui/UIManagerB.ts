/**
 * UIManagerB - UI Manager for Mode B (Circular Scope + A-Scope)
 * Manages layout and rendering of UI B components
 * Based on UIManager but uses different radar displays
 */

import { CanvasManager } from '../rendering/CanvasManager';
import { Vector2 } from '../math/Vector2';
import { Vector3 } from '../math/Vector3';
import { ControlPanelRenderer } from './components/ControlPanelRenderer';
import {
  CircularScopeRenderer,
  CircularScopeTarget,
  CircularScopeBounds,
} from './components/CircularScopeRenderer';
import {
  AScopeRenderer,
  AScopeTarget,
  AScopeBounds,
} from './components/AScopeRenderer';
import {
  TargetListRenderer,
  TargetListData,
} from './components/TargetListRenderer';
import { ControlPanelState } from './components/ControlPanelRenderer';
import { CRT_COLORS } from '../data/Constants';
import { UIEvents } from './UIManager';

export interface UIManagerBLayoutConfig {
  controlPanelWidth: number;
  scopeColumnWidth: number;
}

/**
 * UIManagerB implements UI Mode B layout:
 * - Left: Control Panel
 * - Right Top: Circular Scope (PPI)
 * - Right Bottom: A-Scope (distance)
 */
export class UIManagerB {
  private canvasManager: CanvasManager;
  private events: UIEvents;

  // UI Components
  private controlPanel!: ControlPanelRenderer;
  private circularScope!: CircularScopeRenderer;
  private aScope!: AScopeRenderer;
  private targetListRenderer!: TargetListRenderer;

  // Layout configuration
  private layout: UIManagerBLayoutConfig;
  private bounds!: {
    controlPanel: { x: number; y: number; width: number; height: number };
    circularScope: CircularScopeBounds;
    aScope: AScopeBounds;
    targetList: { x: number; y: number; width: number; height: number };
  };

  // Radar state for rendering
  private radarAzimuth: number = 0;
  private radarRange: number = 10000;
  private rangeGate: number = 5000;

  // Target data
  private circularTargets: CircularScopeTarget[] = [];
  private aScopeTargets: AScopeTarget[] = [];
  private trajectoryPath: Vector2[] = [];

  constructor(
    canvasManager: CanvasManager,
    events: UIEvents,
    layoutConfig: UIManagerBLayoutConfig = {
      controlPanelWidth: 300,
      scopeColumnWidth: 250,
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

    const rightColumnX = this.layout.controlPanelWidth;
    const rightColumnWidth =
      canvasWidth -
      this.layout.controlPanelWidth -
      this.layout.scopeColumnWidth;

    // Calculate layout bounds for UI B
    this.bounds = {
      controlPanel: {
        x: 0,
        y: 0,
        width: this.layout.controlPanelWidth,
        height: canvasHeight,
      },
      circularScope: {
        x: rightColumnX,
        y: 0,
        width: rightColumnWidth,
        height: Math.floor(canvasHeight * 0.6), // 60% for circular scope
        center: new Vector2(
          rightColumnX + rightColumnWidth / 2,
          Math.floor(canvasHeight * 0.3)
        ),
        radius: Math.min(rightColumnWidth, canvasHeight * 0.6) / 2 - 20,
      },
      aScope: {
        x: rightColumnX,
        y: Math.floor(canvasHeight * 0.6),
        width: rightColumnWidth,
        height: Math.floor(canvasHeight * 0.4), // 40% for A-scope
      },
      targetList: {
        x: canvasWidth - this.layout.scopeColumnWidth,
        y: 0,
        width: this.layout.scopeColumnWidth,
        height: canvasHeight,
      },
    };
  }

  private initializeComponents(): void {
    // Initialize control panel (same as UI A)
    this.controlPanel = new ControlPanelRenderer(
      this.canvasManager,
      {
        onAzimuthChange: this.events.onAzimuthChange,
        onElevationChange: this.events.onElevationChange,
        onFireClick: this.events.onFireClick,
        onLockToggle: this.events.onLockToggle,
        onAutoToggle: this.events.onAutoToggle,
        onMenuClick: this.events.onMenuClick,
      },
      this.layout.controlPanelWidth
    );

    // Initialize circular scope renderer
    this.circularScope = new CircularScopeRenderer(
      this.canvasManager,
      this.bounds.circularScope
    );

    // Initialize A-scope renderer
    this.aScope = new AScopeRenderer(this.canvasManager, this.bounds.aScope);

    // Initialize target list renderer
    this.targetListRenderer = new TargetListRenderer(
      this.canvasManager,
      this.bounds.targetList
    );
  }

  /**
   * Render all UI components
   */
  render(time: number = 0): void {
    this.clearCanvas();
    this.renderLayout();
    this.renderControlPanel();
    this.renderScopes();
    this.renderTargetList();
    this.renderScanLines(time);
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

    // Vertical divider between control panel and scopes
    ctx.beginPath();
    ctx.moveTo(this.bounds.controlPanel.width, 0);
    ctx.lineTo(this.bounds.controlPanel.width, this.canvasManager.height);
    ctx.stroke();

    // Vertical divider between scopes and target list
    ctx.beginPath();
    ctx.moveTo(this.bounds.targetList.x, 0);
    ctx.lineTo(this.bounds.targetList.x, this.canvasManager.height);
    ctx.stroke();

    // Horizontal divider between circular scope and A-scope
    ctx.beginPath();
    ctx.moveTo(this.bounds.circularScope.x, this.bounds.aScope.y);
    ctx.lineTo(
      this.bounds.circularScope.x + this.bounds.circularScope.width,
      this.bounds.aScope.y
    );
    ctx.stroke();

    ctx.restore();
  }

  private renderControlPanel(): void {
    const ctx = this.canvasManager.context;

    ctx.save();
    ctx.beginPath();
    ctx.rect(
      this.bounds.controlPanel.x,
      this.bounds.controlPanel.y,
      this.bounds.controlPanel.width,
      this.bounds.controlPanel.height
    );
    ctx.clip();

    this.controlPanel.render();

    ctx.restore();
  }

  private renderScopes(): void {
    const ctx = this.canvasManager.context;

    // Render Circular Scope
    ctx.save();
    ctx.beginPath();
    ctx.rect(
      this.bounds.circularScope.x,
      this.bounds.circularScope.y,
      this.bounds.circularScope.width,
      this.bounds.circularScope.height
    );
    ctx.clip();

    this.circularScope.render(
      this.circularTargets,
      this.radarAzimuth,
      this.radarRange,
      this.trajectoryPath
    );

    ctx.restore();

    // Render A-Scope
    ctx.save();
    ctx.beginPath();
    ctx.rect(
      this.bounds.aScope.x,
      this.bounds.aScope.y,
      this.bounds.aScope.width,
      this.bounds.aScope.height
    );
    ctx.clip();

    this.aScope.render(this.aScopeTargets, this.rangeGate, this.radarRange);

    ctx.restore();
  }

  private renderTargetList(): void {
    const ctx = this.canvasManager.context;

    ctx.save();
    ctx.beginPath();
    ctx.rect(
      this.bounds.targetList.x,
      this.bounds.targetList.y,
      this.bounds.targetList.width,
      this.bounds.targetList.height
    );
    ctx.clip();

    this.targetListRenderer.render();

    ctx.restore();
  }

  private renderScanLines(time: number): void {
    const ctx = this.canvasManager.context;

    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = CRT_COLORS.SCAN_LINE;

    // Static horizontal scan lines
    for (let y = 0; y < this.canvasManager.height; y += 2) {
      ctx.fillRect(0, y, this.canvasManager.width, 1);
    }

    // Moving scan line
    const scanY = (time * 50) % this.canvasManager.height;
    ctx.globalAlpha = 0.3;
    ctx.fillRect(0, scanY, this.canvasManager.width, 2);

    ctx.restore();
  }

  // ===== State Update Methods =====

  setRadarDirection(azimuth: number, _elevation: number): void {
    this.radarAzimuth = azimuth;
    // Elevation not stored separately in UI B - tracked via radar state
  }

  setRadarRange(range: number): void {
    this.radarRange = range;
  }

  setRangeGate(gate: number): void {
    this.rangeGate = gate;
  }

  setArtilleryAngles(azimuth: number, elevation: number): void {
    this.controlPanel.setAngles(azimuth, elevation);
  }

  setArtilleryState(canFire: boolean, reloadProgress: number): void {
    this.controlPanel.updateState({
      canFire,
      artilleryReloadProgress: reloadProgress,
    });
  }

  setRadarInfo(azimuth: number, elevation: number, range: number): void {
    this.controlPanel.setRadarInfo({
      azimuth,
      elevation,
      range,
    });
  }

  setGameTime(time: number): void {
    this.controlPanel.setGameTime(time);
  }

  setLockState(isLocked: boolean): void {
    this.controlPanel.setLockState(isLocked);
  }

  setAutoMode(isAuto: boolean): void {
    this.controlPanel.setAutoMode(isAuto);
  }

  setTargetInfo(info: ControlPanelState['targetInfo']): void {
    this.controlPanel.setTargetInfo(info);
  }

  setTargetList(data: TargetListData[]): void {
    this.targetListRenderer.updateTargets(data);
  }

  setLeadAngle(leadAngle: ControlPanelState['leadAngle']): void {
    this.controlPanel.setLeadAngle(leadAngle);
  }

  updateRadarTarget(target: CircularScopeTarget): void {
    const existingIndex = this.circularTargets.findIndex(
      t => t.id === target.id
    );
    if (existingIndex >= 0) {
      this.circularTargets[existingIndex] = target;
    } else {
      this.circularTargets.push(target);
    }
  }

  removeRadarTarget(targetId: string): void {
    this.circularTargets = this.circularTargets.filter(t => t.id !== targetId);
    this.aScopeTargets = this.aScopeTargets.filter(t => t.id !== targetId);
  }

  updateAScopeTarget(target: AScopeTarget): void {
    const existingIndex = this.aScopeTargets.findIndex(t => t.id === target.id);
    if (existingIndex >= 0) {
      this.aScopeTargets[existingIndex] = target;
    } else {
      this.aScopeTargets.push(target);
    }
  }

  updateProjectiles(
    _projectiles: Array<{
      id: string;
      position: Vector3;
      velocity: Vector3;
      isActive: boolean;
    }>
  ): void {
    // Projectiles are shown on circular scope via trajectory
    // Not needed for UIManagerB as they're handled differently
  }

  updateTrajectoryPrediction(trajectory: Vector2[]): void {
    this.trajectoryPath = trajectory;
  }

  handleMouseEvent(_event: MouseEvent): boolean {
    // Mouse interaction for UI B if needed
    return false;
  }
}
