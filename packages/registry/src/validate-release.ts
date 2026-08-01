import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { RegistryMetadataSchema } from '@open-edu/schemas';
import { computeSha256, OepReader } from '@open-edu/oep-distribution';
import {
  getReleaseByTag,
  fetchAssetBytes,
  parseReleaseTag,
  parseChecksums,
  type GithubRelease,
} from './github.js';

const reader = new OepReader();

export interface ValidateReleaseOptions {
  repo: string;
  tag: string;
  token?: string;
  coursesDir?: string;
  getRelease?: (repo: string, tag: string, token?: string) => Promise<GithubRelease>;
  fetchAsset?: (url: string) => Promise<Uint8Array>;
}

export interface ReleaseValidationResult {
  id: string;
  version: string;
  oepName: string;
  sizeBytes: number;
  checksum: string;
}

export async function validateRelease({
  repo,
  tag,
  token,
  coursesDir = 'courses',
  getRelease = getReleaseByTag,
  fetchAsset = fetchAssetBytes,
}: ValidateReleaseOptions): Promise<ReleaseValidationResult> {
  const parsed = parseReleaseTag(tag);
  if (!parsed) {
    throw new Error(`release tag "${tag}" must match <id>-v<major>.<minor>.<patch>`);
  }
  const { id, version } = parsed;

  const metadataPath = join(coursesDir, id, 'metadata.json');
  if (!existsSync(metadataPath)) {
    throw new Error(
      `courses/${id}/metadata.json does not exist; add metadata before publishing a release`,
    );
  }
  const metadata: unknown = JSON.parse(readFileSync(metadataPath, 'utf8'));
  if (!RegistryMetadataSchema.safeParse(metadata).success) {
    throw new Error(`courses/${id}/metadata.json is invalid`);
  }

  const release = await getRelease(repo, tag, token);
  const assets = release.assets ?? [];
  const oepName = `${id}-${version}.oep`;

  const oepAsset = assets.find((a) => a.name === oepName);
  if (!oepAsset) throw new Error(`release "${tag}" is missing asset "${oepName}"`);

  const checksumsAsset = assets.find((a) => a.name === 'checksums.txt');
  if (!checksumsAsset) throw new Error('release is missing the "checksums.txt" asset');

  const oepBytes = await fetchAsset(oepAsset.browser_download_url);
  const computed = await computeSha256(oepBytes);

  const checksumsText = new TextDecoder().decode(
    await fetchAsset(checksumsAsset.browser_download_url),
  );
  const declared = parseChecksums(checksumsText).get(oepName);
  if (!declared) throw new Error(`checksums.txt does not contain an entry for "${oepName}"`);
  if (declared !== computed) {
    throw new Error(`checksums.txt says ${declared} but the asset hashes to ${computed}`);
  }

  const inspection = await reader.inspect(oepBytes);
  if (inspection.id !== id) {
    throw new Error(`.oep manifest id "${inspection.id}" does not match release id "${id}"`);
  }
  if (inspection.version !== version) {
    throw new Error(
      `.oep manifest version "${inspection.version}" does not match release version "${version}"`,
    );
  }

  return { id, version, oepName, sizeBytes: oepBytes.length, checksum: computed };
}
