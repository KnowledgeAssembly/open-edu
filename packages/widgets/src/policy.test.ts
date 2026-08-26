import { describe, it, expect } from 'vitest';
import { DEFAULT_WIDGET_POLICY, type WidgetPolicy } from '@open-edu/schemas';
import { assertTrustedRemoteAllowed, originOf } from './policy';

describe('assertTrustedRemoteAllowed', () => {
  const policy: WidgetPolicy = {
    ...DEFAULT_WIDGET_POLICY,
    enabledTrustTiers: ['native', 'sandboxed', 'trusted-remote'],
    allowedOrigins: ['https://cdn.example.com'],
  };

  it('allows an https origin on the allowlist', () => {
    expect(() =>
      assertTrustedRemoteAllowed('https://cdn.example.com/widgets/a.js', policy),
    ).not.toThrow();
  });

  it('rejects file, data, blob, http, and off-allowlist hosts', () => {
    expect(() => assertTrustedRemoteAllowed('file:///tmp/w.js', policy)).toThrow();
    expect(() => assertTrustedRemoteAllowed('https://evil.example/w.js', policy)).toThrow();
    expect(() => assertTrustedRemoteAllowed('http://cdn.example.com/w.js', policy)).toThrow();
  });

  it('rejects trusted-remote when the tier is disabled', () => {
    expect(() =>
      assertTrustedRemoteAllowed('https://cdn.example.com/w.js', DEFAULT_WIDGET_POLICY),
    ).toThrow(/trusted-remote/);
  });
});

describe('originOf', () => {
  it('returns scheme + host + port', () => {
    expect(originOf('https://cdn.example.com:8443/a.js')).toBe('https://cdn.example.com:8443');
  });
});
