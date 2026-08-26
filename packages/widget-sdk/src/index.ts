export { MULTI_FILE_CSP, SELF_CONTAINED_CSP_PREFIX } from './fixtures/protocol-fixtures.js';
export { PROTOCOL_API_VERSION } from './constants.js';
export { createWidgetHostClient } from './host-client.js';
export type { WidgetHostClient, WidgetHostClientOptions } from './host-client.js';
export { applyThemeTokens } from './theme.js';
export { validateHostBoundMessage, validateWidgetBoundMessage } from './validate-message.js';
export { normalizeInteractionData } from './normalize-interaction-data.js';
export type { MessageRejection, HostSession } from './validate-message.js';
export {
  WidgetMessageEnvelopeSchema,
  HostToWidgetTypeSchema,
  WidgetToHostTypeSchema,
  InteractionActionSchema,
  InitPayloadSchema,
  CompletePayloadSchema,
  StateSavePayloadSchema,
  StateSaveResultSchema,
  InteractionPayloadSchema,
  ResizePayloadSchema,
  WidgetCapabilitySchema,
} from '@open-edu/schemas';
export type {
  WidgetMessageEnvelope,
  HostToWidgetType,
  WidgetToHostType,
  InteractionAction,
  InitPayload,
  CompletePayload,
  StateSavePayload,
  StateSaveResult,
  InteractionPayload,
  ResizePayload,
  WidgetCapability,
} from '@open-edu/schemas';
