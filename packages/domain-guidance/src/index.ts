import {
  ArtifactContractSchema,
  ProfilesFileSchema,
  QualityRubricFileSchema,
  type ArtifactContractData,
  type LearnerProfileDefinition,
  type ProfilesFile,
  type QualityDimension,
  type QualityDimensionId,
  type QualityRubricFile,
} from './types.js';

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const artifactContractJson = JSON.parse(readFileSync(join(__dirname, 'data/artifact-contract.json'), 'utf-8'));
const profilesJson = JSON.parse(readFileSync(join(__dirname, 'data/profiles.json'), 'utf-8'));
const qualityRubricJson = JSON.parse(readFileSync(join(__dirname, 'data/quality-rubric.json'), 'utf-8'));
import { buildAuthoredPromptView } from './generate.js';

export * from './types.js';
export { buildAuthoredPromptView, generateArtifactContractData } from './generate.js';

export function getArtifactContractData(): ArtifactContractData {
  return ArtifactContractSchema.parse(artifactContractJson);
}

export function getArtifactContractPromptView(): string {
  return buildAuthoredPromptView();
}

export function getProfilesData(): ProfilesFile {
  return ProfilesFileSchema.parse(profilesJson);
}

export function getProfile(id: string): LearnerProfileDefinition | undefined {
  const profiles = getProfilesData().profiles;
  return profiles[id];
}

export function getQualityRubricData(): QualityRubricFile {
  return QualityRubricFileSchema.parse(qualityRubricJson);
}

export function getQualityDimension(id: QualityDimensionId): QualityDimension | undefined {
  const dimensions = getQualityRubricData().dimensions;
  return dimensions.find((d: QualityDimension) => d.id === id);
}
