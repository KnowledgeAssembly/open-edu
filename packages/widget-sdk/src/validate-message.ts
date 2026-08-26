import {
  WidgetMessageEnvelopeSchema,
  PROTOCOL_API_VERSION,
  WidgetToHostTypeSchema,
  HostToWidgetTypeSchema,
} from '@open-edu/schemas';
import type { z } from 'zod';

export type MessageRejection =
  | 'api-version'
  | 'origin'
  | 'instance'
  | 'nonce'
  | 'sequence'
  | 'type'
  | 'malformed'
  | 'rate-limit';

export interface HostSession {
  instanceId: string;
  nonce: string;
  expectedOrigin: string | 'opaque';
  lastSequence: number;
}

function hasUnsupportedApiVersion(data: unknown): boolean {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as Record<string, unknown>).apiVersion !== PROTOCOL_API_VERSION
  );
}

export function validateHostBoundMessage(
  data: unknown,
  eventOrigin: string,
  session: HostSession,
):
  | { ok: true; message: z.infer<typeof WidgetMessageEnvelopeSchema> }
  | { ok: false; reason: MessageRejection } {
  if (session.expectedOrigin !== 'opaque' && eventOrigin !== session.expectedOrigin) {
    return { ok: false, reason: 'origin' };
  }
  if (hasUnsupportedApiVersion(data)) return { ok: false, reason: 'api-version' };
  const parsed = WidgetMessageEnvelopeSchema.safeParse(data);
  if (!parsed.success) return { ok: false, reason: 'malformed' };
  const msg = parsed.data;
  if (msg.apiVersion !== PROTOCOL_API_VERSION) return { ok: false, reason: 'api-version' };
  if (msg.instanceId !== session.instanceId) return { ok: false, reason: 'instance' };
  if (msg.nonce !== session.nonce) return { ok: false, reason: 'nonce' };
  if (!WidgetToHostTypeSchema.safeParse(msg.type).success) return { ok: false, reason: 'type' };
  // v1 does not implement the capability request/response channel, so the host
  // deterministically drops capability:request to keep the extension point safe.
  if (msg.type === 'capability:request') return { ok: false, reason: 'type' };
  // The 'ready' handshake is the first message a widget sends. In React
  // StrictMode the message listener may be torn down and re-attached, causing
  // the host to miss earlier ready messages.  Accept any sequence for the
  // initial handshake so the widget can still establish the session.
  if (msg.type !== 'ready' && msg.sequence !== session.lastSequence + 1) {
    return { ok: false, reason: 'sequence' };
  }
  return { ok: true, message: msg };
}

export function validateWidgetBoundMessage(
  data: unknown,
  eventOrigin: string,
  session: HostSession,
):
  | { ok: true; message: z.infer<typeof WidgetMessageEnvelopeSchema> }
  | { ok: false; reason: MessageRejection } {
  if (session.expectedOrigin !== 'opaque' && eventOrigin !== session.expectedOrigin) {
    return { ok: false, reason: 'origin' };
  }
  if (hasUnsupportedApiVersion(data)) return { ok: false, reason: 'api-version' };
  const parsed = WidgetMessageEnvelopeSchema.safeParse(data);
  if (!parsed.success) return { ok: false, reason: 'malformed' };
  const msg = parsed.data;
  if (msg.apiVersion !== PROTOCOL_API_VERSION) return { ok: false, reason: 'api-version' };
  if (msg.instanceId !== session.instanceId) return { ok: false, reason: 'instance' };
  if (msg.nonce !== session.nonce) return { ok: false, reason: 'nonce' };
  if (msg.sequence !== session.lastSequence + 1) return { ok: false, reason: 'sequence' };
  if (!HostToWidgetTypeSchema.safeParse(msg.type).success) return { ok: false, reason: 'type' };
  return { ok: true, message: msg };
}
