import { writeFileSync, mkdirSync, existsSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { GeneratedActivity, ConceptActivityPair } from '../types.js';

interface ChapterGroup {
  chapterCode: string;
  chapterName: string;
  chapterNumber: number;
  concepts: ConceptActivityPair[];
}

function escapeYamlValue(value: string): string {
  if (/[\]{},"':#\n[]/.test(value) || value.includes('  ')) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  return value;
}

function generateFrontmatter(pairs: ConceptActivityPair[]): string {
  const first = pairs[0]?.concept;
  const estimatedHours =
    pairs.reduce((sum, p) => sum + (p.concept.estimatedDuration || 15), 0) / 60;

  const difficulty = pairs.some((p) => p.concept.difficulty === 'advanced')
    ? 'advanced'
    : pairs.some((p) => p.concept.difficulty === 'intermediate')
      ? 'intermediate'
      : 'beginner';

  const title = first?.chapterName
    ? `${first.chapterName} — Auto-generated Course`
    : 'Auto-generated Course';

  return [
    '---',
    `title: ${escapeYamlValue(title)}`,
    `description: ${escapeYamlValue(`Auto-generated from ${pairs.length} concepts`)}`,
    'author: OpenEdu Pipeline',
    'version: 1.0.0',
    `difficulty: ${difficulty}`,
    `estimatedHours: ${Math.max(1, Math.round(estimatedHours))}`,
    'generated: true',
    '---',
    '',
  ].join('\n');
}

function groupByChapter(pairs: ConceptActivityPair[]): ChapterGroup[] {
  const chapters = new Map<string, ChapterGroup>();

  for (const pair of pairs) {
    const code = pair.concept.chapterCode;
    if (!chapters.has(code)) {
      chapters.set(code, {
        chapterCode: code,
        chapterName: pair.concept.chapterName,
        chapterNumber: parseInt(code.replace(/[^0-9]/g, '')) || 0,
        concepts: [],
      });
    }
    chapters.get(code)!.concepts.push(pair);
  }

  return Array.from(chapters.values()).sort((a, b) => a.chapterNumber - b.chapterNumber);
}

function renderModule(group: ChapterGroup, moduleIndex: number): string {
  const lines: string[] = [];

  const moduleNum = moduleIndex + 1;
  const moduleTitle = `${group.chapterName}`;
  lines.push(`# Module ${moduleNum}: ${moduleTitle}`);
  lines.push('');

  for (let i = 0; i < group.concepts.length; i++) {
    const pair = group.concepts[i]!;
    const lessonNum = moduleNum * 100 + i + 1;
    const lessonLines = renderLesson(pair, lessonNum);
    lines.push(...lessonLines);
  }

  return lines.join('\n');
}

function renderLesson(pair: ConceptActivityPair, lessonNum: number): string[] {
  const lines: string[] = [];
  const { concept, activities } = pair;

  const lessonTitle = `${concept.learningObjective}`;
  lines.push(`## Lesson ${lessonNum}: ${lessonTitle}`);
  lines.push('');

  if (concept.learningObjective) {
    lines.push('**Objectives:**');
    lines.push('');
    lines.push(`- ${concept.learningObjective}`);
    lines.push('');
  }

  lines.push(concept.coreIdea);
  lines.push('');

  if (concept.examples.length > 0) {
    for (const example of concept.examples) {
      lines.push(`- ${example}`);
    }
    lines.push('');
  }

  if (concept.misconceptions.length > 0) {
    lines.push('**Common Misconceptions:**');
    for (const mc of concept.misconceptions) {
      lines.push(`- ${mc}`);
    }
    lines.push('');
  }

  if (concept.estimatedDuration) {
    lines.push(`*Estimated time: ${concept.estimatedDuration} minutes*`);
    lines.push('');
  }

  for (const activity of activities) {
    const activityLines = renderActivity(activity, pair.concept.conceptId, lessonNum);
    lines.push(...activityLines);
  }

  return lines;
}

function renderActivity(activity: GeneratedActivity, conceptId?: string, lessonNum?: number): string[] {
  const lines: string[] = [];

  const stepLabels: Record<string, string> = {
    observe: 'Observe',
    guided_practice: 'Guided Practice',
    independent_practice: 'Independent Practice',
    mastery_check: 'Mastery Check',
    positive_completion: 'Congratulations',
  };

  if (activity.step === 'mastery_check') {
    const label = activity.content.description || 'Mastery Check';
    const quizId = conceptId ? `${conceptId}-mastery-check` : 'quiz-mastery-check';
    lines.push(`### Quiz: ${label} (${quizId})`);
    lines.push('');

    const questions = activity.content.questions || [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]!;
      lines.push(`${i + 1}. ${q.question}`);
      lines.push('');
      for (let j = 0; j < q.options.length; j++) {
        const prefix = j === q.correctIndex ? '[x]' : '[ ]';
        lines.push(`- ${prefix} ${q.options[j]}`);
      }
      lines.push('');
    }
  } else if (activity.courseSpecType === 'reflection') {
    const label = activity.content.description || 'Congratulations';
    lines.push(`### Activity: Reflection`);
    lines.push('');
    if (label) {
      lines.push(`**${label}**`);
      lines.push('');
    }
    if (activity.content.instructions) {
      lines.push(activity.content.instructions);
      lines.push('');
    }
  } else if (activity.courseSpecType === 'reading') {
    const label = activity.content.description || stepLabels[activity.step] || 'Reading';
    lines.push(`### Activity: ${label}`);
    lines.push('');
    if (activity.content.instructions) {
      lines.push(activity.content.instructions);
      lines.push('');
    }
  } else if (activity.courseSpecType === 'exercise') {
    const label = activity.content.description || 'Practice';
    lines.push(`### Activity: ${label}`);
    lines.push('');
    if (activity.content.instructions) {
      lines.push(activity.content.instructions);
      lines.push('');
    }
    if (activity.content.examples && activity.content.examples.length > 0) {
      for (const example of activity.content.examples) {
        lines.push(`- ${example}`);
      }
      lines.push('');
    }
  }

  return lines;
}

export function renderCourseSpec(pairs: ConceptActivityPair[]): string {
  const parts: string[] = [];

  parts.push(generateFrontmatter(pairs));

  const chapters = groupByChapter(pairs);

  for (let i = 0; i < chapters.length; i++) {
    const moduleContent = renderModule(chapters[i]!, i);
    parts.push(moduleContent);
  }

  return parts.join('\n\n');
}

export function writeCourseSpec(
  outputDir: string,
  filename: string,
  content: string,
  force: boolean,
): string {
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const filePath = join(outputDir, filename);

  if (existsSync(filePath) && !force) {
    throw new Error(`File already exists: ${filePath}. Use --force to overwrite.`);
  }

  const tmpPath = join(tmpdir(), `course-spec-${Date.now()}.md`);
  writeFileSync(tmpPath, content, 'utf-8');
  renameSync(tmpPath, filePath);

  return filePath;
}

export function writeCourseSpecOutput(
  outputDir: string,
  filenamePrefix: string,
  pairs: ConceptActivityPair[],
  force: boolean,
): { filePath: string; concepts: number } {
  const content = renderCourseSpec(pairs);
  const filename = `${filenamePrefix}course-spec.md`;
  const filePath = writeCourseSpec(outputDir, filename, content, force);

  return { filePath, concepts: pairs.length };
}
