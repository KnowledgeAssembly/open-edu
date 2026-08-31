import type { StudioContextSnapshot } from './context.js';
import type { CompanionPermissions } from './permission.js';

export type CompanionMode = 'author' | 'explain' | 'review' | 'design' | 'validate';

export interface CompanionCapabilities {
  streaming?: boolean;
  toolCalling?: boolean;
  structuredOutput?: boolean;
}

export interface CompanionRequest {
  message: string;
  context: StudioContextSnapshot;
  conversationId: string;
  mode?: CompanionMode;
  permissions: CompanionPermissions;
  capabilities?: CompanionCapabilities;
}

export interface CompanionResponse {
  conversationId: string;
  runId: string;
}
