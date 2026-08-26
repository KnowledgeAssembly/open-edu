import { Ajv, type AnySchema } from 'ajv';
import { isTrustTierEnabled, WidgetManifestSchema } from '@open-edu/schemas';
import type {
  RemoteWidgetManifest,
  WidgetCapability,
  WidgetManifest,
  WidgetPolicy,
  WidgetReference,
} from '@open-edu/schemas';
import { normalizeWidgetReference } from './normalize-reference.js';
import type { NormalizeWarning } from './normalize-reference.js';
import { fetchBytes, fetchJson, isFetchTimeout } from './fetch-manifest.js';
import { verifyIntegrity } from '../integrity.js';
import type { WidgetArtifactCache } from '../artifact-cache.js';
import type { WidgetDefinition, WidgetRegistry } from '../types.js';

export type ResolveFailure =
  | 'policy'
  | 'integrity'
  | 'incompatible'
  | 'revoked'
  | 'unavailable'
  | 'schema'
  | 'timeout';

export type ResolvedWidget =
  | {
      ok: true;
      tier: 'native';
      widgetId: string;
      version: string;
      definition: WidgetDefinition;
    }
  | {
      ok: true;
      tier: 'sandboxed';
      widgetId: string;
      version: string;
      manifest: WidgetManifest;
      documentBytes: ArrayBuffer;
      documentUrl?: string;
      srcDoc?: string;
      grantedCapabilities: WidgetCapability[];
    }
  | { ok: false; failure: ResolveFailure; message: string };

export interface ResolverCatalog {
  registryId: string;
  origin: string;
  widgets: Map<string, CatalogWidgetMeta>;
}

export interface CatalogWidgetMeta {
  id: string;
  version: string;
  manifestUrl: string;
  status: 'experimental' | 'verified' | 'deprecated' | 'revoked';
  trustTier: 'native' | 'sandboxed';
  offline: boolean;
}

export interface WidgetResolverOptions {
  policy: WidgetPolicy;
  cache: WidgetArtifactCache;
  catalogs: Record<string, ResolverCatalog>;
  registry: WidgetRegistry;
  fetchImpl?: typeof fetch;
  now?: () => number;
  isOnline?: () => boolean;
}

export interface WidgetResolver {
  normalize(input: {
    widget?: string;
    version?: string;
    remoteWidget?: RemoteWidgetManifest;
    widgetRef?: WidgetReference;
  }): { ref: WidgetReference; warnings: NormalizeWarning[] };
  resolve(ref: WidgetReference, nodeConfig?: unknown): Promise<ResolvedWidget>;
}

const DAY = 24 * 60 * 60 * 1000;
const MAX_SRCDOC_BYTES = 2 * 1024 * 1024;

