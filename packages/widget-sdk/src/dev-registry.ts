import type { WidgetManifest } from '@open-edu/schemas';

export interface DevRegistryOptions {
  relaxedOrigins: string[];
}

export function createDevRegistry(options?: Partial<DevRegistryOptions>) {
  return {
    relaxedOrigins: options?.relaxedOrigins ?? ['http://localhost:4177'],
    fixtures: [] as WidgetManifest[],
  };
}
