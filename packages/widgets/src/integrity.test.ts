import { describe, it, expect } from 'vitest';
import { canonicalIntegrity, parseIntegrity, verifyIntegrity, IntegrityError } from './integrity';

describe('integrity', () => {
  it('canonicalIntegrity is sha256- plus 64 lowercase hex', async () => {
    const digest = await canonicalIntegrity(new TextEncoder().encode('hello'));
    expect(digest).toMatch(/^sha256-[a-f0-9]{64}$/);
  });

  it('verifyIntegrity accepts a matching digest', async () => {
    const bytes = new TextEncoder().encode('hello');
    const digest = await canonicalIntegrity(bytes);
    await expect(verifyIntegrity(bytes, digest)).resolves.toBe(true);
  });

  it('parseIntegrity rejects missing prefix, uppercase hex, and wrong length', () => {
    expect(() => parseIntegrity('abc')).toThrow(IntegrityError);
    expect(() => parseIntegrity('sha256-' + 'A'.repeat(64).toLowerCase().toUpperCase())).toThrow(
      IntegrityError,
    );
    expect(() => parseIntegrity('sha256-deadbeef')).toThrow(IntegrityError);
  });

  it('verifyIntegrity throws IntegrityError on mismatch', async () => {
    const bytes = new TextEncoder().encode('hello');
    await expect(verifyIntegrity(bytes, 'sha256-' + '0'.repeat(64))).rejects.toThrow(
      IntegrityError,
    );
  });
});
