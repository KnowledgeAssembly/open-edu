import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ZodType } from 'zod';

export function toJsonSchema(schema: ZodType): Record<string, unknown> {
  return zodToJsonSchema(schema, { target: 'openApi3' });
}

export function toJsonSchemaDraft7(schema: ZodType): Record<string, unknown> {
  return zodToJsonSchema(schema, { target: 'jsonSchema7' });
}
