import { InfoGroupComponent } from '../display/InfoGroupComponent';

export class ArtilleryGroup extends InfoGroupComponent {
  constructor(id: string = 'artillery') {
    super(id, 'Artillery', [
      {
        label: 'Az',
        value: 0,
        type: 'counter',
        digits: 3,
        decimals: 1,
      },
      {
        label: 'El',
        value: 45, // Default elevation
        type: 'counter',
        digits: 3,
        decimals: 1,
      },
    ]);
  }

  update(azimuth: number, elevation: number): void {
    this.updateInfoItem('Az', azimuth);
    this.updateInfoItem('El', elevation);
  }
}
