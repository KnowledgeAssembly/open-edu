import { generateAgentPrompt, generateWidgetCatalog, loadPackage } from '@open-edu/core';
import {
  createDefaultRegistry,
  WIDGET_ALIAS_MAP,
  getLearningIntentsForWidget,
} from '@open-edu/widgets';
import type { WidgetDefinitionV2 } from '@open-edu/widgets';
import { createPackage } from './create.js';
import type { CliResult } from '../utils/json-output.js';
import type { WidgetCatalogInput } from '@open-edu/core';

function buildWidgetCatalog(): string {
  const registry = createDefaultRegistry();
  const allWidgets = registry.getAll();
  const input: WidgetCatalogInput = {
    widgets: allWidgets.map((w) => {
      const v2 = w as unknown as WidgetDefinitionV2;
      const intents = getLearningIntentsForWidget(w.id);
      const legacyEntry = Object.entries(WIDGET_ALIAS_MAP).find(([, target]) => target === w.id);

      const capabilityKeys: string[] = [];
      if (v2.capabilities) {
        for (const [key, val] of Object.entries(v2.capabilities)) {
          if (val === true) capabilityKeys.push(key.slice('supports'.length));
        }
      }

      const accessibilityKeys: string[] = [];
      if (v2.accessibility) {
        for (const [key, val] of Object.entries(v2.accessibility)) {
          if (val === true) accessibilityKeys.push(key);
        }
      }

      const analyticsKeys: string[] = [];
      if (v2.analytics) {
        for (const [key, val] of Object.entries(v2.analytics)) {
          if (val === true) analyticsKeys.push(key);
        }
      }

      return {
        id: w.id,
        name: v2.name,
        description: v2.description,
        domain: v2.domain,
        status: v2.status,
        deprecated: v2.deprecated,
        replacement: v2.replacement,
        keywords: v2.keywords,
        learningIntents: intents,
        legacyId: legacyEntry?.[0],
        capabilities: capabilityKeys,
        accessibility: accessibilityKeys,
        analytics: analyticsKeys,
        reward: v2.reward
          ? {
              completionXP: v2.reward.completionXP,
              positiveMessage: v2.reward.positiveMessage,
              achievement: v2.reward.achievement,
            }
          : undefined,
        ai: v2.ai
          ? {
              difficulty: v2.ai.difficulty,
              estimatedMinutes: v2.ai.estimatedMinutes,
              bloomsLevel: v2.ai.bloomsLevel,
              cognitiveLoad: v2.ai.cognitiveLoad,
              recommendedAge: v2.ai.recommendedAge,
              readingLevel: v2.ai.readingLevel,
              learningObjectives: v2.ai.learningObjectives,
              commonMisconceptions: v2.ai.commonMisconceptions,
              generationHints: v2.ai.generationHints,
            }
          : undefined,
      };
    }),
  };
  return generateWidgetCatalog(input);
}

export async function generatePrompt(options?: { json?: boolean }): Promise<CliResult> {
  const widgetCatalog = buildWidgetCatalog();
  const prompt = generateAgentPrompt(widgetCatalog);

  if (options?.json) {
    return { success: true, data: { prompt } };
  }

  console.log(prompt);
  return { success: true, data: {} };
}

export async function generateFromDescription(
  dir: string,
  description: string,
  options?: { json?: boolean; force?: boolean },
): Promise<CliResult> {
  const id = extractId(description);
  const title = extractTitle(description);

  const createResult = await createPackage(dir, {
    id,
    title,
    author: 'Generated',
    force: options?.force,
  });

  if (!createResult.success) {
    return {
      success: false,
      error: createResult.error!,
      code: 1,
    };
  }

  try {
    const pkg = await loadPackage(dir);

    if (options?.json) {
      return {
        success: true,
        data: {
          directory: dir,
          files: createResult.files!,
          manifest: {
            id: pkg.manifest.id,
            title: pkg.manifest.title,
            version: pkg.manifest.version,
            entry: pkg.manifest.entry,
          },
          nodes: pkg.nodes.length,
        },
      };
    }

    console.log(`Package created at ${dir}`);
    console.log(`  ID: ${pkg.manifest.id}`);
    console.log(`  Title: ${pkg.manifest.title}`);
    console.log(`  Files: ${createResult.files!.join(', ')}`);
    return { success: true, data: { directory: dir, files: createResult.files! } };
  } catch (error) {
    const msg = `Generated package failed validation: ${error instanceof Error ? error.message : String(error)}`;
    if (options?.json) {
      return { success: false, error: msg, code: 1 };
    }
    return { success: false, error: msg, code: 1 };
  }
}

function extractId(description: string): string {
  const words = description
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const id = words.slice(0, 4).join('-');
  return id || 'generated-package';
}

function extractTitle(description: string): string {
  const firstSentence = description.split(/[.!?]/)[0]?.trim();
  if (firstSentence && firstSentence.length <= 80) {
    return firstSentence;
  }
  const words = description.trim().split(/\s+/);
  if (words.length <= 8) {
    return description.trim();
  }
  return words.slice(0, 8).join(' ') + '...';
}
