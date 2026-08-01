import { CatalogSchema } from '@open-edu/schemas';
import type { Catalog, CatalogPackageEntry, CatalogVersionEntry } from '@open-edu/schemas';
import { createLogger } from '@open-edu/logger';

const catalogLogger = createLogger({ scope: 'oep:catalog' });

export class CatalogLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CatalogLoadError';
  }
}

export async function fetchCatalog(url: string, signal?: AbortSignal): Promise<Catalog> {
  catalogLogger.info('Fetching catalog...', { url });
  let response: Response;
  try {
    response = await fetch(url, { signal });
  } catch (err) {
    catalogLogger.error('Failed to fetch catalog', err, { url });
    throw new CatalogLoadError(
      `Failed to fetch catalog from "${url}": ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!response.ok) {
    catalogLogger.error(`Catalog fetch failed: HTTP ${response.status}`, { url });
    throw new CatalogLoadError(`Catalog fetch failed: HTTP ${response.status}`);
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    catalogLogger.error('Catalog response is not valid JSON', { url });
    throw new CatalogLoadError('Catalog response is not valid JSON');
  }

  return parseCatalog(json);
}

export function parseCatalog(data: unknown): Catalog {
  const result = CatalogSchema.safeParse(data);
  if (!result.success) {
    catalogLogger.error('Catalog validation failed', {
      error: result.error.message,
    });
    throw new CatalogLoadError(`Catalog validation failed: ${result.error.message}`);
  }
  catalogLogger.info('Catalog loaded', { packageCount: result.data.packages.length });
  return result.data;
}

export function findPackageInCatalog(
  catalog: Catalog,
  packageId: string,
): CatalogPackageEntry | undefined {
  return catalog.packages.find((p) => p.id === packageId);
}

export function findVersionInCatalog(
  entry: CatalogPackageEntry,
  version: string,
): CatalogVersionEntry | undefined {
  return entry.versions.find((v) => v.version === version);
}
