import { z } from 'zod';
import type { LlmRouter } from '@open-edu/llm-config';
import type { Concept } from '../concepts/types.js';
import type { SourceUnit } from '../source/types.js';
import type { LessonBlueprint } from './types.js';
import { LessonBlueprintSchema, validateBlueprint } from './types.js';
import { buildBlueprintPrompt } from './prompt.js';

export async function generateLessonBlueprints(
  router: LlmRouter,
  concepts: Concept[],
  sourceUnits: SourceUnit[],
  widgetCategories: string[],
): Promise<{ blueprints: LessonBlueprint[]; warnings: string[] }> {
  const warnings: string[] = [];
  const blueprints: LessonBlueprint[] = [];

  for (const concept of concepts) {
    const prompt = buildBlueprintPrompt(concept, sourceUnits, widgetCategories);
    const result = await router.generateStructuredRaw(
      'lesson_blueprint',
      prompt,
      z.object({ blueprints: z.array(LessonBlueprintSchema) }),
      { temperature: 0.3 },
    );

    for (const bp of result.blueprints) {
      const errors = validateBlueprint(bp);
      if (errors.length > 0) {
        warnings.push(...errors.map(e => `[${bp.conceptId}] ${e}`));
      } else {
        blueprints.push(bp);
      }
    }
  }

  return { blueprints, warnings };
}
