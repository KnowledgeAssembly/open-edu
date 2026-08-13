import { describe, it, expect } from 'vitest';
import { extractSuggestedNextSteps } from './policy';
import { MAX_SUGGESTED_NEXT_STEPS } from './metadata';

describe('extractSuggestedNextSteps', () => {
  it('returns draft follow-ups for item drafts', () => {
    const steps = extractSuggestedNextSteps({
      mode: 'draft',
      view: 'edit-activity',
      hasCourseDraft: false,
      locale: 'en',
    });
    expect(steps.length).toBeGreaterThan(0);
    expect(steps.length).toBeLessThanOrEqual(MAX_SUGGESTED_NEXT_STEPS);
    expect(steps[0]).toContain('Apply');
  });

  it('returns course-draft follow-ups for course drafts', () => {
    const steps = extractSuggestedNextSteps({
      mode: 'course_draft',
      view: 'home',
      hasCourseDraft: true,
      locale: 'en',
    });
    expect(steps).toContain('Review quality checklist');
    expect(steps).toContain('Accept draft');
    expect(steps).toContain('Add more notes');
  });

  it('includes add-notes for course drafts even when hasCourseDraft is false', () => {
    const steps = extractSuggestedNextSteps({
      mode: 'course_draft',
      view: 'home',
      hasCourseDraft: false,
      locale: 'en',
    });
    expect(steps).toContain('Add more notes');
  });

  it('returns view-based next steps for explain mode', () => {
    const outline = extractSuggestedNextSteps({
      mode: 'explain',
      view: 'outline',
      hasCourseDraft: false,
      locale: 'en',
    });
    expect(outline).toContain('Add a lesson');
    expect(outline).toContain('Preview course');
  });

  it('caps results at MAX_SUGGESTED_NEXT_STEPS', () => {
    const steps = extractSuggestedNextSteps({
      mode: 'explain',
      view: 'outline',
      hasCourseDraft: false,
      locale: 'en',
    });
    expect(steps.length).toBeLessThanOrEqual(MAX_SUGGESTED_NEXT_STEPS);
  });
});
