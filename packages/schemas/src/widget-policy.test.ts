import { describe, it, expect } from 'vitest';
import { WidgetPolicySchema, DEFAULT_WIDGET_POLICY } from './widget-policy';

describe('WidgetPolicySchema', () => {
  it('parses the default policy with trusted-remote disabled', () => {
    const policy = WidgetPolicySchema.parse(DEFAULT_WIDGET_POLICY);
    expect(policy.enabledTrustTiers).toEqual(['native', 'sandboxed']);
    expect(policy.requireIntegrityForTrustedRemote).toBe(true);
    expect(policy.maxArtifactBytes).toBe(2 * 1024 * 1024);
    expect(policy.readyTimeoutMs).toBe(10_000);
  });

  it('rejects unknown trust tiers', () => {
    expect(() =>
      WidgetPolicySchema.parse({ ...DEFAULT_WIDGET_POLICY, enabledTrustTiers: ['host'] }),
    ).toThrow();
  });

  it('rejects loopback origins in allowedOrigins', () => {
    expect(() =>
      WidgetPolicySchema.parse({
        ...DEFAULT_WIDGET_POLICY,
        allowedOrigins: ['https://127.0.0.1'],
      }),
    ).toThrow();
  });

  it('defaults registryCatalogOrigins to empty array', () => {
    const policy = WidgetPolicySchema.parse(DEFAULT_WIDGET_POLICY);
    expect(policy.registryCatalogOrigins).toEqual([]);
  });

  it('rejects loopback origins in registryCatalogOrigins', () => {
    expect(() =>
      WidgetPolicySchema.parse({
        ...DEFAULT_WIDGET_POLICY,
        registryCatalogOrigins: ['https://127.0.0.1'],
      }),
    ).toThrow();
  });

  it('grants all seven v1 capabilities by default', () => {
    const policy = WidgetPolicySchema.parse(DEFAULT_WIDGET_POLICY);
    expect(policy.grantedCapabilities).toEqual([
      'resize',
      'telemetry-interaction',
      'state-persistence',
      'locale',
      'theme',
      'hints',
      'observe-mode',
    ]);
  });

  it('parses a restricted grantedCapabilities override', () => {
    const policy = WidgetPolicySchema.parse({
      ...DEFAULT_WIDGET_POLICY,
      grantedCapabilities: ['resize'],
    });
    expect(policy.grantedCapabilities).toEqual(['resize']);
  });
});
