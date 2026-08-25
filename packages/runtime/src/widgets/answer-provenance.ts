import type { WidgetAnswer } from '@open-edu/schemas';

export interface WidgetAnswerInput {
  intendedWidgetId: string;
  intendedWidgetVersion?: string;
  renderedWidgetId: string;
  renderedWidgetVersion?: string;
  data: unknown;
  score?: number;
}

export function buildWidgetAnswer(input: WidgetAnswerInput): WidgetAnswer {
  const renderedViaFallback = input.intendedWidgetId !== input.renderedWidgetId;
  return {
    type: 'widget',
    widgetId: input.renderedWidgetId,
    widgetVersion: input.renderedWidgetVersion,
    data: input.data,
    score: input.score,
    intendedWidgetId: input.intendedWidgetId,
    intendedWidgetVersion: input.intendedWidgetVersion,
    renderedWidgetId: input.renderedWidgetId,
    renderedWidgetVersion: input.renderedWidgetVersion,
    renderedViaFallback,
  };
}
