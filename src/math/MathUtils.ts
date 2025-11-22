/** Math utility functions for common game calculations */

export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function radToDeg(radians: number): number {
  return (radians * 180) / Math.PI;
}

export function sinDeg(degrees: number): number {
  return Math.sin(degToRad(degrees));
}

export function cosDeg(degrees: number): number {
  return Math.cos(degToRad(degrees));
}

export function clamp(value: number, min: number, max: number): number {
  // Support inverted bounds by swapping
  if (min > max) {
    const tmp = min;
    min = max;
    max = tmp;
  }
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Normalize angle to [0, 360) range */
export function normalizeAngleDegrees(degrees: number): number {
  degrees = degrees % 360;
  if (degrees < 0) degrees += 360;
  return degrees;
}

/** Normalize angle to [-π, π) range */
export function normalizeAngleRad(theta: number): number {
  const twoPi = Math.PI * 2;
  // Bring into [0, 2π)
  theta = ((theta % twoPi) + twoPi) % twoPi;
  // Shift to [-π, π)
  if (theta >= Math.PI) theta -= twoPi;
  return theta;
}

/** Shortest-path spherical linear interpolation for angles in radians */
export function slerpAngle(a: number, b: number, t: number): number {
  const start = normalizeAngleRad(a);
  const delta = normalizeAngleRad(b - start);
  // Shortest path is already ensured by normalize
  const result = start + delta * t;
  return result;
}
