/**
 * 3D Vector class for physics calculations
 * Used for position, velocity, acceleration, and force vectors
 */
export class Vector3 {
  x: number;
  y: number;
  z: number;

  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  /**
   * Add another vector to this vector
   */
  add(other: Vector3): Vector3 {
    return new Vector3(this.x + other.x, this.y + other.y, this.z + other.z);
  }

  /**
   * Subtract another vector from this vector
   */
  subtract(other: Vector3): Vector3 {
    return new Vector3(this.x - other.x, this.y - other.y, this.z - other.z);
  }

  /**
   * Multiply vector by scalar value
   */
  multiply(scalar: number): Vector3 {
    return new Vector3(this.x * scalar, this.y * scalar, this.z * scalar);
  }

  /**
   * Calculate the magnitude (length) of the vector
   */
  magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  /**
   * Return normalized vector (unit vector in same direction)
   */
  normalize(): Vector3 {
    const mag = this.magnitude();
    if (mag === 0) {
      return new Vector3(0, 0, 0);
    }
    return new Vector3(this.x / mag, this.y / mag, this.z / mag);
  }

  /**
   * Calculate dot product with another vector
   */
  dot(other: Vector3): number {
    return this.x * other.x + this.y * other.y + this.z * other.z;
  }

  /**
   * Calculate cross product with another vector
   */
  cross(other: Vector3): Vector3 {
    return new Vector3(
      this.y * other.z - this.z * other.y,
      this.z * other.x - this.x * other.z,
      this.x * other.y - this.y * other.x
    );
  }

  /**
   * Create a copy of this vector
   */
  copy(): Vector3 {
    return new Vector3(this.x, this.y, this.z);
  }

  /**
   * Convert vector to string representation
   */
  toString(): string {
    return `Vector3(${this.x}, ${this.y}, ${this.z})`;
  }

  /**
   * Check if this vector equals another vector
   */
  equals(other: Vector3, tolerance = 0): boolean {
    if (tolerance === 0) {
      return this.x === other.x && this.y === other.y && this.z === other.z;
    }
    return (
      Math.abs(this.x - other.x) <= tolerance &&
      Math.abs(this.y - other.y) <= tolerance &&
      Math.abs(this.z - other.z) <= tolerance
    );
  }
}
