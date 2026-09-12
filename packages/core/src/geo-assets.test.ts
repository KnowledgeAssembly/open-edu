import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { join, resolve } from 'node:path';
import {
  parseGeoUri,
  collectGeoSourceRefs,
  inlineGeoSources,
  findGeoAssetsDir,
  loadGeoAssetFeatures,
  resolveGeoUrisInSpec,
  resolveGeoUrisInNode,
  resolveGeoUrisInNodes,
} from './geo-assets.js';
import { loadPackage } from './loader.js';
import { loadNodes } from './nodes-fs.js';
import { NodeLoadError } from './errors.js';
import type { LoadedNode } from './types.js';

const fixturesDir = resolve(__dirname, '__fixtures__');
const geoAssetsFixtureDir = join(fixturesDir, 'geo-assets');
const geoPackageDir = join(fixturesDir, 'geo-package');

const savedEnvDir = process.env.OPEN_EDU_GEO_ASSETS_DIR;

function makeGeomapSpec(sources: Record<string, unknown>[]): Record<string, unknown> {
  return { content: { geography: { sources } } };
}

beforeAll(() => {
  delete process.env.OPEN_EDU_GEO_ASSETS_DIR;
});

afterAll(() => {
  if (savedEnvDir !== undefined) process.env.OPEN_EDU_GEO_ASSETS_DIR = savedEnvDir;
});

describe('parseGeoUri', () => {
  it('extracts the asset id from an openedu://geo URI', () => {
    expect(parseGeoUri('openedu://geo/india/states')).toBe('india/states');
    expect(parseGeoUri('openedu://geo/world/countries')).toBe('world/countries');
  });

  it('returns undefined for non-geo URIs and empty ids', () => {
    expect(parseGeoUri('openedu://custom/local')).toBeUndefined();
    expect(parseGeoUri('https://example.com/data.geojson')).toBeUndefined();
    expect(parseGeoUri('openedu://geo/')).toBeUndefined();
    expect(parseGeoUri('')).toBeUndefined();
  });
});

describe('collectGeoSourceRefs', () => {
  it('finds geo URIs in both engine-native and geo-assets convention forms', () => {
    const spec = makeGeomapSpec([
      { id: 'a', type: 'geojson', class: 'reference', uri: 'openedu://geo/demo/states' },
      {
        id: 'b',
        type: 'geojson',
        class: 'reference',
        asset: { uri: 'openedu://geo/demo/cities', version: '1.0.0' },
      },
      { id: 'c', type: 'geojson', class: 'reference', uri: 'openedu://custom/local' },
      { id: 'd', type: 'geojson', class: 'reference', data: { type: 'FeatureCollection' } },
    ]);

    const refs = collectGeoSourceRefs(spec);
    expect(refs).toHaveLength(2);
    expect(refs.map((r) => r.uri)).toEqual([
      'openedu://geo/demo/states',
      'openedu://geo/demo/cities',
    ]);
    expect(refs[1]?.version).toBe('1.0.0');
  });

  it('returns an empty list for specs without geography sources', () => {
    expect(collectGeoSourceRefs({})).toEqual([]);
    expect(collectGeoSourceRefs({ content: {} })).toEqual([]);
  });
});

