import { InfoGroupComponent } from '../display/InfoGroupComponent';
import { CRT_COLORS } from '../../../data/Constants';
import { ExtendedLeadAngle } from '../../../game/LeadAngleSystem';

export class LeadAngleGroup extends InfoGroupComponent {
  constructor(id: string = 'lead-angle') {
    super(id, 'Calculated Lead', [
      { label: 'Az', value: 0, type: 'counter', digits: 3, decimals: 1 },
      { label: 'El', value: 0, type: 'counter', digits: 3, decimals: 1 },
      { label: 'Time', value: 0, type: 'counter', digits: 2, decimals: 2 },
      {
        label: 'Confidence',
        value: 'LOW',
        type: 'indicator_group',
        options: [
          { label: 'LOW', value: 'LOW', color: CRT_COLORS.CRITICAL_TEXT },
          { label: 'MED', value: 'MEDIUM', color: CRT_COLORS.WARNING_TEXT },
          { label: 'HIGH', value: 'HIGH', color: CRT_COLORS.TARGET_LOCKED },
        ],
      },
    ]);
  }

  update(leadAngle: ExtendedLeadAngle | null): void {
    if (leadAngle) {
      // Use standardized 0-360 azimuth
      this.updateAzimuth(leadAngle.azimuth);
      this.updateElevation(leadAngle.elevation);
      this.updateConfidence(leadAngle.confidence);

      if (leadAngle.flightTime) {
        this.updateInfoItem('Time', leadAngle.flightTime);
      } else {
        this.updateInfoItem('Time', 0);
      }
    } else {
      this.updateAzimuth(0); // Reset to 0
      this.updateElevation(0);
      this.updateConfidence('LOW'); // Default to LOW
      this.updateInfoItem('Time', 0);
    }
  }
}
