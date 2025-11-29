import { Vector3 } from '../../math/Vector3';
import { TargetType } from '../entities/Target';

export enum ScenarioEventType {
  SPAWN = 'spawn',
  WAIT = 'wait',
  WAIT_FLAG = 'wait_flag',
  SET_FLAG = 'set_flag',
  MESSAGE = 'message',
  JUMP = 'jump',
  LABEL = 'label',
  STOP = 'stop',
}

export interface BaseEvent {
  type: ScenarioEventType;
}

export interface SpawnEvent extends BaseEvent {
  type: ScenarioEventType.SPAWN;
  targetType: TargetType;
  position: Vector3;
  velocity?: Vector3;
  // Optional ID for tracking specific targets
  id?: string;
}

export interface WaitEvent extends BaseEvent {
  type: ScenarioEventType.WAIT;
  duration: number; // seconds
}

export interface WaitFlagEvent extends BaseEvent {
  type: ScenarioEventType.WAIT_FLAG;
  flagName: string;
  targetValue?: boolean; // Default true
}

export interface SetFlagEvent extends BaseEvent {
  type: ScenarioEventType.SET_FLAG;
  flagName: string;
  value: boolean;
}

export interface MessageEvent extends BaseEvent {
  type: ScenarioEventType.MESSAGE;
  message: string;
  duration?: number; // seconds to display
}

export interface JumpEvent extends BaseEvent {
  type: ScenarioEventType.JUMP;
  label: string;
  conditionFlag?: string; // Optional: only jump if flag is set
}

export interface LabelEvent extends BaseEvent {
  type: ScenarioEventType.LABEL;
  name: string;
}

export interface StopEvent extends BaseEvent {
  type: ScenarioEventType.STOP;
}

export type ScenarioEvent =
  | SpawnEvent
  | WaitEvent
  | WaitFlagEvent
  | SetFlagEvent
  | MessageEvent
  | JumpEvent
  | LabelEvent
  | StopEvent;
