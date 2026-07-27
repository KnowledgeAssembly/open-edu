import { describe, it, expect } from 'vitest';
import { learningContextToSnapshot } from '../context-mapper.js';

describe('learningContextToSnapshot', () => {
  it('empty LearningContext returns empty snapshot', () => {
    const result = learningContextToSnapshot({});
    expect(result.page).toBeUndefined();
    expect(result.lesson).toBeUndefined();
    expect(result.course).toBeUndefined();
  });

  it('lessonId + lessonTitle populates snapshot.lesson with empty objectives/topics', () => {
    const result = learningContextToSnapshot({
      lessonId: 'l1',
      lessonTitle: 'Lesson 1',
    });
    expect(result.lesson?.id).toBe('l1');
    expect(result.lesson?.title).toBe('Lesson 1');
    expect(result.lesson?.objectives).toEqual([]);
    expect(result.lesson?.topics).toEqual([]);
  });

  it('courseId + courseTitle populates snapshot.course; language falls back to en', () => {
    const result = learningContextToSnapshot({
      courseId: 'c1',
      courseTitle: 'Course 1',
    });
    expect(result.course?.id).toBe('c1');
    expect(result.course?.title).toBe('Course 1');
    expect(result.course?.language).toBe('en');
  });

  it('selectedText present means snapshot.page.content starts with "Selection:"', () => {
    const result = learningContextToSnapshot({
      selectedText: 'selected part',
      pageContent: 'full page content',
      lessonId: 'l1',
      lessonTitle: 'Lesson',
    });
    expect(result.page?.content).toContain('Selection: selected part');
  });

  it('learnerPreferences.language flows into snapshot.learner.language', () => {
    const result = learningContextToSnapshot({
      learnerPreferences: { language: 'hi', readingLevel: 'secondary' },
    });
    expect(result.learner?.language).toBe('hi');
    expect(result.learner?.readingLevel).toBe('secondary');
  });

  it('pageContent only (no selection) means snapshot.page.content equals pageContent directly', () => {
    const result = learningContextToSnapshot({
      pageContent: 'just page content',
      lessonId: 'l1',
      lessonTitle: 'Lesson',
    });
    expect(result.page?.content).toBe('just page content');
  });

  it('notes/history are NOT shipped from the client', () => {
    const result = learningContextToSnapshot({});
    expect(result.notes).toBeUndefined();
    expect(result.history).toBeUndefined();
  });
});
