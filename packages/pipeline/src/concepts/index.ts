import type { LlmRouter } from '@open-edu/llm-config';
import type { SourceUnit } from '../source/types.js';
import type { CurriculumProfile } from '../profile/types.js';
import type { Concept } from './types.js';
import { ConceptSchema, ConceptMapSchema } from './types.js';
import { buildConceptMapPrompt } from './prompt.js';

export function validateConceptGraph(concepts: Concept[]): string[] {
  const errors: string[] = [];
  const ids = new Set(concepts.map((c) => c.conceptId));

  for (const concept of concepts) {
    if (concept.prerequisites.includes(concept.conceptId)) {
      errors.push(`Concept "${concept.conceptId}" lists itself as a prerequisite`);
    }
    for (const prereq of concept.prerequisites) {
      if (!ids.has(prereq)) {
        errors.push(`Concept "${concept.conceptId}" references unknown prerequisite "${prereq}"`);
      }
    }
  }

  const visited = new Set<string>();
  const inStack = new Set<string>();
  const adj = new Map<string, string[]>();
  for (const c of concepts) adj.set(c.conceptId, c.prerequisites);

  function detectCycle(nodeId: string): boolean {
    if (inStack.has(nodeId)) {
      errors.push(`Dependency cycle detected via "${nodeId}"`);
      return true;
    }
    if (visited.has(nodeId)) return false;
    visited.add(nodeId);
    inStack.add(nodeId);
    for (const dep of adj.get(nodeId) || []) detectCycle(dep);
    inStack.delete(nodeId);
    return false;
  }
  for (const c of concepts) detectCycle(c.conceptId);

  for (const c of concepts) {
    if (c.sourceUnitIds.length === 0)
      errors.push(`Concept "${c.conceptId}" has no source evidence`);
  }

  return errors;
}

export async function generateConceptMap(
  router: LlmRouter,
  sourceUnits: SourceUnit[],
  lessonName: string,
  profile: CurriculumProfile,
): Promise<{ concepts: Concept[]; warnings: string[] }> {
  const prompt = buildConceptMapPrompt(sourceUnits, lessonName, profile);
  const result = await router.generateStructuredRaw('concept_map', prompt, ConceptMapSchema, {
    temperature: 0.2,
  });

  const warnings: string[] = [];
  const graphErrors = validateConceptGraph(result.concepts);
  if (graphErrors.length > 0) warnings.push(...graphErrors);

  const validConcepts = result.concepts.filter((c) => {
    const r = ConceptSchema.safeParse(c);
    if (!r.success) warnings.push(`Concept "${c.conceptId}" failed validation: ${r.error.message}`);
    return r.success;
  });

  for (const c of validConcepts) {
    if (!profile.conceptKinds.includes(c.kind)) {
      warnings.push(`Concept "${c.conceptId}" uses unsupported kind "${c.kind}" for profile "${profile.id}"`);
    }
    for (const rep of c.representations) {
      if (!profile.representations.includes(rep)) {
        warnings.push(`Concept "${c.conceptId}" uses unsupported representation "${rep}" for profile "${profile.id}"`);
      }
    }
  }

  return { concepts: validConcepts, warnings };
}
