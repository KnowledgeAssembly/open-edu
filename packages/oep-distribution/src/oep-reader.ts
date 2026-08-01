import { unzipSync, strFromU8 } from 'fflate';
import {
  DistributionManifestSchema,
  BundleManifestSchema,
  PackageManifestSchema,
} from '@open-edu/schemas';
import type { DistributionManifest } from '@open-edu/schemas';
import { computeSha256 } from './checksum.js';
import { validateZipArchive } from './zip-security.js';
import { createLogger } from '@open-edu/logger';
import {
  type OepExtraction,
  type PackageInspection,
  type BundleInspection,
  type OepExtractedModule,
  type ZipSecurityOptions,
  DEFAULT_ZIP_SECURITY,
  OEP_CONTENT_ROOT,
  BUNDLE_DIR,
  BUNDLE_MODULES_DIR,
} from './types.js';

const readerLogger = createLogger({ scope: 'oep:reader' });

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

  async inspectBundle(bytes: Uint8Array): Promise<BundleInspection> {
    const extraction = await this.readInternal(bytes, false);
    if (extraction.manifest.type !== 'bundle') {
      throw new OepReaderError(
        'INVALID_MANIFEST',
        'Archive is not a bundle (manifest.type is not "bundle")',
      );
    }
    return {
      id: extraction.manifest.id,
      version: extraction.manifest.version,
      title: extraction.manifest.title,
      type: 'bundle',
      moduleCount: (
        (extraction.bundleManifest as { modules?: unknown[] } | undefined)?.modules ?? []
      ).length,
      moduleIds: (
        (extraction.bundleManifest as { modules?: Array<{ id: string }> } | undefined)?.modules ??
        []
      ).map((m) => m.id),
      checksum: extraction.manifest.checksum,
      signatureStatus: extraction.manifest.signature.status,
    };
  }

  async read(bytes: Uint8Array): Promise<OepExtraction> {
    return this.readInternal(bytes, true);
  }

  private async readInternal(bytes: Uint8Array, fullExtract: boolean): Promise<OepExtraction> {
    readerLogger.time('read-archive');
    if (bytes.length > this.securityOptions.maxArchiveBytes) {
      readerLogger.error('Archive exceeds size limit', {
        size: bytes.length,
        limit: this.securityOptions.maxArchiveBytes,
      });
      throw new OepReaderError(
        'ARCHIVE_TOO_LARGE',
        `Archive ${bytes.length} bytes exceeds limit ${this.securityOptions.maxArchiveBytes}`,
      );
    }

    let rawEntries: Record<string, Uint8Array>;
    try {
      rawEntries = unzipSync(bytes);
    } catch (err) {
      readerLogger.error('Cannot unzip archive', err);
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

    if (manifest.type === 'bundle') {
      return this.readBundleInternal(manifest, rawEntries, fullExtract);
    }

    const contentRoot = manifest.contentRoot || OEP_CONTENT_ROOT;

    const courseContentPaths = Object.keys(rawEntries)
      .filter((p) => p.startsWith(contentRoot) && p !== contentRoot && rawEntries[p]!.length > 0)
      .map((p) => p.slice(contentRoot.length))
      .sort();
    const contentHashInput = courseContentPaths.join('\n');
    const actualChecksum = await computeSha256(new TextEncoder().encode(contentHashInput));
    if (actualChecksum !== manifest.checksum.value) {
      readerLogger.warn('SHA-256 checksum mismatch', {
        packageId: manifest.id,
        expected: manifest.checksum.value,
        actual: actualChecksum,
      });
      throw new OepReaderError(
        'CHECKSUM_MISMATCH',
        `Expected ${manifest.checksum.value}, got ${actualChecksum}`,
      );
    }
    readerLogger.info('SHA-256 checksum verified', { packageId: manifest.id });

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
      const metadataFiles = new Set([
        `${contentRoot}package.json`,
        `${contentRoot}workflow.json`,
        `${contentRoot}rewards.json`,
        `${contentRoot}cards.json`,
      ]);

      for (const [path, data] of Object.entries(rawEntries)) {
        if (!path.startsWith(contentRoot) || data.length === 0) continue;
        if (metadataFiles.has(path)) continue;
        const relativePath = path.slice(contentRoot.length);
        if (!relativePath.includes('/')) continue;
        if (path.startsWith(nodesPrefix) && (path.endsWith('.md') || path.endsWith('.json'))) {
          nodes[path] = strFromU8(data);
        } else {
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

    readerLogger.timeEnd('read-archive');
    readerLogger.info('Archive read complete', {
      packageId: manifest.id,
      nodeCount: Object.keys(nodes).length,
      assetCount: Object.keys(assets).length,
    });

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

  private async readBundleInternal(
    manifest: DistributionManifest,
    rawEntries: Record<string, Uint8Array>,
    fullExtract: boolean,
  ): Promise<OepExtraction> {
    const contentRoot = BUNDLE_DIR;

    const bundleContentPaths = Object.keys(rawEntries)
      .filter((p) => p.startsWith(contentRoot) && p !== contentRoot && rawEntries[p]!.length > 0)
      .map((p) => p.slice(contentRoot.length))
      .sort();
    const contentHashInput = bundleContentPaths.join('\n');
    const actualChecksum = await computeSha256(new TextEncoder().encode(contentHashInput));
    if (actualChecksum !== manifest.checksum.value) {
      readerLogger.warn('SHA-256 checksum mismatch', {
        bundleId: manifest.id,
        expected: manifest.checksum.value,
        actual: actualChecksum,
      });
      throw new OepReaderError(
        'CHECKSUM_MISMATCH',
        `Expected ${manifest.checksum.value}, got ${actualChecksum}`,
      );
    }
    readerLogger.info('SHA-256 checksum verified', { bundleId: manifest.id });

    const bundleJsonRaw = rawEntries[`${contentRoot}bundle.json`];
    if (!bundleJsonRaw) {
      throw new OepReaderError(
        'MISSING_BUNDLE_MANIFEST',
        'bundle/bundle.json not found in archive',
      );
    }

    let bundleManifestJson: unknown;
    try {
      bundleManifestJson = JSON.parse(strFromU8(bundleJsonRaw));
    } catch {
      throw new OepReaderError('BUNDLE_VALIDATION_ERROR', 'bundle/bundle.json is not valid JSON');
    }

    const bundleResult = BundleManifestSchema.safeParse(bundleManifestJson);
    if (!bundleResult.success) {
      throw new OepReaderError(
        'BUNDLE_VALIDATION_ERROR',
        `bundle/bundle.json validation failed: ${bundleResult.error.message}`,
      );
    }

    if (bundleResult.data.id !== manifest.id) {
      throw new OepReaderError(
        'MANIFEST_MISMATCH',
        `Outer manifest id "${manifest.id}" != bundle.json id "${bundleResult.data.id}"`,
      );
    }
    if (bundleResult.data.version !== manifest.version) {
      throw new OepReaderError(
        'MANIFEST_MISMATCH',
        `Outer manifest version "${manifest.version}" != bundle.json version "${bundleResult.data.version}"`,
      );
    }

    const readBundleRootJson = (
      relPath: string,
      label: string,
    ): Record<string, unknown> | undefined => {
      const entryPath = `bundle/${relPath.replace(/^\.\//, '')}`.replace(/\/+$/, '');
      const raw = rawEntries[entryPath];
      if (!raw || raw.length === 0) {
        throw new OepReaderError(
          'BUNDLE_VALIDATION_ERROR',
          `bundle references ${label} but the archive does not contain it (${entryPath})`,
        );
      }
      try {
        return JSON.parse(strFromU8(raw)) as Record<string, unknown>;
      } catch {
        throw new OepReaderError('BUNDLE_VALIDATION_ERROR', `${entryPath} is not valid JSON`);
      }
    };

    const bundleRewards = bundleResult.data.rewards
      ? readBundleRootJson(bundleResult.data.rewards, 'rewards.json')
      : undefined;
    const bundleCards = bundleResult.data.cards
      ? readBundleRootJson(bundleResult.data.cards, 'cards.json')
      : undefined;

    const modules: OepExtractedModule[] = [];

    for (const modRef of bundleResult.data.modules) {
      const moduleDir = `${BUNDLE_MODULES_DIR}${modRef.id}/`;
      const modPkgRaw = rawEntries[`${moduleDir}package.json`];
      if (!modPkgRaw) {
        throw new OepReaderError(
          'MODULE_VALIDATION_ERROR',
          `Module "${modRef.id}" missing package.json at ${moduleDir}package.json`,
        );
      }

      let modManifestJson: unknown;
      try {
        modManifestJson = JSON.parse(strFromU8(modPkgRaw));
      } catch {
        throw new OepReaderError(
          'MODULE_VALIDATION_ERROR',
          `Module "${modRef.id}" package.json is not valid JSON`,
        );
      }

      const modResult = PackageManifestSchema.safeParse(modManifestJson);
      if (!modResult.success) {
        throw new OepReaderError(
          'MODULE_VALIDATION_ERROR',
          `Module "${modRef.id}" package.json validation failed: ${modResult.error.message}`,
        );
      }

      if (modResult.data.id !== modRef.id) {
        throw new OepReaderError(
          'MANIFEST_MISMATCH',
          `Module ref id "${modRef.id}" != module package.json id "${modResult.data.id}"`,
        );
      }

      const modNodes: Record<string, string> = {};
      const modAssets: Record<string, Uint8Array> = {};
      let modWorkflow: Record<string, unknown> | undefined;
      let modRewards: Record<string, unknown> | undefined;
      let modCards: Record<string, unknown> | undefined;

      if (fullExtract) {
        const nodesPrefix = `${moduleDir}nodes/`;
        const metadataFiles = new Set([
          `${moduleDir}package.json`,
          `${moduleDir}workflow.json`,
          `${moduleDir}rewards.json`,
          `${moduleDir}cards.json`,
        ]);

        for (const [path, data] of Object.entries(rawEntries)) {
          if (!path.startsWith(moduleDir) || data.length === 0) continue;
          if (metadataFiles.has(path)) continue;
          const relativePath = path.slice(moduleDir.length);
          if (!relativePath.includes('/')) continue;
          if (path.startsWith(nodesPrefix) && (path.endsWith('.md') || path.endsWith('.json'))) {
            modNodes[path] = strFromU8(data);
          } else if (!path.startsWith(nodesPrefix)) {
            modAssets[path] = data;
          }
        }

        const workflowRaw = rawEntries[`${moduleDir}workflow.json`];
        if (workflowRaw && workflowRaw.length > 0) {
          try {
            modWorkflow = JSON.parse(strFromU8(workflowRaw));
          } catch {
            /* ignore */
          }
        }

        const rewardsRaw = rawEntries[`${moduleDir}rewards.json`];
        if (rewardsRaw && rewardsRaw.length > 0) {
          try {
            modRewards = JSON.parse(strFromU8(rewardsRaw));
          } catch {
            /* ignore */
          }
        }

        const cardsRaw = rawEntries[`${moduleDir}cards.json`];
        if (cardsRaw && cardsRaw.length > 0) {
          try {
            modCards = JSON.parse(strFromU8(cardsRaw));
          } catch {
            /* ignore */
          }
        }

        if (Object.keys(modNodes).length === 0) {
          throw new OepReaderError(
            'MODULE_VALIDATION_ERROR',
            `Module "${modRef.id}" has no node files in ${nodesPrefix}`,
          );
        }
      }

      modules.push({
        manifest: modManifestJson as Record<string, unknown>,
        nodes: modNodes,
        assets: modAssets,
        workflow: modWorkflow,
        rewards: modRewards,
        cards: modCards,
      });
    }

    readerLogger.timeEnd('read-archive');
    readerLogger.info('Bundle archive read complete', {
      bundleId: manifest.id,
      moduleCount: modules.length,
    });

    return {
      manifest,
      bundleManifest: bundleManifestJson as Record<string, unknown>,
      modules,
      rawEntries,
      rewards: bundleRewards,
      cards: bundleCards,
    };
  }
}
