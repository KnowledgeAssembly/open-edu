import { describe, it, expect } from 'vitest';
import { frameSrcCsp } from './widget-policy';

describe('frameSrcCsp', () => {
  it('empty allowlist → frame-src self', () => {
    expect(frameSrcCsp([])).toBe("frame-src 'self'");
  });
  it('includes allowlisted origins', () => {
    expect(frameSrcCsp(['https://widgets.example.edu', 'https://cdn.example.com'])).toBe(
      "frame-src 'self' https://widgets.example.edu https://cdn.example.com",
    );
  });
});
