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
      LessonBlueprintSchema,
      { temperature: 0.3 },
    );

    const errors = validateBlueprint(result);
    if (errors.length > 0) {
      warnings.push(...errors.map((e) => `[${result.conceptId}] ${e}`));
    } else {
      blueprints.push(result);
    }
  }

  return { blueprints, warnings };
}
