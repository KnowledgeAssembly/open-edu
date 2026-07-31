import type {
  LearningContext,
  PipiliContextSnapshot,
  PageContext,
  LessonContext,
  CourseContext,
  LearnerProfile,
} from '@open-edu/ai-companion';

export function learningContextToSnapshot(
  ctx: LearningContext,
  preferences?: Partial<LearnerProfile>,
): PipiliContextSnapshot {
  const snapshot: PipiliContextSnapshot = {};

  if (ctx.lessonId && ctx.lessonTitle) {
    snapshot.lesson = {
      id: ctx.lessonId,
      title: ctx.lessonTitle,
      objectives: [],
      topics: [],
    } satisfies LessonContext;
  }

  if (ctx.courseId && ctx.courseTitle) {
    snapshot.course = {
      id: ctx.courseId,
      title: ctx.courseTitle,
      description: '',
      subject: '',
      level: '',
      language: ctx.learnerPreferences?.language ?? 'en',
    } satisfies CourseContext;
  }

  if (ctx.pageContent || ctx.selectedText) {
    snapshot.page = {
      id: ctx.sectionId ?? ctx.lessonId ?? 'unknown',
      title: ctx.lessonTitle ?? 'Current page',
      content: ctx.selectedText
        ? `Selection: ${ctx.selectedText}\n\nPage: ${ctx.pageContent ?? ''}`
        : (ctx.pageContent ?? ''),
      nodeType: 'page',
    } satisfies PageContext;
  }

  if (ctx.learnerPreferences || preferences) {
    snapshot.learner = {
      language: ctx.learnerPreferences?.language ?? preferences?.language ?? 'en',
      readingLevel:
        ctx.learnerPreferences?.readingLevel ?? preferences?.readingLevel ?? 'secondary',
      explanationStyle:
        ctx.learnerPreferences?.explanationStyle ?? preferences?.explanationStyle,
      emojiMode: ctx.learnerPreferences?.emojiMode ?? preferences?.emojiMode,
    } satisfies LearnerProfile;
  }

  return snapshot;
}
