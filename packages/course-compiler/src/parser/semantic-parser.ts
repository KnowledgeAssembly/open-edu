import type { Root, Heading, Content, Paragraph, Text, List, ListItem } from 'mdast';
import type {
  CourseModel,
  CourseMetadata,
  CourseModule,
  Lesson,
  LearningObjective,
  Activity,
  Quiz,
  Question,
  GlossaryEntry,
  Reference,
  Asset,
  CompilerDiagnostic,
} from '../schemas/index.js';
import { extractHeadingText, serializeContentToMarkdown } from './markdown-ast.js';

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'unnamed'
  );
}

function moduleIdFromTitle(title: string): string {
  const match = title.match(/^Module\s+(\d+)/i);
  if (match) return `module-${match[1]}`;
  const numMatch = title.match(/^(\d+)/);
  if (numMatch) return `module-${numMatch[1]}`;
  return slugify(title);
}

function lessonIdFromTitle(title: string): string {
  const match = title.match(/^Lesson\s+([\d.]+)/i);
  if (match && match[1]) return `lesson-${match[1].replace(/\./g, '')}`;
  const numMatch = title.match(/^(\d+)/);
  if (numMatch) return `lesson-${numMatch[1]}`;
  return slugify(title);
}

function findStrongText(children: Content[], text: string): boolean {
  return children.some(
    (child) =>
      child.type === 'strong' &&
      'children' in child &&
      (child.children as Text[]).some((t) => t.type === 'text' && t.value.trim() === text),
  );
}

function extractListItems(list: List): string[] {
  return list.children.map((item: ListItem) => {
    const para = item.children.find((c): c is Paragraph => c.type === 'paragraph');
    if (!para) return '';
    return para.children
      .filter((c): c is Text => c.type === 'text')
      .map((c) => c.value.trim())
      .join('');
  });
}

function extractInlineContent(children: Content[]): string {
  return children
    .filter((c): c is Text => c.type === 'text')
    .map((c) => c.value)
    .join('');
}

interface ParseContext {
  diagnostics: CompilerDiagnostic[];
}

function addDiagnostic(
  ctx: ParseContext,
  severity: 'error' | 'warning' | 'info',
  message: string,
  code?: string,
) {
  ctx.diagnostics.push({ severity, message, code });
}

export function parseSemantic(input: { ast: Root; frontmatter: Record<string, unknown> }): {
  model: CourseModel | null;
  diagnostics: CompilerDiagnostic[];
} {
  const ctx: ParseContext = { diagnostics: [] };

  const metadata = parseMetadata(input.frontmatter, ctx);
  const modules = parseModules(input.ast, ctx);

  if (modules.length === 0) {
    addDiagnostic(ctx, 'error', 'No modules found in course specification', 'NO_MODULES');
    return { model: null, diagnostics: ctx.diagnostics };
  }

  const model: CourseModel = {
    metadata,
    modules,
  };

  return { model, diagnostics: ctx.diagnostics };
}

function parseMetadata(frontmatter: Record<string, unknown>, ctx: ParseContext): CourseMetadata {
  const metadata: CourseMetadata = {
    title: (frontmatter.title as string) || 'Untitled Course',
    description: (frontmatter.description as string) || '',
    author: frontmatter.author as string | undefined,
    version: frontmatter.version as string | undefined,
    language: (frontmatter.language as string) || 'en',
    keywords: frontmatter.keywords as string[] | undefined,
    targetAudience: frontmatter.targetAudience as string | undefined,
    audience: frontmatter.audience as string | undefined,
    accessibility: frontmatter.accessibility as string[] | undefined,
    difficulty: frontmatter.difficulty as 'beginner' | 'intermediate' | 'advanced' | undefined,
    estimatedHours: frontmatter.estimatedHours as number | undefined,
    lastUpdated: frontmatter.lastUpdated as string | undefined,
  };

  if (!frontmatter.title) {
    addDiagnostic(
      ctx,
      'warning',
      'Course title not found in frontmatter, using "Untitled Course"',
      'MISSING_TITLE',
    );
  }
  if (!frontmatter.description) {
    addDiagnostic(
      ctx,
      'warning',
      'Course description not found in frontmatter',
      'MISSING_DESCRIPTION',
    );
  }

  return metadata;
}

