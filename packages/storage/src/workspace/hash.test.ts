import { describe, it, expect } from 'vitest';
import { hashBytes, sha256Hex } from './hash.js';

describe('hashBytes', () => {
  it('produces the known SHA-256 vector for "abc"', async () => {
    const data = new TextEncoder().encode('abc');
    expect(await hashBytes(data)).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('hashes the empty input deterministically', async () => {
    expect(await hashBytes(new Uint8Array())).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('resolves for a large input without throwing', async () => {
    const data = new Uint8Array(1_000_000);
    for (let i = 0; i < data.length; i++) data[i] = i % 251;
    const digest = await sha256Hex(data);
    expect(digest).toHaveLength(64);
  });

  it('is content-sensitive', async () => {
    const a = await hashBytes(new TextEncoder().encode('one'));
    const b = await hashBytes(new TextEncoder().encode('two'));
    expect(a).not.toBe(b);
  });
});
