export interface AiGenerateRequest {
  notes: string;
  titleHint?: string;
  locale?: string;
}

export interface AiQualityItem {
  id: string;
  labelKey: string;
  passed: boolean;
  detail?: string;
}

export type AiGenerateErrorCode =
  | 'notes-too-short'
  | 'has-content'
  | 'llm'
  | 'parse'
  | 'write'
  | 'compile';

export interface AiGenerateResult {
  success: boolean;
  quality: AiQualityItem[];
  outlinePreview: Array<{ title: string; kind: string }>;
  title?: string;
  error?: string;
  code?: AiGenerateErrorCode;
}

export interface AiStatus {
  available: boolean;
  reason?: 'missing-key' | 'disabled';
}

export type AiEndpointErrorCode = 'no-active-package' | 'missing-notes' | 'unknown-ai-endpoint';
