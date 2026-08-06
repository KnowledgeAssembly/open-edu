import type { AiQualityItem } from './types.js';

export interface DiagnosticLike {
  severity: string;
  message: string;
  code?: string;
}

export interface OutlineLike {
  title: string;
  kind: string;
}

export function mapDiagnosticsToQuality(
  diagnostics: DiagnosticLike[],
  outline: OutlineLike[],
): AiQualityItem[] {
  const codes = new Set(diagnostics.map((diagnostic) => diagnostic.code));
  const hasErrors = diagnostics.some((diagnostic) => diagnostic.severity === 'error');
  const hasAssessment = outline.some((node) => node.kind === 'quiz' || node.kind === 'practice');

  const items: AiQualityItem[] = [
    {
      id: 'objectives',
      labelKey: 'studio.ai.quality.objectives',
      passed: !codes.has('MISSING_OBJECTIVES'),
    },
    {
      id: 'assessment',
      labelKey: 'studio.ai.quality.assessment',
      passed: hasAssessment,
    },
    {
      id: 'duration',
      labelKey: 'studio.ai.quality.duration',
      passed: outline.length >= 1 && outline.length <= 6,
    },
    {
      id: 'completeness',
      labelKey: 'studio.ai.quality.completeness',
      passed: !hasErrors && outline.length > 0,
    },
  ];

  return items;
}
