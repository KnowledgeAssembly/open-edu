import Ajv, { type AnySchema } from 'ajv';

export type WidgetConfigValidation = { ok: true } | { ok: false; errors: string[] };

const ajv = new Ajv({ strict: false, allErrors: true });

export function validateWidgetConfig(
  schema: Record<string, unknown> | undefined,
  config: unknown,
): WidgetConfigValidation {
  if (!schema) return { ok: true };
  const validate = ajv.compile(schema as AnySchema);
  const valid = validate(config);
  if (valid) return { ok: true };
  const errors = (validate.errors ?? []).map((err) =>
    `${err.instancePath || '/'} ${err.message}`.trim(),
  );
  return { ok: false, errors };
}
