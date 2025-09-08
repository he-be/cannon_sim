/**
 * Basic setup test to verify testing environment is working
 */

import { describe, it, expect } from 'vitest';

describe('Setup', () => {
  it('should run tests successfully', () => {
    expect(true).toBe(true);
  });

  it('should have access to browser globals', () => {
    expect(typeof window).toBe('object');
    expect(typeof document).toBe('object');
  });
});
