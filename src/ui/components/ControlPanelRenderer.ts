/**
 * Canvas-based Control Panel Renderer
 * Implements TR-02: Canvas 2D API compliance
 * Based on ControlPanelManager design pattern but with Canvas rendering
 */

import { CanvasManager } from '../../rendering/CanvasManager';
import { Vector2 } from '../../math/Vector2';
import { CRT_COLORS, FONTS } from '../../data/Constants';

export interface ControlPanelEvents {
  onAzimuthChange: (value: number) => void;
  onElevationChange: (value: number) => void;
  onFireClick: () => void;
  onLockToggle: () => void;
  onMenuClick: () => void;
}

export interface ControlPanelState {
  azimuth: number; // -180 to 180
  elevation: number; // 0 to 90
  isLocked: boolean;
  leadAngle: {
    azimuth: number;
    elevation: number;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    flightTime?: number;
  } | null;
  gameTime: number;
  targetInfo: {
    status: 'NO_TARGET' | 'TRACKING' | 'LOCKED_ON';
    type?: string;
    range?: number;
    speed?: number;
  } | null;
  radarInfo: {
    azimuth: number;
    elevation: number;
    range: number;
  } | null;
}

interface UIElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'slider' | 'button';
}

export class ControlPanelRenderer {
  private canvasManager: CanvasManager;
  private events: ControlPanelEvents;
  private state: ControlPanelState;

  // UI Layout
  private readonly panelWidth: number;
  private readonly panelHeight: number;
  private uiElements: Map<string, UIElement> = new Map();

  // Interaction state
  private hoveredElement: string | null = null;
  private isDraggingSlider: string | null = null;
  private pressedButton: string | null = null;
  private _buttonPressStartTime: number = 0;
  private continuousAdjustment: number | null = null;
  private lastUpdateTime: number = 0;

  constructor(
    canvasManager: CanvasManager,
    events: ControlPanelEvents,
    panelWidth: number = 300
  ) {
    this.canvasManager = canvasManager;
    this.events = events;
    this.panelWidth = panelWidth;
    this.panelHeight = canvasManager.height;

    this.state = this.createInitialState();
    this.setupUIElements();
  }

  private createInitialState(): ControlPanelState {
    return {
      azimuth: 0,
      elevation: 45,
      isLocked: false,
      leadAngle: null,
      gameTime: 0,
      targetInfo: null,
      radarInfo: null,
    };
  }

  private setupUIElements(): void {
    const margin = 15;
    const sliderWidth = 160;
    const sliderHeight = 15;
    const buttonWidth = 120;
    const buttonHeight = 25;
    const smallButtonSize = 20;

    // Clear existing elements
    this.uiElements.clear();

    // Calculate positions
    let currentY = 120; // Start after title and artillery info

    // Azimuth Slider with +/- buttons
    this.uiElements.set('azimuth-minus', {
      id: 'azimuth-minus',
      x: margin + 10,
      y: currentY,
      width: smallButtonSize,
      height: smallButtonSize,
      type: 'button',
    });

    this.uiElements.set('azimuth-slider', {
      id: 'azimuth-slider',
      x: margin + 10 + smallButtonSize + 5,
      y: currentY + 3,
      width: sliderWidth,
      height: sliderHeight,
      type: 'slider',
    });

    this.uiElements.set('azimuth-plus', {
      id: 'azimuth-plus',
      x: margin + 10 + smallButtonSize + 5 + sliderWidth + 5,
      y: currentY,
      width: smallButtonSize,
      height: smallButtonSize,
      type: 'button',
    });
    currentY += 35;

    // Elevation Slider with +/- buttons
    this.uiElements.set('elevation-minus', {
      id: 'elevation-minus',
      x: margin + 10,
      y: currentY,
      width: smallButtonSize,
      height: smallButtonSize,
      type: 'button',
    });

    this.uiElements.set('elevation-slider', {
      id: 'elevation-slider',
      x: margin + 10 + smallButtonSize + 5,
      y: currentY + 3,
      width: sliderWidth,
      height: sliderHeight,
      type: 'slider',
    });

    this.uiElements.set('elevation-plus', {
      id: 'elevation-plus',
      x: margin + 10 + smallButtonSize + 5 + sliderWidth + 5,
      y: currentY,
      width: smallButtonSize,
      height: smallButtonSize,
      type: 'button',
    });
    currentY += 80; // Spacing after elevation controls

    // Fire Button - positioned after targeting info to avoid overlap
    this.uiElements.set('fire-button', {
      id: 'fire-button',
      x: margin + 10,
      y: currentY + 200, // Increased spacing to clear targeting section
      width: buttonWidth,
      height: buttonHeight,
      type: 'button',
    });

    // Lock Button
    this.uiElements.set('lock-button', {
      id: 'lock-button',
      x: margin + 10,
      y: currentY + 235, // Spaced below fire button
      width: buttonWidth,
      height: buttonHeight,
      type: 'button',
    });

    // Menu Button
    this.uiElements.set('menu-button', {
      id: 'menu-button',
      x: margin + 10,
      y: currentY + 270, // Spaced below lock button
      width: buttonWidth,
      height: buttonHeight,
      type: 'button',
    });
  }

