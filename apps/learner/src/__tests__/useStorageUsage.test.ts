import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useStorageUsage } from '../hooks/useStorageUsage.js';

describe('useStorageUsage', () => {
  it('returns storage usage info', async () => {
    Object.defineProperty(navigator, 'storage', {
      value: {
        estimate: vi.fn().mockResolvedValue({ usage: 5000, quota: 100000 }),
      },
      configurable: true,
    });

    const { result } = renderHook(() => useStorageUsage());
    expect(result.current).toBeDefined();
    expect(result.current).toHaveProperty('usage');
    expect(result.current).toHaveProperty('quota');
    expect(result.current).toHaveProperty('percentage');
  });
});
