/**
 * Canvas-based Control Panel Renderer
 * Implements TR-02: Canvas 2D API compliance
 * Based on ControlPanelManager design pattern but with Canvas rendering
 */

import { CanvasManager } from '../../rendering/CanvasManager';
import { Vector2 } from '../../math/Vector2';
import { CRT_COLORS, FONTS } from '../../data/Constants';

// Import new component system
import { VBoxContainer } from './layout/VBoxContainer';
import { TextComponent } from './display/TextComponent';
import { InfoGroupComponent } from './display/InfoGroupComponent';
import { TimeDisplayComponent } from './display/TimeDisplayComponent';
import { ButtonComponent } from './interactive/ButtonComponent';
import { SliderWithButtonsComponent } from './composite/SliderWithButtonsComponent';
import { UIEventUtils } from './core/UIEvent';
import { PaddingUtils } from './core/Rectangle';

export interface ControlPanelEvents {
  onAzimuthChange: (value: number) => void;
  onElevationChange: (value: number) => void;
  onFireClick: () => void;
  onLockToggle: () => void;
  onAutoToggle: () => void;
  onMenuClick: () => void;
}

export interface ControlPanelState {
  azimuth: number; // -180 to 180
  elevation: number; // 0 to 90
  isLocked: boolean;
  isAutoMode: boolean;
  leadAngle: {
    azimuth: number;
    elevation: number;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    flightTime?: number;
    converged?: boolean;
    iterations?: number;
    accuracy?: number;
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

export class ControlPanelRenderer {
  private canvasManager: CanvasManager;
  private events: ControlPanelEvents;
  private state: ControlPanelState;
  private readonly panelWidth: number;
  private readonly panelHeight: number;

  // Component tree
  private rootContainer!: VBoxContainer;
  private titleComponent!: TextComponent;
  private artilleryGroup!: InfoGroupComponent;
  private azimuthSlider!: SliderWithButtonsComponent;
  private elevationSlider!: SliderWithButtonsComponent;
  private radarGroup!: InfoGroupComponent;
  private targetingGroup!: InfoGroupComponent;
  private leadAngleGroup!: InfoGroupComponent;
  private buttonsContainer!: VBoxContainer;
  private fireButton!: ButtonComponent;
  private lockButton!: ButtonComponent;
  private autoButton!: ButtonComponent;
  private menuButton!: ButtonComponent;
  private timeDisplay!: TimeDisplayComponent;

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
    this.buildUI();
  }

  private createInitialState(): ControlPanelState {
    return {
      azimuth: 0,
      elevation: 45,
      isLocked: false,
      isAutoMode: false,
      leadAngle: null,
      gameTime: 0,
      targetInfo: null,
      radarInfo: null,
    };
  }

  private buildUI(): void {
    // Create main container
    this.rootContainer = new VBoxContainer('root', [], 10);
    this.rootContainer.setBounds(0, 0, this.panelWidth, this.panelHeight);
    this.rootContainer.setPadding(PaddingUtils.uniform(15));

    // Title
    this.titleComponent = new TextComponent(
      'title',
      'FIRE CONTROL',
      FONTS.TITLE,
      CRT_COLORS.PRIMARY_TEXT
    );

    // Artillery section
    this.artilleryGroup = new InfoGroupComponent('artillery', 'Artillery', [
      { label: 'Az', value: `${this.state.azimuth.toFixed(1)}°` },
      { label: 'El', value: `${this.state.elevation.toFixed(1)}°` },
    ]);

    // Sliders
    this.azimuthSlider = new SliderWithButtonsComponent(
      'azimuth',
      this.state.azimuth,
      -180,
      180,
      (value: number) => {
        this.state.azimuth = value;
        this.artilleryGroup.updateAzimuth(value);
        this.events.onAzimuthChange(value);
      },
      0.1
    );

    this.elevationSlider = new SliderWithButtonsComponent(
      'elevation',
      this.state.elevation,
      0,
      90,
      (value: number) => {
        this.state.elevation = value;
        this.artilleryGroup.updateElevation(value);
        this.events.onElevationChange(value);
      },
      0.1
    );

    // Info groups
    this.radarGroup = new InfoGroupComponent('radar', 'Radar', [
      { label: 'Az', value: '---°' },
      { label: 'El', value: '---°' },
      { label: 'Range', value: '---km' },
    ]);

    this.targetingGroup = new InfoGroupComponent('targeting', 'Targeting', [
      { label: 'Status', value: 'MANUAL' },
    ]);

    this.leadAngleGroup = new InfoGroupComponent(
      'lead-angle',
      'Recommended Lead',
      [
        { label: 'Az', value: '---°' },
        { label: 'El', value: '---°' },
        { label: 'Confidence', value: 'No target locked' },
      ]
    );

    // Buttons
    this.fireButton = new ButtonComponent('fire', 'FIRE', () =>
      this.events.onFireClick()
    );

    this.lockButton = new ButtonComponent(
      'lock',
      this.state.isLocked ? 'UNLOCK' : 'LOCK ON',
      () => this.events.onLockToggle()
    );

    this.autoButton = new ButtonComponent('auto', 'AUTO', () =>
      this.events.onAutoToggle()
    );
    this.autoButton.setVisible(false); // Initially hidden until target is locked

    this.menuButton = new ButtonComponent('menu', 'BACK TO MENU', () =>
      this.events.onMenuClick()
    );

    this.buttonsContainer = new VBoxContainer(
      'buttons',
      [this.fireButton, this.lockButton, this.autoButton, this.menuButton],
      5
    );

    // Time display
    this.timeDisplay = new TimeDisplayComponent('time');

    // Build component tree
    this.rootContainer.addChild(this.titleComponent);
    this.rootContainer.addChild(this.artilleryGroup);
    this.rootContainer.addChild(this.azimuthSlider);
    this.rootContainer.addChild(this.elevationSlider);
    this.rootContainer.addChild(this.radarGroup);
    this.rootContainer.addChild(this.targetingGroup);
    this.rootContainer.addChild(this.leadAngleGroup);
    this.rootContainer.addChild(this.buttonsContainer);
    this.rootContainer.addChild(this.timeDisplay);

    // Calculate initial layout after all children are added
    this.calculateAllLayouts();
  }

  render(): void {
    const ctx = this.canvasManager.context;

    ctx.save();

    // Panel background
    ctx.fillStyle = 'rgba(0, 50, 0, 0.1)';
    ctx.fillRect(0, 0, this.panelWidth, this.panelHeight);

    // Panel border
    ctx.strokeStyle = CRT_COLORS.GRID_LINE;
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, this.panelWidth, this.panelHeight);

    // Ensure layout is calculated
    this.rootContainer.calculateLayout();

    // Render component tree
    this.rootContainer.render(ctx);

    ctx.restore();
  }