  /**
   * Render the control panel
   */
  render(): void {
    const ctx = this.canvasManager.context;
    const margin = 15;
    let y = margin;
    const lineHeight = 20;

    ctx.save();

    // Panel background
    ctx.fillStyle = 'rgba(0, 50, 0, 0.1)';
    ctx.fillRect(0, 0, this.panelWidth, this.panelHeight);

    // Panel border
    ctx.strokeStyle = CRT_COLORS.GRID_LINE;
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, this.panelWidth, this.panelHeight);

    // Panel title
    ctx.fillStyle = CRT_COLORS.PRIMARY_TEXT;
    ctx.font = FONTS.TITLE;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('FIRE CONTROL', margin, y);
    y += lineHeight * 1.5;

    // Artillery controls
    ctx.font = FONTS.SUBTITLE;
    ctx.fillText('Artillery', margin, y);
    y += lineHeight;

    ctx.font = FONTS.DATA;
    ctx.fillStyle = CRT_COLORS.SECONDARY_TEXT;
    ctx.fillText(`Azimuth: ${this.state.azimuth.toFixed(1)}°`, margin + 10, y);
    y += lineHeight;
    ctx.fillText(
      `Elevation: ${this.state.elevation.toFixed(1)}°`,
      margin + 10,
      y
    );
    y += lineHeight * 1.5;

    // Render sliders
    this.renderSliders(ctx);

    // Radar information (moved from center pane)
    y = this.renderRadarInfo(ctx, margin, y + 60, lineHeight);

    // Targeting information
    y = this.renderTargetingInfo(ctx, margin, y + 20, lineHeight);

    // Lead angle display
    y = this.renderLeadAngleInfo(ctx, margin, y + 20, lineHeight);

    // Control buttons
    this.renderButtons(ctx);

    // Game time
    this.renderGameTime(ctx, margin, this.panelHeight - 60, lineHeight);

