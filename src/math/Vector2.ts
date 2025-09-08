/**
 * 2D Vector class for UI and screen-space calculations
 */
export class Vector2 {
  x: number;
  y: number;

  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  /** Add another vector to this vector */
  add(other: Vector2): Vector2 {
    return new Vector2(this.x + other.x, this.y + other.y);
  }

  /** Subtract another vector from this vector */
  subtract(other: Vector2): Vector2 {
    return new Vector2(this.x - other.x, this.y - other.y);
  }

  /** Multiply vector by scalar value */
  multiply(scalar: number): Vector2 {
    return new Vector2(this.x * scalar, this.y * scalar);
  }

  /** Calculate the magnitude (length) of the vector */
  magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /** Return normalized vector (unit vector in same direction) */
  normalize(): Vector2 {
    const mag = this.magnitude();
    if (mag === 0) {
      return new Vector2(0, 0);
    }
    return new Vector2(this.x / mag, this.y / mag);
  }

  /** Calculate dot product with another vector */
  dot(other: Vector2): number {
    return this.x * other.x + this.y * other.y;
  }

  /** Angle from positive X-axis in radians */
  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  /** Angle between this vector and another in radians */
  angleTo(other: Vector2): number {
    const magProduct = this.magnitude() * other.magnitude();
    if (magProduct === 0) return 0;
    let cosTheta = this.dot(other) / magProduct;
    // Clamp for numerical safety
    cosTheta = Math.min(1, Math.max(-1, cosTheta));
    return Math.acos(cosTheta);
  }

  /** Rotate vector by angle (radians) around origin */
  rotate(theta: number): Vector2 {
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    return new Vector2(
      this.x * cos - this.y * sin,
      this.x * sin + this.y * cos
    );
  }

  /** Create a copy of this vector */
  copy(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  /** Convert vector to string representation */
  toString(): string {
    return `Vector2(${this.x}, ${this.y})`;
  }

  /** Check if this vector equals another vector, with optional tolerance */
  equals(other: Vector2, tolerance = 0): boolean {
    if (tolerance === 0) {
      return this.x === other.x && this.y === other.y;
    }
    return (
      Math.abs(this.x - other.x) <= tolerance &&
      Math.abs(this.y - other.y) <= tolerance
    );
  }

  /** Create vector from angle (radians) and length */
  static fromAngle(theta: number, length = 1): Vector2 {
    return new Vector2(Math.cos(theta) * length, Math.sin(theta) * length);
  }
}
