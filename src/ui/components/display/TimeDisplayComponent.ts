import { TextComponent } from './TextComponent';
import { CRT_COLORS, FONTS } from '../../../data/Constants';

export class TimeDisplayComponent extends TextComponent {
  private seconds: number = 0;

  constructor(id: string) {
    super(id, 'TIME: 00:00', FONTS.DATA, CRT_COLORS.SECONDARY_TEXT);
  }

  setTime(seconds: number): void {
    this.seconds = seconds;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const timeStr = `TIME: ${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    this.setText(timeStr);
  }

  getTime(): number {
    return this.seconds;
  }
}
