import type { InteractionActionSchema } from '@open-edu/schemas';

type InteractionAction = (typeof InteractionActionSchema)['options'][number];

const ACTION_DATA_SCHEMAS: Record<string, readonly string[]> = {
  select: ['optionId', 'index'],
  submit: ['optionId', 'index', 'step'],
  retry: ['step'],
  'hint-request': ['step'],
  reveal: ['step'],
  drag: ['from', 'to', 'index'],
  drop: ['from', 'to', 'index'],
  navigate: ['step', 'index'],
  custom: ['step', 'optionId', 'from', 'to', 'index', 'key'],
} satisfies Record<InteractionAction, readonly string[]>;

export function normalizeInteractionData(
  action: string,
  data: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!data) return undefined;
  const allowed = ACTION_DATA_SCHEMAS[action];
  if (!allowed) return undefined;
  const filtered: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in data && typeof data[key] !== 'object') {
      filtered[key] = data[key];
    }
  }
  return Object.keys(filtered).length > 0 ? filtered : undefined;
}
