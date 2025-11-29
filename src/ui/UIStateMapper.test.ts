import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UIStateMapper } from './UIStateMapper';
import { Vector3 } from '../math/Vector3';
import { TargetType } from '../game/entities/Target';

describe('UIStateMapper', () => {
  let mockUIController: any;
  let mockUIManager: any;
  let mockState: any;

  beforeEach((): void => {
    mockUIManager = {
      setArtilleryAngles: vi.fn(),
      setArtilleryState: vi.fn(),
      setRadarDirection: vi.fn(),
      setRadarRange: vi.fn(),
      setRadarInfo: vi.fn(),
      setGameTime: vi.fn(),
      setLockState: vi.fn(),
      setAutoMode: vi.fn(),
      setTargetInfo: vi.fn(),
      setTargetList: vi.fn(),
      setLeadAngle: vi.fn(),
      updateRadarTarget: vi.fn(),
      removeRadarTarget: vi.fn(),
      updateProjectiles: vi.fn(),
      updateTrajectoryPrediction: vi.fn(),
    };

    mockUIController = {
      getUIManager: (): any => mockUIManager,
      getRadarState: (): any => ({ azimuth: 0, elevation: 0, range: 10000 }),
    };

    const mockTarget = {
      id: 'target-1',
      position: new Vector3(1000, 1000, 1000),
      velocity: new Vector3(0, 0, 0),
      type: TargetType.BALLOON,
      isDestroyed: false,
      spawnTime: 0,
      subtract: vi.fn().mockReturnValue(new Vector3(1000, 1000, 1000)),
    };

    mockState = {
      artillery: {
        currentAzimuth: 0,
        currentElevation: 0,
        canFire: (): boolean => true,
        reloadProgress: 1,
        getMuzzleVelocityVector: (): Vector3 => new Vector3(0, 0, 0),
      },
      targetingSystem: {
        getTargetingState: (): string => 'TRACKING',
        getLockedTarget: (): any => null,
        getTrackedTarget: (): any => null,
      },
      entityManager: {
        getTargets: (): any[] => [mockTarget],
        getProjectiles: (): any[] => [],
      },
      leadAngleSystem: {
        getLeadAngle: (): any => null,
      },
      gameTime: 10,
      isAutoMode: false,
      artilleryPosition: new Vector3(0, 0, 0),
      physicsEngine: {
        calculateTrajectory: (): any[] => [],
      },
    };
  });

  it('should keep destroyed targets for 2 seconds then remove them', (): void => {
    // Arrange
    const target = mockState.entityManager.getTargets()[0];
    target.isDestroyed = true;
    target.destructionTime = 10; // Destroyed at 10s
    mockState.gameTime = 11; // Current time 11s (1s elapsed)

    // Act 1: Within 2 seconds
    UIStateMapper.update(mockUIController, mockState);

    // Assert 1: Should still be in list and radar
    expect(mockUIManager.setTargetList).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: target.id })])
    );
    expect(mockUIManager.updateRadarTarget).toHaveBeenCalledWith(
      expect.objectContaining({ id: target.id })
    );
    expect(mockUIManager.removeRadarTarget).not.toHaveBeenCalledWith(target.id);

    // Act 2: After 2 seconds
    mockState.gameTime = 13; // 3s elapsed
    vi.clearAllMocks();
    UIStateMapper.update(mockUIController, mockState);

    // Assert 2: Should be removed
    expect(mockUIManager.setTargetList).toHaveBeenCalledWith([]);
    expect(mockUIManager.removeRadarTarget).toHaveBeenCalledWith(target.id);
  });
});
