import type { ApprovalRequest } from './permission.js';
import type { CourseDraftResult, DraftItem } from './types.js';

export type CompanionErrorCode =
  | 'invalid-request'
  | 'context-invalid'
  | 'permission-denied'
  | 'tool-not-found'
  | 'tool-failed'
  | 'validation-failed'
  | 'cancelled'
  | 'runtime-error'
  | 'rate-limited';

export interface CompanionError {
  code: CompanionErrorCode;
  message: string;
  cause?: unknown;
}

export type CompanionEvent =
  | { type: 'message.delta'; text: string }
  | { type: 'message.complete' }
  | { type: 'tool.started'; toolCallId: string; tool: string }
  | { type: 'tool.completed'; toolCallId: string; result: unknown }
  | { type: 'draft.created'; draft: CourseDraftResult | DraftItem[] }
  | { type: 'approval.required'; approval: ApprovalRequest }
  | { type: 'task.started'; taskId: string }
  | { type: 'task.progress'; taskId: string; progress?: number; message?: string }
  | { type: 'task.completed'; taskId: string }
  | { type: 'error'; error: CompanionError };
