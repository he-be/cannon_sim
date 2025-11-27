import { InfoGroupComponent } from '../display/InfoGroupComponent';
import { CRT_COLORS } from '../../../data/Constants';

export interface TargetInfo {
  status: 'NO_TARGET' | 'TRACKING' | 'LOCKED_ON';
  type?: string;
  range?: number;
  speed?: number;
}

export class TargetingGroup extends InfoGroupComponent {
  constructor(id: string = 'targeting') {
    super(id, 'Targeting', [
      {
        label: 'Status',
        value: 'NO_TARGET',
        type: 'indicator_group',
        options: [
          {
            label: 'SEARCH',
            value: 'NO_TARGET',
            color: CRT_COLORS.SECONDARY_TEXT,
          },
          { label: 'TRACK', value: 'TRACKING', color: CRT_COLORS.WARNING_TEXT },
          {
            label: 'LOCK',
            value: 'LOCKED_ON',
            color: CRT_COLORS.TARGET_LOCKED,
          },
        ],
      },
    ]);
  }

  update(targetInfo: TargetInfo | null): void {
    if (targetInfo) {
      this.updateStatus(targetInfo.status);

      if (targetInfo.range) this.updateRange(targetInfo.range);
      if (targetInfo.speed) this.updateSpeed(targetInfo.speed);
      if (targetInfo.type) this.updateType(targetInfo.type);
    } else {
      this.updateStatus('NO_TARGET');
    }
  }
}
