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
  onRadarRotateToggle: () => void;
  onMenuClick: () => void;
}

export interface ControlPanelState {
  azimuth: number; // -180 to 180 (Current)
  elevation: number; // 0 to 90 (Current)
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
  artilleryReloadProgress: number; // 0.0 to 1.0
  canFire: boolean;
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
  private rotateButton!: ButtonComponent;
  private menuButton!: ButtonComponent;
  private timeDisplay!: TimeDisplayComponent;

  constructor(
    canvasManager: CanvasManager,
    events: ControlPanelEvents,
    _panelWidth: number = 200
  ) {
    this.canvasManager = canvasManager;
    this.events = events;
    this.panelWidth = 180;
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
      artilleryReloadProgress: 1.0,
      canFire: true,
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
      {
        label: 'Az',
        value: this.state.azimuth,
        type: 'counter',
        digits: 3,
        decimals: 1,
      },
      {
        label: 'El',
        value: this.state.elevation,
        type: 'counter',
        digits: 3,
        decimals: 1,
      },
    ]);

    // Sliders
    this.azimuthSlider = new SliderWithButtonsComponent(
      'azimuth',
      this.state.azimuth,
      -180,
      180,
      (value: number) => {
        this.state.azimuth = value;
        this.updateArtilleryInfo(this.state.azimuth, this.state.elevation);
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
        this.updateArtilleryInfo(this.state.azimuth, this.state.elevation);
        this.events.onElevationChange(value);
      },
      0.1
    );

    // Info groups
    this.radarGroup = new InfoGroupComponent('radar', 'Radar', [
      { label: 'Az', value: 0, type: 'counter', digits: 3, decimals: 1 },
      { label: 'El', value: 0, type: 'counter', digits: 3, decimals: 1 },
      { label: 'Range', value: 0, type: 'counter', digits: 2, decimals: 2 }, // km
    ]);

    this.targetingGroup = new InfoGroupComponent('targeting', 'Targeting', [
      {
        label: 'Status',
        value: 'NO_TARGET',
        type: 'indicator_group',
        options: [
          {
            label: 'SEARCH',
            value: 'NO_TARGET',
            color: CRT_COLORS.SECONDARY_TEXT,
          },
          { label: 'TRACK', value: 'TRACKING', color: CRT_COLORS.WARNING_TEXT },
          {
            label: 'LOCK',
            value: 'LOCKED_ON',
            color: CRT_COLORS.TARGET_LOCKED,
          },
        ],
      },
    ]);

    this.leadAngleGroup = new InfoGroupComponent(
      'lead-angle',
      'Calculated Lead',
      [
        { label: 'Az', value: 0, type: 'counter', digits: 3, decimals: 1 },
        { label: 'El', value: 0, type: 'counter', digits: 3, decimals: 1 },
        { label: 'Time', value: 0, type: 'counter', digits: 2, decimals: 2 },
        {
          label: 'Confidence',
          value: 'LOW',
          type: 'indicator_group',
          options: [
            { label: 'LOW', value: 'LOW', color: CRT_COLORS.CRITICAL_TEXT },
            { label: 'MED', value: 'MEDIUM', color: CRT_COLORS.WARNING_TEXT },
            { label: 'HIGH', value: 'HIGH', color: CRT_COLORS.TARGET_LOCKED },
          ],
        },
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
    // Initially disabled until target is locked
    this.autoButton.setDisabled(true);

    this.rotateButton = new ButtonComponent('rotate', 'ROTATE', () =>
      this.events.onRadarRotateToggle()
    );

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

    // Order: Radar -> Calculated Lead -> Artillery -> Buttons -> IGT

    // Radar Section
    this.rootContainer.addChild(this.radarGroup);
    this.rootContainer.addChild(this.rotateButton); // Added above targeting
    this.rootContainer.addChild(this.targetingGroup); // Targeting is related to Radar/Lead

    // Calculated Lead Section
    this.rootContainer.addChild(this.leadAngleGroup);

    // Artillery Section
    this.rootContainer.addChild(this.artilleryGroup);
    this.rootContainer.addChild(this.azimuthSlider);
    this.rootContainer.addChild(this.elevationSlider);

    // Buttons
    this.rootContainer.addChild(this.buttonsContainer);

    // IGT
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
    // We need to recalculate layout every frame if we have dynamic content that changes size?
    // Or at least when state changes.
    // For mechanical counters, size is fixed.
    // For indicators, size is fixed.
    // Text might change length, but usually we reserve space.
    // Let's rely on updateState calling updateLayout.
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

    let layoutChanged = false;

    // Update components based on state changes
    if (
      newState.azimuth !== undefined &&
      newState.azimuth !== oldState.azimuth
    ) {
      // Sliders control commanded value, but we update them to reflect current state if manual?
      // Actually, sliders should probably reflect commanded value if we want to control it.
      // But for now let's keep them showing current, or maybe commanded?
      // The requirement says "UI displays both".
      // Let's update the text display to show both.
      this.azimuthSlider.setValue(newState.azimuth);
    }

    if (
      newState.elevation !== undefined &&
      newState.elevation !== oldState.elevation
    ) {
      this.elevationSlider.setValue(newState.elevation);
    }

    if (
      newState.isLocked !== undefined &&
      newState.isLocked !== oldState.isLocked
    ) {
      this.lockButton.setText(newState.isLocked ? 'UNLOCK' : 'LOCK ON');
      // Enable AUTO button only when locked
      this.autoButton.setDisabled(!newState.isLocked);
    }

    if (
      newState.isAutoMode !== undefined &&
      newState.isAutoMode !== oldState.isAutoMode
    ) {
      this.autoButton.setText(newState.isAutoMode ? 'MANUAL' : 'AUTO');
      // Disable sliders when in auto mode
      this.azimuthSlider.setVisible(!newState.isAutoMode);
      this.elevationSlider.setVisible(!newState.isAutoMode);
      layoutChanged = true;
    }

    if (layoutChanged) {
      this.updateLayout();
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

    if (
      newState.artilleryReloadProgress !== undefined ||
      newState.canFire !== undefined
    ) {
      this.updateFireButton(
        newState.canFire ?? this.state.canFire,
        newState.artilleryReloadProgress ?? this.state.artilleryReloadProgress
      );
    }

    if (newState.azimuth !== undefined || newState.elevation !== undefined) {
      this.updateArtilleryInfo(
        newState.azimuth ?? this.state.azimuth,
        newState.elevation ?? this.state.elevation
      );
    }
  }

  private updateArtilleryInfo(azimuth: number, elevation: number): void {
    this.artilleryGroup.updateInfoItem('Az', azimuth);
    this.artilleryGroup.updateInfoItem('El', elevation);
  }

  private updateRadarInfo(radarInfo: ControlPanelState['radarInfo']): void {
    if (radarInfo) {
      // Use standardized 0-360 azimuth
      let normalizedAzimuth = radarInfo.azimuth;
      while (normalizedAzimuth < 0) normalizedAzimuth += 360;
      while (normalizedAzimuth >= 360) normalizedAzimuth -= 360;

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
      this.targetingGroup.updateStatus(targetInfo.status);

      // Add extra info if needed, but we removed Type/Range/Speed from initial setup
      // If we want them back, we should add them to initial setup or dynamically add them
      // For now, let's assume we only want Status indicators as per request
      // Or we can add them back as text below indicators?
      // The request focused on "targeting status... lamp indicator".
      // Let's keep it simple for now.

      if (targetInfo.range) this.targetingGroup.updateRange(targetInfo.range);
      if (targetInfo.speed) this.targetingGroup.updateSpeed(targetInfo.speed);
      if (targetInfo.type) this.targetingGroup.updateType(targetInfo.type);
    } else {
      this.targetingGroup.updateStatus('NO_TARGET');
    }
  }

  private updateLeadAngle(leadAngle: ControlPanelState['leadAngle']): void {
    if (leadAngle) {
      // Use standardized 0-360 azimuth
      this.leadAngleGroup.updateAzimuth(leadAngle.azimuth);
      this.leadAngleGroup.updateElevation(leadAngle.elevation);
      this.leadAngleGroup.updateConfidence(leadAngle.confidence);

      if (leadAngle.flightTime) {
        this.leadAngleGroup.updateInfoItem('Time', leadAngle.flightTime);
      } else {
        this.leadAngleGroup.updateInfoItem('Time', 0);
      }
    } else {
      this.leadAngleGroup.updateAzimuth(0); // Reset to 0
      this.leadAngleGroup.updateElevation(0);
      this.leadAngleGroup.updateConfidence('LOW'); // Default to LOW or none?
      this.leadAngleGroup.updateInfoItem('Time', 0);
    }
  }

  private updateFireButton(canFire: boolean, reloadProgress: number): void {
    if (canFire) {
      this.fireButton.setText('FIRE');
      this.fireButton.setProgress(1.0);
      this.fireButton.setDisabled(false);
    } else {
      this.fireButton.setText('RELOAD');
      this.fireButton.setProgress(reloadProgress);
      this.fireButton.setDisabled(true);
    }
  }

  // Maintain compatibility with existing interface
  getState(): ControlPanelState {
    return { ...this.state };
  }

  setAngles(azimuth: number, elevation: number): void {
    this.updateState({
      azimuth,
      elevation,
    });
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

  private updateLayout(): void {
    // Recalculate dynamic heights
    this.buttonsContainer.bounds.height =
      this.buttonsContainer.getPreferredHeight();

    // Recalculate group heights as they might change if items are added/removed
    // (Though currently we only update values, not add/remove items mostly)
    this.artilleryGroup.bounds.height =
      this.artilleryGroup.getPreferredHeight();
    this.radarGroup.bounds.height = this.radarGroup.getPreferredHeight();
    this.targetingGroup.bounds.height =
      this.targetingGroup.getPreferredHeight();
    this.leadAngleGroup.bounds.height =
      this.leadAngleGroup.getPreferredHeight();

    // Force root container to recalculate layout
    this.rootContainer.calculateLayout();
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

    // Set info group heights dynamically
    this.artilleryGroup.bounds.height =
      this.artilleryGroup.getPreferredHeight();
    this.radarGroup.bounds.height = this.radarGroup.getPreferredHeight();
    this.targetingGroup.bounds.height =
      this.targetingGroup.getPreferredHeight();
    this.leadAngleGroup.bounds.height =
      this.leadAngleGroup.getPreferredHeight();

    // Initial dynamic height calculation
    this.buttonsContainer.bounds.height =
      this.buttonsContainer.getPreferredHeight();

    this.timeDisplay.bounds.height = 20;

    // Now calculate the main layout
    this.rootContainer.calculateLayout();
  }

  cleanup(): void {
    this.azimuthSlider.cleanup();
    this.elevationSlider.cleanup();
  }
}
