import { VBoxContainer } from '../layout/VBoxContainer';
import { TextComponent } from './TextComponent';
import { CRT_COLORS, FONTS } from '../../../data/Constants';

export interface InfoItem {
  label: string;
  value: string;
  color?: string;
}

export class InfoGroupComponent extends VBoxContainer {
  public title: string;
  private titleComponent: TextComponent;
  private infoItems: Map<string, TextComponent> = new Map();

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
    }

    const textComponent = new TextComponent(
      `${this.id}-${item.label}`,
      `${item.label}: ${item.value}`,
      FONTS.DATA,
      item.color || CRT_COLORS.SECONDARY_TEXT
    );

    this.infoItems.set(item.label, textComponent);
    this.addChild(textComponent);
  }

  updateInfoItem(label: string, value: string, color?: string): void {
    const component = this.infoItems.get(label);
    if (component) {
      component.setText(`${label}: ${value}`);
      if (color) {
        component.setColor(color);
      }
    }
  }

  removeInfoItem(label: string): void {
    const component = this.infoItems.get(label);
    if (component) {
      this.removeChild(component);
      this.infoItems.delete(label);
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
  }

  // Convenience methods for common info updates
  updateStatus(status: string, color?: string): void {
    this.updateInfoItem('Status', status.replace('_', ' '), color);
  }

  updateRange(range: number | null): void {
    const value = range ? `${(range / 1000).toFixed(2)}km` : '---';
    this.updateInfoItem('Range', value);
  }

  updateSpeed(speed: number | null): void {
    const value = speed ? `${speed.toFixed(2)}m/s` : '---';
    this.updateInfoItem('Speed', value);
  }

  updateType(type: string | null): void {
    this.updateInfoItem('Type', type || '---');
  }

  updateAzimuth(azimuth: number | null): void {
    const value = azimuth !== null ? `${azimuth.toFixed(2)}°` : '---°';
    this.updateInfoItem('Az', value);
  }

  updateElevation(elevation: number | null): void {
    const value = elevation !== null ? `${elevation.toFixed(2)}°` : '---°';
    this.updateInfoItem('El', value);
  }
}
