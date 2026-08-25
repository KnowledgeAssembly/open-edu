import { describe, it, expect } from 'vitest';
import { assertPersistableState } from './state-migration.js';

describe('assertPersistableState', () => {
  it('allows a small object', () => {
    expect(() => assertPersistableState({ count: 1 })).not.toThrow();
  });

  it('rejects a large serialized payload', () => {
    expect(() => assertPersistableState('x'.repeat(70 * 1024))).toThrow('too-large');
  });

  it('honors a custom maxBytes limit', () => {
    expect(() => assertPersistableState({ count: 1 }, 10)).toThrow('too-large');
    expect(() => assertPersistableState(1, 10)).not.toThrow();
  });
});
