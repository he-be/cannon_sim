/**
 * TextMeasurementService - Service for measuring text dimensions
 * Decouples canvas context usage from UI components for better testability
 */

export class TextMeasurementService {
  private static instance: TextMeasurementService;
  private ctx: CanvasRenderingContext2D | null = null;

  private constructor() {
    // Lazy initialization of context
  }

  static getInstance(): TextMeasurementService {
    if (!TextMeasurementService.instance) {
      TextMeasurementService.instance = new TextMeasurementService();
    }
    return TextMeasurementService.instance;
  }

  /**
   * Measure text width with specified font
   */
  measureTextWidth(text: string, font: string): number {
    const ctx = this.getContext();
    if (!ctx) return 0;

    ctx.save();
    ctx.font = font;
    const width = ctx.measureText(text).width;
    ctx.restore();

    return width;
  }

  /**
   * Get or create canvas context
   */
  private getContext(): CanvasRenderingContext2D | null {
    if (!this.ctx) {
      try {
        const canvas = document.createElement('canvas');
        this.ctx = canvas.getContext('2d');
      } catch (e) {
        console.warn('Failed to create canvas for text measurement:', e);
        return null;
      }
    }
    return this.ctx;
  }
}
