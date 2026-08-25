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

  it('counts bytes not UTF-16 code units for multi-byte payloads', () => {
    const emoji = '\u{1F600}';
    const serialized = JSON.stringify(emoji);
    const codeUnits = serialized.length;
    const byteLength = new TextEncoder().encode(serialized).byteLength;
    expect(byteLength).toBeGreaterThan(codeUnits);
    expect(() => assertPersistableState(emoji, byteLength)).not.toThrow();
    expect(() => assertPersistableState(emoji, byteLength - 1)).toThrow('too-large');
  });

  it('throws on circular references', () => {
    const obj: Record<string, unknown> = {};
    obj.self = obj;
    expect(() => assertPersistableState(obj)).toThrow();
  });
});
