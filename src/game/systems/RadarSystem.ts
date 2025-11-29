import { Vector3 } from '../../math/Vector3';

export interface IRadarTarget {
  position: Vector3;
  velocity: Vector3;
  rcs: number; // Radar Cross Section in m^2
}

export interface RadarParameters {
  transmitPower: number; // Watts
  frequency: number; // Hz
  antennaGain: number; // dBi
  beamWidth: number; // Degrees
  noiseFigure: number; // dB
  systemLoss: number; // dB
}

export class RadarSystem {
  private params: RadarParameters;
  private lambda: number; // Wavelength
  private linearGain: number;
  private linearLoss: number;

  constructor(params: RadarParameters) {
    this.params = params;
    // Calculate derived constants
    const c = 299792458; // Speed of light m/s
    this.lambda = c / params.frequency;
    this.linearGain = Math.pow(10, params.antennaGain / 10);
    this.linearLoss = Math.pow(10, params.systemLoss / 10);
  }

  /**
   * Calculate received power from a target using the Radar Equation
   * Pr = (Pt * G^2 * lambda^2 * sigma) / ((4*PI)^3 * R^4 * L)
   */
  public calculateReceivedPower(
    target: IRadarTarget,
    radarPosition: Vector3,
    radarDirection: Vector3
  ): number {
    const displacement = target.position.subtract(radarPosition);
    const range = displacement.magnitude();

    if (range === 0) return 0;

    // Calculate angle off-boresight
    // We need the angle between the radar direction vector and the target direction vector
    const targetDirection = displacement.normalize();
    const radarDirNormalized = radarDirection.normalize();

    // Dot product = cos(theta)
    const dot = targetDirection.dot(radarDirNormalized);
    // Clamp dot to -1 to 1 to avoid acos NaN due to floating point errors
    const clampedDot = Math.max(-1, Math.min(1, dot));
    const angleRad = Math.acos(clampedDot);
    const angleDeg = angleRad * (180 / Math.PI);

    // Calculate Antenna Gain Pattern (Gaussian approximation)
    // Gain(theta) = G_max * exp(-k * theta^2)
    // We want Gain = 0.5 * G_max at theta = beamWidth/2
    // 0.5 = exp(-k * (beamWidth/2)^2)
    // ln(0.5) = -k * (beamWidth/2)^2
    // -ln(2) = -k * (beamWidth/2)^2
    // k = ln(2) / (beamWidth/2)^2
    const halfBeamWidth = this.params.beamWidth / 2;
    const k = Math.LN2 / (halfBeamWidth * halfBeamWidth);
    const patternFactor = Math.exp(-k * angleDeg * angleDeg);

    // Effective Gain = G_max * patternFactor
    // In the radar equation, G is squared (transmit and receive paths)
    // So we use (G_linear * patternFactor)^2
    const effectiveGainLinear = this.linearGain * patternFactor;

    // Basic Radar Equation
    const numerator =
      this.params.transmitPower *
      Math.pow(effectiveGainLinear, 2) *
      Math.pow(this.lambda, 2) *
      target.rcs;

    const denominator =
      Math.pow(4 * Math.PI, 3) * Math.pow(range, 4) * this.linearLoss;

    return numerator / denominator;
  }

  /**
   * Calculate Thermal Noise Floor
   * N = k * T0 * B * F
   * k = Boltzmann constant (1.38e-23)
   * T0 = Standard temperature (290K)
   * B = Bandwidth (Hz) - approximated as 1/tau or similar, here we assume matched filter B approx 1/pulseWidth
   * F = Noise Figure (linear)
   */
  public calculateNoiseFloor(bandwidth: number): number {
    const k = 1.380649e-23;
    const T0 = 290;
    const noiseFigureLinear = Math.pow(10, this.params.noiseFigure / 10);
    return k * T0 * bandwidth * noiseFigureLinear;
  }

  /**
   * Calculate Signal-to-Noise Ratio (dB)
   */
  public calculateSNR(receivedPower: number, bandwidth: number): number {
    const noise = this.calculateNoiseFloor(bandwidth);
    if (noise === 0) return 0;
    return 10 * Math.log10(receivedPower / noise);
  }

  /**
   * Determine if target is detected based on SNR threshold
   */
  public isDetected(snrDb: number, thresholdDb: number = 13.0): boolean {
    return snrDb >= thresholdDb;
  }
}
