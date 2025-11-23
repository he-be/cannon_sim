import { VBoxContainer } from '../layout/VBoxContainer';
import { HBoxContainer } from '../layout/HBoxContainer';
import { TextComponent } from './TextComponent';
import { MechanicalCounterComponent } from './MechanicalCounterComponent';
import { IndicatorComponent } from './IndicatorComponent';
import { CRT_COLORS, FONTS } from '../../../data/Constants';
import { UIComponent } from '../core/UIComponent'; // Assuming UIComponent is the base class

export interface InfoItem {
  label: string;
  value: string | number; // Support number for counters, or active value for indicators
  color?: string;
  type?: 'text' | 'counter' | 'indicator_group';
  digits?: number;
  decimals?: number;
  options?: { label: string; value: string; color: string }[]; // For indicator groups
}

export class InfoGroupComponent extends VBoxContainer {
  public title: string;
  private titleComponent: TextComponent;
  private infoItems: Map<string, UIComponent> = new Map();
  // Keep track of indicator groups specifically to update them easily
  private indicatorGroups: Map<string, Map<string, IndicatorComponent>> =
    new Map();

  constructor(id: string, title: string, items: InfoItem[] = []) {
    super(id, [], 2); // Small gap for info items

    this.title = title;
    this.titleComponent = new TextComponent(
      `${id}-title`,
      title,
      FONTS.SUBTITLE,
      CRT_COLORS.PRIMARY_TEXT
    );

    this.addChild(this.titleComponent);

    // Add initial items
    items.forEach(item => this.addInfoItem(item));
  }

  addInfoItem(item: InfoItem): void {
    // Remove existing item if it exists
    const existingComponent = this.infoItems.get(item.label);
    if (existingComponent) {
      this.removeChild(existingComponent);
      this.indicatorGroups.delete(item.label);
    }

    let component: UIComponent;

    if (item.type === 'counter' && typeof item.value === 'number') {
      component = new MechanicalCounterComponent(
        `${this.id}-${item.label}`,
        item.label,
        item.value,
        item.digits || 3,
        item.decimals || 1,
        item.color || CRT_COLORS.SECONDARY_TEXT
      );
    } else if (item.type === 'indicator_group' && item.options) {
      // Create a vertical box for indicators
      const vbox = new VBoxContainer(
        `${this.id}-${item.label}-container`,
        [],
        4
      );
      const groupIndicators = new Map<string, IndicatorComponent>();

      // Add label for the group if needed, or just indicators
      // Let's add indicators directly to vbox

      item.options.forEach(opt => {
        const optContainer = new HBoxContainer(
          `${this.id}-${item.label}-${opt.value}-box`,
          [],
          4
        );

        const indicator = new IndicatorComponent(
          `${this.id}-${item.label}-${opt.value}-ind`,
          opt.color
        );

        // Set initial state
        indicator.setState(item.value === opt.value);

        const label = new TextComponent(
          `${this.id}-${item.label}-${opt.value}-lbl`,
          opt.label,
          FONTS.DATA,
          CRT_COLORS.SECONDARY_TEXT
        );

        optContainer.addChild(indicator);
        optContainer.addChild(label);
        vbox.addChild(optContainer);

        groupIndicators.set(opt.value, indicator);
      });

      component = vbox;
      this.indicatorGroups.set(item.label, groupIndicators);
    } else {
      component = new TextComponent(
        `${this.id}-${item.label}`,
        `${item.label}: ${item.value}`,
        FONTS.DATA,
        item.color || CRT_COLORS.SECONDARY_TEXT
      );
    }

    this.infoItems.set(item.label, component);
    this.addChild(component);
  }

  updateInfoItem(label: string, value: string | number, color?: string): void {
    const component = this.infoItems.get(label);
    if (component) {
      if (component instanceof MechanicalCounterComponent) {
        if (typeof value === 'number') {
          component.setValue(value);
        }
        if (color) {
          component.setColor(color);
        }
      } else if (component instanceof TextComponent) {
        component.setText(`${label}: ${value}`);
        if (color) {
          component.setColor(color);
        }
      } else if (this.indicatorGroups.has(label)) {
        // Handle indicator group update
        const group = this.indicatorGroups.get(label);
        if (group) {
          // Turn off all, turn on matching
          group.forEach((ind, key) => {
            ind.setState(key === value);
          });
        }
      }
    }
  }

  removeInfoItem(label: string): void {
    const component = this.infoItems.get(label);
    if (component) {
      this.removeChild(component);
      this.infoItems.delete(label);
      this.indicatorGroups.delete(label);
    }
  }

  setTitle(title: string): void {
    this.title = title;
    this.titleComponent.setText(title);
  }

  clearItems(): void {
    // Remove all info items but keep title
    for (const [, component] of this.infoItems) {
      this.removeChild(component);
    }
    this.infoItems.clear();
    this.indicatorGroups.clear();
  }

  // Convenience methods for common info updates
  updateStatus(status: string, color?: string): void {
    // If using indicator group, 'status' should match one of the option values
    if (this.indicatorGroups.has('Status')) {
      this.updateInfoItem('Status', status);
    } else {
      this.updateInfoItem('Status', status.replace('_', ' '), color);
    }
  }

  updateRange(range: number | null): void {
    // If range is null, we might want to show 0 or keep last value?
    // Or switch to text '---'?
    // For counter, we can pass 0.
    if (range !== null) {
      // Check if we have a counter for Range
      const component = this.infoItems.get('Range');
      if (component instanceof MechanicalCounterComponent) {
        this.updateInfoItem('Range', range / 1000); // km
      } else {
        this.updateInfoItem('Range', `${(range / 1000).toFixed(2)}km`);
      }
    } else {
      // If null, maybe switch to text or show 0?
      // For now, if it's a counter, show 0 or keep last.
      // Let's stick to text behavior if it was text.
      const component = this.infoItems.get('Range');
      if (component instanceof TextComponent) {
        this.updateInfoItem('Range', '---');
      } else if (component instanceof MechanicalCounterComponent) {
        // Keep last value or set to 0?
        // this.updateInfoItem('Range', 0);
      }
    }
  }

  updateSpeed(speed: number | null): void {
    const value = speed ? `${speed.toFixed(2)}m/s` : '---';
    this.updateInfoItem('Speed', value);
  }

  updateType(type: string | null): void {
    this.updateInfoItem('Type', type || '---');
  }

  updateAzimuth(azimuth: number | null): void {
    if (azimuth !== null) {
      const component = this.infoItems.get('Az');
      if (component instanceof MechanicalCounterComponent) {
        this.updateInfoItem('Az', azimuth);
      } else {
        this.updateInfoItem('Az', `${azimuth.toFixed(2)}°`);
      }
    } else {
      const component = this.infoItems.get('Az');
      if (component instanceof TextComponent) {
        this.updateInfoItem('Az', '---°');
      }
    }
  }

  updateElevation(elevation: number | null): void {
    if (elevation !== null) {
      const component = this.infoItems.get('El');
      if (component instanceof MechanicalCounterComponent) {
        this.updateInfoItem('El', elevation);
      } else {
        this.updateInfoItem('El', `${elevation.toFixed(2)}°`);
      }
    } else {
      const component = this.infoItems.get('El');
      if (component instanceof TextComponent) {
        this.updateInfoItem('El', '---°');
      }
    }
  }

  updateConfidence(confidence: string): void {
    if (this.indicatorGroups.has('Confidence')) {
      this.updateInfoItem('Confidence', confidence);
    } else {
      this.updateInfoItem('Confidence', confidence);
    }
  }
}
