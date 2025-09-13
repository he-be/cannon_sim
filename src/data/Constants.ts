/**
 * Game constants and physics parameters
 */

export const PHYSICS_CONSTANTS = {
  // Gravity
  GRAVITY_ACCELERATION: 9.81, // m/s²
  GRAVITY_DIRECTION: { x: 0, y: 0, z: -1 },

  // Projectile properties
  PROJECTILE_MASS: 43.5, // kg (155mm artillery shell)
  PROJECTILE_DIAMETER: 0.155, // m (155mm)
  PROJECTILE_CROSS_SECTIONAL_AREA: 0.0189, // m² (π * (0.155/2)²)
  PROJECTILE_DRAG_COEFFICIENT: 0.295, // dimensionless

  // Environment
  AIR_DENSITY_SEA_LEVEL: 1.225, // kg/m³

  // Muzzle velocity (initial velocity)
  MUZZLE_VELOCITY: 827, // m/s (typical for 155mm howitzer)

  // Integration
  PHYSICS_TIMESTEP: 1 / 60, // Fixed 60Hz timestep

  // Simulation limits
  MAX_PROJECTILE_LIFETIME: 60, // seconds
  GROUND_LEVEL: 0, // m
} as const;

export const GAME_CONSTANTS = {
  // Radar
  MAX_RADAR_RANGE: 20000, // 20km
  DEFAULT_RADAR_RANGE: 10000, // 10km

  // UI
  TARGET_UPDATE_INTERVAL: 100, // ms

  // Performance
  MAX_ACTIVE_PROJECTILES: 10,
  MAX_TRAIL_POINTS: 200,
} as const;

export const CRT_COLORS = {
  BACKGROUND: '#001100',
  PRIMARY_TEXT: '#00ff00',
  SECONDARY_TEXT: '#66ff66',
  WARNING_TEXT: '#ffff00',
  DANGER_TEXT: '#ff6600',
  CRITICAL_TEXT: '#ff0000',
  GRID_LINE: '#003300',
  RADAR_LINE: '#00ff00',
  TARGET_NORMAL: '#ff0000',
  TARGET_TRACKED: '#ff8800',
  TARGET_LOCKED: '#ffff00',
  PROJECTILE: '#ffffff',
  SCAN_LINE: 'rgba(0, 255, 0, 0.1)',
} as const;

export const FONTS = {
  TITLE: 'bold 18px monospace',
  SUBTITLE: '14px monospace',
  DATA: '12px monospace',
  SMALL: '10px monospace',
} as const;
