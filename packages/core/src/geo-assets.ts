import { access, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { feature as topojsonFeature } from 'topojson-client';
import { NodeLoadError } from './errors.js';
import { coreLoaderLogger } from './logger.js';
import type { LoadedNode } from './types.js';

/**
 * Geo-asset resolution for interactive `geomap` sources.
 *
 * Authored node files reference shared geography as `openedu://geo/{asset-id}`
 * URIs instead of embedding raw TopoJSON/GeoJSON. This module resolves those
 * URIs against a `@knowledgeassemble/geo-assets` dist directory (its
 * `catalog.json` + versioned data files) and inlines a GeoJSON
 * `FeatureCollection` into the node's `geography.sources[].data` field — the
 * shape the geomap engine consumes synchronously at instantiate time.
 *
 * The pure helpers (`collectGeoSourceRefs`, `inlineGeoSources`) are framework
 * agnostic; the `*Node`/`*Nodes` helpers are the Node-side entry points wired
 * into `@open-edu/core` loaders. The browser bundle never imports this module.
 */

export const GEO_URI_PREFIX = 'openedu://geo/';

/** A geo-asset catalog entry, mirrored from `geo-assets` `dist/catalog.json`. */
interface CatalogEntry {
  id: string;
  version: string;
  format?: string;
  uri?: string;
  manifest: string;
}

export interface GeoSourceRef {
  index: number;
  source: Record<string, unknown>;
  uri: string;
  version?: string;
}

export interface GeoSourceDataLoader {
  (assetId: string, version?: string): Promise<Record<string, unknown> | undefined>;
}

/** Extract the asset id from an `openedu://geo/...` URI, or `undefined`. */
export function parseGeoUri(uri: string): string | undefined {
  if (!uri.startsWith(GEO_URI_PREFIX)) return undefined;
  const assetId = uri.slice(GEO_URI_PREFIX.length);
  return assetId.length > 0 ? assetId : undefined;
}

/**
 * Find `geography.sources[]` entries in a geomap spec that reference a geo
 * asset (either the engine-native `uri` field or the geo-assets
 * `asset: { uri, version }` convention). Sources with inline `data` are
 * skipped.
 */
export function collectGeoSourceRefs(spec: Record<string, unknown>): GeoSourceRef[] {
  const content = spec.content as Record<string, unknown> | undefined;
  const geography = content?.geography as Record<string, unknown> | undefined;
  const sources = geography?.sources;
  if (!Array.isArray(sources)) return [];

  const refs: GeoSourceRef[] = [];
  for (let index = 0; index < sources.length; index++) {
    const raw = sources[index];
    if (typeof raw !== 'object' || raw === null) continue;
    const source = raw as Record<string, unknown>;
    if (source.data !== undefined) continue;

    const directUri = typeof source.uri === 'string' ? source.uri : undefined;
    const asset =
      typeof source.asset === 'object' && source.asset !== null
        ? (source.asset as Record<string, unknown>)
        : undefined;
    const assetUri = typeof asset?.uri === 'string' ? asset.uri : undefined;
    const uri = directUri ?? assetUri;
    if (!uri || !parseGeoUri(uri)) continue;

    refs.push({
      index,
      source,
      uri,
      version: typeof asset?.version === 'string' ? asset.version : undefined,
    });
  }
  return refs;
}

/**
 * Resolve every `openedu://geo/*` source ref in a geomap spec to inline
 * `data` (a GeoJSON FeatureCollection), deleting the `uri`/`asset` reference
 * so the shipped spec is self-contained and offline-first. Mutates `spec` in
 * place and returns it. Non-geo URIs are left untouched for the bridge's own
 * `resolveAsset` handling.
 */
export async function inlineGeoSources(
  spec: Record<string, unknown>,
  load: GeoSourceDataLoader,
): Promise<Record<string, unknown>> {
  for (const ref of collectGeoSourceRefs(spec)) {
    const assetId = parseGeoUri(ref.uri);
    if (!assetId) continue;

    let data: Record<string, unknown> | undefined;
    try {
      data = await load(assetId, ref.version);
    } catch (error) {
      if (error instanceof NodeLoadError) throw error;
      throw new NodeLoadError(
        `Failed to resolve geo source "${ref.uri}": ${(error as Error).message}`,
        { suggestion: 'Check the geo-assets catalog and data files' },
      );
    }

    if (data === undefined) {
      throw new NodeLoadError(
        `Cannot resolve geo source "${ref.uri}" — no geo-assets catalog found`,
        {
          suggestion:
            `Set OPEN_EDU_GEO_ASSETS_DIR to the geo-assets dist directory ` +
            `(containing catalog.json), or pass { geoAssetsDir } to the loader`,
        },
      );
    }

    ref.source.data = data;
    delete ref.source.uri;
    delete ref.source.asset;
    // The inlined data is always a GeoJSON FeatureCollection.
    ref.source.type = 'geojson';
  }
  return spec;
}

/**
 * Locate a usable geo-assets dist directory (one containing `catalog.json`).
 * When an explicit dir is given it is authoritative (no discovery fallback):
 * the directory either has a catalog or resolution fails. Otherwise the
 * candidates are `OPEN_EDU_GEO_ASSETS_DIR`, then
 * `<ancestor>/openedu-geo-assets/dist` walking up from the current working
 * directory (covers monorepo sibling checkouts).
 */
export async function findGeoAssetsDir(extra?: string): Promise<string | undefined> {
  if (extra) {
    return (await hasCatalog(extra)) ? extra : undefined;
  }

  const candidates: string[] = [];
  const envDir = process.env.OPEN_EDU_GEO_ASSETS_DIR;
  if (envDir) candidates.push(envDir);

  let ancestor: string | undefined = resolve(process.cwd());
  for (let depth = 0; depth < 12 && ancestor; depth++) {
    candidates.push(join(ancestor, 'openedu-geo-assets', 'dist'));
    const parent = dirname(ancestor);
    if (parent === ancestor) break;
    ancestor = parent;
  }

  for (const candidate of candidates) {
    if (await hasCatalog(candidate)) return candidate;
  }
  return undefined;
}

async function hasCatalog(dir: string): Promise<boolean> {
  return access(join(dir, 'catalog.json')).then(
    () => true,
    () => false,
  );
}

/**
 * Load a geo asset from a geo-assets dist directory and return it as a
 * GeoJSON FeatureCollection (converting TopoJSON via `topojson-client`).
 * Point/line/polygon GeoJSON assets are passed through as-is.
 */
export async function loadGeoAssetFeatures(
  assetId: string,
  baseDir: string,
  version?: string,
): Promise<Record<string, unknown>> {
  const catalogPath = join(baseDir, 'catalog.json');
  let catalog: { assets?: CatalogEntry[] };
  try {
    catalog = JSON.parse(await readFile(catalogPath, 'utf8')) as {
      assets?: CatalogEntry[];
    };
  } catch {
    throw new NodeLoadError(`Geo-asset catalog not found: ${catalogPath}`, {
      file: catalogPath,
      suggestion:
        'Set OPEN_EDU_GEO_ASSETS_DIR to the geo-assets dist directory (containing catalog.json)',
    });
  }

  const entries = Array.isArray(catalog.assets) ? catalog.assets : [];
  const entry = entries.find((e) => e.id === assetId);
  if (!entry) {
    const available = entries.map((e) => e.id).join(', ') || '(none)';
    throw new NodeLoadError(
      `Geo asset not found in catalog: "openedu://geo/${assetId}". Available assets: ${available}`,
      { path: assetId, suggestion: 'Reference an asset id listed in the geo-assets catalog' },
    );
  }

  if (version && entry.version !== version) {
    throw new NodeLoadError(
      `Geo asset version mismatch for "openedu://geo/${assetId}": requested ${version}, catalog has ${entry.version}`,
      { path: assetId, suggestion: 'Drop the version constraint or align it with the catalog' },
    );
  }

  const manifestPath = join(baseDir, entry.manifest);
  let manifest: { version?: string; format?: string; files?: { data?: string } };
  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
      version?: string;
      format?: string;
      files?: { data?: string };
    };
  } catch {
    throw new NodeLoadError(`Geo-asset manifest not found: ${manifestPath}`, {
      file: manifestPath,
    });
  }

  const dataRel = manifest.files?.data;
  if (!dataRel) {
    throw new NodeLoadError(`Geo-asset manifest "${assetId}" has no files.data entry`, {
      file: manifestPath,
    });
  }

  // files.data is relative to the manifest directory (the geo-assets layout).
  const dataPath = join(baseDir, dirname(entry.manifest), dataRel);
  let parsed: { type?: string; objects?: Record<string, unknown> };
  try {
    parsed = JSON.parse(await readFile(dataPath, 'utf8')) as {
      type?: string;
      objects?: Record<string, unknown>;
    };
  } catch {
    throw new NodeLoadError(`Geo-asset data not found: ${dataPath}`, {
      file: dataPath,
    });
  }

  const format = entry.format ?? manifest.format ?? 'geojson';
  if (format === 'topojson') {
    const objectNames = Object.keys(parsed.objects ?? {});
    const objectName = objectNames[0];
    if (!objectName) {
      throw new NodeLoadError(`TopoJSON asset "${assetId}" has no objects`, {
        file: dataPath,
      });
    }
    const collection = topojsonFeature(
      parsed as Parameters<typeof topojsonFeature>[0],
      (parsed.objects as Record<string, unknown>)[objectName] as Parameters<
        typeof topojsonFeature
      >[1],
    );
    return collection as unknown as Record<string, unknown>;
  }

  return parsed as unknown as Record<string, unknown>;
}

