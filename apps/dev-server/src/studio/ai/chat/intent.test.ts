import { describe, it, expect } from 'vitest';
import { parseIntentFromMessage } from './intent.js';

describe('parseIntentFromMessage', () => {
  it('detects a course-generation request with notes', () => {
    const content =
      'Help me create a course from my notes. Course for School students. Exploring different states of India. Capital cities & key historical places. It needs to be interactive & should be engaging.';
    const intent = parseIntentFromMessage(content);
    expect(intent).not.toBeNull();
    expect(intent?.type).toBe('generate_course');
    expect(intent?.description).toBe(content);
  });

  it('requires substantial notes before triggering course generation', () => {
    const intent = parseIntentFromMessage('Create a course');
    expect(intent).toBeNull();
  });

  it('detects a draft-new request for a lesson', () => {
    const intent = parseIntentFromMessage('Create a lesson about photosynthesis');
    expect(intent?.type).toBe('draft_new');
    expect(intent?.kind).toBe('lesson');
  });

  it('detects a draft-new quiz request', () => {
    const intent = parseIntentFromMessage('Create a quiz about fractions');
    expect(intent?.type).toBe('draft_new');
    expect(intent?.kind).toBe('quiz');
  });

  it('detects a draft-new practice request', () => {
    const intent = parseIntentFromMessage('Add a practice activity about fractions');
    expect(intent?.type).toBe('draft_new');
    expect(intent?.kind).toBe('practice');
  });

  it('detects an easier difficulty edit without generic edit words', () => {
    const intent = parseIntentFromMessage('Make this easier');
    expect(intent).toEqual({
      type: 'edit_existing',
      intent: 'difficulty',
      params: { direction: 'easier' },
    });
  });

  it('detects an easier difficulty edit for simpler wording', () => {
    const intent = parseIntentFromMessage('Make this simpler');
    expect(intent).toEqual({
      type: 'edit_existing',
      intent: 'difficulty',
      params: { direction: 'easier' },
    });
  });

  it('detects a harder difficulty edit without generic edit words', () => {
    const intent = parseIntentFromMessage('Make this harder');
    expect(intent).toEqual({
      type: 'edit_existing',
      intent: 'difficulty',
      params: { direction: 'harder' },
    });
  });

  it('detects a translate intent without generic edit words', () => {
    const intent = parseIntentFromMessage('Translate this into French');
    expect(intent?.type).toBe('edit_existing');
    expect(intent?.intent).toBe('translate');
  });

  it('detects an edit-existing rewrite request', () => {
    const intent = parseIntentFromMessage('Rewrite this paragraph to be simpler');
    expect(intent?.type).toBe('edit_existing');
    expect(intent?.intent).toBe('rewrite');
  });

  it('detects add-questions intent', () => {
    const intent = parseIntentFromMessage('Add questions to this quiz');
    expect(intent?.type).toBe('edit_existing');
    expect(intent?.intent).toBe('add-questions');
  });

  it('triggers course generation for long note-like messages', () => {
    const content =
      'India has 28 states. Each state has a capital city. New Delhi is the capital of India. Maharashtra is known for Mumbai. Karnataka is known for Bangalore. Tamil Nadu is known for Chennai. Kerala is known for Thiruvananthapuram. Gujarat is known for Gandhinagar. Rajasthan is known for Jaipur. Students should learn these capitals and also visit historical places like the Red Fort, Gateway of India, and Mysore Palace.';
    expect(content.length).toBeGreaterThan(300);
    const intent = parseIntentFromMessage(content);
    expect(intent?.type).toBe('generate_course');
  });
});
