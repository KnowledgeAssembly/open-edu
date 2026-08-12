import { describe, it, expect } from 'vitest';
import { resolveSuggestions } from './suggestions';
import type { StudioContextSnapshot } from './context';

describe('resolveSuggestions', () => {
  const mockT = (key: string) => key;

  const baseCtx: Partial<StudioContextSnapshot> = {
    aiAvailable: true,
    locale: 'en',
  };

  it('returns empty array when AI is unavailable', () => {
    const ctx = { ...baseCtx, aiAvailable: false, view: 'home' } as StudioContextSnapshot;
    expect(resolveSuggestions(ctx, mockT)).toEqual([]);
  });

  it('returns create_from_notes when on home view with no course', () => {
    const ctx = { ...baseCtx, view: 'home' } as StudioContextSnapshot;
    const suggestions = resolveSuggestions(ctx, mockT);
    expect(suggestions.some(s => s.id === 'create_from_notes')).toBe(true);
    expect(suggestions.some(s => s.id === 'summarize_course')).toBe(false);
  });

  it('returns summarize_course when on home view with a course', () => {
    const ctx = { 
      ...baseCtx, 
      view: 'home', 
      course: { id: '1', title: 'Test', activityCount: 0, outline: [] } 
    } as StudioContextSnapshot;
    const suggestions = resolveSuggestions(ctx, mockT);
    expect(suggestions.some(s => s.id === 'summarize_course')).toBe(true);
    expect(suggestions.some(s => s.id === 'create_from_notes')).toBe(false);
  });

  it('returns correct chips for outline view', () => {
    const ctx = { ...baseCtx, view: 'outline' } as StudioContextSnapshot;
    const suggestions = resolveSuggestions(ctx, mockT);
    expect(suggestions.map(s => s.id)).toContain('add_lesson');
    expect(suggestions.map(s => s.id)).toContain('add_quiz');
    expect(suggestions.map(s => s.id)).toContain('check_flow');
  });

  it('returns correct chips for edit-activity view', () => {
    const ctx = { ...baseCtx, view: 'edit-activity' } as StudioContextSnapshot;
    const suggestions = resolveSuggestions(ctx, mockT);
    expect(suggestions.map(s => s.id)).toContain('improve_activity');
    expect(suggestions.map(s => s.id)).toContain('check_quality');
    expect(suggestions.map(s => s.id)).toContain('simplify');
  });

  it('returns correct chips for preview view', () => {
    const ctx = { ...baseCtx, view: 'preview' } as StudioContextSnapshot;
    const suggestions = resolveSuggestions(ctx, mockT);
    expect(suggestions.map(s => s.id)).toContain('preview_feedback');
    expect(suggestions.map(s => s.id)).toContain('add_followup');
  });

  it('returns correct chips for share view', () => {
    const ctx = { ...baseCtx, view: 'share' } as StudioContextSnapshot;
    const suggestions = resolveSuggestions(ctx, mockT);
    expect(suggestions.map(s => s.id)).toContain('fix_issues');
    expect(suggestions.map(s => s.id)).toContain('improve_description');
  });

  it('returns correct chips for library view', () => {
    const ctx = { ...baseCtx, view: 'library' } as StudioContextSnapshot;
    const suggestions = resolveSuggestions(ctx, mockT);
    expect(suggestions.map(s => s.id)).toContain('create_course');
    expect(suggestions.map(s => s.id)).toContain('organize_library');
  });

  it('returns minimal chips for unit-builder and ai-review', () => {
    const views = ['unit-builder', 'ai-review'] as const;
    views.forEach(view => {
      const ctx = { ...baseCtx, view } as StudioContextSnapshot;
      const suggestions = resolveSuggestions(ctx, mockT);
      expect(suggestions.map(s => s.id)).toContain('what_can_you_do');
      expect(suggestions).toHaveLength(1);
    });
  });
});
