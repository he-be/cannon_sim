import { ScenarioEvent, ScenarioEventType, SpawnEvent } from './ScenarioEvent';
import { EntityManager } from '../EntityManager';
import { Target } from '../entities/Target';
import { Vector3 } from '../../math/Vector3';

export class ScenarioManager {
  private events: ScenarioEvent[] = [];
  private currentIndex: number = 0;
  private waitTimer: number = 0;
  private flags: Map<string, boolean> = new Map();
  private entityManager: EntityManager;
  private isFinished: boolean = false;
  private labels: Map<string, number> = new Map();

  // Callbacks for external systems
  public onMessage?: (message: string, duration: number) => void;

  constructor(entityManager: EntityManager) {
    this.entityManager = entityManager;
  }

  /**
   * Load a scenario
   */
  loadScenario(events: ScenarioEvent[]): void {
    this.events = events;
    this.currentIndex = 0;
    this.waitTimer = 0;
    this.isFinished = false;
    this.flags.clear();
    this.labels.clear();

    // Pre-scan labels
    this.events.forEach((event, index) => {
      if (event.type === ScenarioEventType.LABEL) {
        this.labels.set(event.name, index);
      }
    });
  }

  /**
   * Update scenario execution
   */
  update(deltaTime: number): void {
    if (this.isFinished) return;

    // Decrease wait timer by delta time
    this.waitTimer -= deltaTime;

    while (this.currentIndex < this.events.length) {
      // If we are waiting for time, stop processing
      if (this.waitTimer > 0) {
        return;
      }

      const event = this.events[this.currentIndex];

      if (event.type === ScenarioEventType.WAIT) {
        this.waitTimer += event.duration;
        this.currentIndex++;
        // If waitTimer is still <= 0, it means we've waited long enough (or deltaTime was large),
        // so we continue to the next event immediately.
      } else if (event.type === ScenarioEventType.WAIT_FLAG) {
        const targetValue = event.targetValue ?? true;
        const currentValue = this.flags.get(event.flagName) ?? false;

        if (currentValue !== targetValue) {
          // Condition not met, stop processing.
          // Reset waitTimer to 0 because time spent waiting for a flag doesn't count towards future time waits
          // (unless we want to support "wait 5s OR flag"? No, that's complex).
          this.waitTimer = 0;
          return;
        }
        // Condition met, proceed
        this.currentIndex++;
      } else if (event.type === ScenarioEventType.JUMP) {
        if (event.conditionFlag) {
          const flagValue = this.flags.get(event.conditionFlag) ?? false;
          if (!flagValue) {
            this.currentIndex++;
            continue;
          }
        }

        const targetIndex = this.labels.get(event.label);
        if (targetIndex !== undefined) {
          this.currentIndex = targetIndex;
          // Continue loop from new index
        } else {
          console.warn(`Scenario label not found: ${event.label}`);
          this.currentIndex++;
        }
      } else if (event.type === ScenarioEventType.STOP) {
        this.isFinished = true;
        return;
      } else {
        // Instant events (Spawn, SetFlag, Message, Label)
        this.processInstantEvent(event);
        this.currentIndex++;
      }
    }

    if (this.currentIndex >= this.events.length) {
      this.isFinished = true;
    }
  }

  /**
   * Process instant events
   */
  private processInstantEvent(event: ScenarioEvent): void {
    switch (event.type) {
      case ScenarioEventType.SPAWN:
        this.handleSpawn(event);
        break;

      case ScenarioEventType.SET_FLAG:
        this.flags.set(event.flagName, event.value);
        break;

      case ScenarioEventType.MESSAGE:
        if (this.onMessage) {
          this.onMessage(event.message, event.duration ?? 3);
        }
        break;

      case ScenarioEventType.LABEL:
        // No-op, just a marker
        break;
    }
  }

  private handleSpawn(event: SpawnEvent): void {
    const target = new Target(
      new Vector3(event.position.x, event.position.y, event.position.z),
      event.targetType,
      event.velocity
        ? new Vector3(event.velocity.x, event.velocity.y, event.velocity.z)
        : undefined,
      0 // Spawn immediately relative to when the event fires
    );
    this.entityManager.addTarget(target);
  }

  /**
   * Set a flag externally (e.g., from GameScene when a condition is met)
   */
  setFlag(name: string, value: boolean): void {
    this.flags.set(name, value);
  }

  /**
   * Check if scenario is finished
   */
  isScenarioFinished(): boolean {
    return this.isFinished;
  }
}
