import { rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../..');

export const WIDGET_REGISTRY_DIR = join(REPO_ROOT, '.openedu-widget-registry');
export const WIDGET_ID = 'community.example.counter';
export const WIDGET_PUBLISHER = 'localpub';
export const WIDGET_VERSION = '1.0.0';
export const REGISTRY_ORIGIN = 'http://localhost:4002';
export const REGISTRY_ID = 'localdev';

const WIDGET_MANIFEST_FILE = join(
  REPO_ROOT,
  'examples/community-widget-counter/widget.manifest.json',
);
const WIDGET_DOCUMENT_FILE = join(REPO_ROOT, 'examples/community-widget-counter/dist/index.html');

export { WIDGET_MANIFEST_FILE, WIDGET_DOCUMENT_FILE };

function sha256Hex(bytes) {
  return createHash('sha256').update(Buffer.from(bytes)).digest('hex');
}

/**
 * Mirrors what WidgetRegistryStore.install persists so the served manifest bytes
 * exactly match what the fixture course's widgetRef.integrity was computed over.
 * The seed persists the RAW manifest file bytes (and the registry route serves
 * them verbatim via readManifestBytes), so this callsite writes the file
 * content byte-for-byte rather than re-serializing a parsed object.
 */
export async function seedRegistry() {
  const manifestRaw = await readFile(WIDGET_MANIFEST_FILE, 'utf-8');
  const manifestJson = JSON.parse(manifestRaw);
  const documentBytes = new Uint8Array(await readFile(WIDGET_DOCUMENT_FILE));

  const html = Buffer.from(documentBytes).toString('utf-8');
  const documentIntegrity = `sha256-${sha256Hex(documentBytes)}`;
  if (documentIntegrity !== manifestJson.artifact.documentIntegrity) {
    throw new Error(
      `seed self-check: document integrity mismatch (${documentIntegrity} != ${manifestJson.artifact.documentIntegrity})`,
    );
  }
  if (manifestJson.artifact.sizeBytes !== documentBytes.byteLength) {
    throw new Error(`seed self-check: document size mismatch`);
  }
  const csp = /<meta[^>]*http-equiv="Content-Security-Policy"[^>]*content="([^"]*)"/i.exec(
    html,
  )?.[1];
  if (!csp || !csp.includes("connect-src 'none'") || !csp.includes("frame-src 'none'")) {
    throw new Error('seed self-check: document CSP must include connect-src/frame-src none');
  }
  if (!html.includes('open-edu.widget/1')) {
    throw new Error('seed self-check: document must speak the open-edu.widget/1 protocol');
  }

  const versionDir = join(WIDGET_REGISTRY_DIR, WIDGET_PUBLISHER, WIDGET_ID, WIDGET_VERSION);
  await rm(WIDGET_REGISTRY_DIR, { recursive: true, force: true });
  await mkdir(versionDir, { recursive: true });
  await writeFile(join(versionDir, 'manifest.json'), await readFile(WIDGET_MANIFEST_FILE));
  await writeFile(join(versionDir, 'index.html'), Buffer.from(documentBytes));
}
