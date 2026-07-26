import { CatalogSchema } from '@open-edu/schemas';
import type { Catalog, CatalogPackageEntry, CatalogVersionEntry } from '@open-edu/schemas';

export class CatalogLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CatalogLoadError';
  }
}

export async function fetchCatalog(url: string, signal?: AbortSignal): Promise<Catalog> {
  let response: Response;
  try {
    response = await fetch(url, { signal });
  } catch (err) {
    throw new CatalogLoadError(
      `Failed to fetch catalog from "${url}": ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!response.ok) {
    throw new CatalogLoadError(`Catalog fetch failed: HTTP ${response.status}`);
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new CatalogLoadError('Catalog response is not valid JSON');
  }

  return parseCatalog(json);
}

export function parseCatalog(data: unknown): Catalog {
  const result = CatalogSchema.safeParse(data);
  if (!result.success) {
    throw new CatalogLoadError(`Catalog validation failed: ${result.error.message}`);
  }
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