/**
 * Resolve `openedu://geo/*` sources in a single spec (single-engine or
 * composed lesson). Best-effort: when no geo-assets catalog is discoverable
 * the URIs are left in place (the package still loads), but once a catalog is
 * found, missing/unknown assets fail fast with authoring guidance.
 */
export async function resolveGeoUrisInSpec(
  spec: Record<string, unknown>,
  options?: { geoAssetsDir?: string },
): Promise<void> {
  if (collectGeoSourceRefs(spec).length === 0) return;
  const baseDir = await findGeoAssetsDir(options?.geoAssetsDir);
  if (!baseDir) {
    if (options?.geoAssetsDir) {
      throw new NodeLoadError(
        `geoAssetsDir does not contain a geo-assets catalog: ${options.geoAssetsDir}`,
        {
          file: options.geoAssetsDir,
          suggestion:
            'Point geoAssetsDir at the geo-assets dist directory (containing catalog.json)',
        },
      );
    }
    coreLoaderLogger.warn(
      'openedu://geo/* sources left unresolved — no geo-assets catalog found. ' +
        'Set OPEN_EDU_GEO_ASSETS_DIR to the geo-assets dist directory (or pass { geoAssetsDir }).',
    );
    return;
  }
  await inlineGeoSources(spec, async (assetId, version) =>
    loadGeoAssetFeatures(assetId, baseDir, version),
  );
}

/** Resolve geo sources on a single interactive node (spec + composed engines). */
export async function resolveGeoUrisInNode(
  node: LoadedNode,
  options?: { geoAssetsDir?: string },
): Promise<void> {
  if (node.node.type !== 'interactive') return;
  if (node.node.spec) {
    await resolveGeoUrisInSpec(node.node.spec as Record<string, unknown>, options);
  }
  for (const engine of node.node.engines ?? []) {
    if (engine.spec) {
      await resolveGeoUrisInSpec(engine.spec as Record<string, unknown>, options);
    }
  }
}

/** Resolve geo sources across many loaded nodes (no-op when none reference geo URIs). */
export async function resolveGeoUrisInNodes(
  nodes: LoadedNode[],
  options?: { geoAssetsDir?: string },
): Promise<void> {
  for (const node of nodes) {
    await resolveGeoUrisInNode(node, options);
  }
}
