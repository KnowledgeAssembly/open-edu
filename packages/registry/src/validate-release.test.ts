import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { OepWriter } from '@open-edu/oep-distribution';
import { OEP_FORMAT, OEP_FORMAT_VERSION } from '@open-edu/schemas';
import type { GithubRelease } from './github.js';
import { validateRelease } from './validate-release.js';

let tmp: string;
let oepBytes: Uint8Array;
let oepSha: string;

beforeAll(async () => {
  tmp = mkdtempSync(join(tmpdir(), 'open-edu-registry-'));
  mkdirSync(join(tmp, 'courses', 'tribal-art'), { recursive: true });
  writeFileSync(
    join(tmp, 'courses', 'tribal-art', 'metadata.json'),
    JSON.stringify({
      id: 'tribal-art',
      name: 'Indian Tribal Art',
      author: 'OpenEdu Authors',
      license: 'CC-BY-SA-4.0',
      languages: ['en'],
    }),
  );

  const { bytes } = await OepWriter.build({
    manifest: {
      format: OEP_FORMAT,
      formatVersion: OEP_FORMAT_VERSION,
      id: 'tribal-art',
      version: '0.4.0',
      title: 'Indian Tribal Art',
      contentRoot: 'course/',
      checksum: { algorithm: 'sha256', value: '' },
      signature: { status: 'unsigned' },
    },
    courseFiles: new Map([
      [
        'package.json',
        new TextEncoder().encode(
          JSON.stringify({
            id: 'tribal-art',
            title: 'Indian Tribal Art',
            version: '0.4.0',
            author: 'X',
            entry: 'nodes/welcome.md',
          }),
        ),
      ],
      ['nodes/welcome.md', new TextEncoder().encode('# Welcome\n')],
    ]),
  });
  oepBytes = bytes;
  const { computeSha256 } = await import('@open-edu/oep-distribution');
  oepSha = await computeSha256(bytes);
});

afterAll(() => {
  rmSync(tmp, { recursive: true, force: true });
});

function fakeRelease(overrides: Partial<GithubRelease> = {}): GithubRelease {
  return {
    tag_name: 'tribal-art-v0.4.0',
    draft: false,
    prerelease: false,
    assets: [
      {
        name: 'tribal-art-0.4.0.oep',
        size: oepBytes.length,
        browser_download_url: 'https://example.com/tribal-art-0.4.0.oep',
      },
      {
        name: 'checksums.txt',
        size: 100,
        browser_download_url: 'https://example.com/checksums.txt',
      },
    ],
    ...overrides,
  };
}

describe('validateRelease', () => {
  it('rejects a non-conforming tag', async () => {
    await expect(
      validateRelease({
        repo: 'acme/openedu-library',
        tag: 'bad-tag',
        coursesDir: join(tmp, 'courses'),
      }),
    ).rejects.toThrow(/must match <id>-v<major>\.<minor>\.<patch>/);
  });

  it('rejects a release whose metadata is missing', async () => {
    await expect(
      validateRelease({
        repo: 'acme/openedu-library',
        tag: 'ghost-course-v0.1.0',
        coursesDir: join(tmp, 'courses'),
        getRelease: async () => fakeRelease({ tag_name: 'ghost-course-v0.1.0' }),
      }),
    ).rejects.toThrow(/metadata.json does not exist/);
  });

  it('accepts a valid release', async () => {
    const result = await validateRelease({
      repo: 'acme/openedu-library',
      tag: 'tribal-art-v0.4.0',
      coursesDir: join(tmp, 'courses'),
      getRelease: async () => fakeRelease(),
      fetchAsset: async (url: string) => {
        if (url.endsWith('checksums.txt')) {
          return new TextEncoder().encode(`${oepSha}  tribal-art-0.4.0.oep\n`);
        }
        return oepBytes;
      },
    });
    expect(result.id).toBe('tribal-art');
    expect(result.version).toBe('0.4.0');
    expect(result.checksum).toBe(oepSha);
  });

  it('fails when checksums.txt disagrees', async () => {
    await expect(
      validateRelease({
        repo: 'acme/openedu-library',
        tag: 'tribal-art-v0.4.0',
        coursesDir: join(tmp, 'courses'),
        getRelease: async () => fakeRelease(),
        fetchAsset: async (url: string) => {
          if (url.endsWith('checksums.txt')) {
            return new TextEncoder().encode(`${'e'.repeat(64)}  tribal-art-0.4.0.oep\n`);
          }
          return oepBytes;
        },
      }),
    ).rejects.toThrow(/checksums.txt says/);
  });
});
