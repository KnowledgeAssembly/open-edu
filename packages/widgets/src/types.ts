import type { ReactNode } from 'react';

export interface WidgetRenderProps {
  nodeId: string;
  config: Record<string, unknown>;
  emitInteraction: (data: Record<string, unknown>) => void;
  complete: (score?: number) => void;
}

export interface WidgetDefinition {
  id: string;
  version?: string;
  render: (props: WidgetRenderProps) => ReactNode;
}

export interface RemoteWidgetManifest {
  id: string;
  version: string;
  url: string;
  integrity?: string;
  apiVersion: string;
  fallback?: string;
  permissions?: string[];
}

export interface RemoteWidgetRegistration {
  manifest: RemoteWidgetManifest;
  status: 'pending' | 'loading' | 'success' | 'error';
  error?: string;
}

export interface WidgetRegistry {
  register: (definition: WidgetDefinition) => void;
  get: (id: string) => WidgetDefinition | undefined;
  has: (id: string) => boolean;
  registerRemote: (manifest: RemoteWidgetManifest) => void;
  getRemoteRegistration: (manifest: RemoteWidgetManifest) => RemoteWidgetRegistration | undefined;
  updateRemoteStatus: (
    manifest: RemoteWidgetManifest,
    status: RemoteWidgetRegistration['status'],
    error?: string,
  ) => void;
}

export class WidgetRegistrationError extends Error {
  constructor(widgetId: string) {
    super(`Widget "${widgetId}" is already registered`);
    this.name = 'WidgetRegistrationError';
  }
}
