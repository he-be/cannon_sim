# T051 Shooting Method Implementation - Troubleshooting Log

## Overview

This document tracks the implementation and debugging process of the Shooting Method algorithm for accurate ballistic calculations in Browser Artillery. The goal was to replace placeholder implementations with mathematically rigorous Newton-Raphson convergence.

## Initial Problem Statement

- **Goal**: Implement Shooting Method for hitting moving targets at long range (15km+, 800m altitude)
- **Expected Solution**: Lead angle around 13.3° elevation
- **Observed Issue**: Algorithm shows 21° elevation consistently, suggesting fallback implementation usage

## Implementation Timeline

### Phase 1: Basic Implementation (T051.1-T051.3) ✅

**What was done:**

- Created `ShootingMethodSolver.ts` with Newton-Raphson method
- Implemented 3x2 overdetermined system (3D spatial error, 2 angle variables)
- Added Jacobian matrix calculation with numerical differentiation
- Set 15-iteration limit with 10m convergence tolerance

**Result:** Basic structure complete, but not tested with real scenarios.

### Phase 2: Integration (T052-T053) ✅

**What was done:**

- Integrated Shooting Method into `LeadAngleCalculator.ts`
- Completely removed fallback implementations to force Shooting Method usage
- Added performance optimization (caching, rate limiting)
- Fixed runtime errors in `GameScene.ts` and `Artillery.ts`

**Result:** System functional but showing convergence issues.

### Phase 3: 3D Trajectory Bug Fix (T055) ✅ - CRITICAL FIX

**Problem discovered:**

```
// WRONG: Trajectory terminated at ground level (Z=0)
if (newState.position.z <= 0) {
  return { endPosition: groundPosition, flightTime: time };
}
```

**What was wrong:**

- Projectile trajectory terminated when hitting ground (Z=0)
- For airborne targets at 800m altitude, this created impossible error calculations
- Error vector: (Xi-Xt, Yi-Yt, 0-800) = (ΔX, ΔY, -800m)
- Z-axis always had -800m error → convergence impossible

**Fix implemented:**

```typescript
// CORRECT: Terminate at target altitude
const terminationAltitude = targetPosition.z; // 800m
if (projectile crosses terminationAltitude) {
  return interpolated_intersection_point;
}
```

**Result:** Major improvement, but convergence still problematic.

### Phase 4: Convergence Optimization (T054, T056) ⚠️ MIXED RESULTS

**What was tried:**

1. **Jacobian perturbation**: 0.01° → 0.1° → 0.5°
2. **Damping factors**: Removed conservative damping for large errors
3. **Maximum corrections**: Increased from 5° to 20° per iteration
4. **Linear system**: Simplified 3x2 to 2x2 → Reverted to 3x2 (CORRECT)

**Damping evolution:**

```typescript
// Initial: Very conservative
dampingFactor = Math.min(1.0, 10.0 / errorMagnitude);

// Modified: Less damping for large errors
if (errorMagnitude > 5000.0) dampingFactor = 1.0; // No damping

// Final: Aggressive for large errors
if (errorMagnitude > 5000.0) dampingFactor = 0.7;
```

**Results:** Some improvement in step sizes, but fundamental oscillation remained.

### Phase 5: Oscillation Problem (T057) ❌ BAND-AID SOLUTION

**Observed pattern:**

```
El: 10.91° → 3.22° → 23.22° → 3.31° → 23.30° → 3.31°
Error: 9176m → 38011m → 13108m → 37995m → 13115m → 37993m
```

**What was tried:**

- Oscillation detection algorithm (error history analysis)
- Extreme damping (0.1) when oscillation detected
- Maximum correction limits (2-5 degrees)

**What was wrong:** Treating symptoms instead of root cause.

### Phase 6: Current Status - Root Cause Analysis ✅ FACTS ESTABLISHED

**Fact-finding logs revealed:**

#### Initial Guess Behavior (CORRECT):

```
TRAJECTORY START: Az=-113.36°, El=10.91°, Target=800m
TRAJECTORY END: Crossed 800m at range=5776m, time=8.38s, maxAlt=800m
```

- Projectile successfully reaches 800m altitude
- Takes 8.38 seconds, reasonable flight time
- Max altitude exactly 800m (target altitude)

#### After Newton-Raphson Correction (BROKEN):

```
TRAJECTORY START: Az=245.80°, El=7.51°, Target=800m
TRAJECTORY TIMEOUT: At range=29790m, alt=-31414m, time=120.02s
```

- Azimuth changed from -113° to 246° (wrong direction)
- Projectile flies 30km and ends up 31km underground
- Clearly indicates fundamental calculation error

## Identified Root Causes

### 1. Direction/Coordinate System Issues ❌ UNRESOLVED

- Initial azimuth: -113° (Northwest direction)
- After correction: 246° (Southwest direction)
- **Problem**: These point in completely different directions
- **Likely cause**: Azimuth normalization or coordinate system confusion

### 2. Trajectory Termination Logic ❌ PARTIALLY UNDERSTOOD

**Current understanding:**

- Algorithm stops at first 800m altitude crossing (at 5.8km range)
- Target is actually at 15km range, 800m altitude
- **Problem**: Not checking if projectile reaches target's X,Y coordinates

**Confusion point:** What should the termination condition be?

- Option A: Projectile crosses target altitude anywhere along trajectory?
- Option B: Projectile reaches target's 2D coordinates (X,Y) and check altitude there?
- Option C: Projectile gets closest to target's 3D position (X,Y,Z)?

### 3. Newton-Raphson Correction Magnitude 🔍 UNCLEAR

- Large angle corrections (7-20 degrees) causing overshooting
- Damping factors may be insufficient
- **Question**: Are corrections computed correctly, or is input data wrong?

## Current Blocked Issues

### Issue 1: Azimuth Direction Problem

```
Target at (-13890, -6000, 800) → should point Northwest (-113°)
After correction → points Southwest (246°)
```

**Need to investigate**: Azimuth calculation and normalization logic.

### Issue 2: Target Intersection Definition

**Question**: When does a projectile "hit" a target at (X,Y,Z)?

- When trajectory passes through exact 3D coordinates?
- When trajectory reaches horizontal distance and matches altitude?
- When trajectory gets closest to target position?

### Issue 3: Physics Validation

**Need to verify**: Do 10.91° elevation shots actually reach 800m altitude at 15km range?

- Theoretical calculation needed
- Compare with simulation results
