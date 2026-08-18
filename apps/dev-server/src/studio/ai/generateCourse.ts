import { existsSync, readFileSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compile as compileFromCourseCompiler } from '@open-edu/course-compiler';
import { loadPackage } from '@open-edu/core';
import { mapDiagnosticsToQuality } from './qualityMap.js';
import { detectActivityKind, titleFromMarkdown, titleFromQuizJson } from '../outlineModel.js';
import type { AiGenerateErrorCode, CourseDraftResult } from './types.js';
import { resolveCourseSpec, type CourseSpecSource } from './generateCoursePackage.js';

const DRAFT_TTL_MS = 30 * 60 * 1000;

export type CourseDraftSource = CourseSpecSource;

export interface GenerateCourseOptions {
  source: CourseDraftSource;
  packageDir: string;
  compile?: typeof compileFromCourseCompiler;
}

interface DraftEntry {
  tempDir: string;
  outputDir: string;
  title?: string;
  createdAt: number;
}

const activeDrafts = new Map<string, DraftEntry>();

function generateDraftId(): string {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getDraftEntry(draftId: string): DraftEntry | undefined {
  const entry = activeDrafts.get(draftId);
  if (!entry) return undefined;
  if (Date.now() - entry.createdAt > DRAFT_TTL_MS) {
    activeDrafts.delete(draftId);
    rm(entry.tempDir, { recursive: true, force: true }).catch(() => {});
    return undefined;
  }
  return entry;
}

export function deleteDraft(draftId: string): void {
  const entry = activeDrafts.get(draftId);
  if (entry) {
    activeDrafts.delete(draftId);
    rm(entry.tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

function errorResult(code: AiGenerateErrorCode, error: string): CourseDraftResult {
  return { success: false, code, quality: [], outlinePreview: [], error, draftId: '' };
}

function fallbackOutline(packageDir: string): Array<{ title: string; kind: string }> {
  try {
    const workflowPath = join(packageDir, 'workflow.json');
    if (!existsSync(workflowPath)) return [];
    const workflow = JSON.parse(readFileSync(workflowPath, 'utf-8')) as {
      routing?: Record<string, unknown>;
    };
    return Object.keys(workflow.routing ?? {}).map((path) => ({
      title: path.split('/').pop() ?? path,
      kind: 'other',
    }));
  } catch {
    return [];
  }
}

async function buildOutlinePreview(
  packageDir: string,
): Promise<Array<{ title: string; kind: string }>> {
  try {
    const pkg = await loadPackage(packageDir);
    const routingPaths = Object.keys(pkg.workflow?.routing ?? {});
    const nodeContent = new Map(pkg.nodes.map((node) => [node.relativePath, node.content]));
    return routingPaths.map((path) => {
      const content = nodeContent.get(path) ?? '';
      const kind = detectActivityKind(path, content);
      const title =
        kind === 'lesson'
          ? titleFromMarkdown(content)
          : kind === 'quiz'
            ? titleFromQuizJson(content)
            : (path.split('/').pop() ?? path);
      return { title, kind };
    });
  } catch {
    return fallbackOutline(packageDir);
  }
}

/**
 * Local draft generation using the shared `resolveCourseSpec` service.
 * Adds local-only in-memory draft storage with TTL for the Vite middleware.
 * Unlike the hosted `generateCoursePackage`, this preserves the temp directory
 * so `commitCourseDraft` can write to packageDir later.
 */
export async function generateCourseDraft(
  options: GenerateCourseOptions,
): Promise<CourseDraftResult> {
  const { source } = options;
  const compile = options.compile ?? compileFromCourseCompiler;

  // Validate and resolve spec using the shared service.
  let specText: string;
  try {
    specText = await resolveCourseSpec(source);
  } catch (error) {
    const code =
      error instanceof Error && 'code' in error ? (error as { code: string }).code : 'compile';
    return errorResult(
      code === 'notes-too-short'
        ? 'notes-too-short'
        : code === 'spec-invalid'
          ? 'spec-invalid'
          : code === 'llm'
            ? 'llm'
            : code === 'parse'
              ? 'parse'
              : 'compile',
      error instanceof Error ? error.message : 'Could not resolve course spec.',
    );
  }

  const tempDir = await mkdtemp(join(tmpdir(), 'openedu-studio-ai-'));
  const scratchName =
    source.kind === 'notes' ? 'course-spec.json' : `course-spec${source.extension}`;
  const specPath = join(tempDir, scratchName);
  try {
    await writeFile(specPath, specText, 'utf-8');
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
    return errorResult('write', 'Could not write the draft.');
  }

  const outputDir = join(tempDir, 'out');
  let result;
  try {
    result = await compile(specPath, { output: outputDir, validate: true });
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
    return errorResult('compile', 'Could not compile the draft.');
  }

  const outlinePreview = await buildOutlinePreview(outputDir);
  const quality = mapDiagnosticsToQuality(result.diagnostics, outlinePreview);
  const firstError = result.diagnostics.find((diagnostic) => diagnostic.severity === 'error');

  const draftId = generateDraftId();
  activeDrafts.set(draftId, {
    tempDir,
    outputDir,
    createdAt: Date.now(),
  });

  if (!result.success) {
    return {
      success: false,
      code: 'compile',
      quality,
      outlinePreview,
      draftId,
      error: firstError?.message ?? 'Could not compile the draft.',
    };
  }

  // Read title from compiled output.
  let title: string | undefined;
  try {
    const manifestPath = join(outputDir, 'package.json');
    if (existsSync(manifestPath)) {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as { title?: string };
      title = manifest.title;
    }
  } catch {
    // Title is optional.
  }

  activeDrafts.get(draftId)!.title = title;

  return {
    success: true,
    quality,
    outlinePreview,
    title,
    draftId,
  };
}
