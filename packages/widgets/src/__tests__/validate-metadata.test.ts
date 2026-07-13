import { describe, it, expect } from 'vitest';
import { validateWidgetMetadata } from '../validate-metadata';
import type { WidgetDefinitionV2 } from '../types';
import { LearningIntent } from '../metadata/learning-intents';

function v2(overrides: Partial<WidgetDefinitionV2> = {}): WidgetDefinitionV2 {
  return {
    id: 'test.widget',
    name: 'Test',
    description: 'A test widget',
    domain: 'test',
    learningIntents: [LearningIntent.Practice],
    capabilities: {},
    accessibility: {},
    analytics: {},
    reward: {},
    ai: { difficulty: 'medium' },
    status: 'stable',
    render: () => null,
    ...overrides,
  };
}

describe('validateWidgetMetadata', () => {
  it('returns no errors for a valid V2 definition', () => {
    const result = validateWidgetMetadata(v2());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('warns when name is missing', () => {
    const result = validateWidgetMetadata(v2({ name: '' }));
    expect(result.warnings).toContainEqual(expect.stringContaining('name'));
  });

  it('warns when description is missing', () => {
    const result = validateWidgetMetadata(v2({ description: '' }));
    expect(result.warnings).toContainEqual(expect.stringContaining('description'));
  });

  it('warns when learningIntents is empty', () => {
    const result = validateWidgetMetadata(v2({ learningIntents: [] }));
    expect(result.warnings).toContainEqual(expect.stringContaining('learningIntents'));
  });

  it('warns when ai.difficulty is missing', () => {
    const result = validateWidgetMetadata(v2({ ai: {} }));
    expect(result.warnings).toContainEqual(expect.stringContaining('difficulty'));
  });

  it('warns when keywords are missing', () => {
    const result = validateWidgetMetadata(v2({ keywords: undefined }));
    expect(result.warnings).toContainEqual(expect.stringContaining('keywords'));
  });

  it('errors when id is empty', () => {
    const result = validateWidgetMetadata(v2({ id: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(expect.stringContaining('id'));
  });

  it('warns when status is experimental', () => {
    const result = validateWidgetMetadata(v2({ status: 'experimental' }));
    expect(result.warnings).toContainEqual(expect.stringContaining('experimental'));
  });

  it('warns when deprecated is true but replacement is missing', () => {
    const result = validateWidgetMetadata(v2({ deprecated: true, replacement: undefined }));
    expect(result.warnings).toContainEqual(expect.stringContaining('replacement'));
  });

  it('warns when icon is missing', () => {
    const result = validateWidgetMetadata(v2({ icon: undefined }));
    expect(result.warnings).toContainEqual(expect.stringContaining('icon'));
  });
});
