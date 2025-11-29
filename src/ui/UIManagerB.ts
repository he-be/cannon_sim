/**
 * UIManagerB - UI Manager for Mode B (Circular Scope + A-Scope)
 * Manages layout and rendering of UI B components
 * Based on UIManager but uses different radar displays
 */

import { CanvasManager } from '../rendering/CanvasManager';
import { Vector2 } from '../math/Vector2';
import { Vector3 } from '../math/Vector3';
import { ControlPanelRenderer } from './components/ControlPanelRenderer';
import { RadarTarget } from './components/RadarRenderer';
import { Target } from '../game/entities/Target';
import {
  CircularScopeRenderer,
  CircularScopeTarget,
} from './components/CircularScopeRenderer';
import { AScopeRenderer, AScopeTarget } from './components/AScopeRenderer';
import {
  TargetListRenderer,
  TargetListData,
} from './components/TargetListRenderer';
import { ControlPanelState } from './components/ControlPanelRenderer';
import { CRT_COLORS } from '../data/Constants';
import { UIEvents } from './UIManager';
import { RadarTargetFilter } from './utils/RadarTargetFilter';
import { UIStateManager } from './state/UIStateManager';
import { UILayoutB, UIManagerBLayoutConfig } from './layout/UILayoutB';

export type { UIManagerBLayoutConfig };

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

  // Layout Manager
  private layoutManager: UILayoutB;

  // State Management
  private targetFilter: RadarTargetFilter;
  private stateManager: UIStateManager;

  private trajectoryPath: Vector2[] = [];
  private projectiles: Array<{ position: Vector3; isActive: boolean }> = [];

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

    // Initialize Layout Manager
    this.layoutManager = new UILayoutB(canvasManager, layoutConfig);

    // Initialize helpers
    this.targetFilter = new RadarTargetFilter();
    this.stateManager = new UIStateManager();

    this.initializeComponents();
  }

  private initializeComponents(): void {
    const bounds = this.layoutManager.getBounds();

    // Initialize control panel (same as UI A)
    this.controlPanel = new ControlPanelRenderer(
      this.canvasManager,
      {
        onAzimuthChange: this.events.onAzimuthChange,
        onElevationChange: this.events.onElevationChange,
        onFireClick: this.events.onFireClick,
        onLockToggle: this.events.onLockToggle,
        onAutoToggle: this.events.onAutoToggle,
        onRadarRotateToggle: this.events.onRadarRotateToggle,
        onMenuClick: this.events.onMenuClick,
      },
      bounds.controlPanel.width
    );

    // Initialize circular scope renderer
    this.circularScope = new CircularScopeRenderer(
      this.canvasManager,
      bounds.circularScope
    );

    // Initialize A-scope renderer
    this.aScope = new AScopeRenderer(this.canvasManager, bounds.aScope);

    // Initialize target list renderer
    this.targetListRenderer = new TargetListRenderer(
      this.canvasManager,
      bounds.targetList
    );
  }

  /**
   * Render all UI components
   */
  render(time: number = 0): void {
    this.clearCanvas();
    this.layoutManager.render(this.canvasManager.context);
    this.renderControlPanel();
    this.renderScopes(time);
    this.renderTargetList();
    this.renderScanLines(time);
  }

  private clearCanvas(): void {
    const ctx = this.canvasManager.context;
    ctx.fillStyle = CRT_COLORS.BACKGROUND;
    ctx.fillRect(0, 0, this.canvasManager.width, this.canvasManager.height);
  }

  private renderControlPanel(): void {
    const ctx = this.canvasManager.context;
    const bounds = this.layoutManager.getBounds().controlPanel;

    ctx.save();
    ctx.beginPath();
    ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.clip();

    this.controlPanel.render();

    ctx.restore();
  }

  private renderScopes(time: number): void {
    const ctx = this.canvasManager.context;
    const bounds = this.layoutManager.getBounds();

    // Render Circular Scope
    ctx.save();
    ctx.beginPath();
    ctx.rect(
      bounds.circularScope.x,
      bounds.circularScope.y,
      bounds.circularScope.width,
      bounds.circularScope.height
    );
    ctx.clip();

    // Render Circular Scope
    this.circularScope.render(
      this.stateManager.circularTargets,
      this.stateManager.radarAzimuth,
      this.stateManager.radarElevation,
      this.stateManager.radarRange,
      this.trajectoryPath,
      this.projectiles,
      time * 1000 // Convert seconds to ms
    );

    ctx.restore();

    // Render A-Scope
    ctx.save();
    ctx.beginPath();
    ctx.rect(
      bounds.aScope.x,
      bounds.aScope.y,
      bounds.aScope.width,
      bounds.aScope.height
    );
    ctx.clip();

    // Render A-Scope
    this.aScope.render(
      this.stateManager.aScopeTargets,
      this.stateManager.rangeGate,
      this.stateManager.radarRange,
      this.projectiles,
      this.stateManager.radarAzimuth,
      this.stateManager.radarElevation,
      time
    );

    ctx.restore();
  }

  private renderTargetList(): void {
    const ctx = this.canvasManager.context;
    const bounds = this.layoutManager.getBounds().targetList;

    ctx.save();
    ctx.beginPath();
    ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
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

  setRadarDirection(azimuth: number, elevation: number): void {
    this.stateManager.setRadarDirection(azimuth, elevation);
  }

  setRadarRange(range: number): void {
    this.stateManager.setRadarRange(range);
  }

  setRangeGate(gate: number): void {
    this.stateManager.setRangeGate(gate);
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
    this.controlPanel.setRadarInfo({ azimuth, elevation, range });
    // Also update internal state if needed, but usually setRadarDirection is called separately
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

  /**
   * Update lead angle display
   */
  updateLeadAngle(
    azimuth: number,
    elevation: number,
    confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  ): void {
    this.controlPanel.setLeadAngle({
      azimuth,
      elevation,
      confidence,
    });
  }

  /**
   * Update targeting info display
   */
  updateTargetingInfo(
    state: string,
    _trackedTarget: Target | null,
    lockedTarget: Target | null
  ): void {
    // Convert target info for display
    const targetInfo: {
      status: 'NO_TARGET' | 'TRACKING' | 'LOCKED_ON';
      type?: string;
      range?: number;
      speed?: number;
    } | null = lockedTarget
      ? {
          status: state === 'LOCKED_ON' ? 'LOCKED_ON' : 'TRACKING',
          type: lockedTarget.type ? lockedTarget.type.toString() : 'UNKNOWN',
          range: 0, // TODO: Calculate range
          speed: lockedTarget.velocity ? lockedTarget.velocity.magnitude() : 0,
        }
      : { status: 'NO_TARGET' };

    this.controlPanel.setTargetInfo(targetInfo);
    this.controlPanel.setLockState(state === 'LOCKED_ON');
  }

  /**
   * Update radar azimuth display
   */
  updateRadarAzimuth(_azimuth: number): void {
    // Circular scope always shows 360 degrees, but we can update a cursor or similar
    // For now, just update the control panel if needed
    // Or maybe CircularScopeRenderer has a method to set current azimuth
  }

  setTargetList(data: TargetListData[]): void {
    this.targetListRenderer.updateTargets(data);
  }

  setLeadAngle(leadAngle: ControlPanelState['leadAngle']): void {
    this.controlPanel.setLeadAngle(leadAngle);
  }

  updateRadarTarget(target: CircularScopeTarget | RadarTarget): void {
    // Handle RadarTarget (from GameScene)
    if ('bearing' in target) {
      // Update Circular Scope Target
      const circularTarget = this.targetFilter.toCircularScopeTarget(target);
      this.stateManager.updateCircularTarget(circularTarget);

      // Update A-Scope Target
      if (
        this.targetFilter.shouldShowOnAScope(
          target,
          this.stateManager.radarAzimuth,
          this.stateManager.radarElevation
        )
      ) {
        const aScopeTarget = this.targetFilter.toAScopeTarget(target);
        this.stateManager.updateAScopeTarget(aScopeTarget);
      } else {
        this.stateManager.removeAScopeTarget(target.id);
      }
    } else {
      // Handle direct CircularScopeTarget
      this.stateManager.updateCircularTarget(target);
    }
  }

  updateCircularTarget(target: CircularScopeTarget): void {
    this.stateManager.updateCircularTarget(target);
  }

  removeAScopeTarget(targetId: string): void {
    this.stateManager.removeAScopeTarget(targetId);
  }

  removeRadarTarget(targetId: string): void {
    this.stateManager.removeCircularTarget(targetId);
    this.stateManager.removeAScopeTarget(targetId);
  }

  updateAScopeTarget(target: AScopeTarget): void {
    this.stateManager.updateAScopeTarget(target);
  }

  updateProjectiles(
    projectiles: Array<{
      id: string;
      position: Vector3;
      velocity: Vector3;
      isActive: boolean;
    }>
  ): void {
    this.projectiles = projectiles;
  }

  updateTrajectoryPrediction(trajectory: Vector2[]): void {
    this.trajectoryPath = trajectory;
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
    _button: number = 0
  ): boolean {
    // Only handle basic mouse events, ignore drag events for now
    if (eventType === 'dragstart' || eventType === 'dragend') {
      return false;
    }

    // Check control panel first
    if (this.isPointInControlPanel(mousePos)) {
      const bounds = this.layoutManager.getBounds().controlPanel;
      const localPos = new Vector2(
        mousePos.x - bounds.x,
        mousePos.y - bounds.y
      );
      return this.controlPanel.handleMouseEvent(localPos, eventType);
    }

    // UI B doesn't have interactive scopes (they're display-only)
    return false;
  }

  /**
   * Check if point is in control panel bounds
   */
  private isPointInControlPanel(pos: Vector2): boolean {
    const bounds = this.layoutManager.getBounds().controlPanel;
    return (
      pos.x >= bounds.x &&
      pos.x <= bounds.x + bounds.width &&
      pos.y >= bounds.y &&
      pos.y <= bounds.y + bounds.height
    );
  }

  /**
   * Add explosion effect
   */
  addExplosion(position: Vector3, time: number): void {
    const timeMs = time * 1000;
    // Add to Circular Scope
    this.circularScope.addExplosion(position, timeMs);
    // Add to A-Scope (Disabled per user request)
    // this.aScope.addExplosion(position, timeMs);
  }
}