describe('inlineGeoSources (pure)', () => {
  const fc = (featureIds: string[]) => ({
    type: 'FeatureCollection',
    features: featureIds.map((id) => ({ type: 'Feature', id, geometry: null })),
  });

  it('inlines data, drops the uri, and normalizes type to geojson', async () => {
    const spec = makeGeomapSpec([
      { id: 'a', type: 'topojson', class: 'reference', uri: 'openedu://geo/demo/states' },
    ]);

    await inlineGeoSources(spec, async () => fc(['IN-OD']));

    const [source] = (
      spec.content as {
        geography: { sources: [{ uri?: string; type?: string; data?: unknown }] };
      }
    ).geography.sources;
    expect(source.uri).toBeUndefined();
    expect(source.type).toBe('geojson');
    expect((source.data as { features: unknown[] }).features).toHaveLength(1);
  });

  it('supports the asset { uri, version } convention and forwards the version', async () => {
    const spec = makeGeomapSpec([
      {
        id: 'a',
        type: 'geojson',
        class: 'reference',
        asset: { uri: 'openedu://geo/demo/cities', version: '1.0.0' },
      },
    ]);
    let seenVersion: string | undefined;

    await inlineGeoSources(spec, async (_id, version) => {
      seenVersion = version;
      return fc(['city']);
    });

    expect(seenVersion).toBe('1.0.0');
    const [source] = (
      spec.content as {
        geography: { sources: [{ asset?: unknown; data?: unknown }] };
      }
    ).geography.sources;
    expect(source.asset).toBeUndefined();
    expect(source.data).toBeDefined();
  });

  it('leaves non-geo URIs and inline data untouched', async () => {
    const spec = makeGeomapSpec([
      { id: 'a', type: 'geojson', class: 'reference', uri: 'openedu://custom/local' },
      { id: 'b', type: 'geojson', class: 'reference', data: { type: 'FeatureCollection' } },
    ]);
    const load = vi.fn(async (assetId: string): Promise<Record<string, unknown> | undefined> => {
      expect.fail(`should not load: ${assetId}`);
      return undefined;
    });

    await inlineGeoSources(spec, load);

    const [a, b] = (
      spec.content as {
        geography: { sources: [{ uri?: string; data?: unknown }, { data?: unknown }] };
      }
    ).geography.sources;
    expect(a.uri).toBe('openedu://custom/local');
    expect(a.data).toBeUndefined();
    expect(b.data).toEqual({ type: 'FeatureCollection' });
  });

  it('throws a NodeLoadError when the loader cannot resolve a geo uri', async () => {
    const spec = makeGeomapSpec([
      { id: 'a', type: 'geojson', class: 'reference', uri: 'openedu://geo/demo/missing' },
    ]);

    await expect(inlineGeoSources(spec, async () => undefined)).rejects.toThrowError(NodeLoadError);
  });
});

describe('loadGeoAssetFeatures', () => {
  it('converts a TopoJSON boundary asset to a FeatureCollection', async () => {
    const data = await loadGeoAssetFeatures('demo/states', geoAssetsFixtureDir);
    const features = (data as { features: Array<{ id?: string }> }).features;
    expect(features).toHaveLength(2);
    expect(features.map((f) => f.id)).toEqual(['IN-OD', 'IN-WB']);
  });

  it('passes GeoJSON assets through', async () => {
    const data = await loadGeoAssetFeatures('demo/cities', geoAssetsFixtureDir);
    const features = (data as { features: unknown[] }).features;
    expect(features).toHaveLength(1);
  });

  it('rejects unknown asset ids with available assets listed', async () => {
    await expect(loadGeoAssetFeatures('demo/missing', geoAssetsFixtureDir)).rejects.toThrowError(
      /Available assets: demo\/states, demo\/cities/,
    );
  });

  it('rejects a requested version that does not match the catalog', async () => {
    await expect(
      loadGeoAssetFeatures('demo/states', geoAssetsFixtureDir, '2.0.0'),
    ).rejects.toThrowError(/version mismatch/i);
  });
});

describe('findGeoAssetsDir', () => {
  it('returns an explicit dir with a catalog', async () => {
    expect(await findGeoAssetsDir(geoAssetsFixtureDir)).toBe(geoAssetsFixtureDir);
  });

  it('returns undefined for an explicit dir without a catalog', async () => {
    expect(await findGeoAssetsDir(join(fixturesDir, 'valid-package'))).toBeUndefined();
    expect(await findGeoAssetsDir(join(fixturesDir, 'geo-assets', 'nope'))).toBeUndefined();
  });
});