  handleMouseEvent(
    mousePos: Vector2,
    eventType: 'mousedown' | 'mousemove' | 'mouseup' | 'click'
  ): boolean {
    // Check if mouse is within panel bounds
    if (mousePos.x < 0 || mousePos.x > this.panelWidth) {
      return false;
    }

    const event = UIEventUtils.createMouseEvent(eventType, mousePos);
    const handled = this.rootContainer.handleEvent(event);

    return handled || event.handled;
  }

  // State management methods (maintain same interface)
  updateState(newState: Partial<ControlPanelState>): void {
    const oldState = { ...this.state };
    this.state = { ...this.state, ...newState };

    // Update components based on state changes
    if (
      newState.azimuth !== undefined &&
      newState.azimuth !== oldState.azimuth
    ) {
      this.azimuthSlider.setValue(newState.azimuth);
      this.artilleryGroup.updateAzimuth(newState.azimuth);
    }

    if (
      newState.elevation !== undefined &&
      newState.elevation !== oldState.elevation
    ) {
      this.elevationSlider.setValue(newState.elevation);
      this.artilleryGroup.updateElevation(newState.elevation);
    }

    if (
      newState.isLocked !== undefined &&
      newState.isLocked !== oldState.isLocked
    ) {
      this.lockButton.setText(newState.isLocked ? 'UNLOCK' : 'LOCK ON');
      // Enable AUTO button only when locked
      this.autoButton.setVisible(newState.isLocked);
    }

    if (
      newState.isAutoMode !== undefined &&
      newState.isAutoMode !== oldState.isAutoMode
    ) {
      this.autoButton.setText(newState.isAutoMode ? 'MANUAL' : 'AUTO');
      // Disable sliders when in auto mode
      this.azimuthSlider.setVisible(!newState.isAutoMode);
      this.elevationSlider.setVisible(!newState.isAutoMode);
    }

    if (
      newState.gameTime !== undefined &&
      newState.gameTime !== oldState.gameTime
    ) {
      this.timeDisplay.setTime(newState.gameTime);
    }

    if (newState.radarInfo !== undefined) {
      this.updateRadarInfo(newState.radarInfo);
    }

    if (newState.targetInfo !== undefined) {
      this.updateTargetInfo(newState.targetInfo);
    }

    if (newState.leadAngle !== undefined) {
      this.updateLeadAngle(newState.leadAngle);
    }
  }

