import { z } from 'zod';
import { WidgetCapabilitySchema } from './community-widget-manifest.js';

export const PROTOCOL_API_VERSION = 'open-edu.widget/1' as const;

export const HostToWidgetTypeSchema = z.enum([
  'init',
  'state:update',
  'locale:update',
  'theme:update',
  'lifecycle:pause',
  'lifecycle:destroy',
  'capability:result',
]);

export const WidgetToHostTypeSchema = z.enum([
  'ready',
  'resize',
  'interaction',
  'complete',
  'state:save',
  'capability:request',
  'error',
]);

export const InteractionActionSchema = z.enum([
  'select',
  'submit',
  'retry',
  'hint-request',
  'reveal',
  'drag',
  'drop',
  'navigate',
  'custom',
]);

export const WidgetMessageEnvelopeSchema = z.object({
  apiVersion: z.literal(PROTOCOL_API_VERSION),
  type: z.string(),
  instanceId: z.string().min(1).max(128),
  nonce: z.string().min(1).max(128),
  sequence: z.number().int().nonnegative(),
  requestId: z.string().min(1).max(128).optional(),
  payload: z.unknown(),
});

export const InitPayloadSchema = z.object({
  apiVersion: z.literal(PROTOCOL_API_VERSION),
  widgetId: z.string(),
  widgetVersion: z.string(),
  instanceId: z.string(),
  nodeId: z.string(),
  config: z.record(z.unknown()),
  storedState: z.unknown().optional(),
  locale: z.string(),
  theme: z.enum(['light', 'dark', 'zen']),
  themeTokens: z.record(z.string()),
  prefersReducedMotion: z.boolean(),
  capabilities: z.array(WidgetCapabilitySchema),
});

export const CompletePayloadSchema = z.object({
  score: z.number().min(0).max(100).optional(),
  state: z.unknown().optional(),
  reason: z.enum(['finished', 'submitted', 'continued']).optional(),
});

export const StateSavePayloadSchema = z.object({
  requestId: z.string(),
  schemaVersion: z.string().min(1),
  state: z.unknown(),
});

export const StateSaveResultSchema = z.object({
  requestId: z.string(),
  accepted: z.boolean(),
  normalizedState: z.unknown().optional(),
  rejectionReason: z
    .enum(['schema-invalid', 'too-large', 'lifecycle-closed', 'policy-denied'])
    .optional(),
});

export const InteractionPayloadSchema = z.object({
  action: InteractionActionSchema,
  data: z.record(z.unknown()).optional(),
});

export const ResizePayloadSchema = z.object({
  height: z.number().positive(),
});

export type WidgetMessageEnvelope = z.infer<typeof WidgetMessageEnvelopeSchema>;
export type InitPayload = z.infer<typeof InitPayloadSchema>;
export type CompletePayload = z.infer<typeof CompletePayloadSchema>;
export type StateSavePayload = z.infer<typeof StateSavePayloadSchema>;
export type StateSaveResult = z.infer<typeof StateSaveResultSchema>;
export type InteractionPayload = z.infer<typeof InteractionPayloadSchema>;
export type ResizePayload = z.infer<typeof ResizePayloadSchema>;
export type InteractionAction = z.infer<typeof InteractionActionSchema>;
export type WidgetToHostType = z.infer<typeof WidgetToHostTypeSchema>;
export type HostToWidgetType = z.infer<typeof HostToWidgetTypeSchema>;
