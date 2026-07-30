import { z } from 'zod';

export const OEP_FORMAT = 'openedu-package' as const;
export const OEP_FORMAT_VERSION = 1 as const;
export const OEP_BUNDLE_CONTENT_ROOT = 'bundle/' as const;

export const ChecksumSchema = z.object({
  algorithm: z.literal('sha256'),
  value: z.string().regex(/^[a-f0-9]{64}$/, 'must be a 64-char hex SHA-256 hash'),
});

export type DistributionChecksum = z.infer<typeof ChecksumSchema>;

export const SignatureStatusSchema = z.object({
  status: z.enum(['unsigned', 'verified', 'invalid', 'untrusted']),
  verifiedAt: z.string().optional(),
  verifiedBy: z.string().optional(),
});

export type SignatureStatus = z.infer<typeof SignatureStatusSchema>;

export const DistributionManifestSchema = z.object({
  format: z.literal(OEP_FORMAT),
  formatVersion: z.literal(OEP_FORMAT_VERSION),
  type: z.enum(['course', 'bundle']).default('course'),
  id: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[a-z0-9][a-z0-9_-]*$/, 'must be kebab-case'),
  version: z
    .string()
    .min(1)
    .max(64)
    .regex(/^\d+\.\d+\.\d+$/, 'must be semver (e.g. 1.0.0)'),
  title: z.string().min(1).max(256),
  contentRoot: z.string().default('course/'),
  checksum: ChecksumSchema,
  signature: SignatureStatusSchema.default({ status: 'unsigned' }),
});

export type DistributionManifest = z.infer<typeof DistributionManifestSchema>;
