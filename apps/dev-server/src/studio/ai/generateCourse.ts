import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
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
import type { AiGenerateResult } from './types.js';

const MIN_NOTES_LENGTH = 40;

export interface GenerateCourseOptions {
  notes: string;
  packageDir: string;
  completeText: (prompt: string) => Promise<string>;
  compile?: typeof compileFromCourseCompiler;
  force?: boolean;
}

function errorResult(error: string): AiGenerateResult {
  return { success: false, quality: [], outlinePreview: [], error };
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
  const { notes, packageDir, completeText, force = false } = options;
  const compile = options.compile ?? compileFromCourseCompiler;

  if (notes.trim().length < MIN_NOTES_LENGTH) {
    return errorResult('Add more detail');
  }

  if (!force && hasNodes(packageDir)) {
    return errorResult('Package already has content');
  }

  let raw: string;
  try {
    raw = await completeText(buildCourseSpecPrompt(notes));
  } catch (error) {
    return errorResult(
      `AI generation failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  let spec: Record<string, unknown>;
  try {
    spec = extractJsonObject(raw);
  } catch {
    return errorResult('Could not parse the draft');
  }

  const tempDir = await mkdtemp(join(tmpdir(), 'openedu-studio-ai-'));
  const specPath = join(tempDir, 'course-spec.json');
  try {
    await writeFile(specPath, JSON.stringify(spec, null, 2), 'utf-8');
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
    return errorResult(
      `Could not write the draft: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  let result: CompileResult;
  try {
    result = await compile(specPath, { output: packageDir, validate: true });
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
    return errorResult(
      `Could not compile the draft: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  await rm(tempDir, { recursive: true, force: true }).catch(() => {});

  const outlinePreview = await buildOutlinePreview(packageDir);
  const quality = mapDiagnosticsToQuality(result.diagnostics, outlinePreview);
  const firstError = result.diagnostics.find((diagnostic) => diagnostic.severity === 'error');

  return {
    success: result.success,
    quality,
    outlinePreview,
    title: readManifestTitle(packageDir),
    error: result.success ? undefined : firstError?.message,
  };
}
