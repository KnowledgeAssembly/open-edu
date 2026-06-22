import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ZodType } from 'zod';

export function toJsonSchema(schema: ZodType): Record<string, unknown> {
  return zodToJsonSchema(schema, { target: 'openApi3' });
}
