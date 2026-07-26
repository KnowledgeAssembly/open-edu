import { useState, useCallback } from 'react';
import { useTranslation } from '@open-edu/i18n';
import { fetchCatalog, catalogSource } from '@open-edu/oep-distribution';
import type { Catalog, CatalogPackageEntry } from '@open-edu/oep-distribution';
import { installFromSource } from '../courseDownload';
import {
  Button,
  Input,
  PageHeader,
  EmptyState,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@open-edu/design-system';

export function CatalogInstallView(): JSX.Element {
  const { t } = useTranslation();
  const [catalogUrl, setCatalogUrl] = useState('');
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installingId, setInstallingId] = useState<string | null>(null);

  const handleFetchCatalog = useCallback(async () => {
    if (!catalogUrl.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchCatalog(catalogUrl.trim());
      setCatalog(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('learner.catalog.fetch_error'));
    } finally {
      setIsLoading(false);
    }
  }, [catalogUrl, t]);

  const handleInstallPackage = useCallback(async (entry: CatalogPackageEntry) => {
    const version = entry.versions[entry.versions.length - 1]!;
    setInstallingId(entry.id);
    try {
      const source = catalogSource({
        downloadUrl: version.downloadUrl,
        label: `${entry.title} v${version.version}`,
        expectedChecksum: version.checksum,
      });
      await installFromSource(source);
    } catch {
      // errors surfaced by coordinator
    } finally {
      setInstallingId(null);
    }
  }, []);

  return (
    <div className="p-xl max-w-content mx-auto w-full">
      <PageHeader title={t('learner.catalog.load_catalog')} className="mb-xl" />

      <div className="mb-lg flex gap-3">
        <Input
          type="url"
          placeholder={t('learner.catalog.catalog_url_placeholder')}
          value={catalogUrl}
          onChange={(e) => setCatalogUrl(e.target.value)}
          className="flex-1"
          aria-label={t('learner.catalog.catalog_url_label')}
        />
        <Button onClick={handleFetchCatalog} disabled={isLoading || !catalogUrl.trim()}>
          {isLoading ? t('learner.catalog.fetching') : t('learner.catalog.fetch_button')}
        </Button>
      </div>

      {error && (
        <p className="text-error text-caption mb-md" role="alert">
          {error}
        </p>
      )}

      {catalog && catalog.packages.length === 0 && (
        <EmptyState variant="no-results" heading={t('learner.catalog.no_entries')} description="" />
      )}

      {catalog && catalog.packages.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
          {catalog.packages.map((entry) => {
            const latest = entry.versions[entry.versions.length - 1]!;
            return (
              <Card key={entry.id}>
                <CardHeader>
                  <CardTitle>{entry.title}</CardTitle>
                  <CardDescription>
                    {t('learner.catalog.version')}: {latest.version}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-on-surface-variant text-caption mb-3">
                    {t('learner.catalog.size')}: {(latest.sizeBytes / 1024).toFixed(0)} KB
                  </p>
                  <Button
                    onClick={() => handleInstallPackage(entry)}
                    disabled={installingId === entry.id}
                    className="w-full"
                  >
                    {installingId === entry.id
                      ? t('learner.catalog.loading')
                      : t('learner.catalog.install_version')}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
