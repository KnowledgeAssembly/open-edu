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