export function createWidgetResolver(options: WidgetResolverOptions): WidgetResolver {
  const { policy, cache, catalogs, registry } = options;
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? Date.now;
  const isOnline = options.isOnline ?? (() => true);

  return {
    normalize: normalizeWidgetReference,
    async resolve(ref, nodeConfig): Promise<ResolvedWidget> {
      if (ref.source === 'builtin') {
        const definition = registry.get(ref.id);
        if (!definition) {
          return { ok: false, failure: 'unavailable', message: 'builtin-not-registered' };
        }
        return {
          ok: true,
          tier: 'native',
          widgetId: ref.id,
          version: ref.version,
          definition,
        };
      }

      if (ref.source === 'url') {
        if (!isTrustTierEnabled(policy, 'trusted-remote')) {
          return { ok: false, failure: 'policy', message: 'trusted-remote-disabled' };
        }
        if (policy.requireIntegrityForTrustedRemote && !ref.integrity) {
          return { ok: false, failure: 'integrity', message: 'integrity-required' };
        }
        return { ok: false, failure: 'unavailable', message: 'legacy-url-renderer-path' };
      }

      if (!ref.integrity) {
        return { ok: false, failure: 'integrity', message: 'registry-ref-requires-integrity' };
      }
      const catalog = catalogs[ref.registryId ?? ''];
      if (!catalog) {
        return { ok: false, failure: 'unavailable', message: 'registry-not-configured' };
      }
      const entry = catalog.widgets.get(`${ref.id}@${ref.version}`);
      if (!entry) {
        return { ok: false, failure: 'unavailable', message: 'widget-not-in-catalog' };
      }
      let manifestOrigin: string;
      try {
        manifestOrigin = new URL(entry.manifestUrl).origin;
      } catch {
        return { ok: false, failure: 'schema', message: 'manifest-url-invalid' };
      }
      if (!policy.registryCatalogOrigins.includes(manifestOrigin)) {
        return { ok: false, failure: 'policy', message: 'registry-origin-not-allowed' };
      }

      let manifestBytes: ArrayBuffer | undefined;
      try {
        manifestBytes = await fetchBytes(
          entry.manifestUrl,
          { signal: AbortSignal.timeout(policy.readyTimeoutMs) },
          fetchImpl,
        );
      } catch (err) {
        const timedOut = isFetchTimeout(err);
        if (ref.integrity) {
          const offlineManifest = await cache.getEntry(
            ref.id,
            ref.version,
            ref.integrity,
            'manifest',
          );
          if (offlineManifest) {
            manifestBytes = offlineManifest.bytes;
          }
        }
        if (!manifestBytes) {
          return {
            ok: false,
            failure: timedOut ? 'timeout' : 'unavailable',
            message: timedOut ? 'manifest-fetch-timeout' : 'manifest-fetch-failed',
          };
        }
      }

      try {
        await verifyIntegrity(manifestBytes, ref.integrity);
      } catch {
        return { ok: false, failure: 'integrity', message: 'manifest-integrity-mismatch' };
      }

      let manifest: WidgetManifest;
      try {
        manifest = WidgetManifestSchema.parse(JSON.parse(new TextDecoder().decode(manifestBytes)));
      } catch {
        return { ok: false, failure: 'schema', message: 'manifest-invalid' };
      }

      if (manifest.id !== ref.id || manifest.version !== ref.version) {
        return { ok: false, failure: 'incompatible', message: 'manifest-identity-mismatch' };
      }

      const NOW = now();
      await cache.put({
        widgetId: ref.id,
        version: ref.version,
        integrity: ref.integrity,
        bytes: manifestBytes,
        cachedAt: NOW,
        kind: 'manifest',
      });
      let cachedDocumentBytes: ArrayBuffer | undefined;

      if (manifest.status === 'revoked' || entry.status === 'revoked') {
        const cached = await cache.getEntry(
          ref.id,
          ref.version,
          manifest.artifact.documentIntegrity,
        );
        if (cached && !cached.revokedAt) {
          await cache.put({ ...cached, revokedAt: NOW });
        }
        const cachedManifest = await cache.getEntry(ref.id, ref.version, ref.integrity, 'manifest');
        if (cachedManifest && !cachedManifest.revokedAt) {
          await cache.put({ ...cachedManifest, revokedAt: NOW });
        }
        if (isOnline()) {
          return { ok: false, failure: 'revoked', message: 'revoked' };
        }
        if (cached && NOW - cached.cachedAt <= 7 * DAY) {
          cachedDocumentBytes = cached.bytes;
        } else {
          return { ok: false, failure: 'revoked', message: 'revoked-offline-grace-expired' };
        }
      }

      const unsigned = manifest.signature === undefined || manifest.signature === null;
      const effectiveStatus: WidgetManifest['status'] =
        manifest.status === 'verified' && unsigned ? 'experimental' : manifest.status;
      if (effectiveStatus === 'experimental' && policy.experimentalWidgets === 'deny') {
        return { ok: false, failure: 'policy', message: 'experimental-denied' };
      }

      const grantedCapabilities = manifest.capabilities.filter((cap) =>
        policy.grantedCapabilities.includes(cap),
      );

      if (manifest.schemas.configUrl && nodeConfig !== undefined) {
        let configSchema: unknown;
        try {
          configSchema = await fetchJson(
            manifest.schemas.configUrl,
            { signal: AbortSignal.timeout(policy.readyTimeoutMs) },
            fetchImpl,
          );
        } catch {
          return { ok: false, failure: 'schema', message: 'config-schema-unavailable' };
        }
        try {
          const validate = new Ajv({ strict: false, allErrors: true }).compile(
            configSchema as AnySchema,
          );
          if (!validate(nodeConfig)) {
            return { ok: false, failure: 'schema', message: 'config-invalid' };
          }
        } catch {
          return { ok: false, failure: 'schema', message: 'config-invalid' };
        }
      }

      let bytes: ArrayBuffer;
      if (cachedDocumentBytes) {
        bytes = cachedDocumentBytes;
      } else {
        try {
          if (manifest.distribution.offline) {
            bytes =
              (await cache.get(ref.id, ref.version, manifest.artifact.documentIntegrity)) ??
              (await fetchBytes(
                manifest.artifact.documentUrl,
                { signal: AbortSignal.timeout(policy.readyTimeoutMs) },
                fetchImpl,
              ));
          } else {
            bytes = await fetchBytes(
              manifest.artifact.documentUrl,
              { signal: AbortSignal.timeout(policy.readyTimeoutMs) },
              fetchImpl,
            );
          }
        } catch (err) {
          if (isFetchTimeout(err)) {
            return { ok: false, failure: 'timeout', message: 'document-fetch-timeout' };
          }
          return { ok: false, failure: 'unavailable', message: 'document-fetch-failed' };
        }
        try {
          await verifyIntegrity(bytes, manifest.artifact.documentIntegrity);
        } catch {
          return { ok: false, failure: 'integrity', message: 'document-integrity-mismatch' };
        }
        await cache.put({
          widgetId: ref.id,
          version: ref.version,
          integrity: manifest.artifact.documentIntegrity,
          bytes,
          cachedAt: NOW,
        });
      }

      if (manifest.artifact.format === 'multi-file') {
        let documentOrigin: string;
        try {
          documentOrigin = new URL(manifest.artifact.documentUrl).origin;
        } catch {
          return { ok: false, failure: 'schema', message: 'document-url-invalid' };
        }
        if (documentOrigin !== manifestOrigin) {
          return { ok: false, failure: 'policy', message: 'document-origin-not-allowed' };
        }
        return {
          ok: true,
          tier: 'sandboxed',
          widgetId: ref.id,
          version: ref.version,
          manifest,
          documentBytes: bytes,
          documentUrl: manifest.artifact.documentUrl,
          grantedCapabilities,
        };
      }
      if (bytes.byteLength > MAX_SRCDOC_BYTES) {
        return { ok: false, failure: 'schema', message: 'document-too-large' };
      }
      return {
        ok: true,
        tier: 'sandboxed',
        widgetId: ref.id,
        version: ref.version,
        manifest,
        documentBytes: bytes,
        srcDoc: new TextDecoder().decode(bytes),
        grantedCapabilities,
      };
    },
  };
}
