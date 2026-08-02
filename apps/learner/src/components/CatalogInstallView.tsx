import { useState, useCallback } from 'react';
import { useTranslation } from '@open-edu/i18n';
import { parseCatalog, catalogSource } from '@open-edu/oep-distribution';
import type { Catalog, CatalogPackageEntry, InstallResult } from '@open-edu/oep-distribution';
import { installFromSource } from '../courseDownload';
import { proxyFetch, proxyErrorCode, proxyUrl } from '../oep-proxy/client';
import type { ProxyErrorCode } from '../oep-proxy/client';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
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

export interface CatalogInstallViewProps {
  onInstalled?: () => Promise<void>;
}

export function CatalogInstallView({ onInstalled }: CatalogInstallViewProps): JSX.Element {
  const { t } = useTranslation();
  const [catalogUrl, setCatalogUrl] = useState('');
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set());

  const handleFetchCatalog = useCallback(async () => {
    if (!catalogUrl.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await proxyFetch(catalogUrl.trim());
      const result = parseCatalog(await response.json());
      setCatalog(result);
    } catch (err) {
      setError(t(proxyErrorKey(err)));
    } finally {
      setIsLoading(false);
    }
  }, [catalogUrl, t]);

  const handleInstallPackage = useCallback(
    async (entry: CatalogPackageEntry) => {
      const version = entry.versions[entry.versions.length - 1]!;
      setInstallingId(entry.id);
      try {
        const source = catalogSource({
          downloadUrl: proxyUrl(version.downloadUrl),
          label: `${entry.title} v${version.version}`,
          expectedChecksum: version.checksum,
        });
        const result = await installFromSource(source);
        if (result.success) {
          setInstalledIds((prev) => new Set(prev).add(entry.id));
          toast.success(t('learner.install.success'));
          await onInstalled?.();
        } else {
          toast.error(t(installErrorKey(result)));
        }
      } catch {
        toast.error(t('learner.install.error_unknown'));
      } finally {
        setInstallingId(null);
      }
    },
    [onInstalled, t],
  );

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
                    disabled={installingId === entry.id || installedIds.has(entry.id)}
                    variant={installedIds.has(entry.id) ? 'outline' : 'default'}
                    data-testid="install-from-catalog-button"
                    className="w-full"
                  >
                    {installedIds.has(entry.id) ? (
                      <>
                        <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                        {t('learner.catalog.installed_badge')}
                      </>
                    ) : installingId === entry.id ? (
                      t('learner.catalog.loading')
                    ) : (
                      t('learner.catalog.install_version')
                    )}
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

const proxyErrorKeyMap: Record<ProxyErrorCode, string> = {
  INVALID_URL: 'learner.proxy.error.invalid_url',
  UPSTREAM_ERROR: 'learner.proxy.error.upstream_error',
  PROXY_ERROR: 'learner.proxy.error.proxy_error',
};

function proxyErrorKey(err: unknown): string {
  const code = proxyErrorCode(err);
  return code
    ? (proxyErrorKeyMap[code] ?? 'learner.catalog.fetch_error')
    : 'learner.catalog.fetch_error';
}

const installErrorKeyMap: Record<string, string> = {
  ARCHIVE_TOO_LARGE: 'learner.install.error_archive_too_large',
  DECOMPRESSED_TOO_LARGE: 'learner.install.error_decompressed_too_large',
  MALFORMED_ARCHIVE: 'learner.install.error_malformed_archive',
  CHECKSUM_MISMATCH: 'learner.install.error_checksum_mismatch',
  MANIFEST_MISMATCH: 'learner.install.error_manifest_mismatch',
  COURSE_VALIDATION_ERROR: 'learner.install.error_course_validation',
  SOURCE_READ_ERROR: 'learner.install.error_network',
  STORAGE_ERROR: 'learner.install.error_storage',
  VERSION_DOWNGRADE: 'learner.install.error_version_downgrade',
  VERSION_SAME: 'learner.install.error_version_same',
  NOT_FOUND: 'learner.install.error_not_found',
};

function installErrorKey(result: InstallResult): string {
  return installErrorKeyMap[result.errorCode ?? ''] ?? 'learner.install.error_unknown';
}
