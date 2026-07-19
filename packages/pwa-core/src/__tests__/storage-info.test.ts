import { describe, it, expect, vi } from 'vitest';
import { getStorageUsage } from '../storage-info.js';

describe('Storage info', () => {
  it('returns storage usage information', async () => {
    Object.defineProperty(navigator, 'storage', {
      value: {
        estimate: vi.fn().mockResolvedValue({ usage: 1024, quota: 1024 * 1024 * 100 }),
      },
      writable: true,
      configurable: true,
    });

    const usage = await getStorageUsage();
    expect(usage.usage).toBe(1024);
    expect(usage.quota).toBe(1024 * 1024 * 100);
    expect(usage.percentage).toBeCloseTo(0.001);
  });

  it('handles missing storage API gracefully', async () => {
    Object.defineProperty(navigator, 'storage', { value: undefined, configurable: true });
    const usage = await getStorageUsage();
    expect(usage.usage).toBe(0);
    expect(usage.quota).toBe(0);
  });
});
