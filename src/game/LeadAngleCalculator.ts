/**
 * LeadAngleCalculator - Accurate lead angle calculation using Shooting Method
 * Implements requirements GS-07 with mathematically rigorous ballistic calculation
 * Based on docs/ShootingMethod.txt numerical analysis approach
 */

import { Vector3 } from '../math/Vector3';
import {
  ShootingMethodSolver,
  createDefaultBallisticParameters,
  ShootingResult,
} from './ShootingMethodSolver';

export interface LeadAngle {
  azimuth: number; // degrees from north (clockwise)
  elevation: number; // degrees above horizon
}

export interface RecommendedLeadResult {
  leadAngle: LeadAngle;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  flightTime?: number;
  converged?: boolean;
  iterations?: number;
  accuracy?: number; // Final error in meters
  leadDistance?: number; // meters ahead of current target position
}

/**
 * High-precision lead angle calculator using Shooting Method
 * Replaces placeholder implementation with mathematically rigorous approach
 */
interface CachedResult {
  result: RecommendedLeadResult;
  timestamp: number;
  key: string;
}

export class LeadAngleCalculator {
  private shootingMethodSolver: ShootingMethodSolver;

  // Performance optimization: caching and rate limiting
  private resultCache = new Map<string, CachedResult>();
  private lastCalculationTime = 0;
  private readonly CACHE_TTL = 500; // 500ms cache time
  private readonly MIN_CALCULATION_INTERVAL = 100; // Maximum 10Hz calculation rate
  private readonly MAX_CACHE_SIZE = 50; // Limit cache size

  constructor() {
    const ballisticParams = createDefaultBallisticParameters();
    this.shootingMethodSolver = new ShootingMethodSolver(ballisticParams);
  }

  /**
   * Calculate lead angle for hitting a moving target (GS-07)
   * Uses Shooting Method for mathematically accurate calculation
   */
  calculateLeadAngle(
    artilleryPosition: Vector3,
    targetPosition: Vector3,
    targetVelocity: Vector3
  ): LeadAngle {
    // Use Shooting Method for accurate ballistic calculation
    const shootingResult = this.shootingMethodSolver.solve(
      artilleryPosition,
      targetPosition,
      targetVelocity
    );

    return {
      azimuth: this.normalizeAzimuth(shootingResult.azimuth),
      elevation: Math.max(5, Math.min(85, shootingResult.elevation)), // Artillery limits
    };
  }

  /**
   * Calculate recommended lead angle with detailed information (UI display)
   * Includes performance optimization with caching and rate limiting
   */
  calculateRecommendedLead(
    artilleryPosition: Vector3,
    targetPosition: Vector3,
    targetVelocity: Vector3
  ): RecommendedLeadResult {
    const now = Date.now();

    // Rate limiting: limit calculation frequency
    if (now - this.lastCalculationTime < this.MIN_CALCULATION_INTERVAL) {
      // Check cache for recent result
      const cacheKey = this.generateCacheKey(
        artilleryPosition,
        targetPosition,
        targetVelocity
      );
      const cached = this.getCachedResult(cacheKey, now);
      if (cached) {
        return cached.result;
      }
    }

    // Check cache before expensive calculation
    const cacheKey = this.generateCacheKey(
      artilleryPosition,
      targetPosition,
      targetVelocity
    );
    const cached = this.getCachedResult(cacheKey, now);
    if (cached) {
      return cached.result;
    }

    // Perform Shooting Method calculation
    const shootingResult = this.shootingMethodSolver.solve(
      artilleryPosition,
      targetPosition,
      targetVelocity
    );

    // Calculate confidence based on convergence performance
    const confidence = this.calculateConfidence(shootingResult);

    // Calculate lead distance for user feedback
    const leadDistance =
      targetVelocity.magnitude() * (shootingResult.flightTime || 0);

    const result: RecommendedLeadResult = {
      leadAngle: {
        azimuth: this.normalizeAzimuth(shootingResult.azimuth),
        elevation: Math.max(5, Math.min(85, shootingResult.elevation)),
      },
      confidence,
      flightTime: shootingResult.flightTime,
      converged: shootingResult.converged,
      iterations: shootingResult.iterations,
      accuracy: shootingResult.finalError,
      leadDistance,
    };

    // Cache the result
    this.cacheResult(cacheKey, result, now);
    this.lastCalculationTime = now;

    return result;
  }

