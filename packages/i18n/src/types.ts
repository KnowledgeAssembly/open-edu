export interface TranslationProvider {
  readonly id: string;
  readonly name: string;
  translate(
    text: string,
    sourceLocale: string,
    targetLocale: string
  ): Promise<string>;
}

export interface TranslationJob {
  readonly id: string;
  readonly sourceLocale: string;
  readonly targetLocale: string;
  readonly keys: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: Record<string, string>;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface TranslationStatus {
  totalKeys: number;
  translatedKeys: number;
  missingKeys: string[];
  coveragePercent: number;
}
