import type { LoadedPackage } from '@open-edu/core';
import { loadPackageFromFiles } from '@open-edu/core/browser';
import type { DistributionManifest } from '@open-edu/schemas';
import { OepReader, OepWriter } from '@open-edu/oep-distribution';
import type {
  StudioApi,
  StudioApiError,
  CourseSummary,
  ExportResult,
  LibraryResult,
  OutlineResult,
  StorageStatus,
  ValidationResult,
} from './studioApi.js';
import {
  createBrowserCourseStore,
  buildFileIndex,
  type BrowserCourse,
  type BrowserCourseStore,
  type BrowserCourseSummary,
} from './browserCourseStore.js';
import { assertSafeCoursePath, sortCourseFiles, type StudioFile } from './courseFiles.js';
import { getTemplateById } from './templates/catalog.js';
import { activitiesFromEntryOrder, buildLinearWorkflow } from './outlineModel.js';
import type { LibraryEntry } from './library/types.js';

const TEXT_DECODER = new TextDecoder();
const TEXT_ENCODER = new TextEncoder();

export class BrowserStudioApiError extends Error implements StudioApiError {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'BrowserStudioApiError';
    this.code = code;
  }
}

export interface BrowserStudioSession {
  activeCourseId: string | null;
  setActiveCourse(id: string | null): void;
}

export interface BrowserStudioApiOptions {
  store?: BrowserCourseStore;
  session?: BrowserStudioSession;
  onPackageChanged?: () => void;
}

export function createBrowserStudioSession(): BrowserStudioSession {
  let activeCourseId: string | null = null;
  return {
    get activeCourseId() {
      return activeCourseId;
    },
    setActiveCourse(id: string | null) {
      activeCourseId = id;
    },
  };
}

function makeUnsupported(method: string): never {
  throw new BrowserStudioApiError(
    'unsupported-in-browser',
    `${method} is not supported in browser mode yet`,
  );
}

function makeSourceFromFiles(files: StudioFile[]): {
  get(path: string): Uint8Array | undefined;
  list(prefix?: string): string[];
} {
  const index = buildFileIndex(files);
  const keys = Array.from(index.keys()).sort();
  return {
    get: (path) => index.get(path),
    list: (prefix) => (prefix ? keys.filter((p) => p.startsWith(prefix)) : keys),
  };
}

function summaryFromCourse(course: BrowserCourse): CourseSummary {
  return {
    id: course.id,
    title: course.title,
    version: course.version,
    updatedAt: course.updatedAt,
    fileCount: course.files.length,
  };
}

function summaryToLibraryEntry(summary: BrowserCourseSummary): LibraryEntry {
  return {
    id: summary.id,
    title: summary.title,
    kind: 'course',
    relativePath: summary.id,
    version: summary.version,
    updatedAt: summary.updatedAt,
  };
}

async function nextAvailableImportId(store: BrowserCourseStore, baseId: string): Promise<string> {
  let candidate = baseId;
  let suffix = 0;
  while (await store.get(candidate)) {
    suffix += 1;
    candidate = `${baseId}-imported${suffix === 1 ? '' : `-${suffix}`}`;
  }
  return candidate;
}

function updateManifestId(files: StudioFile[], id: string): StudioFile[] {
  const manifestIndex = files.findIndex((file) => file.path === 'package.json');
  if (manifestIndex === -1) return files;
  const manifest = JSON.parse(TEXT_DECODER.decode(files[manifestIndex]!.data)) as Record<
    string,
    unknown
  >;
  return files.map((file, index) =>
    index === manifestIndex
      ? { ...file, data: TEXT_ENCODER.encode(JSON.stringify({ ...manifest, id }, null, 2)) }
      : file,
  );
}

