import { mkdir, readFile, writeFile, readdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import { validateWidgetPackage } from '@open-edu/widgets/install';
import {
  WidgetManifestSchema,
  type WidgetManifest,
  DEFAULT_WIDGET_POLICY,
} from '@open-edu/schemas';
import { deriveRegistryId } from './registryId.js';

export type WidgetRegistryStatus = 'enabled' | 'disabled' | 'deprecated' | 'revoked';

export interface InstallWidgetInput {
  publisher: string;
  widgetId: string;
  manifestJson: unknown;
  documentBytes: Uint8Array;
  archiveBytes?: Uint8Array;
}

export interface WidgetInstanceCatalogEntry {
  id: string;
  version: string;
  manifestUrl: string;
  status: 'experimental' | 'verified' | 'deprecated' | 'revoked';
  trustTier: 'sandboxed';
  offline: boolean;
}

export interface WidgetInstanceCatalog {
  registryId: string;
  origin: string;
  widgets: WidgetInstanceCatalogEntry[];
}

export interface InstalledWidget {
  publisher: string;
  widget: string;
  version: string;
  status: WidgetRegistryStatus;
}

const MANAGED_STATUSES: readonly WidgetRegistryStatus[] = [
  'enabled',
  'disabled',
  'deprecated',
  'revoked',
];

function isManagedStatus(value: unknown): value is WidgetRegistryStatus {
  return typeof value === 'string' && (MANAGED_STATUSES as readonly string[]).includes(value);
}

export class WidgetAlreadyInstalledError extends Error {
  constructor(publisher: string, widget: string, version: string) {
    super(`widget version already installed: ${publisher}/${widget}@${version}`);
    this.name = 'WidgetAlreadyInstalledError';
  }
}

export class WidgetValidationError extends Error {
  constructor(public readonly errors: string[]) {
    super(`widget package validation failed: ${errors.join('; ')}`);
    this.name = 'WidgetValidationError';
  }
}

export class WidgetNotFoundError extends Error {
  constructor(publisher: string, widget: string, version?: string) {
    super(`widget not found: ${publisher}/${widget}${version ? `@${version}` : ''}`);
    this.name = 'WidgetNotFoundError';
  }
}

export class WidgetRegistryStore {
  readonly rootDir: string;
  readonly origin: string;
  readonly registryId: string;

  constructor(rootDir?: string, origin?: string, registryId?: string) {
    this.rootDir =
      rootDir ??
      process.env.OPEN_EDU_WIDGET_REGISTRY ??
      join(process.cwd(), '.openedu-widget-registry');
    this.origin = origin ?? 'http://localhost:4002';
    this.registryId =
      registryId ?? process.env.OPEN_EDU_WIDGET_REGISTRY_ID ?? deriveRegistryId(this.origin);
  }

  async install(
    input: InstallWidgetInput,
  ): Promise<{ publisher: string; widget: string; version: string }> {
    const validation = await validateWidgetPackage(
      {
        manifestJson: input.manifestJson,
        documentBytes: input.documentBytes,
        archiveBytes: input.archiveBytes,
      },
      { maxArtifactBytes: DEFAULT_WIDGET_POLICY.maxArtifactBytes },
    );
    if (!validation.ok) {
      throw new WidgetValidationError(validation.errors);
    }

    const manifest = validation.manifest;
    const publisher = manifest.publisher.id;
    const widget = manifest.id;
    const version = manifest.version;

    if (input.publisher !== publisher || input.widgetId !== widget) {
      throw new WidgetValidationError([
        `identity-mismatch: requested ${input.publisher}/${input.widgetId} but the manifest declares ${publisher}/${widget}`,
      ]);
    }

    const dir = this.versionDir(publisher, widget, version);
    if (await this.exists(join(dir, 'manifest.json'))) {
      throw new WidgetAlreadyInstalledError(publisher, widget, version);
    }

    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');
    await writeFile(join(dir, 'index.html'), input.documentBytes);
    if (input.archiveBytes) {
      await writeFile(join(dir, 'artifact.zip'), input.archiveBytes);
    }

    return { publisher, widget, version };
  }

  async catalog(): Promise<WidgetInstanceCatalog> {
    const widgets: WidgetInstanceCatalogEntry[] = [];
    const publishers = await this.listDir(this.rootDir);
    for (const publisher of publishers) {
      const pubDir = join(this.rootDir, publisher);
      const widgetDirs = await this.listDir(pubDir);
      for (const widget of widgetDirs) {
        const widgetDir = join(pubDir, widget);
        const widgetRevoked = await this.exists(join(widgetDir, 'revoked.json'));
        const versions = await this.listDir(widgetDir);
        for (const version of versions) {
          const versionDir = join(widgetDir, version);
          if (!(await this.exists(join(versionDir, 'manifest.json')))) continue;
          const status = await this.catalogStatus(versionDir);
          if (status === 'skip') continue;
          const manifest = await this.tryReadManifest(versionDir);
          if (!manifest) continue;
          let entryStatus: WidgetInstanceCatalogEntry['status'];
          if (widgetRevoked || status === 'revoked') entryStatus = 'revoked';
          else if (status === 'deprecated') entryStatus = 'deprecated';
          else entryStatus = manifest.status;
          widgets.push({
            id: manifest.id,
            version: manifest.version,
            manifestUrl: `${this.origin}/widget-registry/${publisher}/${widget}/${version}/manifest.json`,
            status: entryStatus,
            trustTier: 'sandboxed',
            offline: manifest.distribution.offline,
          });
        }
      }
    }
    return { registryId: this.registryId, origin: this.origin, widgets };
  }

  async revoke(publisher: string, widget: string, version?: string): Promise<void> {
    if (version) {
      await this.assertInstalled(publisher, widget, version);
      const dir = this.versionDir(publisher, widget, version);
      await mkdir(dir, { recursive: true });
      await writeFile(
        join(dir, 'revoked.json'),
        JSON.stringify({ revokedAt: new Date().toISOString() }, null, 2),
        'utf-8',
      );
      return;
    }
    const widgetDir = join(this.rootDir, publisher, widget);
    if ((await this.listDir(widgetDir)).length === 0) {
      throw new WidgetNotFoundError(publisher, widget);
    }
    await writeFile(
      join(widgetDir, 'revoked.json'),
      JSON.stringify({ revokedAt: new Date().toISOString() }, null, 2),
      'utf-8',
    );
  }

  async deprecate(publisher: string, widget: string, version: string): Promise<void> {
    await this.assertInstalled(publisher, widget, version);
    await this.writeStatus(publisher, widget, version, 'deprecated');
  }

  async setEnabled(
    publisher: string,
    widget: string,
    version: string,
    enabled: boolean,
  ): Promise<void> {
    await this.assertInstalled(publisher, widget, version);
    await this.writeStatus(publisher, widget, version, enabled ? 'enabled' : 'disabled');
  }

  async readManifest(publisher: string, widget: string, version: string): Promise<WidgetManifest> {
    const parsed = await this.tryReadManifest(this.versionDir(publisher, widget, version));
    if (!parsed) throw new WidgetNotFoundError(publisher, widget, version);
    return parsed;
  }

  async readManifestBytes(publisher: string, widget: string, version: string): Promise<Uint8Array> {
    const file = join(this.versionDir(publisher, widget, version), 'manifest.json');
    try {
      return new Uint8Array(await readFile(file));
    } catch {
      throw new WidgetNotFoundError(publisher, widget, version);
    }
  }

  async readDocument(publisher: string, widget: string, version: string): Promise<Uint8Array> {
    const file = join(this.versionDir(publisher, widget, version), 'index.html');
    try {
      return new Uint8Array(await readFile(file));
    } catch {
      throw new WidgetNotFoundError(publisher, widget, version);
    }
  }

  async readStatus(
    publisher: string,
    widget: string,
    version: string,
  ): Promise<WidgetRegistryStatus> {
    await this.assertInstalled(publisher, widget, version);
    const widgetDir = join(this.rootDir, publisher, widget);
    const versionDir = this.versionDir(publisher, widget, version);
    if (await this.exists(join(widgetDir, 'revoked.json'))) return 'revoked';
    if (await this.exists(join(versionDir, 'revoked.json'))) return 'revoked';
    const override = await this.readStatusFile(versionDir);
    if (override) return override;
    const manifest = await this.readManifest(publisher, widget, version);
    if (manifest.status === 'deprecated' || manifest.status === 'revoked') return manifest.status;
    return 'enabled';
  }

  async listInstalled(): Promise<InstalledWidget[]> {
    const installed: InstalledWidget[] = [];
    for (const publisher of await this.listDir(this.rootDir)) {
      for (const widget of await this.listDir(join(this.rootDir, publisher))) {
        for (const version of await this.listDir(join(this.rootDir, publisher, widget))) {
          const versionDir = this.versionDir(publisher, widget, version);
          if (!(await this.exists(join(versionDir, 'manifest.json')))) continue;
          const status = await this.readStatus(publisher, widget, version);
          installed.push({ publisher, widget, version, status });
        }
      }
    }
    return installed;
  }

  private versionDir(publisher: string, widget: string, version: string): string {
    return join(this.rootDir, publisher, widget, version);
  }

  private async exists(path: string): Promise<boolean> {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  }

  private async listDir(dir: string): Promise<string[]> {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
    } catch {
      return [];
    }
  }

  private async assertInstalled(publisher: string, widget: string, version: string): Promise<void> {
    if (!(await this.exists(join(this.versionDir(publisher, widget, version), 'manifest.json')))) {
      throw new WidgetNotFoundError(publisher, widget, version);
    }
  }

  private async writeStatus(
    publisher: string,
    widget: string,
    version: string,
    status: WidgetRegistryStatus,
  ): Promise<void> {
    const dir = this.versionDir(publisher, widget, version);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, '.status.json'), JSON.stringify({ status }, null, 2), 'utf-8');
  }

  private async readStatusFile(dir: string): Promise<WidgetRegistryStatus | null> {
    try {
      const parsed: unknown = JSON.parse(await readFile(join(dir, '.status.json'), 'utf-8'));
      const status = (parsed as { status?: unknown } | null)?.status;
      return isManagedStatus(status) ? status : null;
    } catch {
      return null;
    }
  }

  private async catalogStatus(dir: string): Promise<WidgetRegistryStatus | 'skip'> {
    const override = await this.readStatusFile(dir);
    if (override === 'disabled') return 'skip';
    if (override === 'revoked' || override === 'deprecated') return override;
    if (override === 'enabled') return 'enabled';
    if (await this.exists(join(dir, 'revoked.json'))) return 'revoked';
    const manifest = await this.tryReadManifest(dir);
    if (!manifest) return 'skip';
    if (manifest.status === 'revoked') return 'revoked';
    return manifest.status === 'deprecated' ? 'deprecated' : 'enabled';
  }

  private async tryReadManifest(versionDir: string): Promise<WidgetManifest | null> {
    try {
      const parsed: unknown = JSON.parse(
        await readFile(join(versionDir, 'manifest.json'), 'utf-8'),
      );
      return WidgetManifestSchema.parse(parsed);
    } catch {
      return null;
    }
  }
}