  private updateRadarInfo(radarInfo: ControlPanelState['radarInfo']): void {
    if (radarInfo) {
      // Convert azimuth from 0-360 to -180-180 to match Artillery display
      let normalizedAzimuth = radarInfo.azimuth;
      if (normalizedAzimuth > 180) {
        normalizedAzimuth = normalizedAzimuth - 360;
      }

      this.radarGroup.updateAzimuth(normalizedAzimuth);
      this.radarGroup.updateElevation(radarInfo.elevation);
      this.radarGroup.updateRange(radarInfo.range);
    } else {
      this.radarGroup.updateAzimuth(null);
      this.radarGroup.updateElevation(null);
      this.radarGroup.updateRange(null);
    }
  }

  private updateTargetInfo(targetInfo: ControlPanelState['targetInfo']): void {
    if (targetInfo) {
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

      this.targetingGroup.updateStatus(targetInfo.status, statusColor);
      this.targetingGroup.updateType(targetInfo.type || null);
      this.targetingGroup.updateRange(targetInfo.range || null);
      this.targetingGroup.updateSpeed(targetInfo.speed || null);
    } else {
      this.targetingGroup.updateStatus('MANUAL');
      this.targetingGroup.removeInfoItem('Type');
      this.targetingGroup.removeInfoItem('Range');
      this.targetingGroup.removeInfoItem('Speed');
    }
  }

  private updateLeadAngle(leadAngle: ControlPanelState['leadAngle']): void {
    if (leadAngle) {
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

      // Convert azimuth from 0-360 to -180-180 to match Artillery display
      let normalizedAzimuth = leadAngle.azimuth;
      if (normalizedAzimuth > 180) {
        normalizedAzimuth = normalizedAzimuth - 360;
      }

      this.leadAngleGroup.updateAzimuth(normalizedAzimuth);
      this.leadAngleGroup.updateElevation(leadAngle.elevation);
      this.leadAngleGroup.updateInfoItem(
        'Confidence',
        leadAngle.confidence,
        confidenceColor
      );

      if (leadAngle.flightTime) {
        this.leadAngleGroup.addInfoItem({
          label: 'Time',
          value: `${leadAngle.flightTime.toFixed(2)}s`,
        });
      } else {
        this.leadAngleGroup.removeInfoItem('Time');
      }
    } else {
      this.leadAngleGroup.updateAzimuth(null);
      this.leadAngleGroup.updateElevation(null);
      this.leadAngleGroup.updateInfoItem('Confidence', 'No target locked');
      this.leadAngleGroup.removeInfoItem('Time');
    }
  }

  // Maintain compatibility with existing interface
  getState(): ControlPanelState {
    return { ...this.state };
  }

  setAngles(azimuth: number, elevation: number): void {
    this.updateState({ azimuth, elevation });
  }

  setLeadAngle(leadAngle: ControlPanelState['leadAngle']): void {
    this.updateState({ leadAngle });
  }

  setTargetInfo(targetInfo: ControlPanelState['targetInfo']): void {
    this.updateState({ targetInfo });
  }

  setGameTime(seconds: number): void {
    this.updateState({ gameTime: seconds });
  }

  setLockState(isLocked: boolean): void {
    this.updateState({ isLocked });
  }

  setAutoMode(isAutoMode: boolean): void {
    this.updateState({ isAutoMode });
  }

  setRadarInfo(radarInfo: ControlPanelState['radarInfo']): void {
    this.updateState({ radarInfo });
  }

  private calculateAllLayouts(): void {
    // First, ensure all leaf components have proper sizes
    this.titleComponent.updateSize();

    // Calculate slider sizes
    this.azimuthSlider.bounds.height = 25;
    this.elevationSlider.bounds.height = 25;

    // Calculate button sizes
    this.fireButton.bounds = { x: 0, y: 0, width: 120, height: 25 };
    this.lockButton.bounds = { x: 0, y: 0, width: 120, height: 25 };
    this.menuButton.bounds = { x: 0, y: 0, width: 120, height: 25 };

    // Set info group heights
    this.artilleryGroup.bounds.height = 60;
    this.radarGroup.bounds.height = 80;
    this.targetingGroup.bounds.height = 40;
    this.leadAngleGroup.bounds.height = 80;
    this.buttonsContainer.bounds.height = 85;
    this.timeDisplay.bounds.height = 20;

    // Now calculate the main layout
    this.rootContainer.calculateLayout();
  }

  cleanup(): void {
    this.azimuthSlider.cleanup();
    this.elevationSlider.cleanup();
  }
}
