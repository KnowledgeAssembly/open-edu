import { describe, it, expect } from 'vitest';
import {
  DistributionManifestSchema,
  ChecksumSchema,
  SignatureStatusSchema,
  OEP_FORMAT,
  OEP_FORMAT_VERSION,
} from './distribution-manifest';

describe('ChecksumSchema', () => {
  it('accepts valid sha256 hex', () => {
    const result = ChecksumSchema.safeParse({
      algorithm: 'sha256',
      value: 'a'.repeat(64),
    });
    expect(result.success).toBe(true);
  });

  it('rejects wrong-length hex', () => {
    const result = ChecksumSchema.safeParse({
      algorithm: 'sha256',
      value: 'a'.repeat(63),
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-hex characters', () => {
    const result = ChecksumSchema.safeParse({
      algorithm: 'sha256',
      value: 'g'.repeat(64),
    });
    expect(result.success).toBe(false);
  });
});

describe('SignatureStatusSchema', () => {
  it('accepts unsigned', () => {
    const result = SignatureStatusSchema.safeParse({ status: 'unsigned' });
    expect(result.success).toBe(true);
  });

  it('accepts verified with metadata', () => {
    const result = SignatureStatusSchema.safeParse({
      status: 'verified',
      verifiedAt: '2026-01-01T00:00:00Z',
      verifiedBy: 'test-key',
    });
    expect(result.success).toBe(true);
  });
});

describe('DistributionManifestSchema', () => {
  const validManifest = {
    format: 'openedu-package' as const,
    formatVersion: 1 as const,
    id: 'science-grade7',
    version: '1.0.0',
    title: 'Science Grade 7',
    checksum: { algorithm: 'sha256' as const, value: 'a'.repeat(64) },
  };

  it('accepts minimal valid manifest', () => {
    const result = DistributionManifestSchema.safeParse(validManifest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.contentRoot).toBe('course/');
      expect(result.data.signature.status).toBe('unsigned');
    }
  });

  it('defaults contentRoot to course/', () => {
    const result = DistributionManifestSchema.safeParse(validManifest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.contentRoot).toBe('course/');
    }
  });

  it('rejects bad id format', () => {
    const result = DistributionManifestSchema.safeParse({
      ...validManifest,
      id: 'INVALID ID',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-semver version', () => {
    const result = DistributionManifestSchema.safeParse({
      ...validManifest,
      version: 'latest',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing checksum', () => {
    const { checksum: _, ...noChecksum } = validManifest;
    const result = DistributionManifestSchema.safeParse(noChecksum);
    expect(result.success).toBe(false);
  });

  it('accepts with explicit signature', () => {
    const result = DistributionManifestSchema.safeParse({
      ...validManifest,
      signature: { status: 'verified', verifiedAt: '2026-01-01T00:00:00Z', verifiedBy: 'key-1' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts type: "bundle"', () => {
    const result = DistributionManifestSchema.safeParse({
      format: OEP_FORMAT,
      formatVersion: OEP_FORMAT_VERSION,
      type: 'bundle',
      id: 'my-bundle',
      version: '1.0.0',
      title: 'My Bundle',
      checksum: { algorithm: 'sha256', value: 'a'.repeat(64) },
      contentRoot: 'bundle/',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.type).toBe('bundle');
  });

  it('defaults type to "course" when omitted', () => {
    const result = DistributionManifestSchema.safeParse({
      format: OEP_FORMAT,
      formatVersion: OEP_FORMAT_VERSION,
      id: 'c',
      version: '1.0.0',
      title: 'C',
      checksum: { algorithm: 'sha256', value: 'a'.repeat(64) },
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.type).toBe('course');
  });
});
