export interface ExerciseNode {
  type: 'exercise';
  title?: string;
  widget: string;
  config: Record<string, unknown>;
}

export function parseExerciseNode(content: string): ExerciseNode | null {
  try {
    const parsed = JSON.parse(content) as Partial<ExerciseNode> & { type?: string };
    if (parsed.type !== 'exercise' || typeof parsed.widget !== 'string') return null;
    return {
      type: 'exercise',
      title: typeof parsed.title === 'string' ? parsed.title : undefined,
      widget: parsed.widget,
      config: (parsed.config as Record<string, unknown>) ?? {},
    };
  } catch {
    return null;
  }
}

export function serializeExerciseNode(node: ExerciseNode): string {
  return JSON.stringify(
    {
      type: 'exercise',
      ...(node.title ? { title: node.title } : {}),
      widget: node.widget,
      config: node.config,
    },
    null,
    2,
  );
}

export function createEmptyExercise(widgetId: string, title = 'Practice'): ExerciseNode {
  return { type: 'exercise', title, widget: widgetId, config: {} };
}
