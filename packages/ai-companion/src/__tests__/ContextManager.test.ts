import { describe, it, expect, beforeEach } from 'vitest';
import { ContextManager } from '../services/ContextManager.js';

describe('ContextManager', () => {
  let manager: ContextManager;

  beforeEach(() => {
    manager = new ContextManager();
  });

  it('returns empty context initially', () => {
    const context = manager.getCurrentContext();
    expect(context).toEqual({});
  });

  it('sets full context', () => {
    manager.setContext({
      courseId: 'course-1',
      courseTitle: 'Biology 101',
      lessonId: 'lesson-1',
      lessonTitle: 'Cell Division',
    });
    const context = manager.getCurrentContext();
    expect(context.courseId).toBe('course-1');
    expect(context.lessonTitle).toBe('Cell Division');
  });

  it('updates context incrementally', () => {
    manager.setContext({ courseId: 'course-1', lessonId: 'lesson-1' });
    manager.updateContext({ lessonId: 'lesson-2', sectionId: 'section-1' });

    const context = manager.getCurrentContext();
    expect(context.courseId).toBe('course-1');
    expect(context.lessonId).toBe('lesson-2');
    expect(context.sectionId).toBe('section-1');
  });

  it('subscribes to context changes', () => {
    const updates: unknown[] = [];
    const unsubscribe = manager.subscribe((ctx) => {
      updates.push(ctx);
    });

    manager.setContext({ courseId: 'course-1' });
    expect(updates.length).toBe(1);

    manager.updateContext({ lessonId: 'lesson-1' });
    expect(updates.length).toBe(2);

    unsubscribe();
    manager.setContext({ courseId: 'course-2' });
    expect(updates.length).toBe(2);
  });

  it('returns a copy of context (immutable)', () => {
    manager.setContext({ courseId: 'original' });
    const context = manager.getCurrentContext();
    context.courseId = 'modified';
    expect(manager.getCurrentContext().courseId).toBe('original');
  });

  it('handles learner preferences', () => {
    manager.setContext({
      learnerPreferences: { readingLevel: 'adult', language: 'en' },
    });
    const context = manager.getCurrentContext();
    expect(context.learnerPreferences?.readingLevel).toBe('adult');
    expect(context.learnerPreferences?.language).toBe('en');
  });

  it('handles subscribe returning unsubscribe function', () => {
    const unsub = manager.subscribe(() => {});
    expect(typeof unsub).toBe('function');
  });
});
