import { InputHandler, InputCallbacks } from './InputHandler';
import { UIController } from '../ui/controllers/UIController';
import { UIEvents } from '../ui/UIManager';
import { SceneType } from '../ui/scenes/TitleScene';
import { RadarTarget } from '../ui/components/RadarRenderer';

export interface GameActions {
  fireProjectile: () => void;
  toggleLock: () => void;
  toggleAuto: () => void;
  toggleRadarRotation: () => void;
  transitionScene: (type: SceneType) => void;
  restartGame: () => void;
  setRadarAzimuth: (az: number) => void;
  setRadarElevation: (el: number) => void;
  setRadarAutoRotating: (rotating: boolean) => void;
  isRadarRotating: () => boolean;
  getGameState: () => string; // GameState enum string
}

export class GameInputController {
  private inputHandler!: InputHandler;
  private actions: GameActions;

  constructor(actions: GameActions) {
    this.actions = actions;
  }

  initialize(uiController: UIController): void {
    this.inputHandler = new InputHandler(
      this.createInputCallbacks(),
      uiController
    );
  }

  attach(): void {
    if (this.inputHandler) {
      this.inputHandler.attach();
    }
  }

  detach(): void {
    if (this.inputHandler) {
      this.inputHandler.detach();
    }
  }

  getUIEvents(): UIEvents {
    return {
      onAzimuthChange: (value: number): void => {
        this.actions.setRadarAzimuth(value);
        this.actions.setRadarAutoRotating(false);
      },
      onElevationChange: (value: number): void => {
        this.actions.setRadarElevation(value);
      },
      onFireClick: (): void => {
        this.actions.fireProjectile();
      },
      onLockToggle: (): void => {
        this.actions.toggleLock();
      },
      onAutoToggle: (): void => {
        this.actions.toggleAuto();
      },
      onRadarRotateToggle: (): void => {
        this.actions.toggleRadarRotation();
      },
      onMenuClick: (): void => {
        this.actions.transitionScene(SceneType.TITLE);
      },
      onDirectionChange: (_azimuth: number, _elevation: number): void => {
        // Radar state is managed by UIController
      },
      onRangeChange: (_range: number): void => {
        // Radar state is managed by UIController
      },
      onTargetDetected: (_target: RadarTarget): void => {
        // Handle target detection if needed
      },
      onTargetLost: (_targetId: string): void => {
        // Handle target loss if needed
      },
    };
  }

  private createInputCallbacks(): InputCallbacks {
    return {
      onFire: (): void => {
        const state = this.actions.getGameState();
        if (state === 'stage_clear') {
          this.actions.transitionScene(SceneType.STAGE_SELECT);
        } else if (state === 'playing') {
          this.actions.fireProjectile();
        }
      },
      onLockToggle: (): void => this.actions.toggleLock(),
      onAutoToggle: (): void => this.actions.toggleAuto(),
      onRestart: (): void => {
        if (this.actions.getGameState() === 'game_over') {
          this.actions.restartGame();
        }
      },
      onSceneTransition: (transition: { type: SceneType }): void =>
        this.actions.transitionScene(transition.type),
      onCancelAutoRotation: (): void => {
        if (this.actions.isRadarRotating()) {
          this.actions.setRadarAutoRotating(false);
          console.log('Radar auto-rotation cancelled by manual input');
        }
      },
      onRadarRotateToggle: (): void => this.actions.toggleRadarRotation(),
    };
  }
}
