import { describe, it, expect } from 'vitest';
import { computeSha256 } from './checksum';

describe('computeSha256', () => {
  it('returns 64-char hex for empty input', async () => {
    const hash = await computeSha256(new Uint8Array(0));
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('returns consistent hash for same input', async () => {
    const data = new TextEncoder().encode('hello world');
    const a = await computeSha256(data);
    const b = await computeSha256(data);
    expect(a).toBe(b);
  });

  it('returns different hash for different input', async () => {
    const a = await computeSha256(new TextEncoder().encode('hello'));
    const b = await computeSha256(new TextEncoder().encode('world'));
    expect(a).not.toBe(b);
  });

  it('handles binary data', async () => {
    const data = new Uint8Array([0x00, 0xff, 0x42, 0x7f]);
    const hash = await computeSha256(data);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