function parseModules(ast: Root, ctx: ParseContext): CourseModule[] {
  const modules: CourseModule[] = [];
  let i = 0;

  while (i < ast.children.length) {
    const node = ast.children[i];
    if (!node) {
      i++;
      continue;
    }
    if (node.type === 'heading' && node.depth === 1) {
      const headingText = extractHeadingText(node);
      const moduleId = moduleIdFromTitle(headingText);
      const moduleTitle = headingText.replace(/^Module\s+\d+[:\s]+/i, '').trim() || headingText;

      i++;
      const moduleContent: Content[] = [];
      while (i < ast.children.length) {
        const child = ast.children[i];
        if (!child) {
          i++;
          continue;
        }
        if (child.type === 'heading' && child.depth === 1) break;
        moduleContent.push(child);
        i++;
      }

      const lessons = parseLessons(moduleContent, ctx);
      const description = extractModuleDescription(moduleContent);
      const objectives = extractModuleObjectives(moduleContent);

      modules.push({
        id: moduleId,
        title: moduleTitle,
        description,
        objectives: objectives.length > 0 ? objectives : undefined,
        lessons,
      });
    } else {
      i++;
    }
  }

  return modules;
}

function extractModuleDescription(content: Content[]): string | undefined {
  for (const node of content) {
    if (node.type === 'paragraph' && !findStrongText(node.children, 'Objectives:')) {
      return extractInlineContent(node.children);
    }
  }
  return undefined;
}

function extractModuleObjectives(content: Content[]): LearningObjective[] {
  for (let i = 0; i < content.length; i++) {
    const node = content[i];
    if (!node) continue;
    if (node.type === 'paragraph' && findStrongText(node.children, 'Objectives:')) {
      const nextNode = content[i + 1];
      if (nextNode && nextNode.type === 'list') {
        return extractListItems(nextNode as List).map((item, idx) => ({
          id: `obj-${idx + 1}`,
          description: item,
        }));
      }
    }
  }
  return [];
}

function parseLessons(content: Content[], ctx: ParseContext): Lesson[] {
  const lessons: Lesson[] = [];
  let i = 0;

  while (i < content.length) {
    const node = content[i];
    if (!node) {
      i++;
      continue;
    }
    if (node.type === 'heading' && node.depth === 2) {
      const headingText = extractHeadingText(node);
      const lessonId = lessonIdFromTitle(headingText);
      const lessonTitle = headingText.replace(/^Lesson\s+[\d.]+[:\s]+/i, '').trim() || headingText;

      i++;
      const lessonContent: Content[] = [];
      while (i < content.length) {
        const child = content[i];
        if (!child) {
          i++;
          continue;
        }
        if (child.type === 'heading' && (child.depth === 2 || child.depth === 1)) break;
        lessonContent.push(child);
        i++;
      }

      const lesson = parseLesson(lessonId, lessonTitle, lessonContent, ctx);
      lessons.push(lesson);
    } else {
      i++;
    }
  }

  return lessons;
}

function parseLesson(id: string, title: string, content: Content[], ctx: ParseContext): Lesson {
  const objectives = extractLessonObjectives(content) || [
    {
      id: 'obj-1',
      description: `Understand ${title.toLowerCase()}`,
    },
  ];
  const lessonBody = extractLessonBody(content);
  const activities = parseActivities(content, ctx);
  const quiz = parseQuiz(content, ctx);
  const glossary = parseGlossary(content);
  const references = parseReferences(content);
  const assets = parseAssets(content);

  return {
    id,
    title,
    objectives,
    content: lessonBody,
    activities: activities.length > 0 ? activities : undefined,
    quiz: quiz ?? undefined,
    glossary: glossary.length > 0 ? glossary : undefined,
    references: references.length > 0 ? references : undefined,
    assets: assets.length > 0 ? assets : undefined,
  };
}

function extractLessonObjectives(content: Content[]): LearningObjective[] | undefined {
  for (let i = 0; i < content.length; i++) {
    const node = content[i];
    if (!node) continue;
    if (node.type === 'paragraph' && findStrongText(node.children, 'Objectives:')) {
      const nextNode = content[i + 1];
      if (nextNode && nextNode.type === 'list') {
        return extractListItems(nextNode as List).map((item, idx) => ({
          id: `obj-${idx + 1}`,
          description: item,
        }));
      }
    }
  }
  return undefined;
}

