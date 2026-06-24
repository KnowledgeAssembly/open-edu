import type { WidgetDefinition, WidgetRegistry } from './types';
import { WidgetRegistrationError } from './types';

export function createWidgetRegistry(): WidgetRegistry {
  const widgets = new Map<string, WidgetDefinition>();

  return {
    register(definition: WidgetDefinition) {
      if (widgets.has(definition.id)) {
        throw new WidgetRegistrationError(definition.id);
      }
      widgets.set(definition.id, definition);
    },
    get(id: string) {
      return widgets.get(id);
    },
    has(id: string) {
      return widgets.has(id);
    },
  };
}
