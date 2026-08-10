import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { cp, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  compile as compileFromCourseCompiler,
  type CompileResult,
} from '@open-edu/course-compiler';
import { loadPackage } from '@open-edu/core';
import { buildCourseSpecPrompt, extractJsonObject } from './draftPrompt.js';
import { mapDiagnosticsToQuality } from './qualityMap.js';
import { detectActivityKind, titleFromMarkdown, titleFromQuizJson } from '../outlineModel.js';
import type { AiGenerateErrorCode, AiGenerateResult } from './types.js';

const MIN_NOTES_LENGTH = 40;

export type CourseDraftSource =
  | { kind: 'notes'; notes: string; completeText: (prompt: string) => Promise<string> }
  | { kind: 'spec'; spec: string; extension: '.json' | '.md' };

export interface GenerateCourseOptions {
  source: CourseDraftSource;
  packageDir: string;
  compile?: typeof compileFromCourseCompiler;
  force?: boolean;
}

function errorResult(code: AiGenerateErrorCode, error: string): AiGenerateResult {
  return { success: false, code, quality: [], outlinePreview: [], error };
}

function hasNodes(packageDir: string): boolean {
  const nodesDir = join(packageDir, 'nodes');
  return existsSync(nodesDir) && readdirSync(nodesDir).length > 0;
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

function readManifestTitle(packageDir: string): string | undefined {
  try {
    const manifestPath = join(packageDir, 'package.json');
    if (!existsSync(manifestPath)) return undefined;
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as { title?: string };
    return manifest.title;
  } catch {
    return undefined;
  }
}

export async function generateCourseDraft(
  options: GenerateCourseOptions,
): Promise<AiGenerateResult> {
  const { source, packageDir, force = false } = options;
  const compile = options.compile ?? compileFromCourseCompiler;

  if (source.kind === 'spec' && source.spec.trim().length === 0) {
    return errorResult('spec-invalid', 'Spec file is empty');
  }

  if (source.kind === 'notes' && source.notes.trim().length < MIN_NOTES_LENGTH) {
    return errorResult('notes-too-short', 'Add more detail');
  }

  if (!force && hasNodes(packageDir)) {
    return errorResult('has-content', 'Package already has content');
  }

  let raw: string;
  if (source.kind === 'notes') {
    try {
      raw = await source.completeText(buildCourseSpecPrompt(source.notes));
    } catch (error) {
      return errorResult(
        'llm',
        `AI generation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  } else {
    raw = source.spec;
  }

  let specText: string;
  if (source.kind === 'notes') {
    let spec: Record<string, unknown>;
    try {
      spec = extractJsonObject(raw);
    } catch {
      return errorResult('parse', 'Could not parse the draft');
    }
    specText = JSON.stringify(spec, null, 2);
  } else {
    specText = raw;
  }

  const tempDir = await mkdtemp(join(tmpdir(), 'openedu-studio-ai-'));
  const scratchName =
    source.kind === 'notes' ? 'course-spec.json' : `course-spec${source.extension}`;
  const specPath = join(tempDir, scratchName);
  try {
    await writeFile(specPath, specText, 'utf-8');
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
    return errorResult(
      'write',
      `Could not write the draft: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  // Compile into a scratch dir so packageDir is only touched on success.
  const outputDir = join(tempDir, 'out');
  let result: CompileResult;
  try {
    result = await compile(specPath, { output: outputDir, validate: true });
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
    return errorResult(
      'compile',
      `Could not compile the draft: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const outlinePreview = await buildOutlinePreview(outputDir);
  const quality = mapDiagnosticsToQuality(result.diagnostics, outlinePreview);
  const firstError = result.diagnostics.find((diagnostic) => diagnostic.severity === 'error');

  if (!result.success) {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
    return {
      success: false,
      code: 'compile',
      quality,
      outlinePreview,
      error: firstError?.message ?? 'Could not compile the draft',
    };
  }

  try {
    await cp(outputDir, packageDir, { recursive: true });
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
    return errorResult(
      'write',
      `Could not save the draft: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  await rm(tempDir, { recursive: true, force: true }).catch(() => {});

  return {
    success: true,
    quality,
    outlinePreview,
    title: readManifestTitle(packageDir),
  };
}
