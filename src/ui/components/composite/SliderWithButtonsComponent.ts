import { HBoxContainer } from '../layout/HBoxContainer';
import { SliderComponent } from '../interactive/SliderComponent';
import { AdjustmentButtonComponent } from '../interactive/AdjustmentButtonComponent';

export class SliderWithButtonsComponent extends HBoxContainer {
  public slider: SliderComponent;
  public minusButton: AdjustmentButtonComponent;
  public plusButton: AdjustmentButtonComponent;
  public value: number;
  public min: number;
  public max: number;
  public onChange: (value: number) => void;
  public step: number = 0.1;

  constructor(
    id: string,
    value: number,
    min: number,
    max: number,
    onChange: (value: number) => void,
    step: number = 0.1
  ) {
    super(id, [], 5); // 5px gap between elements

    this.value = value;
    this.min = min;
    this.max = max;
    this.onChange = onChange;
    this.step = step;

    // Create minus button
    this.minusButton = new AdjustmentButtonComponent(`${id}-minus`, '-', () =>
      this.adjustValue(-this.step)
    );

    // Create slider
    this.slider = new SliderComponent(
      `${id}-slider`,
      value,
      min,
      max,
      (newValue: number) => {
        this.value = newValue;
        this.onChange(newValue);
      }
    );

    // Create plus button
    this.plusButton = new AdjustmentButtonComponent(`${id}-plus`, '+', () =>
      this.adjustValue(this.step)
    );

    // Add components to container
    this.addChild(this.minusButton);
    this.addChild(this.slider);
    this.addChild(this.plusButton);

    // Set total size
    this.bounds = {
      x: 0,
      y: 0,
      width: this.getPreferredWidth(),
      height: 20,
    };
  }

  private adjustValue(delta: number): void {
    const newValue = Math.max(this.min, Math.min(this.max, this.value + delta));
    if (Math.abs(newValue - this.value) > 0.001) {
      this.value = newValue;
      this.slider.setValue(newValue);
      this.onChange(newValue);
    }
  }

  setValue(value: number): void {
    const clampedValue = Math.max(this.min, Math.min(this.max, value));
    if (Math.abs(clampedValue - this.value) > 0.001) {
      this.value = clampedValue;
      this.slider.setValue(clampedValue);
    }
  }

  setRange(min: number, max: number): void {
    this.min = min;
    this.max = max;
    this.slider.setRange(min, max);
    this.setValue(this.value); // Re-clamp current value
  }

  setStep(step: number): void {
    this.step = step;
  }

  cleanup(): void {
    this.minusButton.cleanup();
    this.plusButton.cleanup();
  }
}
