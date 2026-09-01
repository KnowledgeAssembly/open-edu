import { describe, it, expect } from 'vitest';
import {
  getArtifactContractData,
  getArtifactContractPromptView,
  getProfilesData,
  getProfile,
  getQualityRubricData,
  getQualityDimension,
} from '../index.js';
import { generateArtifactContractData } from '../generate.js';

describe('domain-guidance package', () => {
  it('committed artifact-contract.json is in sync with schema generator', () => {
    const generated = generateArtifactContractData();
    const fromFile = getArtifactContractData();
    expect(fromFile).toEqual(generated);
  });

  it('golden-file test: authored prompt view renders curated prose over derived facts', () => {
    const promptView = getArtifactContractPromptView();
    expect(promptView).toContain('Output ONLY a single JSON object');
    expect(promptView).toContain('"format": "openedu-course-spec"');
    expect(promptView).toContain('RULES:');
    expect(promptView).toContain('1 to 6 lessons only');
    expect(promptView).toContain('Use measurable objectives');
  });

  it('profiles accessors return valid profile definitions', () => {
    const data = getProfilesData();
    expect(data.schemaVersion).toBe(1);
    expect(data.defaultProfile).toBe('neurotypical');
    expect(Object.keys(data.profiles)).toContain('autism');
    expect(Object.keys(data.profiles)).toContain('school');

    const autism = getProfile('autism');
    expect(autism).toBeDefined();
    expect(autism?.kind).toBe('autism');
    expect(autism?.accessibility).toContain('sensory-friendly');
  });

  it('quality rubric accessors return valid dimension definitions', () => {
    const rubric = getQualityRubricData();
    expect(rubric.schemaVersion).toBe(1);
    expect(rubric.dimensions.map((d) => d.id)).toEqual([
      'objectives',
      'assessment',
      'duration',
      'completeness',
    ]);

    const objectives = getQualityDimension('objectives');
    expect(objectives).toBeDefined();
    expect(objectives?.title).toBe('Learning Objectives');
    expect(objectives?.promptGuidance).toContain('measurable objectives');
  });
});
