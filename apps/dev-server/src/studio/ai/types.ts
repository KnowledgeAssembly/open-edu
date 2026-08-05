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

export interface AiGenerateResult {
  success: boolean;
  quality: AiQualityItem[];
  outlinePreview: Array<{ title: string; kind: string }>;
  title?: string;
  error?: string;
}

export interface AiStatus {
  available: boolean;
  reason?: 'missing-key' | 'disabled';
}
