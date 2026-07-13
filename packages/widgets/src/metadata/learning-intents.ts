export enum LearningIntent {
  Assess = 'assess',
  Practice = 'practice',
  Observe = 'observe',
  Compare = 'compare',
  Explore = 'explore',
  Create = 'create',
  Reflect = 'reflect',
  Apply = 'apply',
}

export const WIDGET_LEARNING_INTENTS: Record<string, LearningIntent[]> = {
  'core.matching': [LearningIntent.Practice, LearningIntent.Compare],
  'core.multiple-choice': [LearningIntent.Assess],
  'core.multiple-choice-practice': [LearningIntent.Practice],
  'core.visual-counting': [LearningIntent.Observe, LearningIntent.Practice],
  'core.drag-drop': [LearningIntent.Practice, LearningIntent.Compare],
  'core.sequencing': [LearningIntent.Practice, LearningIntent.Apply],
  'core.fill-blank': [LearningIntent.Assess, LearningIntent.Practice],
  'core.story-question': [LearningIntent.Assess, LearningIntent.Reflect],
  'core.real-world': [LearningIntent.Apply, LearningIntent.Explore],
  'math.fraction-visual': [LearningIntent.Observe, LearningIntent.Explore],
  'math.place-value-chart': [LearningIntent.Observe, LearningIntent.Practice],
  'math.grid-area': [LearningIntent.Practice, LearningIntent.Apply],
  'core.chart-reader': [LearningIntent.Observe, LearningIntent.Apply],
  'math.clock-time': [LearningIntent.Practice, LearningIntent.Apply],
  'math.measurement-scale': [LearningIntent.Practice, LearningIntent.Apply],
};

export function getLearningIntentsForWidget(widgetId: string): LearningIntent[] {
  return WIDGET_LEARNING_INTENTS[widgetId] ?? [];
}

export function getWidgetsByLearningIntent(intent: LearningIntent): string[] {
  return Object.entries(WIDGET_LEARNING_INTENTS)
    .filter(([, intents]) => intents.includes(intent))
    .map(([id]) => id);
}
