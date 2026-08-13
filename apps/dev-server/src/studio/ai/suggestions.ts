import type { StudioContextSnapshot } from './context';

export interface SuggestionChip {
  id: string;
  label: string;
  action: {
    type: 'send_message';
    message: string;
  };
}

export function resolveSuggestions(
  ctx: StudioContextSnapshot,
  t: (key: string, options?: any) => string,
): SuggestionChip[] {
  if (!ctx.aiAvailable) {
    return [];
  }

  const { view, course, activity } = ctx;
  const chips: SuggestionChip[] = [];

  if (view === 'edit-activity' && activity?.selection) {
    chips.push(
      {
        id: 'rewrite_selection',
        label: t('studio.assistant.suggest.rewrite_selection'),
        action: { type: 'send_message', message: `Rewrite this: "${activity.selection.text}"` },
      },
      {
        id: 'simplify_selection',
        label: t('studio.assistant.suggest.simplify_selection'),
        action: { type: 'send_message', message: `Simplify this: "${activity.selection.text}"` },
      },
    );
    return chips;
  }

  const suggestions: Record<string, SuggestionChip[]> = {
    home: course
      ? [
          { id: 'summarize_course', label: t('studio.assistant.suggest.summarize_course'), action: { type: 'send_message', message: 'Summarize this course' } },
          { id: 'improve_outline', label: t('studio.assistant.suggest.improve_outline'), action: { type: 'send_message', message: 'How can I improve the outline?' } },
        ]
      : [
          { id: 'create_from_notes', label: t('studio.assistant.suggest.create_from_notes'), action: { type: 'send_message', message: 'How do I create a course from notes?' } },
          { id: 'what_can_you_do', label: t('studio.assistant.suggest.what_can_you_do'), action: { type: 'send_message', message: 'What can you help me with?' } },
        ],
    'outline': [
      { id: 'add_lesson', label: t('studio.assistant.suggest.add_lesson'), action: { type: 'send_message', message: 'How do I add a lesson?' } },
      { id: 'add_quiz', label: t('studio.assistant.suggest.add_quiz'), action: { type: 'send_message', message: 'How do I add a quiz?' } },
      { id: 'check_flow', label: t('studio.assistant.suggest.check_flow'), action: { type: 'send_message', message: 'Check my course flow' } },
    ],
    'edit-activity': [
      { id: 'improve_activity', label: t('studio.assistant.suggest.improve_activity'), action: { type: 'send_message', message: 'How can I improve this activity?' } },
      { id: 'check_quality', label: t('studio.assistant.suggest.check_quality'), action: { type: 'send_message', message: 'Check quality of this activity' } },
      { id: 'simplify', label: t('studio.assistant.suggest.simplify'), action: { type: 'send_message', message: 'How can I simplify this?' } },
    ],
    'preview': [
      { id: 'preview_feedback', label: t('studio.assistant.suggest.preview_feedback'), action: { type: 'send_message', message: 'What should I improve after preview?' } },
      { id: 'add_followup', label: t('studio.assistant.suggest.add_followup'), action: { type: 'send_message', message: 'Suggest a follow-up activity' } },
    ],
    'share': [
      { id: 'fix_issues', label: t('studio.assistant.suggest.fix_issues'), action: { type: 'send_message', message: 'Help me fix share readiness issues' } },
      { id: 'improve_description', label: t('studio.assistant.suggest.improve_description'), action: { type: 'send_message', message: 'Improve the course description' } },
    ],
    'library': [
      { id: 'create_course', label: t('studio.assistant.suggest.create_course'), action: { type: 'send_message', message: 'Help me create a new course' } },
      { id: 'organize_library', label: t('studio.assistant.suggest.organize_library'), action: { type: 'send_message', message: 'How should I organize my library?' } },
    ],
    'unit-builder': [
      { id: 'what_can_you_do', label: t('studio.assistant.suggest.what_can_you_do'), action: { type: 'send_message', message: 'What can you help me with?' } },
    ],
    'ai-review': [
      { id: 'what_can_you_do', label: t('studio.assistant.suggest.what_can_you_do'), action: { type: 'send_message', message: 'What can you help me with?' } },
    ],
  };

  return suggestions[view] || [];
}