import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  CourseModel,
  CompilerDiagnostic,
  CourseModule,
  Lesson,
  Quiz,
} from '../schemas/index.js';

export interface GenerateOptions {
  verbose?: boolean;
}

export interface GenerateResult {
  diagnostics: CompilerDiagnostic[];
  outputPath: string;
}

export async function generatePackage(
  model: CourseModel,
  outputDir: string,
  _options?: GenerateOptions,
): Promise<GenerateResult> {
  const diagnostics: CompilerDiagnostic[] = [];

  if (model.modules.length === 1) {
    await generateSingleModule(model.modules[0]!, model.metadata, outputDir, diagnostics);
  } else {
    await generateBundle(model, outputDir, diagnostics);
  }

  return { diagnostics, outputPath: outputDir };
}

async function generateSingleModule(
  mod: CourseModule,
  metadata: CourseModel['metadata'],
  outputDir: string,
  diagnostics: CompilerDiagnostic[],
): Promise<void> {
  const nodeFiles: { id: string; title: string; path: string }[] = [];

  for (const lesson of mod.lessons) {
    nodeFiles.push({
      id: lesson.id,
      title: lesson.title,
      path: `nodes/${lesson.id}.md`,
    });
    if (lesson.quiz) {
      nodeFiles.push({
        id: lesson.quiz.id,
        title: lesson.quiz.title,
        path: `nodes/${lesson.quiz.id}.json`,
      });
    }
  }

  const entry = nodeFiles[0]?.path ?? 'nodes/start.md';

  await mkdir(join(outputDir, 'nodes'), { recursive: true });
  await mkdir(join(outputDir, 'assets'), { recursive: true });

  const pkg = {
    id: mod.id,
    title: mod.title,
    version: metadata.version ?? '0.1.0',
    author: metadata.author ?? 'OpenEdu',
    entry,
  };
  await writeJson(join(outputDir, 'package.json'), pkg);

  const workflow = generateWorkflow(nodeFiles);
  await writeJson(join(outputDir, 'workflow.json'), workflow);

  for (const lesson of mod.lessons) {
    const mdContent = generateLessonMarkdown(lesson);
    await writeFile(join(outputDir, `nodes/${lesson.id}.md`), mdContent, 'utf-8');

    if (lesson.quiz) {
      const quizContent = generateQuizJson(lesson.quiz);
      await writeJson(join(outputDir, `nodes/${lesson.quiz.id}.json`), quizContent);
    }
  }

  for (const lesson of mod.lessons) {
    if (!lesson.assets) continue;
    for (const asset of lesson.assets) {
      if (asset.placeholderGenerated) {
        const svg = generatePlaceholderSvg(asset);
        const assetPath = join(outputDir, 'assets', asset.path.replace(/^assets\//, ''));
        await mkdir(join(outputDir, 'assets'), { recursive: true });
        await writeFile(assetPath, svg, 'utf-8');
        diagnostics.push({
          severity: 'info',
          message: `Generated placeholder for missing asset: ${asset.path}`,
          code: 'PLACEHOLDER_GENERATED',
        });
      }
    }
  }
}

async function generateBundle(
  model: CourseModel,
  outputDir: string,
  diagnostics: CompilerDiagnostic[],
): Promise<void> {
  const modulesDir = join(outputDir, 'modules');
  await mkdir(modulesDir, { recursive: true });

  const bundleModules: {
    id: string;
    title: string;
    path: string;
    dependsOn: string[];
    estimatedDuration?: number;
  }[] = [];

  for (const mod of model.modules) {
    const modDir = join(modulesDir, mod.id);
    await generateSingleModule(mod, model.metadata, modDir, diagnostics);

    bundleModules.push({
      id: mod.id,
      title: mod.title,
      path: `./modules/${mod.id}`,
      dependsOn: mod.prerequisites ?? [],
      estimatedDuration: mod.estimatedHours ? mod.estimatedHours * 60 : undefined,
    });
  }

  const bundleId = model.metadata.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const bundle = {
    id: bundleId,
    type: 'bundle' as const,
    title: model.metadata.title,
    version: model.metadata.version ?? '0.1.0',
    author: model.metadata.author ?? 'OpenEdu',
    description: model.metadata.description,
    modules: bundleModules,
  };
  await writeJson(join(outputDir, 'bundle.json'), bundle);
}

function generateWorkflow(
  nodeFiles: { id: string; title: string; path: string }[],
): Record<string, unknown> {
  const routing: Record<string, unknown> = {};

  for (let i = 0; i < nodeFiles.length; i++) {
    const current = nodeFiles[i]!;
    const next = nodeFiles[i + 1];
    routing[current.path] = next ? { onComplete: next.path } : { onComplete: 'COMPLETED' };
  }

  return { routing };
}

function generateLessonMarkdown(lesson: Lesson): string {
  const parts: string[] = [];

  parts.push(`# ${lesson.title}`);
  parts.push('');

  if (lesson.objectives && lesson.objectives.length > 0) {
    parts.push('**Objectives:**');
    for (const obj of lesson.objectives) {
      parts.push(`- ${obj.description}`);
    }
    parts.push('');
  }

  if (lesson.content) {
    parts.push(lesson.content);
    parts.push('');
  }

  if (lesson.activities) {
    for (const activity of lesson.activities) {
      parts.push(`## ${capitalize(activity.type)}`);
      parts.push('');
      if ('content' in activity && activity.content) {
        parts.push(activity.content);
      } else if ('instructions' in activity && activity.instructions) {
        parts.push(activity.instructions);
      } else if ('prompt' in activity && activity.prompt) {
        parts.push(activity.prompt);
      }
      parts.push('');
    }
  }

  return parts.join('\n');
}

function generateQuizJson(quiz: Quiz): Record<string, unknown> {
  if (quiz.questions.length > 0) {
    const firstQuestion = quiz.questions[0]!;
    if (firstQuestion.type === 'multiple-choice') {
      return {
        type: 'quiz',
        title: quiz.title,
        question: firstQuestion.prompt,
        options: firstQuestion.options.map((opt) => ({
          id: opt.id,
          text: opt.text,
          correct: opt.correct,
        })),
        skills: [],
      };
    }
  }

  return {
    type: 'quiz',
    title: quiz.title,
    question: quiz.title,
    options: [
      { id: 'a', text: 'Answer A', correct: true },
      { id: 'b', text: 'Answer B', correct: false },
    ],
    skills: [],
  };
}

function generatePlaceholderSvg(asset: {
  id: string;
  path: string;
  type: string;
  description?: string;
}): string {
  const label = asset.description ?? asset.id;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <rect width="400" height="300" fill="#f0f0f0" rx="8"/>
  <text x="200" y="140" text-anchor="middle" font-family="sans-serif" font-size="24" fill="#999">${escapeXml(label)}</text>
  <text x="200" y="170" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#bbb">[Placeholder]</text>
</svg>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

async function writeJson(path: string, data: unknown): Promise<void> {
  const json = JSON.stringify(data, null, 2) + '\n';
  await writeFile(path, json, 'utf-8');
}
