/**
 * EffectRenderer - Clean implementation with proper component integration
 * Handles explosion effects and particle systems for Browser Artillery
 */

import { Vector3 } from '../../math/Vector3';
import { Vector2 } from '../../math/Vector2';
import { CanvasManager } from '../CanvasManager';

export interface ParticleState {
  position: Vector2;
  velocity: Vector2;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
}

export interface ExplosionConfig {
  position: Vector3;
  type: 'projectile_impact' | 'target_destruction';
  startTime: number;
  duration: number;
  maxRadius: number;
  particleCount: number;
}

export interface EffectRendererOptions {
  maxParticles: number;
  explosionDuration: number;
  particleLifetime: number;
}

/**
 * Manages visual effects with proper CanvasManager integration
 */
export class EffectRenderer {
  private particles: ParticleState[] = [];
  private explosions: ExplosionConfig[] = [];
  private options: EffectRendererOptions;
  private canvasManager: CanvasManager;
  private currentTime: number = 0;

  constructor(
    canvasManager: CanvasManager,
    options: Partial<EffectRendererOptions> = {}
  ) {
    this.canvasManager = canvasManager;
    this.options = {
      maxParticles: 500,
      explosionDuration: 1.5, // seconds
      particleLifetime: 2.0, // seconds
      ...options,
    };
  }

  /**
   * Create explosion effect at target destruction (GS-08)
   */
  createExplosion(
    position: Vector3,
    type: 'projectile_impact' | 'target_destruction'
  ): void {
    const explosion: ExplosionConfig = {
      position: position.copy(),
      type,
      startTime: this.currentTime,
      duration: this.options.explosionDuration,
      maxRadius: type === 'target_destruction' ? 50 : 30,
      particleCount: type === 'target_destruction' ? 30 : 15,
    };

    this.explosions.push(explosion);
    this.spawnParticles(explosion);
  }

  /**
   * Update all active effects
   */
  update(deltaTime: number): void {
    this.currentTime += deltaTime;

    // Update particles
    this.updateParticles(deltaTime);

    // Clean up expired explosions
    this.explosions = this.explosions.filter(
      explosion => this.currentTime - explosion.startTime < explosion.duration
    );
  }

  /**
   * Render all active effects using CanvasManager
   */
  render(): void {
    this.renderExplosions();
    this.renderParticles();
  }

  /**
   * Clear all active effects
   */
  clearAll(): void {
    this.particles.length = 0;
    this.explosions.length = 0;
    this.currentTime = 0;
  }

  /**
   * Get current effect statistics
   */
  getStats(): { particleCount: number; explosionCount: number } {
    return {
      particleCount: this.particles.length,
      explosionCount: this.explosions.length,
    };
  }

  /**
   * Update effect system options
   */
  updateOptions(options: Partial<EffectRendererOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Spawn particle system for explosion
   */
  private spawnParticles(explosion: ExplosionConfig): void {
    const screenPos = this.worldToScreen(explosion.position);
    if (!screenPos) return;

    for (let i = 0; i < explosion.particleCount; i++) {
      if (this.particles.length >= this.options.maxParticles) break;

      const angle =
        (Math.PI * 2 * i) / explosion.particleCount + Math.random() * 0.5;
      const speed = 50 + Math.random() * 100;
      const velocity = new Vector2(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed
      );

      const particle: ParticleState = {
        position: screenPos.copy(),
        velocity,
        life: this.options.particleLifetime * (0.5 + Math.random() * 0.5),
        maxLife: this.options.particleLifetime,
        size: 2 + Math.random() * 4,
        color: explosion.type === 'target_destruction' ? '#ff6600' : '#ffff00',
        alpha: 1.0,
      };

      this.particles.push(particle);
    }
  }

  /**
   * Update particle simulation
   */
  private updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];

      // Update position
      particle.position = particle.position.add(
        particle.velocity.multiply(deltaTime)
      );

      // Apply gravity
      particle.velocity.y += 200 * deltaTime;

      // Apply friction
      particle.velocity = particle.velocity.multiply(0.98);

      // Update life
      particle.life -= deltaTime;
      particle.alpha = Math.max(0, particle.life / particle.maxLife);

      // Remove expired particles
      if (particle.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  /**
   * Render explosion effects using CanvasManager
   */
  private renderExplosions(): void {
    this.canvasManager.save();

    this.explosions.forEach(explosion => {
      const elapsed = this.currentTime - explosion.startTime;
      const progress = Math.min(elapsed / explosion.duration, 1.0);

      const screenPos = this.worldToScreen(explosion.position);
      if (!screenPos) return;

      // Expanding ring effect
      const radius = explosion.maxRadius * progress;
      const alpha = 1.0 - progress;

      const ringColor =
        explosion.type === 'target_destruction' ? '#ff3300' : '#ffaa00';

      this.canvasManager.context.globalAlpha = alpha * 0.7;
      this.canvasManager.drawCircle(screenPos, radius, ringColor, false);

      // Inner flash
      if (progress < 0.3) {
        const flashColor =
          explosion.type === 'target_destruction' ? '#ffff99' : '#ffffff';
        this.canvasManager.context.globalAlpha = alpha;
        this.canvasManager.drawCircle(
          screenPos,
          radius * 0.5,
          flashColor,
          true
        );
      }
    });

    this.canvasManager.restore();
  }

  /**
   * Render particle effects using CanvasManager
   */
  private renderParticles(): void {
    this.canvasManager.save();

    this.particles.forEach(particle => {
      this.canvasManager.context.globalAlpha = particle.alpha;
      this.canvasManager.drawCircle(
        particle.position,
        particle.size,
        particle.color,
        true
      );
    });

    this.canvasManager.restore();
  }

  /**
   * Convert world coordinates to screen coordinates using CanvasManager
   */
  private worldToScreen(worldPos: Vector3): Vector2 | null {
    const center = this.canvasManager.center;

    if (!center || center.x === 0 || center.y === 0) {
      return null;
    }

    const scale = 0.1; // Should be externalized to Constants

    return new Vector2(
      center.x + worldPos.x * scale,
      center.y - worldPos.z * scale
    );
  }
}
