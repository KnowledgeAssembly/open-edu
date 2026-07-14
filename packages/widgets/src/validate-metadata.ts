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

  if ((widget.deprecated || widget.status === 'deprecated') && !widget.replacement) {
    warnings.push(`Widget ${widget.id} is deprecated but has no replacement ID specified`);
  }

  // AI metadata completeness
  if (widget.ai) {
    if (!widget.ai.recommendedAge) {
      warnings.push('AI recommendedAge is recommended for age-appropriate content generation');
    }

    if (!widget.ai.learningObjectives || widget.ai.learningObjectives.length === 0) {
      warnings.push('AI learningObjectives are recommended for content alignment');
    }

    if (!widget.ai.commonMisconceptions || widget.ai.commonMisconceptions.length === 0) {
      warnings.push('AI commonMisconceptions are recommended for generating helpful distractors');
    }

    if (widget.ai.exampleConfigs && widget.ai.exampleConfigs.length === 0) {
      warnings.push('AI exampleConfigs should contain at least one example');
    }
  }

  // Capabilities — supportsObserveMode for stable widgets
  if (
    widget.status === 'stable' &&
    widget.capabilities &&
    !widget.capabilities.supportsObserveMode
  ) {
    warnings.push('Stable widgets should declare supportsObserveMode capability');
  }

  // Analytics — consistency with capabilities
  if (
    widget.capabilities?.supportsHints &&
    widget.analytics &&
    widget.analytics.trackHints !== true
  ) {
    warnings.push('Widget supports hints but trackHints is not enabled');
  }

  if (
    widget.capabilities?.supportsRetry &&
    widget.analytics &&
    widget.analytics.trackRetries !== true
  ) {
    warnings.push('Widget supports retry but trackRetries is not enabled');
  }

  // Reward — completionXP should have positiveMessage
  if (widget.reward?.completionXP && !widget.reward.positiveMessage) {
    warnings.push('Widget awards completionXP but has no positiveMessage for feedback');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
