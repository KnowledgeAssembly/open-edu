export enum WidgetDomain {
  Core = 'core',
  Math = 'math',
  Language = 'language',
  Science = 'science',
  Social = 'social',
}

export const WIDGET_ALIAS_MAP: Record<string, string> = {
  'open-edu.matching': 'core.matching',
  'open-edu.multiple-choice': 'core.multiple-choice',
  'open-edu.multiple-choice-practice': 'core.multiple-choice',
  'open-edu.visual-counting': 'core.visual-counting',
  'open-edu.drag-drop': 'core.drag-drop',
  'open-edu.sequencing': 'core.sequencing',
  'open-edu.fill-blank': 'core.fill-blank',
  'open-edu.story-question': 'core.story-question',
  'open-edu.real-world': 'core.real-world',
  'open-edu.fraction-visual': 'math.fraction-visual',
  'open-edu.place-value-chart': 'math.place-value-chart',
  'open-edu.grid-area': 'math.grid-area',
  'open-edu.chart-reader': 'core.chart-reader',
  'open-edu.clock-time': 'math.clock-time',
  'open-edu.measurement-scale': 'math.measurement-scale',
};

export function resolveWidgetId(id: string): string {
  return WIDGET_ALIAS_MAP[id] ?? id;
}

export function migrateWidgetId(id: string): {
  oldId: string;
  newId: string;
  migrated: boolean;
} {
  const newId = resolveWidgetId(id);
  return {
    oldId: id,
    newId,
    migrated: id !== newId,
  };
}

export function getDomainPrefix(widgetId: string): string {
  const dotIndex = widgetId.indexOf('.');
  if (dotIndex === -1) return '';
  return widgetId.substring(0, dotIndex);
}
