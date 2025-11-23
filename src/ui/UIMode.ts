/**
 * UIMode - Enumeration for UI mode selection
 * MODE_A: Existing UI (Horizontal + Vertical Radar)
 * MODE_B: New UI (Circular Scope + A-Scope)
 */

export enum UIMode {
  MODE_A = 'mode_a',
  MODE_B = 'mode_b',
}

export interface UIConfigSelection {
  stage: number;
  uiMode: UIMode;
}