function extractLessonBody(content: Content[]): string {
  // Find index ranges of quiz and activity sections to exclude from body
  const excludedRanges: [number, number][] = [];

  for (let i = 0; i < content.length; i++) {
    const node = content[i];
    if (node?.type === 'heading' && node.depth === 3) {
      const text = extractHeadingText(node);
      const lower = text.toLowerCase();
      if (lower.startsWith('quiz:') || lower.startsWith('activity:')) {
        const start = i;
        let end = i + 1;
        while (end < content.length) {
          const next = content[end];
          if (!next) {
            end++;
            continue;
          }
          if (next.type === 'heading' && next.depth <= 3) break;
          end++;
        }
        excludedRanges.push([start, end]);
      }
    }
  }

  const excludedParagraphIndices = new Set<number>();
  for (let i = 0; i < content.length; i++) {
    const node = content[i];
    if (node?.type !== 'paragraph' || !node.children.length) continue;
    if (
      findStrongText(node.children, 'Objectives:') ||
      findStrongText(node.children, 'Glossary:') ||
      findStrongText(node.children, 'References:')
    ) {
      excludedParagraphIndices.add(i);
      const next = content[i + 1];
      if (next?.type === 'list') excludedParagraphIndices.add(i + 1);
    }
  }

  const bodyNodes = content.filter((node, idx) => {
    if (excludedRanges.some(([s, e]) => idx >= s && idx < e)) return false;
    if (excludedParagraphIndices.has(idx)) return false;

    if (
      node.type !== 'paragraph' &&
      node.type !== 'list' &&
      node.type !== 'thematicBreak' &&
      node.type !== 'code' &&
      node.type !== 'blockquote'
    )
      return false;
    return true;
  });

  return serializeContentToMarkdown(bodyNodes);
}

function parseActivities(content: Content[], _ctx: ParseContext): Activity[] {
  const activities: Activity[] = [];

  for (let i = 0; i < content.length; i++) {
    const node = content[i];
    if (!node) continue;
    if (node.type === 'heading' && node.depth === 3) {
      const headingText = extractHeadingText(node);
      const lower = headingText.toLowerCase();

      if (lower.startsWith('activity:')) {
        const activityType = headingText.slice('Activity:'.length).trim().toLowerCase();
        const actId = slugify(headingText);
        const actContent = serializeContentToMarkdown(extractContentAfterNodes(content, i));

        let activity: Activity | null = null;
        if (activityType.startsWith('reading') || activityType === 'read') {
          activity = { id: actId, type: 'reading', content: actContent };
        } else if (activityType.startsWith('exercise') || activityType.startsWith('practice')) {
          activity = { id: actId, type: 'exercise', instructions: actContent };
        } else if (activityType.startsWith('discussion') || activityType.startsWith('discuss')) {
          activity = { id: actId, type: 'discussion', prompt: actContent };
        } else if (activityType.startsWith('reflection') || activityType.startsWith('reflect')) {
          activity = { id: actId, type: 'reflection', prompt: actContent, private: true };
        } else if (activityType.startsWith('video') || activityType.startsWith('watch')) {
          activity = { id: actId, type: 'video', url: actContent };
        }

        if (!activity) {
          activity = { id: actId, type: 'reading', content: actContent };
        }

        activities.push(activity);
      }
    }
  }

  return activities;
}

function parseQuiz(content: Content[], ctx: ParseContext): Quiz | null {
  for (let i = 0; i < content.length; i++) {
    const node = content[i];
    if (!node) continue;
    if (node.type === 'heading' && node.depth === 3) {
      const headingText = extractHeadingText(node);
      const lower = headingText.toLowerCase();

      if (lower.startsWith('quiz:')) {
        const quizTitle = headingText.slice('Quiz:'.length).trim() || 'Untitled Quiz';
        const afterNodes = extractContentAfterNodes(content, i);
        const questions = parseQuestionsFromNodes(afterNodes, ctx);

        return {
          id: slugify(headingText),
          title: quizTitle,
          questions: questions.length > 0 ? questions : [],
          shuffleQuestions: false,
        };
      }
    }
  }
  return null;
}

function extractContentAfterNodes(content: Content[], headingIndex: number): Content[] {
  const heading = content[headingIndex];
  if (!heading) return [];
  const depth = (heading as Heading).depth;
  const nodes: Content[] = [];

  for (let i = headingIndex + 1; i < content.length; i++) {
    const node = content[i];
    if (!node) continue;
    if (node.type === 'heading' && node.depth <= depth) break;
    nodes.push(node);
  }

  return nodes;
}

