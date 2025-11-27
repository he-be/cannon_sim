import { InfoGroupComponent } from '../display/InfoGroupComponent';

export interface RadarInfo {
  azimuth: number;
  elevation: number;
  range: number;
}

export class RadarGroup extends InfoGroupComponent {
  constructor(id: string = 'radar') {
    super(id, 'Radar', [
      { label: 'Az', value: 0, type: 'counter', digits: 3, decimals: 1 },
      { label: 'El', value: 0, type: 'counter', digits: 3, decimals: 1 },
      { label: 'Range', value: 0, type: 'counter', digits: 2, decimals: 2 }, // km
    ]);
  }

  update(radarInfo: RadarInfo | null): void {
    if (radarInfo) {
      // Use standardized 0-360 azimuth
      let normalizedAzimuth = radarInfo.azimuth;
      while (normalizedAzimuth < 0) normalizedAzimuth += 360;
      while (normalizedAzimuth >= 360) normalizedAzimuth -= 360;

      this.updateAzimuth(normalizedAzimuth);
      this.updateElevation(radarInfo.elevation);
      this.updateRange(radarInfo.range);
    } else {
      this.updateAzimuth(null);
      this.updateElevation(null);
      this.updateRange(null);
    }
  }
}
