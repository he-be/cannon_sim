/**
 * Basic setup test to verify testing environment is working
 */

import { describe, it, expect, vi } from 'vitest';

// Mock requestAnimationFrame for test environment
Object.defineProperty(globalThis, 'requestAnimationFrame', {
  value: vi.fn((callback: FrameRequestCallback) =>
    globalThis.setTimeout(callback, 16)
  ),
  writable: true,
});

Object.defineProperty(globalThis, 'cancelAnimationFrame', {
  value: vi.fn((id: number) => globalThis.clearTimeout(id)),
  writable: true,
});

describe('Setup', () => {
  it('should run tests successfully', () => {
    expect(true).toBe(true);
  });

  it('should have access to browser globals', () => {
    expect(typeof window).toBe('object');
    expect(typeof document).toBe('object');
  });
});
