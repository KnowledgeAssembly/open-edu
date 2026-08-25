import { z } from 'zod';
import { WidgetCapabilitySchema } from './community-widget-manifest.js';

export const TrustTierSchema = z.enum(['native', 'trusted-remote', 'sandboxed']);
export type TrustTier = z.infer<typeof TrustTierSchema>;

const httpsPublicOrigin = z
  .string()
  .url()
  .refine(
    (val) => {
      try {
        const url = new URL(val);
        if (url.protocol !== 'https:') return false;
        const host = url.hostname.toLowerCase();
        if (host === 'localhost' || host.endsWith('.localhost')) return false;
        if (host === '127.0.0.1' || host === '::1' || host === '[::1]') return false;
        if (host.endsWith('.local')) return false;
        return true;
      } catch {
        return false;
      }
    },
    { message: 'allowedOrigins must be https public hosts' },
  );

export const WidgetPolicySchema = z.object({
  enabledTrustTiers: z.array(TrustTierSchema).min(1),
  allowedOrigins: z.array(httpsPublicOrigin).default([]),
  requireIntegrityForTrustedRemote: z.boolean().default(true),
  maxArtifactBytes: z
    .number()
    .int()
    .positive()
    .max(32 * 1024 * 1024),
  readyTimeoutMs: z.number().int().positive().max(60_000),
  experimentalWidgets: z.enum(['allow', 'deny']).default('deny'),
  maxHostBoundMessagesPerMinute: z.number().int().positive().default(120),
  registryCatalogOrigins: z.array(httpsPublicOrigin).default([]),
  grantedCapabilities: z
    .array(WidgetCapabilitySchema)
    .default([
      'resize',
      'telemetry-interaction',
      'state-persistence',
      'locale',
      'theme',
      'hints',
      'observe-mode',
    ]),
});

export type WidgetPolicy = z.infer<typeof WidgetPolicySchema>;

export const DEFAULT_WIDGET_POLICY: WidgetPolicy = WidgetPolicySchema.parse({
  enabledTrustTiers: ['native', 'sandboxed'],
  allowedOrigins: [],
  requireIntegrityForTrustedRemote: true,
  maxArtifactBytes: 2 * 1024 * 1024,
  readyTimeoutMs: 10_000,
  experimentalWidgets: 'deny',
  maxHostBoundMessagesPerMinute: 120,
  registryCatalogOrigins: [],
  grantedCapabilities: [
    'resize',
    'telemetry-interaction',
    'state-persistence',
    'locale',
    'theme',
    'hints',
    'observe-mode',
  ],
});

export function isTrustTierEnabled(policy: WidgetPolicy, tier: TrustTier): boolean {
  return policy.enabledTrustTiers.includes(tier);
}
