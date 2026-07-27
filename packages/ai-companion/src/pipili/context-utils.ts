import type { PipiliContextSnapshot } from './types.js';

export const CONTEXT_PRIORITY = [
  'page',
  'widget',
  'lesson',
  'module',
  'course',
  'notes',
  'history',
] as const;

export type ContextSource = (typeof CONTEXT_PRIORITY)[number];

export interface BoundedContextEntry {
  source: ContextSource;
  content: string;
  priority: number;
  truncated: boolean;
}

export interface BoundedContext {
  entries: BoundedContextEntry[];
  totalTokens: number;
  truncated: boolean;
}

const MAX_CONTEXT_TOKENS = 8000;
const TOKEN_ESTIMATE_RATIO = 0.75;

function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).length / TOKEN_ESTIMATE_RATIO);
}

export function boundContext(snapshot: PipiliContextSnapshot): BoundedContext {
  const entries: BoundedContextEntry[] = [];
  let totalTokens = 0;

  for (const [i, source] of CONTEXT_PRIORITY.entries()) {
    const content = sourceToContent(snapshot, source);
    if (!content) continue;

    const tokens = estimateTokens(content);
    const remaining = MAX_CONTEXT_TOKENS - totalTokens;

    if (remaining <= 0) break;

    if (tokens <= remaining) {
      entries.push({ source, content, priority: i, truncated: false });
      totalTokens += tokens;
    } else {
      const truncatedContent = truncateToTokens(content, remaining);
      entries.push({ source, content: truncatedContent, priority: i, truncated: true });
      totalTokens += remaining;
    }
  }

  return {
    entries,
    totalTokens,
    truncated: entries.some((e) => e.truncated),
  };
}

function sourceToContent(snapshot: PipiliContextSnapshot, source: ContextSource): string | null {
  switch (source) {
    case 'page': {
      const p = snapshot.page;
      return p ? formatPage(p) : null;
    }
    case 'widget': {
      const w = snapshot.widget;
      return w ? formatWidget(w) : null;
    }
    case 'lesson': {
      const l = snapshot.lesson;
      return l ? formatLesson(l) : null;
    }
    case 'module': {
      const m = snapshot.module;
      return m ? formatModule(m) : null;
    }
    case 'course': {
      const c = snapshot.course;
      return c ? formatCourse(c) : null;
    }
    case 'notes':
      return formatNotes(snapshot.notes);
    case 'history':
      return formatHistory(snapshot.history);
    default:
      return null;
  }
}

function formatPage(ctx: NonNullable<PipiliContextSnapshot['page']>): string {
  return `[Current Page]\nTitle: ${ctx.title}\nType: ${ctx.nodeType}\nContent:\n${ctx.content}`;
}

function formatWidget(ctx: NonNullable<PipiliContextSnapshot['widget']>): string {
  return `[Current Widget]\nType: ${ctx.type}\nState: ${JSON.stringify(ctx.state)}`;
}

function formatLesson(ctx: NonNullable<PipiliContextSnapshot['lesson']>): string {
  const objectives = ctx.objectives.map((o) => `- ${o}`).join('\n');
  const topics = ctx.topics.join(', ');
  return `[Current Lesson]\nTitle: ${ctx.title}\nObjectives:\n${objectives}\nTopics: ${topics}`;
}

function formatModule(ctx: NonNullable<PipiliContextSnapshot['module']>): string {
  const lessons = ctx.lessons.map((l) => `- ${l.title}`).join('\n');
  return `[Current Module]\nTitle: ${ctx.title}\nLessons:\n${lessons}`;
}

function formatCourse(ctx: NonNullable<PipiliContextSnapshot['course']>): string {
  return `[Course]\nTitle: ${ctx.title}\nDescription: ${ctx.description}\nSubject: ${ctx.subject}\nLevel: ${ctx.level}\nLanguage: ${ctx.language}`;
}

function formatNotes(notes: PipiliContextSnapshot['notes']): string | null {
  if (!notes || notes.entries.length === 0) return null;
  const formatted = notes.entries.map((n) => `[Note: ${n.title}]\n${n.content}`).join('\n\n');
  return `[Learner Notes]\n${formatted}`;
}

function formatHistory(history: PipiliContextSnapshot['history']): string | null {
  if (!history) return null;
  const strengths =
    history.strengths.length > 0 ? `Strengths: ${history.strengths.join(', ')}` : '';
  const weak =
    history.weakConcepts.length > 0 ? `Weak concepts: ${history.weakConcepts.join(', ')}` : '';
  if (!strengths && !weak) return null;
  return `[Learning History]\n${strengths}\n${weak}`;
}

function truncateToTokens(text: string, maxTokens: number): string {
  const maxWords = Math.floor(maxTokens * TOKEN_ESTIMATE_RATIO);
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  const truncated = words.slice(0, maxWords).join(' ');
  const lastSentence = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?'),
    truncated.lastIndexOf('\n'),
  );
  if (lastSentence > maxWords * 0.5) {
    return truncated.slice(0, lastSentence + 1) + ' [truncated]';
  }
  return truncated + ' [truncated]';
}