function parseQuestionsFromNodes(nodes: Content[], _ctx: ParseContext): Question[] {
  const questions: Question[] = [];

  for (const node of nodes) {
    // Check for ordered list (question stems)
    if (node.type === 'list') {
      const list = node as { ordered: boolean; children: Content[] };
      if (list.ordered) {
        for (const item of list.children) {
          const para = (item as { children: Content[] }).children.find(
            (c): c is Paragraph => c.type === 'paragraph',
          );
          if (!para) continue;
          const text = extractInlineContent(para.children).trim();
          if (!text) continue;

          const question: Question = {
            id: `q-${questions.length + 1}`,
            type: 'multiple-choice',
            prompt: text,
            options: [],
          };
          questions.push(question);
        }
      } else {
        // Unordered list - these could be options for the last question
        for (const item of list.children) {
          if (questions.length === 0) continue;
          const lastQuestion = questions[questions.length - 1];
          if (!lastQuestion || lastQuestion.type !== 'multiple-choice') continue;

          const para = (item as { children: Content[] }).children.find(
            (c): c is Paragraph => c.type === 'paragraph',
          );
          if (!para) continue;

          // Check for checkbox
          const checkbox = (item as { checked?: boolean | null }).checked;
          const text = extractInlineContent(para.children).trim();
          if (text) {
            lastQuestion.options.push({
              id: `opt-${lastQuestion.options.length + 1}`,
              text,
              correct: checkbox === true,
            });
          }
        }
      }
    } else if (node.type === 'paragraph') {
      // Check for numbered paragraph pattern: "1. Question text?"
      const text = extractInlineContent(node.children).trim();
      const numberedMatch = text.match(/^(\d+)[.)]\s+(.+)/);
      if (numberedMatch && numberedMatch[2]) {
        const question: Question = {
          id: `q-${questions.length + 1}`,
          type: 'multiple-choice',
          prompt: numberedMatch[2],
          options: [],
        };
        questions.push(question);
      }
    }
  }

  return questions;
}

function parseGlossary(content: Content[]): GlossaryEntry[] {
  for (let i = 0; i < content.length; i++) {
    const node = content[i];
    if (!node) continue;
    if (node.type === 'paragraph' && findStrongText(node.children, 'Glossary:')) {
      const entries: GlossaryEntry[] = [];
      for (let j = i + 1; j < content.length; j++) {
        const next = content[j];
        if (!next) continue;
        if (next.type === 'heading') break;
        if (next.type === 'list') {
          for (const item of (next as List).children) {
            const listItem = item as ListItem;
            const para = listItem.children.find((c): c is Paragraph => c.type === 'paragraph');
            const text = para ? extractInlineContent(para.children).trim() : '';
            const colonIdx = text.indexOf(':');
            if (colonIdx > 0) {
              entries.push({
                term: text.slice(0, colonIdx).trim(),
                definition: text.slice(colonIdx + 1).trim(),
              });
            } else if (text) {
              entries.push({ term: text, definition: '' });
            }
          }
        }
      }
      return entries;
    }
  }
  return [];
}

function parseReferences(content: Content[]): Reference[] {
  for (let i = 0; i < content.length; i++) {
    const node = content[i];
    if (!node) continue;
    if (node.type === 'paragraph' && findStrongText(node.children, 'References:')) {
      const refs: Reference[] = [];
      for (let j = i + 1; j < content.length; j++) {
        const next = content[j];
        if (!next) continue;
        if (next.type === 'heading') break;
        if (next.type === 'list') {
          for (const item of (next as List).children) {
            const listItem = item as ListItem;
            const para = listItem.children.find((c): c is Paragraph => c.type === 'paragraph');
            const text = para ? extractInlineContent(para.children).trim() : '';
            const urlMatch = text.match(/\[([^\]]+)\]\(([^)]+)\)/);
            if (urlMatch) {
              refs.push({ title: urlMatch[1] ?? text, url: urlMatch[2] ?? text });
            } else if (text) {
              refs.push({ title: text });
            }
          }
        }
      }
      return refs;
    }
  }
  return [];
}

function parseAssets(content: Content[]): Asset[] {
  const assets: Asset[] = [];
  for (const node of content) {
    if (node.type === 'paragraph') {
      for (const child of node.children) {
        if (child.type === 'image') {
          const img = child as { url: string; alt?: string };
          const pathParts = img.url.split('/');
          const filename = pathParts[pathParts.length - 1] || 'asset';
          assets.push({
            id: slugify(img.alt || filename),
            path: img.url,
            type: 'image',
            description: img.alt,
            placeholderGenerated: false,
          });
        }
      }
    }
  }
  return assets;
}
