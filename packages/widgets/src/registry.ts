import type {
  WidgetDefinition,
  WidgetRegistry,
  RemoteWidgetManifest,
  RemoteWidgetRegistration,
} from './types';
import { WidgetRegistrationError } from './types';
import {
  visualCounting,
  multipleChoice,
  matching,
  dragDrop,
  sequencing,
  fillBlank,
  storyQuestion,
  realWorld,
  fractionVisual,
  placeValueChart,
  gridArea,
  chartReader,
  clockTime,
  measurementScale,
} from './builtins';

export function createWidgetRegistry(): WidgetRegistry {
  const widgets = new Map<string, WidgetDefinition>();
  const remoteWidgets = new Map<string, RemoteWidgetRegistration>();

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
    registerRemote(manifest: RemoteWidgetManifest) {
      const key = `${manifest.id}@${manifest.version}`;
      if (remoteWidgets.has(key)) {
        return;
      }
      remoteWidgets.set(key, { manifest, status: 'pending' });
    },
    getRemoteRegistration(manifest: RemoteWidgetManifest): RemoteWidgetRegistration | undefined {
      return remoteWidgets.get(`${manifest.id}@${manifest.version}`);
    },
    updateRemoteStatus(
      manifest: RemoteWidgetManifest,
      status: RemoteWidgetRegistration['status'],
      error?: string,
    ) {
      const key = `${manifest.id}@${manifest.version}`;
      const existing = remoteWidgets.get(key);
      if (existing) {
        existing.status = status;
        existing.error = error;
      }
    },
  };
}

const BUILTIN_WIDGETS: WidgetDefinition[] = [
  visualCounting,
  multipleChoice,
  matching,
  dragDrop,
  sequencing,
  fillBlank,
  storyQuestion,
  realWorld,
  fractionVisual,
  placeValueChart,
  gridArea,
  chartReader,
  clockTime,
  measurementScale,
];

export function registerAllBuiltins(registry: WidgetRegistry): void {
  for (const widget of BUILTIN_WIDGETS) {
    registry.register(widget);
  }
}

export function createDefaultRegistry(): WidgetRegistry {
  const registry = createWidgetRegistry();
  registerAllBuiltins(registry);
  return registry;
}
