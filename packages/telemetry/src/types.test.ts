import { describe, it, expect } from 'vitest';
import type { TelemetryEmitResult, Persister } from './types';

describe('types', () => {
  it('TelemetryEmitResult should be a valid type', () => {
    const result: TelemetryEmitResult = { success: true, event: undefined as any };
    expect(result.success).toBe(true);
  });

  it('Persister should be a valid interface', () => {
    const persister: Persister = {
      write: async () => {},
      flush: async () => {},
      close: async () => {},
    };
    expect(persister.write).toBeDefined();
    expect(persister.flush).toBeDefined();
    expect(persister.close).toBeDefined();
  });
});
