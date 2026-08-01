import { CatalogSchema } from '@open-edu/schemas';
import { computeSha256, semverGreaterThan } from '@open-edu/oep-distribution';
import { parseReleaseTag, parseChecksums, fetchAssetBytes, type GithubRelease } from './github.js';
import type { LoadedMetadata } from './metadata.js';

const RELEASE_BASE = 'https://github.com';
const RAW_BASE = 'https://raw.githubusercontent.com';

export function compareVersions(a: string, b: string): number {
  if (semverGreaterThan(a, b)) return 1;
  if (semverGreaterThan(b, a)) return -1;
  return 0;
}

export interface BuildCatalogOptions {
  metadataMap: Map<string, LoadedMetadata>;
  releases: GithubRelease[];
  repo: string;
  includePrerelease?: boolean;
  fetchAsset?: (url: string) => Promise<Uint8Array>;
}

export interface BuiltCatalogEntry {
  id: string;
  title: string;
  description?: string;
  author?: string;
  license?: string;
  tags?: string[];
  thumbnail?: string;
  latestVersion: string;
  versions: Array<{
    version: string;
    downloadUrl: string;
    checksum: string;
    sizeBytes: number;
    languages: string[];
  }>;
}

export interface BuiltCatalog {
  catalogVersion: number;
  generatedAt: string;
  packages: BuiltCatalogEntry[];
}

export async function buildCatalog({
  metadataMap,
  releases,
  repo,
  includePrerelease = false,
  fetchAsset = fetchAssetBytes,
}: BuildCatalogOptions): Promise<{ catalog: BuiltCatalog; warnings: string[] }> {
  const rawBaseUrl = `${RAW_BASE}/${repo}/HEAD`;
  const byId = new Map<
    string,
    {
      versions: Array<{
        version: string;
        downloadUrl: string;
        checksum: string;
        sizeBytes: number;
      }>;
    }
  >();
  const warnings: string[] = [];

  for (const release of releases) {
    if (release.draft) continue;
    if (release.prerelease && !includePrerelease) continue;

    const parsed = parseReleaseTag(release.tag_name ?? '');
    if (!parsed) {
      warnings.push(`release "${release.tag_name}" does not match <id>-v<semver>; skipped`);
      continue;
    }
    const { id, version } = parsed;
    const oepName = `${id}-${version}.oep`;
    const oepAsset = (release.assets ?? []).find((a) => a.name === oepName);
    if (!oepAsset) {
      warnings.push(`release "${release.tag_name}" has no asset "${oepName}"; skipped`);
      continue;
    }

    let checksum: string;
    try {
      checksum = await computeSha256(await fetchAsset(oepAsset.browser_download_url));
    } catch (err) {
      warnings.push(
        `release "${release.tag_name}": could not download .oep asset (${
          err instanceof Error ? err.message : String(err)
        }); skipped`,
      );
      continue;
    }

    const checksumsAsset = (release.assets ?? []).find((a) => a.name === 'checksums.txt');
    if (checksumsAsset) {
      try {
        const text = new TextDecoder().decode(
          await fetchAsset(checksumsAsset.browser_download_url),
        );
        const declared = parseChecksums(text).get(oepName);
        if (declared && declared !== checksum) {
          warnings.push(
            `release "${release.tag_name}": checksums.txt mismatch for "${oepName}" (declared ${declared}, computed ${checksum})`,
          );
        }
      } catch {
        // checksums.txt cross-check is best-effort at generation time
      }
    }

    const entry = byId.get(id) ?? { versions: [] };
    entry.versions.push({
      version,
      downloadUrl: `${RELEASE_BASE}/${repo}/releases/download/${release.tag_name}/${oepName}`,
      checksum,
      sizeBytes: oepAsset.size,
    });
    byId.set(id, entry);
  }

  const packages: BuiltCatalogEntry[] = [];
  const sortedById = [...byId.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  for (const [id, { versions }] of sortedById) {
    const meta = metadataMap.get(id);
    if (!meta) {
      warnings.push(`package "${id}" has releases but no courses/${id}/metadata.json; skipped`);
      continue;
    }

    versions.sort((a, b) => compareVersions(a.version, b.version));
    const latest = versions[versions.length - 1]!;

    packages.push({
      id,
      title: meta.data.name,
      ...(meta.data.description !== undefined ? { description: meta.data.description } : {}),
      ...(meta.data.author !== undefined ? { author: meta.data.author } : {}),
      ...(meta.data.license !== undefined ? { license: meta.data.license } : {}),
      ...(meta.data.tags?.length ? { tags: meta.data.tags } : {}),
      ...(meta.data.thumbnail
        ? { thumbnail: `${rawBaseUrl}/courses/${meta.dir}/${meta.data.thumbnail}` }
        : {}),
      latestVersion: latest.version,
      versions: versions.map((v) => ({ ...v, languages: meta.data.languages ?? ['en'] })),
    });
  }

  return {
    catalog: {
      catalogVersion: 1,
      generatedAt: new Date().toISOString(),
      packages,
    },
    warnings,
  };
}

export async function validateCatalogData(data: unknown): Promise<string[]> {
  const parsed = CatalogSchema.safeParse(data);
  if (!parsed.success) {
    return parsed.error.issues.map((i) => `${i.path.join('.') || '/'} ${i.message}`);
  }
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const pkg of parsed.data.packages) {
    if (ids.has(pkg.id)) errors.push(`duplicate package id "${pkg.id}"`);
    ids.add(pkg.id);

    const isAscending = pkg.versions.every(
      (v, i) => i === 0 || compareVersions(v.version, pkg.versions[i - 1]!.version) > 0,
    );
    if (!isAscending) errors.push(`versions for "${pkg.id}" are not ascending`);

    let latest = '';
    for (const v of pkg.versions) {
      if (compareVersions(v.version, latest) > 0) latest = v.version;
    }
    if (latest && pkg.latestVersion !== latest) {
      errors.push(`latestVersion for "${pkg.id}" is "${pkg.latestVersion}", expected "${latest}"`);
    }
  }
  return errors;
}
