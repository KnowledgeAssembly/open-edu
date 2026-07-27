import { unzipSync, strFromU8 } from 'fflate';
import { DistributionManifestSchema } from '@open-edu/schemas';
import { PackageManifestSchema } from '@open-edu/schemas';
import { computeSha256 } from './checksum.js';
import { validateZipArchive } from './zip-security.js';
import {
  type OepExtraction,
  type PackageInspection,
  type ZipSecurityOptions,
  DEFAULT_ZIP_SECURITY,
  OEP_CONTENT_ROOT,
} from './types.js';

export class OepReaderError extends Error {
  public readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'OepReaderError';
  }
}

export class OepReader {
  private securityOptions: ZipSecurityOptions;

  constructor(options: Partial<ZipSecurityOptions> = {}) {
    this.securityOptions = { ...DEFAULT_ZIP_SECURITY, ...options };
  }

  async inspect(bytes: Uint8Array): Promise<PackageInspection> {
    const extraction = await this.readInternal(bytes, false);
    return {
      id: extraction.manifest.id,
      version: extraction.manifest.version,
      title: extraction.manifest.title,
      checksum: extraction.manifest.checksum,
      signatureStatus: extraction.manifest.signature.status,
    };
  }

  async read(bytes: Uint8Array): Promise<OepExtraction> {
    return this.readInternal(bytes, true);
  }

  private async readInternal(bytes: Uint8Array, fullExtract: boolean): Promise<OepExtraction> {
    if (bytes.length > this.securityOptions.maxArchiveBytes) {
      throw new OepReaderError(
        'ARCHIVE_TOO_LARGE',
        `Archive ${bytes.length} bytes exceeds limit ${this.securityOptions.maxArchiveBytes}`,
      );
    }

    let rawEntries: Record<string, Uint8Array>;
    try {
      rawEntries = unzipSync(bytes);
    } catch (err) {
      throw new OepReaderError(
        'MALFORMED_ARCHIVE',
        `Cannot unzip: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const entryList = Object.entries(rawEntries).map(([path, data]) => ({
      path,
      size: data.length,
    }));
    validateZipArchive(bytes.length, entryList, this.securityOptions);

    const manifestRaw = rawEntries['manifest.json'];
    if (!manifestRaw) {
      throw new OepReaderError('MISSING_MANIFEST', 'manifest.json not found in archive');
    }

    let manifestJson: unknown;
    try {
      manifestJson = JSON.parse(strFromU8(manifestRaw));
    } catch {
      throw new OepReaderError('INVALID_MANIFEST', 'manifest.json is not valid JSON');
    }

    const manifestResult = DistributionManifestSchema.safeParse(manifestJson);
    if (!manifestResult.success) {
      throw new OepReaderError(
        'INVALID_MANIFEST',
        `manifest.json validation failed: ${manifestResult.error.message}`,
      );
    }
    const manifest = manifestResult.data;
    const contentRoot = manifest.contentRoot || OEP_CONTENT_ROOT;

    const courseContentPaths = Object.keys(rawEntries)
      .filter((p) => p.startsWith(contentRoot) && p !== contentRoot && rawEntries[p]!.length > 0)
      .map((p) => p.slice(contentRoot.length))
      .sort();
    const contentHashInput = courseContentPaths.join('\n');
    const actualChecksum = await computeSha256(new TextEncoder().encode(contentHashInput));
    if (actualChecksum !== manifest.checksum.value) {
      throw new OepReaderError(
        'CHECKSUM_MISMATCH',
        `Expected ${manifest.checksum.value}, got ${actualChecksum}`,
      );
    }

    const pkgJsonRaw = rawEntries[`${contentRoot}package.json`];
    if (!pkgJsonRaw) {
      throw new OepReaderError(
        'MISSING_COURSE_DIR',
        `${contentRoot}package.json not found in archive`,
      );
    }

    let courseManifestJson: unknown;
    try {
      courseManifestJson = JSON.parse(strFromU8(pkgJsonRaw));
    } catch {
      throw new OepReaderError('COURSE_VALIDATION_ERROR', 'course/package.json is not valid JSON');
    }

    const courseManifestResult = PackageManifestSchema.safeParse(courseManifestJson);
    if (!courseManifestResult.success) {
      throw new OepReaderError(
        'COURSE_VALIDATION_ERROR',
        `course/package.json validation failed: ${courseManifestResult.error.message}`,
      );
    }

    const courseManifestData = courseManifestResult.data;
    if (courseManifestData.id !== manifest.id) {
      throw new OepReaderError(
        'MANIFEST_MISMATCH',
        `Outer manifest id "${manifest.id}" != course package.json id "${courseManifestData.id}"`,
      );
    }
    if (courseManifestData.version !== manifest.version) {
      throw new OepReaderError(
        'MANIFEST_MISMATCH',
        `Outer manifest version "${manifest.version}" != course package.json version "${courseManifestData.version}"`,
      );
    }

    const nodes: Record<string, string> = {};
    const assets: Record<string, Uint8Array> = {};
    let workflow: Record<string, unknown> | undefined;
    let rewards: Record<string, unknown> | undefined;
    let cards: Record<string, unknown> | undefined;

    if (fullExtract) {
      const nodesPrefix = `${contentRoot}nodes/`;
      const assetsPrefix = `${contentRoot}assets/`;

      for (const [path, data] of Object.entries(rawEntries)) {
        if (
          path.startsWith(nodesPrefix) &&
          (path.endsWith('.md') || path.endsWith('.json')) &&
          data.length > 0
        ) {
          nodes[path] = strFromU8(data);
        } else if (path.startsWith(assetsPrefix) && data.length > 0) {
          assets[path] = data;
        }
      }

      const workflowRaw = rawEntries[`${contentRoot}workflow.json`];
      if (workflowRaw && workflowRaw.length > 0) {
        try {
          workflow = JSON.parse(strFromU8(workflowRaw));
        } catch {
          // ignore malformed workflow.json
        }
      }

      const rewardsRaw = rawEntries[`${contentRoot}rewards.json`];
      if (rewardsRaw && rewardsRaw.length > 0) {
        try {
          rewards = JSON.parse(strFromU8(rewardsRaw));
        } catch {
          // ignore malformed rewards.json
        }
      }

      const cardsRaw = rawEntries[`${contentRoot}cards.json`];
      if (cardsRaw && cardsRaw.length > 0) {
        try {
          cards = JSON.parse(strFromU8(cardsRaw));
        } catch {
          // ignore malformed cards.json
        }
      }

      if (Object.keys(nodes).length === 0) {
        throw new OepReaderError(
          'COURSE_VALIDATION_ERROR',
          'No node files found in course/nodes/ (expected .md or .json files)',
        );
      }
    }

    return {
      manifest,
      courseManifest: courseManifestJson as Record<string, unknown>,
      nodes,
      assets,
      rawEntries,
      workflow,
      rewards,
      cards,
    };
  }
}