  /**
   * Calculate confidence based on Shooting Method performance
   */
  private calculateConfidence(
    result: ShootingResult
  ): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (!result.converged) {
      return 'LOW';
    }

    if (result.finalError < 5 && result.iterations < 8) {
      return 'HIGH'; // High precision, fast convergence
    } else if (result.finalError < 15 && result.iterations < 12) {
      return 'MEDIUM'; // Acceptable precision and convergence
    } else {
      return 'LOW'; // Poor precision or slow convergence
    }
  }

  /**
   * Normalize azimuth to 0-360 degree range
   */
  private normalizeAzimuth(azimuth: number): number {
    while (azimuth < 0) azimuth += 360;
    while (azimuth >= 360) azimuth -= 360;
    return azimuth;
  }

  /**
   * Generate cache key for position and velocity vectors
   */
  private generateCacheKey(
    artilleryPos: Vector3,
    targetPos: Vector3,
    targetVel: Vector3
  ): string {
    // Round to reasonable precision for caching (1m position, 1m/s velocity)
    const roundedArtillery = `${Math.round(artilleryPos.x)},${Math.round(artilleryPos.y)},${Math.round(artilleryPos.z)}`;
    const roundedTarget = `${Math.round(targetPos.x)},${Math.round(targetPos.y)},${Math.round(targetPos.z)}`;
    const roundedVelocity = `${Math.round(targetVel.x)},${Math.round(targetVel.y)},${Math.round(targetVel.z)}`;

    return `${roundedArtillery}|${roundedTarget}|${roundedVelocity}`;
  }

  /**
   * Get cached result if still valid
   */
  private getCachedResult(
    key: string,
    currentTime: number
  ): CachedResult | null {
    const cached = this.resultCache.get(key);
    if (cached && currentTime - cached.timestamp < this.CACHE_TTL) {
      return cached;
    }

    // Clean up expired entry
    if (cached) {
      this.resultCache.delete(key);
    }

    return null;
  }

  /**
   * Cache calculation result
   */
  private cacheResult(
    key: string,
    result: RecommendedLeadResult,
    timestamp: number,
    _ttl: number = this.CACHE_TTL
  ): void {
    // Clean up cache if it gets too large
    if (this.resultCache.size >= this.MAX_CACHE_SIZE) {
      this.cleanupCache(timestamp);
    }

    this.resultCache.set(key, {
      result,
      timestamp,
      key,
    });
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(currentTime: number): void {
    const entriesToDelete: string[] = [];

    for (const [key, cached] of this.resultCache.entries()) {
      if (currentTime - cached.timestamp > this.CACHE_TTL) {
        entriesToDelete.push(key);
      }
    }

    // If still too many entries, delete oldest ones
    if (
      this.resultCache.size - entriesToDelete.length >
      this.MAX_CACHE_SIZE * 0.8
    ) {
      const sortedEntries = Array.from(this.resultCache.entries()).sort(
        (a, b) => a[1].timestamp - b[1].timestamp
      );

      const toDelete = sortedEntries.slice(
        0,
        Math.floor(this.MAX_CACHE_SIZE * 0.3)
      );
      toDelete.forEach(([key]) => entriesToDelete.push(key));
    }

    entriesToDelete.forEach(key => this.resultCache.delete(key));
  }

  /**
   * Clear all cached results (useful for testing or parameter changes)
   */
  public clearCache(): void {
    this.resultCache.clear();
  }

  /**
   * Get cache statistics for debugging
   */
  public getCacheStats(): { size: number; hitRate?: number } {
    return {
      size: this.resultCache.size,
      // Hit rate tracking could be added if needed
    };
  }
}
