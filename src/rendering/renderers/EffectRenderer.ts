/**
 * EffectRenderer - Handles visual effects for Browser Artillery
 * Implements explosion effects, destruction feedback, and particle systems
 */

import { Vector3 } from '../../math/Vector3';
import { Vector2 } from '../../math/Vector2';

export interface Particle {
  position: Vector2;
  velocity: Vector2;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
}

export interface ExplosionEffect {
  position: Vector3;
  startTime: number;
  duration: number;
  maxRadius: number;
  particleCount: number;
  type: 'projectile_impact' | 'target_destruction';
}

export interface EffectSystemOptions {
  maxParticles: number;
  explosionDuration: number;
  particleLifetime: number;
  enableTrails: boolean;
}

/**
 * Manages visual effects for combat feedback
 */
export class EffectRenderer {
  private particles: Particle[] = [];
  private explosions: ExplosionEffect[] = [];
  private options: EffectSystemOptions;
  private ctx: CanvasRenderingContext2D;
  private currentTime: number = 0; // Track time internally

  constructor(
    ctx: CanvasRenderingContext2D,
    options?: Partial<EffectSystemOptions>
  ) {
    this.ctx = ctx;
    this.options = {
      maxParticles: 500,
      explosionDuration: 1.5, // seconds
      particleLifetime: 2.0, // seconds
      enableTrails: true,
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
    const explosion: ExplosionEffect = {
      position: position.copy(),
      startTime: this.currentTime,
      duration: this.options.explosionDuration,
      maxRadius: type === 'target_destruction' ? 50 : 30,
      particleCount: type === 'target_destruction' ? 30 : 15,
      type,
    };

    this.explosions.push(explosion);
    this.spawnParticles(explosion);
  }

  /**
   * Spawn particle system for explosion
   */
  private spawnParticles(explosion: ExplosionEffect): void {
    const screenPos = this.worldToScreen(explosion.position);
    if (!screenPos) return;

    for (let i = 0; i < explosion.particleCount; i++) {
      if (this.particles.length >= this.options.maxParticles) break;

      const angle =
        (Math.PI * 2 * i) / explosion.particleCount + Math.random() * 0.5;
      const speed = 50 + Math.random() * 100; // pixels per second
      const velocity = new Vector2(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed
      );

      const particle: Particle = {
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
   * Update particle simulation
   */
  private updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];

      // Update position
      particle.position = particle.position.add(
        particle.velocity.multiply(deltaTime)
      );

      // Apply gravity effect
      particle.velocity.y += 200 * deltaTime; // Gravity acceleration

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
   * Render all active effects
   */
  render(): void {
    this.renderExplosions();
    this.renderParticles();
  }

  /**
   * Render explosion effects
   */
  private renderExplosions(): void {
    this.explosions.forEach(explosion => {
      const elapsed = this.currentTime - explosion.startTime;
      const progress = Math.min(elapsed / explosion.duration, 1.0);

      const screenPos = this.worldToScreen(explosion.position);
      if (!screenPos) return;

      // Expand and fade out
      const radius = explosion.maxRadius * progress;
      const alpha = 1.0 - progress;

      // Draw explosion ring
      this.ctx.save();
      this.ctx.globalAlpha = alpha * 0.7;
      this.ctx.strokeStyle =
        explosion.type === 'target_destruction' ? '#ff3300' : '#ffaa00';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
      this.ctx.stroke();

      // Draw inner flash
      if (progress < 0.3) {
        this.ctx.globalAlpha = alpha;
        this.ctx.fillStyle =
          explosion.type === 'target_destruction' ? '#ffff99' : '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(screenPos.x, screenPos.y, radius * 0.5, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.restore();
    });
  }

  /**
   * Render particle effects
   */
  private renderParticles(): void {
    this.ctx.save();

    this.particles.forEach(particle => {
      this.ctx.globalAlpha = particle.alpha;
      this.ctx.fillStyle = particle.color;

      this.ctx.beginPath();
      this.ctx.arc(
        particle.position.x,
        particle.position.y,
        particle.size,
        0,
        Math.PI * 2
      );
      this.ctx.fill();
    });

    this.ctx.restore();
  }

  /**
   * Convert world coordinates to screen coordinates
   * This is a simplified version - in full implementation would use proper camera transform
   */
  private worldToScreen(worldPos: Vector3): Vector2 | null {
    // Simple orthographic projection for now
    // In full implementation, this would use the camera/radar coordinate system
    const centerX = this.ctx.canvas.width / 2;
    const centerY = this.ctx.canvas.height / 2;
    const scale = 0.1; // meters to pixels scaling

    return new Vector2(
      centerX + worldPos.x * scale,
      centerY - worldPos.y * scale // Flip Y axis for screen coordinates
    );
  }

  /**
   * Clear all active effects
   */
  clearAll(): void {
    this.particles.length = 0;
    this.explosions.length = 0;
    this.currentTime = 0; // Reset time
  }

  /**
   * Get current effect statistics for debugging
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
  updateOptions(options: Partial<EffectSystemOptions>): void {
    this.options = { ...this.options, ...options };
  }
}