describe('loader integration', () => {
  it('inlines geo URIs when loading a package with a geoAssetsDir', async () => {
    const pkg = await loadPackage(geoPackageDir, { geoAssetsDir: geoAssetsFixtureDir });
    const node = pkg.nodes.find((n) => n.relativePath === 'nodes/geomap.json');
    expect(node?.node.type).toBe('interactive');
    if (node?.node.type !== 'interactive') return;

    const [states, cities, runtime, inline] = (
      node.node.spec as { content: { geography: { sources: unknown[] } } }
    ).content.geography.sources as [
      { type?: string; uri?: string; data?: { features?: unknown[] } },
      { asset?: unknown; uri?: string; data?: { features?: unknown[] } },
      { uri?: string; data?: unknown },
      { data?: unknown },
    ];

    expect(states.uri).toBeUndefined();
    expect(states.type).toBe('geojson');
    expect(states.data?.features).toHaveLength(2);

    expect(cities.asset).toBeUndefined();
    expect(cities.data?.features).toHaveLength(1);

    expect(runtime.uri).toBe('openedu://custom/local');
    expect(runtime.data).toBeUndefined();
    expect(inline.data).toBeDefined();
  });

  it('leaves geo URIs intact when resolution is opted out', async () => {
    const pkg = await loadPackage(geoPackageDir, { resolveGeoAssets: false });
    const node = pkg.nodes.find((n) => n.relativePath === 'nodes/geomap.json');
    expect(node?.node.type).toBe('interactive');
    if (node?.node.type !== 'interactive') return;
    const [states] = (node.node.spec as { content: { geography: { sources: unknown[] } } }).content
      .geography.sources as [{ uri?: string; data?: unknown }];
    expect(states.uri).toBe('openedu://geo/demo/states');
    expect(states.data).toBeUndefined();
  });

  it('fails fast when an explicit geoAssetsDir is missing or invalid', async () => {
    await expect(
      loadPackage(geoPackageDir, { geoAssetsDir: join(fixturesDir, 'nope') }),
    ).rejects.toThrowError(/geo-assets catalog/i);
  });

  it('fails fast on unknown asset ids and version mismatches', async () => {
    const unknownSpec = makeGeomapSpec([
      { id: 'a', type: 'geojson', class: 'reference', uri: 'openedu://geo/demo/missing' },
    ]);
    await expect(
      resolveGeoUrisInSpec(unknownSpec, { geoAssetsDir: geoAssetsFixtureDir }),
    ).rejects.toThrowError(/not found in catalog/i);

    const versionSpec = makeGeomapSpec([
      {
        id: 'a',
        type: 'geojson',
        class: 'reference',
        asset: { uri: 'openedu://geo/demo/states', version: '9.9.9' },
      },
    ]);
    await expect(
      resolveGeoUrisInSpec(versionSpec, { geoAssetsDir: geoAssetsFixtureDir }),
    ).rejects.toThrowError(/version mismatch/i);
  });
});

describe('node-level resolution', () => {
  it('resolves geo URIs in a composed lesson engine spec', async () => {
    const composed: LoadedNode = {
      path: 'nodes/composed.json',
      relativePath: 'nodes/composed.json',
      content: '',
      node: {
        type: 'interactive',
        id: 'composed',
        engines: [
          {
            instanceId: 'g1',
            engine: 'geomap',
            spec: makeGeomapSpec([
              { id: 'a', type: 'geojson', class: 'reference', uri: 'openedu://geo/demo/states' },
            ]),
          },
          { instanceId: 'v1', engine: 'visual', spec: {} },
        ],
        bindings: [],
      },
    };

    await resolveGeoUrisInNode(composed, { geoAssetsDir: geoAssetsFixtureDir });

    const [engine] = (composed.node as { engines: Array<{ spec: Record<string, unknown> }> })
      .engines;
    expect(engine).toBeDefined();
    if (!engine) return;
    const [states] = (engine.spec as { content: { geography: { sources: unknown[] } } }).content
      .geography.sources as [{ uri?: string; data?: { features?: unknown[] } }];
    expect(states.uri).toBeUndefined();
    expect(states.data?.features).toHaveLength(2);
  });

  it('ignores non-interactive nodes', async () => {
    const lesson: LoadedNode = {
      path: 'nodes/lesson.md',
      relativePath: 'nodes/lesson.md',
      content: '# Hello',
      node: { type: 'lesson', title: 'Hello' },
    };
    await expect(
      resolveGeoUrisInNode(lesson, { geoAssetsDir: geoAssetsFixtureDir }),
    ).resolves.toBeUndefined();
    await expect(resolveGeoUrisInNodes([lesson], {})).resolves.toBeUndefined();
  });
});

describe('loadNodes direct loader', () => {
  it('resolves geo URIs too', async () => {
    const nodes = await loadNodes(geoPackageDir, { geoAssetsDir: geoAssetsFixtureDir });
    const node = nodes.find((n) => n.relativePath === 'nodes/geomap.json');
    expect(node?.node.type).toBe('interactive');
    if (node?.node.type !== 'interactive') return;
    const [states] = (node.node.spec as { content: { geography: { sources: unknown[] } } }).content
      .geography.sources as [{ data?: { features?: unknown[] }; uri?: string }];
    expect(states.data?.features).toHaveLength(2);
    expect(states.uri).toBeUndefined();
  });
});
