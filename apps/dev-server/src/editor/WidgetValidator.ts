import type { z } from 'zod';
import { createDefaultRegistry } from '@open-edu/widgets';

export interface ValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning';
  code: string;
}

export function validateWidgetConfig(
  config: unknown,
  schema?: z.ZodType<any, any, any>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!schema) return errors;

  const result = schema.safeParse(config);
  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push({
        path: issue.path.join('.'),
        message: issue.message,
        severity: issue.code === 'invalid_type' ? 'error' : 'error',
        code: issue.code,
      });
    }
  }

  return errors;
}

let _registry: ReturnType<typeof createDefaultRegistry> | null = null;
function getRegistry() {
  if (!_registry) _registry = createDefaultRegistry();
  return _registry;
}

export function validateWidgetConfigForType(
  widgetType: string,
  config: unknown,
): ValidationError[] {
  const registry = getRegistry();
  const definition = registry.get(widgetType);
  const schema = (definition as any)?.schema;
  return validateWidgetConfig(config, schema ?? undefined);
}
