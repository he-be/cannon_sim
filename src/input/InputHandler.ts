import { Vector2 } from '../math/Vector2';
import { UIController } from '../ui/controllers/UIController';
import { SceneType } from '../ui/scenes/TitleScene';
import { MouseEventData } from './MouseHandler';

export interface InputCallbacks {
  onFire: () => void;
  onLockToggle: () => void;
  onAutoToggle: () => void;
  onRestart: () => void;
  onSceneTransition: (transition: { type: SceneType }) => void;
  onCancelAutoRotation: () => void;
  onRadarRotateToggle: () => void;
}

export class InputHandler {
  private isAttached: boolean = false;

  constructor(
    private callbacks: InputCallbacks,
    private uiController: UIController
  ) {}

  /**
   * Attach event listeners
   */
  attach(): void {
    if (this.isAttached) return;
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.isAttached = true;
  }

  /**
   * Detach event listeners
   */
  detach(): void {
    if (!this.isAttached) return;
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.isAttached = false;
  }

  /**
   * Handle mouse events
   */
  handleMouseEvent(event: MouseEventData): void {
    const mousePos = new Vector2(
      event.position.canvas.x,
      event.position.canvas.y
    );

    // Route all mouse events through UIManager
    const handled = this.uiController
      .getUIManager()
      .handleMouseEvent(mousePos, event.type, event.button);

    if (!handled) {
      // Handle any game-specific mouse interactions that aren't UI-related
    }
  }

  /**
   * Handle keyboard key down events
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    // Prevent default scrolling for arrow keys and space
    if (
      ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(
        event.key
      )
    ) {
      event.preventDefault();
    }

    // Cancel auto-rotation on manual azimuth input
    if (['ArrowLeft', 'ArrowRight'].includes(event.key)) {
      this.callbacks.onCancelAutoRotation();
    }

    // Game actions
    // Note: We check game state in GameScene before calling these,
    // but here we just map keys to actions.
    // The callbacks themselves should handle state checks if necessary,
    // or we can pass current game state to InputHandler (but that adds coupling).
    // For now, we'll let the callbacks decide if they should run based on game state.

    switch (event.key) {
      case 'r':
      case 'R':
        this.callbacks.onRestart();
        break;
      case ' ':
        // Space is context dependent (fire or next stage)
        // We'll trigger fire, and let GameScene handle the context
        // Actually, GameScene handles space differently based on state.
        // We might need separate callbacks or just a generic "onAction"
        // Let's stick to specific callbacks and let GameScene decide.
        // But wait, GameScene.handleKeyDown had logic:
        // if (STAGE_CLEAR) onSceneTransition else if (PLAYING) fire
        // We can expose both or let the callback handle it.
        // Let's expose a generic "onPrimaryAction" for Space?
        // Or just call both and let them check state?
        // Better: InputHandler shouldn't know about GameState.
        // It should just say "Space pressed".
        // But we want semantic callbacks like "onFire".
        // Let's assume Space is always "Confirm/Fire".
        this.callbacks.onFire();
        break;
      case 'f':
      case 'F':
        this.callbacks.onFire();
        break;
      case 'l':
      case 'L':
        this.callbacks.onLockToggle();
        break;
      case 'k':
      case 'K':
        this.callbacks.onAutoToggle();
        break;
      case 't':
      case 'T':
        this.callbacks.onRadarRotateToggle();
        break;
    }

    // Delegate keys to UIController
    if (
      ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'o', 'i'].includes(
        event.key.toLowerCase()
      ) ||
      ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)
    ) {
      this.uiController.handleKeyDown(event);
    }
  };

  /**
   * Handle keyboard key up events
   */
  private handleKeyUp = (event: KeyboardEvent): void => {
    // Delegate keys to UIController
    if (
      ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'o', 'i'].includes(
        event.key.toLowerCase()
      ) ||
      ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)
    ) {
      this.uiController.handleKeyUp(event);
    }
  };
}
