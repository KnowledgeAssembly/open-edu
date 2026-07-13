import type { ReactNode } from 'react';
import type { LearningIntent } from './metadata/learning-intents';
import type { WidgetCapabilities } from './metadata/capabilities';
import type { AccessibilityMetadata } from './metadata/accessibility';
import type { AnalyticsMetadata } from './metadata/analytics';
import type { RewardMetadata } from './metadata/reward';
import type { AIMetadata, DifficultyLevel } from './metadata/ai';

export interface WidgetRenderProps<TState = unknown> {
  nodeId: string;
  config: Record<string, unknown>;
  emitInteraction: (data: Record<string, unknown>) => void;
  complete: (score?: number, state?: TState) => void;
  storedState?: TState;
}

export interface WidgetDefinition {
  id: string;
  version?: string;
  render: (props: WidgetRenderProps) => ReactNode;
}

export interface WidgetDefinitionV2 extends WidgetDefinition {
  name: string;
  description: string;
  domain: string;
  learningIntents: LearningIntent[];
  capabilities: WidgetCapabilities;
  accessibility: AccessibilityMetadata;
  analytics: AnalyticsMetadata;
  reward: RewardMetadata;
  ai: AIMetadata;
  schema?: Record<string, unknown>;
  // TODO: refine renderer type (e.g., React.ComponentType or string reference)
  renderer?: unknown;
  // TODO: refine validator type (e.g., a validation function signature)
  validator?: unknown;
  icon?: string;
  keywords?: string[];
  status: 'stable' | 'experimental' | 'deprecated';
  deprecated?: boolean;
  replacement?: string;
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

export interface WidgetSearchFilters {
  query?: string;
  domain?: string;
  intent?: LearningIntent;
  difficulty?: DifficultyLevel;
  status?: WidgetDefinitionV2['status'];
  capability?: keyof WidgetCapabilities;
  accessibility?: keyof AccessibilityMetadata;
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
  registerAlias: (aliasId: string, targetId: string) => void;
  resolveAlias: (id: string) => string;
  getAll: () => WidgetDefinition[];
  getByDomain: (domain: string) => WidgetDefinition[];
  search: (query: string) => WidgetDefinition[];
  searchWithFilters: (filters: WidgetSearchFilters) => WidgetDefinition[];
}

export class WidgetRegistrationError extends Error {
  constructor(widgetId: string) {
    super(`Widget "${widgetId}" is already registered`);
    this.name = 'WidgetRegistrationError';
  }
}