export function createBrowserStudioApi(options: BrowserStudioApiOptions = {}): StudioApi {
  const store = options.store ?? createBrowserCourseStore();
  const session = options.session ?? createBrowserStudioSession();
  const onPackageChanged = options.onPackageChanged ?? (() => {});

  async function requireActiveCourse(): Promise<BrowserCourse> {
    if (!session.activeCourseId) {
      throw new BrowserStudioApiError('no-active-course', 'No course is open');
    }
    const course = await store.get(session.activeCourseId);
    if (!course) {
      throw new BrowserStudioApiError(
        'course-not-found',
        `Course ${session.activeCourseId} not found`,
      );
    }
    return course;
  }

  async function loadCurrentPackage(): Promise<LoadedPackage> {
    const course = await requireActiveCourse();
    return loadPackageFromFiles(makeSourceFromFiles(course.files), `browser://${course.id}`);
  }

  async function replaceFiles(files: StudioFile[]): Promise<void> {
    const course = await requireActiveCourse();
    await store.replace(course.id, { ...course, files });
    onPackageChanged();
  }

  async function validate(): Promise<ValidationResult> {
    if (!session.activeCourseId) {
      return { valid: false, errors: [{ path: '', error: 'No course is open' }] };
    }
    const course = await store.get(session.activeCourseId);
    if (!course) {
      return {
        valid: false,
        errors: [{ path: '', error: `Course ${session.activeCourseId} not found` }],
      };
    }
    try {
      await loadPackageFromFiles(makeSourceFromFiles(course.files), `browser://${course.id}`);
      return { valid: true, errors: [] };
    } catch (err) {
      const e = err as { code?: string; file?: string; path?: string; message?: string };
      return {
        valid: false,
        errors: [{ path: e.file ?? e.path ?? '', error: e.message ?? String(err) }],
      };
    }
  }

  async function getOutline(): Promise<OutlineResult> {
    const course = await requireActiveCourse();
    const index = buildFileIndex(course.files);

    const manifestRaw = index.get('package.json');
    let title = '';
    if (manifestRaw) {
      try {
        title = (JSON.parse(TEXT_DECODER.decode(manifestRaw)) as { title?: string }).title ?? '';
      } catch {
        title = '';
      }
    }

    let orderedPaths: string[] = [];
    const files = new Map<string, string>();
    const workflowRaw = index.get('workflow.json');
    if (workflowRaw) {
      try {
        const workflow = JSON.parse(TEXT_DECODER.decode(workflowRaw)) as {
          routing?: Record<string, unknown>;
        };
        orderedPaths = Object.keys(workflow.routing ?? {});
      } catch {
        orderedPaths = [];
      }
    }
    if (orderedPaths.length === 0) {
      orderedPaths = Array.from(index.keys())
        .filter((p) => p.startsWith('nodes/') && /\.(md|json)$/.test(p))
        .sort();
      const entry = (() => {
        try {
          return (
            JSON.parse(TEXT_DECODER.decode(manifestRaw ?? new Uint8Array())) as { entry?: string }
          ).entry;
        } catch {
          return undefined;
        }
      })();
      if (entry && orderedPaths.includes(entry)) {
        orderedPaths = [entry, ...orderedPaths.filter((p) => p !== entry)];
      }
    }
    for (const path of orderedPaths) {
      const raw = index.get(path);
      if (raw) files.set(path, TEXT_DECODER.decode(raw));
    }

    return { title, activities: activitiesFromEntryOrder(orderedPaths, files) };
  }

  async function saveOutlineOrder(paths: string[]): Promise<{ success: boolean }> {
    const course = await requireActiveCourse();
    const index = buildFileIndex(course.files);
    const manifestRaw = index.get('package.json');
    let manifest: Record<string, unknown> = {};
    if (manifestRaw) {
      try {
        manifest = JSON.parse(TEXT_DECODER.decode(manifestRaw)) as Record<string, unknown>;
      } catch {
        manifest = {};
      }
    }

    const entry = paths[0] ?? (typeof manifest.entry === 'string' ? manifest.entry : '');
    const linear = buildLinearWorkflow(paths, entry);
    const nextFiles = course.files
      .filter((f) => f.path !== 'workflow.json' && f.path !== 'package.json')
      .concat([
        {
          path: 'workflow.json',
          data: TEXT_ENCODER.encode(JSON.stringify({ routing: linear.routing }, null, 2)),
        },
        {
          path: 'package.json',
          data: TEXT_ENCODER.encode(JSON.stringify({ ...manifest, entry: linear.entry }, null, 2)),
        },
      ]);
    await replaceFiles(nextFiles);
    return { success: true };
  }

  async function applyTemplate(templateId: string): Promise<{ success: boolean }> {
    const template = getTemplateById(templateId);
    if (!template) {
      throw new BrowserStudioApiError('invalid-template', `Unknown template: ${templateId}`);
    }
    const files: StudioFile[] = Object.entries(template.files).map(([path, content]) => ({
      path: assertSafeCoursePath(path),
      data: TEXT_ENCODER.encode(content),
    }));
    const manifestRaw = buildFileIndex(files).get('package.json');
    let id = templateId;
    let title = template.titleKey;
    let version = '1.0.0';
    if (manifestRaw) {
      try {
        const manifest = JSON.parse(TEXT_DECODER.decode(manifestRaw)) as {
          id?: string;
          title?: string;
          version?: string;
        };
        id = manifest.id ?? id;
        title = manifest.title ?? title;
        version = manifest.version ?? version;
      } catch {
        // keep template defaults
      }
    }
    const course: BrowserCourse = {
      id,
      version,
      title,
      files,
      updatedAt: Date.now(),
      source: { kind: 'template', label: templateId },
    };
    // Replacing an existing template course keeps edits consistent; creating a
    // brand new record is the normal path.
    const existing = await store.get(id);
    if (existing) {
      await store.replace(id, course);
    } else {
      await store.create(course);
    }
    session.setActiveCourse(id);
    onPackageChanged();
    return { success: true };
  }

  async function getLibrary(): Promise<LibraryResult> {
    const summaries = await store.list();
    return {
      workspace: 'browser',
      entries: summaries.map(summaryToLibraryEntry),
    };
  }

  async function openLibraryCourse(
    relativePath: string,
  ): Promise<{ success: boolean; packageDir: string }> {
    const course = await store.get(relativePath);
    if (!course) {
      throw new BrowserStudioApiError('course-not-found', `Course ${relativePath} not found`);
    }
    session.setActiveCourse(course.id);
    onPackageChanged();
    return { success: true, packageDir: `browser://${course.id}` };
  }

  async function duplicateCourse(
    relativePath: string,
    newId: string,
    newTitle: string,
  ): Promise<{ success: boolean; entry: LibraryEntry }> {
    const dup = await store.duplicate(relativePath, newId, newTitle);
    return {
      success: true,
      entry: summaryToLibraryEntry({ ...summaryFromCourse(dup), fileCount: dup.files.length }),
    };
  }

  async function renameCourse(
    relativePath: string,
    newTitle: string,
  ): Promise<{ success: boolean; entry: LibraryEntry }> {
    const course = await store.get(relativePath);
    if (!course) {
      throw new BrowserStudioApiError('course-not-found', `Course ${relativePath} not found`);
    }
    const index = buildFileIndex(course.files);
    let manifest: Record<string, unknown> = {};
    const manifestRaw = index.get('package.json');
    if (manifestRaw) {
      try {
        manifest = JSON.parse(TEXT_DECODER.decode(manifestRaw)) as Record<string, unknown>;
      } catch {
        manifest = {};
      }
    }
    const nextCourse: BrowserCourse = {
      ...course,
      title: newTitle,
      files: course.files.map((f) =>
        f.path === 'package.json'
          ? {
              path: f.path,
              data: TEXT_ENCODER.encode(JSON.stringify({ ...manifest, title: newTitle }, null, 2)),
            }
          : f,
      ),
      updatedAt: Date.now(),
    };
    await store.replace(relativePath, nextCourse);
    if (session.activeCourseId === relativePath) {
      onPackageChanged();
    }
    return {
      success: true,
      entry: summaryToLibraryEntry({
        ...summaryFromCourse(nextCourse),
        fileCount: nextCourse.files.length,
      }),
    };
  }

  async function archiveCourse(
    relativePath: string,
  ): Promise<{ success: boolean; archivedPath?: string }> {
    await store.delete(relativePath);
    if (session.activeCourseId === relativePath) {
      session.setActiveCourse(null);
    }
    onPackageChanged();
    return { success: true };
  }

  async function exportOep(): Promise<ExportResult> {
    const course = await requireActiveCourse();
    const manifest = await loadCurrentPackage().then((p) => p.manifest);
    const distManifest: DistributionManifest = {
      format: 'openedu-package',
      formatVersion: 1,
      type: 'course',
      id: manifest.id,
      version: manifest.version,
      title: manifest.title,
      checksum: { algorithm: 'sha256', value: '' },
      contentRoot: 'course/',
      signature: { status: 'unsigned' },
    };
    const courseFiles = new Map<string, Uint8Array>();
    for (const file of sortCourseFiles(course.files)) {
      courseFiles.set(file.path, new Uint8Array(file.data));
    }
    const result = await OepWriter.build({ manifest: distManifest, courseFiles });
    const blob = new Blob([result.bytes as unknown as ArrayBuffer], {
      type: 'application/octet-stream',
    });
    return { blob, fileName: `${manifest.id}-${manifest.version}.oep` };
  }

  async function importOep(bytes: Uint8Array): Promise<CourseSummary> {
    const reader = new OepReader();
    const extraction = await reader.read(bytes);
    if (extraction.manifest.type === 'bundle') {
      throw new BrowserStudioApiError(
        'unsupported-in-browser',
        'Importing .oep bundles is not supported in browser mode yet',
      );
    }
    const contentRoot = extraction.manifest.contentRoot || 'course/';
    const files: StudioFile[] = [];
    for (const [path, data] of Object.entries(extraction.rawEntries)) {
      if (!path.startsWith(contentRoot) || data.length === 0) continue;
      const rel = path.slice(contentRoot.length);
      if (!rel) continue;
      files.push({ path: assertSafeCoursePath(rel), data: new Uint8Array(data) });
    }
    if (files.length === 0) {
      throw new BrowserStudioApiError('invalid-archive', 'Archive contains no course files');
    }

    const originalId = extraction.manifest.id;
    const id = await nextAvailableImportId(store, originalId);
    const title = extraction.manifest.title;
    const version = extraction.manifest.version;
    const importedFiles = id === originalId ? files : updateManifestId(files, id);
    const course: BrowserCourse = {
      id,
      version,
      title,
      files: importedFiles,
      updatedAt: Date.now(),
      source: { kind: 'oep-import', label: `${id}-${version}.oep` },
    };

    // Validate the complete file set before persisting anything.
    try {
      await loadPackageFromFiles(makeSourceFromFiles(importedFiles), `browser://${id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new BrowserStudioApiError('invalid-package', `Imported course is invalid: ${message}`);
    }

    await store.create(course);
    session.setActiveCourse(id);
    onPackageChanged();
    return summaryFromCourse(course);
  }

  async function readFile(path: string): Promise<{ path: string; content: string }> {
    const course = await requireActiveCourse();
    const index = buildFileIndex(course.files);
    const data = index.get(path);
    if (data === undefined) {
      throw new BrowserStudioApiError('file-not-found', `File not found: ${path}`);
    }
    const content = TEXT_DECODER.decode(data);
    if (content.includes('\uFFFD')) {
      throw new BrowserStudioApiError(
        'binary-file',
        `File is binary and cannot be opened as text: ${path}`,
      );
    }
    return { path, content };
  }

  async function writeFile(path: string, content: string): Promise<{ success: boolean }> {
    const safePath = assertSafeCoursePath(path);
    const course = await requireActiveCourse();
    const next = course.files
      .filter((f) => f.path !== safePath)
      .concat({
        path: safePath,
        data: TEXT_ENCODER.encode(content),
      });
    await replaceFiles(next);
    return { success: true };
  }

  async function deleteFile(path: string): Promise<{ success: boolean; path: string }> {
    const safePath = assertSafeCoursePath(path);
    const course = await requireActiveCourse();
    const next = course.files.filter((f) => f.path !== safePath);
    if (next.length === course.files.length) {
      throw new BrowserStudioApiError('file-not-found', `File not found: ${path}`);
    }
    await replaceFiles(next);
    return { success: true, path: safePath };
  }

  async function getPreviewPackage(): Promise<LoadedPackage | null> {
    if (!session.activeCourseId) return null;
    try {
      return await loadCurrentPackage();
    } catch {
      return null;
    }
  }

  async function getStorageStatus(): Promise<StorageStatus> {
    try {
      await store.list();
      return { available: true };
    } catch (err) {
      const code = (err as { code?: string }).code;
      return {
        available: false,
        reason: code === 'quota-exceeded' ? 'quota-exceeded' : 'storage-unavailable',
      };
    }
  }

  return {
    getPackageDir: async () => `browser://${session.activeCourseId ?? 'no-course'}`,
    validate,
    getOutline,
    saveOutlineOrder,
    applyTemplate,
    getLibrary,
    openLibraryCourse,
    duplicateCourse,
    renameCourse,
    archiveCourse,
    exportOep,
    importOep,
    readFile,
    writeFile,
    deleteFile,
    getPreviewPackage,
    getStorageStatus,
    getAiStatus: async () => ({ available: false, reason: 'disabled' }) as const,
    generateFromNotes: async () => makeUnsupported('generateFromNotes'),
    uploadSpec: async () => makeUnsupported('uploadSpec'),
    generateCourseDraft: async () => makeUnsupported('generateCourseDraft'),
    uploadSpecDraft: async () => makeUnsupported('uploadSpecDraft'),
    commitCourseDraft: async () => makeUnsupported('commitCourseDraft'),
    discardCourseDraft: async () => makeUnsupported('discardCourseDraft'),
    generateItemAdd: async () => makeUnsupported('generateItemAdd'),
    generateItemEdit: async () => makeUnsupported('generateItemEdit'),
    importCourseFolder: async () => makeUnsupported('importCourseFolder'),
    createUnit: async () => makeUnsupported('createUnit'),
    exportUnitOep: async () => makeUnsupported('exportUnitOep'),
  };
}
