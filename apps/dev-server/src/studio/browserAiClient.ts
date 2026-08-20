import {
  saveStudioDraft,
  getStudioDraft,
  deleteStudioDraft,
  listStudioDraftsByCourse,
  type StoredStudioDraft,
  type StoredStudioFile,
} from '@open-edu/storage';
import type { AiStatus } from './ai/types.js';

export interface GatewayGeneratedFile {
  path: string;
  content: string;
  encoding: 'utf8' | 'base64';
}

export interface GatewayDraftResponse {
  requestId: string;
  success: true;
  title: string;
  version?: string;
  files: GatewayGeneratedFile[];
  outlinePreview: Array<{ title: string; kind: string }>;
  quality: Array<{
    id: string;
    labelKey: string;
    passed: boolean;
    detail?: string;
  }>;
}

export type GatewayAiErrorCode = string;

export class BrowserAiClientError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'BrowserAiClientError';
    this.code = code;
  }
}

function decodeFile(file: GatewayGeneratedFile): Uint8Array {
  if (file.encoding === 'base64') {
    const binary = atob(file.content);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  return new TextEncoder().encode(file.content);
}

export interface BrowserAiClientOptions {
  baseUrl?: string;
}

const MAX_RETRIES = 1;
const INITIAL_RETRY_DELAY_MS = 2_000;

function isTimeoutError(err: unknown): boolean {
  return err instanceof BrowserAiClientError && err.code === 'timeout';
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Browser-side AI client for the stateless hosted gateway. It calls only
 * /api/ai/* endpoints, never includes API keys, and owns draft persistence in
 * the browser-owned studio-drafts store.
 */
export class BrowserAiClient {
  private readonly baseUrl: string;

  constructor(options: BrowserAiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? '';
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });

    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      // non-JSON error
    }

    if (!res.ok) {
      const errorCode = (data as { error?: { code?: string } })?.error?.code ?? 'unknown-error';
      const message =
        (data as { error?: { message?: string } })?.error?.message ??
        `Gateway request failed with status ${res.status}`;
      throw new BrowserAiClientError(errorCode, message);
    }

    return data as T;
  }

  private async requestWithRetry<T>(path: string, init?: RequestInit): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await this.request<T>(path, init);
      } catch (err) {
        lastError = err;
        if (attempt < MAX_RETRIES && isTimeoutError(err)) {
          await delay(INITIAL_RETRY_DELAY_MS * 2 ** attempt);
        } else {
          throw err;
        }
      }
    }
    throw lastError;
  }

  async getStatus(): Promise<AiStatus> {
    try {
      const data = await this.request<{ available: boolean; reason?: string }>('/api/ai/status');
      return { available: data.available, reason: data.reason as AiStatus['reason'] };
    } catch (err) {
      if (err instanceof BrowserAiClientError) {
        return { available: false, reason: 'disabled' };
      }
      return { available: false, reason: 'disabled' };
    }
  }

  /** Generate a complete draft and persist it locally in studio-drafts. */
  async generateDraft(
    input: { notes?: string; spec?: string; specExt?: '.json' | '.md' },
    courseId: string,
  ): Promise<GatewayDraftResponse & { draftId: string }> {
    const data = await this.requestWithRetry<GatewayDraftResponse>('/api/ai/generate-draft', {
      method: 'POST',
      body: JSON.stringify(input),
    });

    const files: StoredStudioFile[] = data.files.map((file) => ({
      path: file.path,
      data: decodeFile(file).buffer.slice(0) as ArrayBuffer,
    }));

    const draftId = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date().toISOString();
    const draft: StoredStudioDraft = {
      id: draftId,
      courseId,
      version: data.version ?? '1.0.0',
      title: data.title,
      files,
      createdAt: now,
      updatedAt: now,
    };

    await saveStudioDraft(draft);
    return { ...data, draftId };
  }

  async listDrafts(courseId: string): Promise<StoredStudioDraft[]> {
    return listStudioDraftsByCourse(courseId);
  }

  async getDraft(draftId: string): Promise<StoredStudioDraft | undefined> {
    return getStudioDraft(draftId);
  }

  async discardDraft(draftId: string): Promise<void> {
    await deleteStudioDraft(draftId);
  }

  async generateItem(
    body:
      | { kind: string; description: string; existingTitles?: string[] }
      | {
          kind: string;
          intent: string;
          currentContent: string;
          params?: unknown;
          existingTitles?: string[];
        },
  ): Promise<unknown> {
    return this.request('/api/ai/item', { method: 'POST', body: JSON.stringify(body) });
  }

  async chat(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    context?: unknown,
  ): Promise<{ terminal: 'finished' | 'error'; content?: string; error?: string }> {
    return this.request('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ messages, context }),
    });
  }
}