    ctx.restore();
  }

  private renderSliders(ctx: CanvasRenderingContext2D): void {
    // Azimuth controls
    const azimuthMinusBtn = this.uiElements.get('azimuth-minus')!;
    this.renderAdjustmentButton(ctx, azimuthMinusBtn, '-', 'azimuth-minus');

    const azimuthSlider = this.uiElements.get('azimuth-slider')!;
    this.renderSlider(
      ctx,
      azimuthSlider,
      this.state.azimuth,
      -180,
      180,
      'azimuth-slider'
    );

    const azimuthPlusBtn = this.uiElements.get('azimuth-plus')!;
    this.renderAdjustmentButton(ctx, azimuthPlusBtn, '+', 'azimuth-plus');

    // Elevation controls
    const elevationMinusBtn = this.uiElements.get('elevation-minus')!;
    this.renderAdjustmentButton(ctx, elevationMinusBtn, '-', 'elevation-minus');

    const elevationSlider = this.uiElements.get('elevation-slider')!;
    this.renderSlider(
      ctx,
      elevationSlider,
      this.state.elevation,
      0,
      90,
      'elevation-slider'
    );

    const elevationPlusBtn = this.uiElements.get('elevation-plus')!;
    this.renderAdjustmentButton(ctx, elevationPlusBtn, '+', 'elevation-plus');
  }

  private renderAdjustmentButton(
    ctx: CanvasRenderingContext2D,
    element: UIElement,
    symbol: string,
    elementId: string
  ): void {
    const isHovered = this.hoveredElement === elementId;
    const isPressed = this.pressedButton === elementId;

    // Button background
    ctx.fillStyle = isPressed
      ? CRT_COLORS.WARNING_TEXT
      : isHovered
        ? 'rgba(0, 255, 0, 0.2)'
        : 'rgba(0, 50, 0, 0.3)';
    ctx.fillRect(element.x, element.y, element.width, element.height);

    // Button border
    ctx.strokeStyle =
      isHovered || isPressed ? CRT_COLORS.WARNING_TEXT : CRT_COLORS.GRID_LINE;
    ctx.lineWidth = 1;
    ctx.strokeRect(element.x, element.y, element.width, element.height);

    // Button text
    ctx.fillStyle = isPressed ? CRT_COLORS.BACKGROUND : CRT_COLORS.PRIMARY_TEXT;
    ctx.font = FONTS.DATA;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      symbol,
      element.x + element.width / 2,
      element.y + element.height / 2
    );
  }

  private renderSlider(
    ctx: CanvasRenderingContext2D,
    element: UIElement,
    value: number,
    min: number,
    max: number,
    elementId: string
  ): void {
    const isHovered = this.hoveredElement === elementId;
    const isDragging = this.isDraggingSlider === elementId;

    // Slider track
    ctx.strokeStyle =
      isHovered || isDragging ? CRT_COLORS.WARNING_TEXT : CRT_COLORS.GRID_LINE;
    ctx.lineWidth = 2;
    ctx.strokeRect(element.x, element.y, element.width, element.height);

    // Slider handle position
    const normalizedValue = (value - min) / (max - min);
    const handleX =
      element.x + normalizedValue * (element.width - element.height);

    // Slider handle
    ctx.fillStyle =
      isHovered || isDragging
        ? CRT_COLORS.WARNING_TEXT
        : CRT_COLORS.PRIMARY_TEXT;
    ctx.fillRect(handleX, element.y, element.height, element.height);

    // Slider fill
    ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
    ctx.fillRect(
      element.x,
      element.y,
      handleX - element.x + element.height,
      element.height
    );
  }

  private renderButtons(ctx: CanvasRenderingContext2D): void {
    // Fire button
    const fireButton = this.uiElements.get('fire-button')!;
    this.renderButton(ctx, fireButton, 'FIRE', 'fire-button');

    // Lock button
    const lockButton = this.uiElements.get('lock-button')!;
    const lockText = this.state.isLocked ? 'UNLOCK' : 'LOCK ON';
    this.renderButton(ctx, lockButton, lockText, 'lock-button');

    // Menu button
    const menuButton = this.uiElements.get('menu-button')!;
    this.renderButton(ctx, menuButton, 'BACK TO MENU', 'menu-button');
  }

  private renderButton(
    ctx: CanvasRenderingContext2D,
    element: UIElement,
    text: string,
    elementId: string
  ): void {
    const isHovered = this.hoveredElement === elementId;

    // Button background
    ctx.fillStyle = isHovered ? 'rgba(0, 255, 0, 0.2)' : 'rgba(0, 255, 0, 0.1)';
    ctx.fillRect(element.x, element.y, element.width, element.height);

    // Button border
    ctx.strokeStyle = isHovered
      ? CRT_COLORS.WARNING_TEXT
      : CRT_COLORS.PRIMARY_TEXT;
    ctx.lineWidth = 1;
    ctx.strokeRect(element.x, element.y, element.width, element.height);

    // Button text
    ctx.fillStyle = isHovered
      ? CRT_COLORS.WARNING_TEXT
      : CRT_COLORS.PRIMARY_TEXT;
    ctx.font = FONTS.DATA;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      text,
      element.x + element.width / 2,
      element.y + element.height / 2
    );

    // Reset text alignment
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
  }

  private renderTargetingInfo(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    lineHeight: number
  ): number {
    ctx.fillStyle = CRT_COLORS.PRIMARY_TEXT;
    ctx.font = FONTS.SUBTITLE;
    ctx.fillText('Targeting', x, y);
    y += lineHeight;

    const targetInfo = this.state.targetInfo;
    if (targetInfo) {
      // Status
      let statusColor: string;
      switch (targetInfo.status) {
        case 'TRACKING':
          statusColor = CRT_COLORS.WARNING_TEXT;
          break;
        case 'LOCKED_ON':
          statusColor = CRT_COLORS.CRITICAL_TEXT;
          break;
        default:
          statusColor = CRT_COLORS.SECONDARY_TEXT;
      }

      ctx.font = FONTS.DATA;
      ctx.fillStyle = statusColor;
      ctx.fillText(`Status: ${targetInfo.status.replace('_', ' ')}`, x + 10, y);
      y += lineHeight;

      // Target details
      ctx.fillStyle = CRT_COLORS.SECONDARY_TEXT;
      ctx.fillText(`Type: ${targetInfo.type || '---'}`, x + 10, y);
      y += lineHeight;
      ctx.fillText(
        `Range: ${targetInfo.range ? (targetInfo.range / 1000).toFixed(1) + 'km' : '---'}`,
        x + 10,
        y
      );
      y += lineHeight;
      ctx.fillText(
        `Speed: ${targetInfo.speed ? targetInfo.speed.toFixed(1) + 'm/s' : '---'}`,
        x + 10,
        y
      );
      y += lineHeight;
    } else {
      ctx.fillStyle = CRT_COLORS.SECONDARY_TEXT;
      ctx.font = FONTS.DATA;
      ctx.fillText('Status: MANUAL', x + 10, y);
      y += lineHeight * 4;
    }

    return y;
  }

  private renderLeadAngleInfo(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    lineHeight: number
  ): number {
    ctx.fillStyle = CRT_COLORS.PRIMARY_TEXT;
    ctx.font = FONTS.SUBTITLE;
    ctx.fillText('Recommended Lead', x, y);
    y += lineHeight;

    const leadAngle = this.state.leadAngle;
    if (leadAngle) {
      // Confidence color coding
      let confidenceColor: string;
      switch (leadAngle.confidence) {
        case 'HIGH':
          confidenceColor = CRT_COLORS.TARGET_LOCKED;
          break;
        case 'MEDIUM':
          confidenceColor = CRT_COLORS.WARNING_TEXT;
          break;
        case 'LOW':
          confidenceColor = CRT_COLORS.CRITICAL_TEXT;
          break;
        default:
          confidenceColor = CRT_COLORS.SECONDARY_TEXT;
      }

      ctx.font = FONTS.DATA;
      ctx.fillStyle = confidenceColor;
      ctx.fillText(`Az: ${Math.round(leadAngle.azimuth)}°`, x + 10, y);
      y += lineHeight;
      ctx.fillText(`El: ${Math.round(leadAngle.elevation)}°`, x + 10, y);
      y += lineHeight;

      // Additional info
      ctx.fillStyle = CRT_COLORS.SECONDARY_TEXT;
      ctx.font = FONTS.SMALL;
      if (leadAngle.flightTime) {
        ctx.fillText(`Time: ${leadAngle.flightTime.toFixed(1)}s`, x + 10, y);
        y += lineHeight * 0.8;
      }
      ctx.fillText(`Confidence: ${leadAngle.confidence}`, x + 10, y);
      y += lineHeight * 0.8;
    } else {
      ctx.fillStyle = '#666666';
      ctx.font = FONTS.DATA;
      ctx.fillText('Az: ---°', x + 10, y);
      y += lineHeight;
      ctx.fillText('El: ---°', x + 10, y);
      y += lineHeight;
      ctx.fillStyle = CRT_COLORS.SECONDARY_TEXT;
      ctx.font = FONTS.SMALL;
      ctx.fillText('No target locked', x + 10, y);
      y += lineHeight;
    }

    return y;
  }

  private renderRadarInfo(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    lineHeight: number
  ): number {
    ctx.fillStyle = CRT_COLORS.PRIMARY_TEXT;
    ctx.font = FONTS.SUBTITLE;
    ctx.fillText('Radar', x, y);
    y += lineHeight;

    const radarInfo = this.state.radarInfo;
    if (radarInfo) {
      ctx.font = FONTS.DATA;
      ctx.fillStyle = CRT_COLORS.SECONDARY_TEXT;
      ctx.fillText(`Az: ${radarInfo.azimuth.toFixed(1)}°`, x + 10, y);
      y += lineHeight;
      ctx.fillText(`El: ${radarInfo.elevation.toFixed(1)}°`, x + 10, y);
      y += lineHeight;
      ctx.fillText(
        `Range: ${(radarInfo.range / 1000).toFixed(1)}km`,
        x + 10,
        y
      );
      y += lineHeight;
    } else {
      ctx.fillStyle = CRT_COLORS.SECONDARY_TEXT;
      ctx.font = FONTS.DATA;
      ctx.fillText('Az: ---°', x + 10, y);
      y += lineHeight;
      ctx.fillText('El: ---°', x + 10, y);
      y += lineHeight;
      ctx.fillText('Range: ---km', x + 10, y);
      y += lineHeight;
    }

    return y;
  }

  private renderGameTime(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    lineHeight: number
  ): void {
    ctx.fillStyle = CRT_COLORS.PRIMARY_TEXT;
    ctx.font = FONTS.SUBTITLE;
    ctx.fillText('Mission Time', x, y);
    y += lineHeight;

    const minutes = Math.floor(this.state.gameTime / 60);
    const seconds = Math.floor(this.state.gameTime % 60);
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    ctx.font = FONTS.DATA;
    ctx.fillStyle = CRT_COLORS.SECONDARY_TEXT;
    ctx.fillText(timeStr, x + 10, y);
  }

  /**
   * Handle mouse events
   */
  handleMouseEvent(
    mousePos: Vector2,
    eventType: 'mousedown' | 'mousemove' | 'mouseup' | 'click'
  ): boolean {
    // Check if mouse is within panel bounds
    if (mousePos.x < 0 || mousePos.x > this.panelWidth) {
      return false;
    }

    switch (eventType) {
      case 'mousemove':
        this.handleMouseMove(mousePos);
        break;
      case 'mousedown':
        return this.handleMouseDown(mousePos);
      case 'mouseup':
        this.handleMouseUp(mousePos);
        break;
      case 'click':
        return this.handleClick(mousePos);
    }

    return true; // Event handled
  }

  private handleMouseMove(mousePos: Vector2): void {
    // Update hover state
    this.hoveredElement = this.getElementAt(mousePos);

    // Handle slider dragging
    if (this.isDraggingSlider) {
      this.updateSliderValue(this.isDraggingSlider, mousePos);
    }
  }

  private handleMouseDown(mousePos: Vector2): boolean {
    const element = this.getElementAt(mousePos);

    if (element) {
      const uiElement = this.uiElements.get(element);
      if (uiElement?.type === 'slider') {
        this.isDraggingSlider = element;
        this.updateSliderValue(element, mousePos);
        return true;
      } else if (
        uiElement?.type === 'button' &&
        this.isAdjustmentButton(element)
      ) {
        this.pressedButton = element;
        this._buttonPressStartTime = Date.now();
        this.lastUpdateTime = Date.now();
        this.startContinuousAdjustment(element);
        return true;
      }
    }

    return false;
  }

  private handleMouseUp(_mousePos: Vector2): void {
    this.isDraggingSlider = null;
    if (this.pressedButton) {
      this.stopContinuousAdjustment();
      this.pressedButton = null;
    }
  }

  private isAdjustmentButton(elementId: string): boolean {
    return [
      'azimuth-minus',
      'azimuth-plus',
      'elevation-minus',
      'elevation-plus',
    ].includes(elementId);
  }

  private startContinuousAdjustment(buttonId: string): void {
    if (this.continuousAdjustment) {
      window.clearInterval(this.continuousAdjustment);
    }

    // Immediate first adjustment
    this.performAdjustment(buttonId);

    // Start continuous adjustment at 0.1 degrees per 100ms (= 1 degree per second)
    this.continuousAdjustment = window.setInterval(() => {
      this.performAdjustment(buttonId);
    }, 100);
  }

  private stopContinuousAdjustment(): void {
    if (this.continuousAdjustment) {
      window.clearInterval(this.continuousAdjustment);
      this.continuousAdjustment = null;
    }
  }

  private performAdjustment(buttonId: string): void {
    const now = Date.now();
    const deltaTime = now - this.lastUpdateTime;
    const adjustment = 0.1 * (deltaTime / 100); // 0.1 degrees per 100ms

    let newValue: number;

    switch (buttonId) {
      case 'azimuth-minus':
        newValue = Math.max(-180, this.state.azimuth - adjustment);
        this.state.azimuth = newValue;
        this.events.onAzimuthChange(newValue);
        break;
      case 'azimuth-plus':
        newValue = Math.min(180, this.state.azimuth + adjustment);
        this.state.azimuth = newValue;
        this.events.onAzimuthChange(newValue);
        break;
      case 'elevation-minus':
        newValue = Math.max(0, this.state.elevation - adjustment);
        this.state.elevation = newValue;
        this.events.onElevationChange(newValue);
        break;
      case 'elevation-plus':
        newValue = Math.min(90, this.state.elevation + adjustment);
        this.state.elevation = newValue;
        this.events.onElevationChange(newValue);
        break;
    }

    this.lastUpdateTime = now;
  }

  public cleanup(): void {
    this.stopContinuousAdjustment();
  }

  private handleClick(mousePos: Vector2): boolean {
    const element = this.getElementAt(mousePos);

    if (element && this.uiElements.get(element)?.type === 'button') {
      this.handleButtonClick(element);
      return true;
    }

    return false;
  }

  private getElementAt(mousePos: Vector2): string | null {
    for (const [id, element] of this.uiElements.entries()) {
      if (
        mousePos.x >= element.x &&
        mousePos.x <= element.x + element.width &&
        mousePos.y >= element.y &&
        mousePos.y <= element.y + element.height
      ) {
        return id;
      }
    }
    return null;
  }

  private updateSliderValue(sliderId: string, mousePos: Vector2): void {
    const element = this.uiElements.get(sliderId);
    if (!element) return;

    const relativeX = Math.max(
      0,
      Math.min(element.width, mousePos.x - element.x)
    );
    const normalizedValue = relativeX / element.width;

    if (sliderId === 'azimuth-slider') {
      const newValue = -180 + normalizedValue * 360;
      this.state.azimuth = newValue;
      this.events.onAzimuthChange(newValue);
    } else if (sliderId === 'elevation-slider') {
      const newValue = normalizedValue * 90;
      this.state.elevation = newValue;
      this.events.onElevationChange(newValue);
    }
  }

  private handleButtonClick(buttonId: string): void {
    if (this.isAdjustmentButton(buttonId)) {
      // Adjustment buttons are handled by mouse down/up events
      return;
    }

    switch (buttonId) {
      case 'fire-button':
        this.events.onFireClick();
        break;
      case 'lock-button':
        this.events.onLockToggle();
        break;
      case 'menu-button':
        this.events.onMenuClick();
        break;
    }
  }

  /**
   * Update control panel state
   */
  updateState(newState: Partial<ControlPanelState>): void {
    this.state = { ...this.state, ...newState };
  }

  /**
   * Get current state
   */
  getState(): ControlPanelState {
    return { ...this.state };
  }

  /**
   * Set artillery angles
   */
  setAngles(azimuth: number, elevation: number): void {
    this.state.azimuth = azimuth;
    this.state.elevation = elevation;
  }

  /**
   * Update lead angle display
   */
  setLeadAngle(leadAngle: ControlPanelState['leadAngle']): void {
    this.state.leadAngle = leadAngle;
  }

  /**
   * Update target information
   */
  setTargetInfo(targetInfo: ControlPanelState['targetInfo']): void {
    this.state.targetInfo = targetInfo;
  }

  /**
   * Update game time
   */
  setGameTime(seconds: number): void {
    this.state.gameTime = seconds;
  }

  /**
   * Set lock state
   */
  setLockState(isLocked: boolean): void {
    this.state.isLocked = isLocked;
  }

  /**
   * Set radar information
   */
  setRadarInfo(radarInfo: ControlPanelState['radarInfo']): void {
    this.state.radarInfo = radarInfo;
  }
}
