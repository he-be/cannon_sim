import { describe, it, expect, beforeEach } from 'vitest';
import { Vector3 } from '../../math/Vector3';
import { RadarSystem, RadarParameters, IRadarTarget } from './RadarSystem';

describe('RadarSystem Physics', () => {
  // Standard X-band radar parameters for testing
  const defaultParams: RadarParameters = {
    transmitPower: 10000, // 10 kW
    frequency: 10e9, // 10 GHz
    antennaGain: 30, // 30 dBi
    beamWidth: 2.0, // 2.0 degrees
    noiseFigure: 4.0, // 4.0 dB
    systemLoss: 5.0, // 5.0 dB
  };

  let radarSystem: RadarSystem;

  beforeEach(() => {
    radarSystem = new RadarSystem(defaultParams);
  });

  describe('Radar Equation', () => {
    it('should calculate received power correctly for a known case', () => {
      // Manual calculation for verification:
      // Pt = 10000 W
      // G = 10^(30/10) = 1000 (linear)
      // f = 10e9 -> lambda = 0.0299792458 m
      // sigma = 1.0 m^2
      // R = 1000 m
      // L = 10^(5/10) = 3.16227766 (linear)
      // Pr = (Pt * G^2 * lambda^2 * sigma) / ((4*PI)^3 * R^4 * L)

      const target: IRadarTarget = {
        position: new Vector3(1000, 0, 0),
        velocity: new Vector3(0, 0, 0),
        rcs: 1.0,
      };

      const power = radarSystem.calculateReceivedPower(
        target,
        new Vector3(0, 0, 0),
        new Vector3(1, 0, 0)
      );

      // Expected value calculation
      // lambda = 299792458 / 10e9 = 0.0299792458
      // G = 1000
      // Numerator = 10000 * 1000^2 * 0.0299792458^2 * 1.0 = 8987.55
      // Denominator = (4*PI)^3 * 1000^4 * 3.1622 = 1984.4 * 1e12 * 3.1622 = 6.275e15
      // Pr approx 1.43e-9 Watts (-58.4 dBm)

      expect(power).toBeGreaterThan(1e-10);
      expect(power).toBeLessThan(1e-8);
    });

    it('should follow inverse 4th power law for range', () => {
      const target1: IRadarTarget = {
        position: new Vector3(1000, 0, 0),
        velocity: new Vector3(0, 0, 0),
        rcs: 1.0,
      };

      const target2: IRadarTarget = {
        position: new Vector3(2000, 0, 0), // Double distance
        velocity: new Vector3(0, 0, 0),
        rcs: 1.0,
      };

      const power1 = radarSystem.calculateReceivedPower(
        target1,
        new Vector3(0, 0, 0),
        new Vector3(1, 0, 0)
      );
      const power2 = radarSystem.calculateReceivedPower(
        target2,
        new Vector3(0, 0, 0),
        new Vector3(1, 0, 0)
      );

      // Power should drop by factor of 2^4 = 16
      expect(power1 / power2).toBeCloseTo(16, 1);
    });

    it('should scale linearly with RCS', () => {
      const target1: IRadarTarget = {
        position: new Vector3(1000, 0, 0),
        velocity: new Vector3(0, 0, 0),
        rcs: 1.0,
      };

      const target2: IRadarTarget = {
        position: new Vector3(1000, 0, 0),
        velocity: new Vector3(0, 0, 0),
        rcs: 10.0, // 10x RCS
      };

      const power1 = radarSystem.calculateReceivedPower(
        target1,
        new Vector3(0, 0, 0),
        new Vector3(1, 0, 0)
      );
      const power2 = radarSystem.calculateReceivedPower(
        target2,
        new Vector3(0, 0, 0),
        new Vector3(1, 0, 0)
      );

      expect(power2 / power1).toBeCloseTo(10, 1);
    });
  });

  describe('Antenna Gain Pattern', () => {
    it('should have maximum gain on boresight', () => {
      const target: IRadarTarget = {
        position: new Vector3(1000, 0, 0),
        velocity: new Vector3(0, 0, 0),
        rcs: 1.0,
      };
      const radarPos = new Vector3(0, 0, 0);
      const radarDir = new Vector3(1, 0, 0); // Pointing directly at target

      const power = radarSystem.calculateReceivedPower(
        target,
        radarPos,
        radarDir
      );

      // Should match the calculation without pattern loss
      // We already verified this value range in the previous test
      expect(power).toBeGreaterThan(1e-10);
    });

    it('should have -3dB gain (one way) at half beamwidth', () => {
      // Beamwidth is 2.0 degrees, so half beamwidth is 1.0 degree
      // Target at 1.0 degree off-axis
      // x = 1000 * cos(1 deg), y = 1000 * sin(1 deg)
      const angleRad = 1.0 * (Math.PI / 180);
      const target: IRadarTarget = {
        position: new Vector3(
          1000 * Math.cos(angleRad),
          1000 * Math.sin(angleRad),
          0
        ),
        velocity: new Vector3(0, 0, 0),
        rcs: 1.0,
      };
      const radarPos = new Vector3(0, 0, 0);
      const radarDir = new Vector3(1, 0, 0);

      const powerOffAxis = radarSystem.calculateReceivedPower(
        target,
        radarPos,
        radarDir
      );

      // Reference power (on axis)
      const targetOnAxis: IRadarTarget = {
        position: new Vector3(1000, 0, 0),
        velocity: new Vector3(0, 0, 0),
        rcs: 1.0,
      };
      const powerOnAxis = radarSystem.calculateReceivedPower(
        targetOnAxis,
        radarPos,
        radarDir
      );

      // Two-way loss: -3dB * 2 = -6dB
      // -6dB is approx 0.25 linear ratio
      // However, our Gaussian approximation might be slightly different
      // Gain factor at half beamwidth = exp(-2.7725 * 1^2 / 1^2) = exp(-2.7725) = 0.0625 ??
      // Wait, k = 2.77 / (theta_3dB/2)^2
      // At theta = theta_3dB/2, exponent is -2.77
      // exp(-2.77) = 0.0625... that's too much loss.
      // -3dB is 0.5 power.
      // ln(0.5) = -0.693
      // So k should be 0.693 / (halfBeamWidth)^2 ??

      // Let's re-verify the Gaussian beam formula.
      // G(theta) = G0 * exp(-4 * ln(2) * (theta / theta_3dB)^2)
      // At theta = theta_3dB / 2:
      // exp(-4 * ln(2) * (1/2)^2) = exp(-ln(2)) = 0.5. Correct.

      // My implementation used k = 2.77... which is 4 * ln(2).
      // So patternFactor at half beamwidth should be 0.5.
      // Two-way pattern factor is 0.5^2 = 0.25.

      expect(powerOffAxis / powerOnAxis).toBeCloseTo(0.25, 1);
    });

    it('should have significant attenuation outside main lobe', () => {
      // Target at 5 degrees (2.5x beamwidth)
      const angleRad = 5.0 * (Math.PI / 180);
      const target: IRadarTarget = {
        position: new Vector3(
          1000 * Math.cos(angleRad),
          1000 * Math.sin(angleRad),
          0
        ),
        velocity: new Vector3(0, 0, 0),
        rcs: 1.0,
      };
      const radarPos = new Vector3(0, 0, 0);
      const radarDir = new Vector3(1, 0, 0);

      const powerOffAxis = radarSystem.calculateReceivedPower(
        target,
        radarPos,
        radarDir
      );

      const targetOnAxis: IRadarTarget = {
        position: new Vector3(1000, 0, 0),
        velocity: new Vector3(0, 0, 0),
        rcs: 1.0,
      };
      const powerOnAxis = radarSystem.calculateReceivedPower(
        targetOnAxis,
        radarPos,
        radarDir
      );

      // Should be very small
      expect(powerOffAxis / powerOnAxis).toBeLessThan(0.001);
    });
  });

  describe('Signal Processing', () => {
    it('should calculate noise floor correctly', () => {
      // B = 1 MHz
      const bandwidth = 1e6;
      const noise = radarSystem.calculateNoiseFloor(bandwidth);

      // k * T0 * B * F
      // 1.38e-23 * 290 * 1e6 * 10^(4/10)
      // 4e-21 * 1e6 * 2.51
      // approx 1e-14 Watts (-110 dBm)

      expect(noise).toBeGreaterThan(1e-15);
      expect(noise).toBeLessThan(1e-13);
    });

    it('should calculate SNR correctly', () => {
      const bandwidth = 1e6;
      const noise = radarSystem.calculateNoiseFloor(bandwidth);
      const signal = noise * 100; // 20dB SNR

      const snr = radarSystem.calculateSNR(signal, bandwidth);
      expect(snr).toBeCloseTo(20, 1);
    });

    it('should detect targets above threshold', () => {
      expect(radarSystem.isDetected(14.0, 13.0)).toBe(true);
      expect(radarSystem.isDetected(12.0, 13.0)).toBe(false);
    });
  });
});
