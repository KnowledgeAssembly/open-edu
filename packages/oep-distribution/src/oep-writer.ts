import { zipSync, strToU8 } from 'fflate';
import type { DistributionManifest } from '@open-edu/schemas';
import { computeSha256 } from './checksum.js';
import { OEP_CONTENT_ROOT } from './types.js';

export interface OepBuildInput {
  manifest: DistributionManifest;
  courseFiles: Map<string, Uint8Array>;
}

export interface OepBuildResult {
  bytes: Uint8Array;
  checksumValue: string;
}

export class OepWriter {
  static async build(input: OepBuildInput): Promise<OepBuildResult> {
    const manifest = { ...input.manifest };

    const checksumValue = await computeContentChecksum(input.courseFiles);

    manifest.checksum = { algorithm: 'sha256', value: checksumValue };
    const zipEntries = buildZipEntries(manifest, input.courseFiles);
    const finalBytes = zipSync(zipEntries);

    return { bytes: finalBytes, checksumValue };
  }
}

async function computeContentChecksum(courseFiles: Map<string, Uint8Array>): Promise<string> {
  const sortedPaths = Array.from(courseFiles.keys()).sort();
  const hash = await computeSha256(new TextEncoder().encode(sortedPaths.join('\n')));
  return hash;
}

function buildZipEntries(
  manifest: DistributionManifest,
  courseFiles: Map<string, Uint8Array>,
): Record<string, Uint8Array> {
  const entries: Record<string, Uint8Array> = {};
  const manifestJson = JSON.stringify(manifest, null, 2);
  entries['manifest.json'] = strToU8(manifestJson);

  for (const [relativePath, content] of courseFiles) {
    const sanitizedPath = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
    entries[`${OEP_CONTENT_ROOT}${sanitizedPath}`] = content;
  }

  entries[`${OEP_CONTENT_ROOT}`] = new Uint8Array(0);
  return entries;
}
