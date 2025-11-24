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
  MAX_RADAR_RANGE: 15000, // 20km
  DEFAULT_RADAR_RANGE: 15000, // 15km

  // UI
  TARGET_UPDATE_INTERVAL: 100, // ms

  // Performance
  MAX_ACTIVE_PROJECTILES: 10,
  MAX_TRAIL_POINTS: 200,
  GAME_OVER_DISTANCE: 1000, // 1km
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
  TITLE: 'bold 18px "Space Mono", monospace',
  SUBTITLE: '14px "Space Mono", monospace',
  DATA: '12px "Space Mono", monospace',
  SMALL: '10px "Space Mono", monospace',
} as const;

/**
 * 艦船特性データ
 * 各艦船タイプの物理的特性を定義
 */
export const VESSEL_CHARACTERISTICS = {
  // 従来のタイプ（後方互換性）
  static: {
    size: 50,
    durability: 1,
    maxSpeed: 0,
    altitude: 0,
    displayName: 'Static Target',
  },
  moving_slow: {
    size: 50,
    durability: 1,
    maxSpeed: 50,
    altitude: 0,
    displayName: 'Slow Target',
  },
  moving_fast: {
    size: 50,
    durability: 1,
    maxSpeed: 100,
    altitude: 0,
    displayName: 'Fast Target',
  },

  // 空中戦艦タイプ
  balloon: {
    size: 160, // 大きな当たり判定（容易）
    durability: 1,
    maxSpeed: 0, // 静止
    altitude: 1000, // 1000m高度
    displayName: '気球',
  },
  frigate: {
    size: 160, // 中程度の当たり判定
    durability: 2,
    maxSpeed: 70, // 70m/s
    altitude: 800, // 800m高度
    displayName: 'フリゲート',
  },
  cruiser: {
    size: 200, // 大きいが高速
    durability: 3,
    maxSpeed: 120, // 120m/s
    altitude: 1200, // 1200m高度
    displayName: '巡洋艦',
  },
} as const;

/**
 * 艦船配置用定数
 */
export const VESSEL_DEPLOYMENT = {
  BALLOON: {
    ALTITUDE_RANGE: [800, 1200],
    COUNT_PER_STAGE: [3, 4, 5],
  },
  FRIGATE: {
    ALTITUDE_RANGE: [600, 1000],
    SPEED_RANGE: [50, 80],
    COUNT_PER_STAGE: [2, 3, 4],
  },
  CRUISER: {
    ALTITUDE_RANGE: [800, 1400],
    SPEED_RANGE: [100, 150],
    COUNT_PER_STAGE: [1, 2, 3],
  },
} as const;
