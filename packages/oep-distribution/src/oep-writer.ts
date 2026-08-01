import { zipSync, strToU8 } from 'fflate';
import { BundleManifestSchema } from '@open-edu/schemas';
import type { DistributionManifest, BundleManifest } from '@open-edu/schemas';
import { computeSha256 } from './checksum.js';
import { OEP_CONTENT_ROOT, BUNDLE_DIR } from './types.js';
import { createLogger } from '@open-edu/logger';

const writerLogger = createLogger({ scope: 'oep:writer' });

type RelaxedManifest = Omit<DistributionManifest, 'type'> & { type?: 'course' | 'bundle' };

export interface OepBuildInput {
  manifest: RelaxedManifest;
  courseFiles: Map<string, Uint8Array>;
}

export interface OepBundleBuildInput {
  manifest: RelaxedManifest;
  bundleManifest: BundleManifest;
  moduleFiles: Map<string, Map<string, Uint8Array>>;
  bundleFiles?: Map<string, Uint8Array>;
}

export interface OepBuildResult {
  bytes: Uint8Array;
  checksumValue: string;
}

export class OepWriter {
  static async build(input: OepBuildInput): Promise<OepBuildResult> {
    const manifest = { type: 'course' as const, ...input.manifest };

    writerLogger.info('Building .oep archive...', {
      packageId: manifest.id,
      fileCount: input.courseFiles.size,
    });
    writerLogger.time('build-archive');

    const checksumValue = await computeContentChecksum(input.courseFiles);

    manifest.checksum = { algorithm: 'sha256', value: checksumValue };
    const zipEntries = buildZipEntries(manifest, input.courseFiles);
    const finalBytes = zipSync(zipEntries);

    writerLogger.timeEnd('build-archive');
    writerLogger.info('.oep archive built', {
      packageId: manifest.id,
      bytes: finalBytes.length,
    });

    return { bytes: finalBytes, checksumValue };
  }

  static async buildBundle(input: OepBundleBuildInput): Promise<OepBuildResult> {
    writerLogger.info('Building .oep bundle archive...', {
      bundleId: input.bundleManifest.id,
      moduleCount: input.bundleManifest.modules.length,
    });
    writerLogger.time('build-bundle-archive');

    // Validate bundle manifest at build time
    BundleManifestSchema.parse(input.bundleManifest);

    const manifest = { ...input.manifest, type: 'bundle' as const, contentRoot: BUNDLE_DIR };

    const allFiles = new Map<string, Uint8Array>();

    const bundleJsonBytes = strToU8(JSON.stringify(input.bundleManifest, null, 2));
    allFiles.set('bundle.json', bundleJsonBytes);

    for (const [moduleId, files] of input.moduleFiles) {
      for (const [relativePath, content] of files) {
        const sanitizedPath = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
        allFiles.set(`modules/${moduleId}/${sanitizedPath}`, content);
      }
    }

    if (input.bundleFiles) {
      for (const [relativePath, content] of input.bundleFiles) {
        const sanitizedPath = relativePath
          .replace(/\\/g, '/')
          .replace(/^\/+/, '')
          .replace(/^bundle\//, '');
        allFiles.set(sanitizedPath, content);
      }
    }

    writerLogger.debug('Bundle archive file inventory', { fileCount: allFiles.size });

    const checksumValue = await computeContentChecksum(allFiles);
    manifest.checksum = { algorithm: 'sha256', value: checksumValue };

    const zipEntries: Record<string, Uint8Array> = {};
    zipEntries['manifest.json'] = strToU8(JSON.stringify(manifest, null, 2));
    zipEntries[BUNDLE_DIR] = new Uint8Array(0);

    for (const [relativePath, content] of allFiles) {
      zipEntries[`${BUNDLE_DIR}${relativePath}`] = content;
    }

    const finalBytes = zipSync(zipEntries);
    writerLogger.timeEnd('build-bundle-archive');
    writerLogger.info('.oep bundle archive built', {
      bundleId: input.bundleManifest.id,
      bytes: finalBytes.length,
    });
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
