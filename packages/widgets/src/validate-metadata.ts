import type { WidgetDefinitionV2 } from './types';

export interface MetadataValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateWidgetMetadata(widget: WidgetDefinitionV2): MetadataValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!widget.id) {
    errors.push('Widget id is required');
  }

  if (!widget.name) {
    warnings.push('Widget name is recommended for discoverability');
  }

  if (!widget.description) {
    warnings.push('Widget description is recommended for authoring tools');
  }

  if (!widget.learningIntents || widget.learningIntents.length === 0) {
    warnings.push('No learningIntents defined — at least one is recommended for classification');
  }

  if (!widget.keywords || widget.keywords.length === 0) {
    warnings.push('No keywords defined — keywords are recommended for search discoverability');
  }

  if (!widget.icon) {
    warnings.push('An icon is recommended for toolbox display');
  }

  if (!widget.ai?.difficulty) {
    warnings.push('AI difficulty level is recommended for content generation');
  }

  if (widget.status === 'experimental') {
    warnings.push(`Widget ${widget.id} is marked experimental — ensure it is ready for use`);
  }

  if (widget.deprecated && !widget.replacement) {
    warnings.push(`Widget ${widget.id} is deprecated but has no replacement ID specified`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
