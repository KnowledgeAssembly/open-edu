import { describe, expect, it } from 'vitest';
import { loadStaticCatalog } from './catalog.js';
import catalogFixture from './fixtures/catalog.json';

const validCatalog = {
  registryId: 'example-registry',
  origin: 'https://widgets.example.edu',
  widgets: [
    {
      id: 'community.example.counter',
      version: '1.0.0',
      manifestUrl: 'https://widgets.example.edu/community.example.counter/1.0.0/manifest.json',
      status: 'experimental',
      trustTier: 'sandboxed',
      offline: true,
    },
    {
      id: 'community.example.counter',
      version: '1.1.0',
      manifestUrl: 'https://widgets.example.edu/community.example.counter/1.1.0/manifest.json',
      status: 'verified',
      trustTier: 'sandboxed',
      offline: false,
    },
  ],
};

describe('loadStaticCatalog', () => {
  it('indexes widgets by id@version with both entries retrievable', () => {
    const catalog = loadStaticCatalog(validCatalog);

    expect(catalog.registryId).toBe('example-registry');
    expect(catalog.origin).toBe('https://widgets.example.edu');
    expect(catalog.widgets.size).toBe(2);

    const v1 = catalog.widgets.get('community.example.counter@1.0.0');
    expect(v1).toEqual({
      id: 'community.example.counter',
      version: '1.0.0',
      manifestUrl: 'https://widgets.example.edu/community.example.counter/1.0.0/manifest.json',
      status: 'experimental',
      trustTier: 'sandboxed',
      offline: true,
    });

    const v2 = catalog.widgets.get('community.example.counter@1.1.0');
    expect(v2).toEqual({
      id: 'community.example.counter',
      version: '1.1.0',
      manifestUrl: 'https://widgets.example.edu/community.example.counter/1.1.0/manifest.json',
      status: 'verified',
      trustTier: 'sandboxed',
      offline: false,
    });
  });

  it('rejects a catalog whose origin is http (not https)', () => {
    expect(() =>
      loadStaticCatalog({
        ...validCatalog,
        origin: 'http://widgets.example.edu',
        widgets: validCatalog.widgets.map((w) => ({ ...w })),
      }),
    ).toThrow();
  });

  it('rejects http non-loopback urls even when allowLoopback is set', () => {
    expect(() =>
      loadStaticCatalog(
        {
          ...validCatalog,
          origin: 'http://widgets.example.edu',
          widgets: validCatalog.widgets.map((w) => ({ ...w })),
        },
        { allowLoopback: true },
      ),
    ).toThrow();
  });

  it('accepts loopback http localhost and 127.0.0.1 urls when allowLoopback is set', () => {
    const catalog = loadStaticCatalog(
      {
        registryId: 'localdev',
        origin: 'http://localhost:4002',
        widgets: [
          {
            id: 'community.example.counter',
            version: '1.0.0',
            manifestUrl: 'http://127.0.0.1:4002/x/community.example.counter/1.0.0/manifest.json',
            status: 'experimental',
            trustTier: 'sandboxed',
            offline: true,
          },
        ],
      },
      { allowLoopback: true },
    );
    expect(catalog.registryId).toBe('localdev');
    expect(catalog.widgets.get('community.example.counter@1.0.0')).toMatchObject({
      manifestUrl: 'http://127.0.0.1:4002/x/community.example.counter/1.0.0/manifest.json',
    });
  });

  it('rejects loopback http urls when allowLoopback is not set', () => {
    expect(() =>
      loadStaticCatalog({
        registryId: 'localdev',
        origin: 'http://localhost:4002',
        widgets: [
          {
            id: 'community.example.counter',
            version: '1.0.0',
            manifestUrl: 'http://localhost:4002/x/manifest.json',
            status: 'experimental',
            trustTier: 'sandboxed',
            offline: true,
          },
        ],
      }),
    ).toThrow();
  });

  it('returns undefined when the widget id@version is not present', () => {
    const catalog = loadStaticCatalog(validCatalog);
    expect(catalog.widgets.get('community.example.other@1.0.0')).toBeUndefined();
  });

  it('parses the committed fixture and reports its https origin', () => {
    const catalog = loadStaticCatalog(catalogFixture);
    expect(catalog.origin).toBe('https://widgets.example.edu');
    expect(catalog.widgets.size).toBe(2);
    expect(catalog.widgets.get('community.example.counter@1.1.0')?.status).toBe('verified');
  });
});
