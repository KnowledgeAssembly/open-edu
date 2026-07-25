import type { LlmRouter } from '@open-edu/llm-config';
import type { SourceUnit, SourceInventory } from './types.js';
import { SourceInventorySchema, InventoryLLMResponseSchema } from './types.js';
import { buildInventoryPrompt } from './inventory-prompt.js';

const NIOS_LESSON_HEADING = /^(?:Lesson|पाठ)\s+(\d+)\s*[:\-\u2013\u2014]\s*(.+)$/im;
const NIOS_OBJECTIVE_MARKER = /^(?:LEARNING\s*OUTCOMES|Objectives|OBJECTIVES|सीखने के परिणाम)/im;
const NIOS_EXAMPLE_MARKER = /^(?:Example|उदाहरण)\s+(\d+(?:\.\d+)?)\s*[:\-\u2013\u2014]/im;
const NIOS_EXERCISE_MARKER =
  /^(?:Let us see what you have learnt|Exercise|अभ्यास|आइए देखें आपने क्या सीखा)/im;
const NIOS_REVIEW_MARKER = /^(?:REVIEW|Review|पुनरावृत्ति|What have you learnt|आपने क्या सीखा)/im;
const NIOS_TEST_MARKER = /^(?:TEST|Test|परीक्षा|Assessment|मूल्यांकन)/im;
const NIOS_CHAPTER_START = /From\s+this\s+lesson,?\s+you\s+will\s+learn/i;
const NIOS_CHAPTER_TITLE = /^\s*\d*\s*\n*\s*([A-Z][A-Z\s,-]{4,})/m;
const TABLE_OF_CONTENTS = /^(?:Sl\.?\s*No\.?|Contents|TABLE\s*OF\s*CONTENTS)/im;

export interface PageContent {
  pageNum: number;
  text: string;
}

function splitIntoSegments(pages: PageContent[]): SourceUnit[] {
  const units: SourceUnit[] = [];
  let exerciseMode = false;
  let unitCounter = 0;
  let _lessonCount = 0;

  for (const page of pages) {
    const segments = page.text.split(/\n{2,}/).filter((s) => s.trim().length > 0);

    for (const segment of segments) {
      unitCounter++;
      const id = `src-${unitCounter}`;
      const trimmed = segment.trim();
      const location = { pageStart: page.pageNum };

      // Skip table of contents
      if (TABLE_OF_CONTENTS.test(trimmed)) {
        units.push({
          id,
          type: 'unclassified',
          text: trimmed,
          location,
          extractionConfidence: 1.0,
          requiredCoverage: false,
        });
        continue;
      }

      if (NIOS_LESSON_HEADING.test(trimmed)) {
        exerciseMode = false;
        _lessonCount++;
        units.push({
          id,
          type: 'lesson',
          text: trimmed,
          location,
          extractionConfidence: 1.0,
          requiredCoverage: true,
        });
        continue;
      }

      // NIOS chapter start: "From this lesson, you will learn"
      if (NIOS_CHAPTER_START.test(trimmed)) {
        exerciseMode = false;
        _lessonCount++;
        units.push({
          id,
          type: 'lesson',
          text: trimmed,
          location,
          extractionConfidence: 0.95,
          requiredCoverage: true,
        });
        continue;
      }

      // NIOS chapter title: number followed by all-caps title
      if (NIOS_CHAPTER_TITLE.test(trimmed)) {
        exerciseMode = false;
        _lessonCount++;
        units.push({
          id,
          type: 'lesson',
          text: trimmed,
          location,
          extractionConfidence: 0.85,
          requiredCoverage: true,
        });
        continue;
      }

      if (NIOS_EXERCISE_MARKER.test(trimmed)) {
        exerciseMode = true;
        units.push({
          id,
          type: 'exercise',
          text: trimmed,
          location,
          extractionConfidence: 0.9,
          requiredCoverage: true,
        });
        continue;
      }

      if (NIOS_OBJECTIVE_MARKER.test(trimmed)) {
        units.push({
          id,
          type: 'objective',
          text: trimmed,
          location,
          extractionConfidence: 0.95,
          requiredCoverage: true,
        });
        continue;
      }

      if (NIOS_REVIEW_MARKER.test(trimmed)) {
        exerciseMode = false;
        units.push({
          id,
          type: 'review',
          text: trimmed,
          location,
          extractionConfidence: 0.9,
          requiredCoverage: false,
        });
        continue;
      }

      if (NIOS_TEST_MARKER.test(trimmed)) {
        exerciseMode = false;
        units.push({
          id,
          type: 'assessment',
          text: trimmed,
          location,
          extractionConfidence: 0.9,
          requiredCoverage: true,
        });
        continue;
      }

      if (NIOS_EXAMPLE_MARKER.test(trimmed)) {
        units.push({
          id,
          type: 'worked_example',
          text: trimmed,
          location,
          extractionConfidence: 0.9,
          requiredCoverage: true,
        });
        continue;
      }

      units.push({
        id,
        type: exerciseMode ? 'exercise' : 'unclassified',
        text: trimmed,
        location,
        extractionConfidence: exerciseMode ? 0.8 : 0.5,
        requiredCoverage: exerciseMode,
      });
    }
  }

  return units;
}

export async function buildSourceInventory(
  router: LlmRouter,
  pages: PageContent[],
  documentTitle: string,
): Promise<SourceInventory> {
  const rawUnits = splitIntoSegments(pages);

  const unclassifiedUnits = rawUnits.filter((u) => u.type === 'unclassified');

  if (unclassifiedUnits.length > 0) {
    const promptInput = unclassifiedUnits.map((u) => ({
      id: u.id,
      pageStart: u.location.pageStart,
      heading: u.location.heading,
      text: u.text.slice(0, 1000),
    }));

    const prompt = buildInventoryPrompt(promptInput);
    try {
      const result = await router.generateStructuredRaw(
        'source_inventory',
        prompt,
        InventoryLLMResponseSchema,
        { temperature: 0.1 },
      );

      for (const classification of result.classifications) {
        const unit = unclassifiedUnits.find((u) => u.id === classification.unitId);
        if (unit) {
          unit.type = classification.type;
          unit.extractionConfidence = classification.extractionConfidence;
          unit.requiredCoverage = [
            'worked_example',
            'exercise',
            'assessment',
            'objective',
          ].includes(classification.type);
        }
      }
    } catch {
      // Keep unclassified on LLM failure
    }
  }

  const warnings: string[] = [];
  if (pages.length === 0) {
    warnings.push('No pages extracted from document');
  }

  const inventory: SourceInventory = {
    documentId: documentTitle.toLowerCase().replace(/\s+/g, '-'),
    title: documentTitle,
    totalPages: pages.length,
    units: rawUnits,
    warnings,
  };

  return SourceInventorySchema.parse(inventory);
}
