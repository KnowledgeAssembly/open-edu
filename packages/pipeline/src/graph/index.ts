import { createHash } from 'node:crypto';
import type { LlmRouter } from '@open-edu/llm-config';
import { legacyAdapter, type LlmStage } from '@open-edu/llm-config';
import { extractPDFPages, extractPDF } from '../extract/index.js';
import { buildSourceInventory } from '../source/inventory.js';
import type { SourceInventory } from '../source/types.js';
import { generateConceptMap } from '../concepts/index.js';
import type { Concept } from '../concepts/types.js';
import { generateLessonBlueprints } from '../blueprint/index.js';
import type { LessonBlueprint } from '../blueprint/types.js';
import { generateActivitiesForConcept } from '../generate-activities/index.js';
import { validateAllMath, extractMathQuestions } from '../validation/math.js';
import { validateWidgetConfig, type WidgetValidationResult } from '../validation/widgets.js';
import { buildCoverageLedger } from '../coverage/index.js';
import { generateQualityReport, type QualityReport } from '../validation/report.js';
import { writeCourseSpecOutput, writeCourseSpecJSONOutput } from '../output/index.js';
import { generateAssetFiles } from '../assets/manifest.js';
import type { AssetManifest } from '../assets/types.js';
import type { GeneratedActivity, ConceptActivityPair } from '../types.js';
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export interface PipelineResult {
  report: QualityReport;
  outputPaths: string[];
  coverageLedger: any;
  assetManifest: AssetManifest | null;
}

export async function runPipelineV2(
  router: LlmRouter,
  options: {
    pdfPath: string;
    levelCode: string;
    subject: string;
    force: boolean;
    chapterFilter?: number;
    outputDir: string;
    verbose: boolean;
    dryRun: boolean;
    resume: boolean;
    maxRetries: number;
    format: 'md' | 'json' | 'both';
    widgetCategories: string[];
  },
): Promise<PipelineResult> {
  const startTime = Date.now();
  const outputPaths: string[] = [];
  const reviewItems: string[] = [];
  const retries = 0;

  if (!existsSync(options.outputDir)) mkdirSync(options.outputDir, { recursive: true });

  function computeConfigHash(): string {
    const hash = createHash('sha256');
    const cfg = JSON.stringify({
      pdfPath: options.pdfPath,
      levelCode: options.levelCode,
      subject: options.subject,
      stages: ['source_inventory','concept_map','concept_enrichment','lesson_blueprint','asset_plan','activity_generation','review']
        .map((s: string) => ({ stage: s, ...router.getStageConfig(s as LlmStage) })),
    });
    hash.update(cfg);
    return hash.digest('hex').slice(0, 12);
  }

  const configHash = computeConfigHash();
  const hashPath = join(options.outputDir, '.pipeline-hash');
  const previousHash = options.resume && existsSync(hashPath) ? readFileSync(hashPath, 'utf-8').trim() : '';

  function canResume(filename: string): boolean {
    if (!options.resume) return false;
    if (previousHash !== configHash) return false;
    return existsSync(join(options.outputDir, filename));
  }

  if (options.force) {
    if (options.verbose) console.log('--force set: regenerating all artifacts');
  } else if (options.resume && previousHash !== configHash) {
    if (options.verbose) console.log('Config changed since last run. Regenerating all artifacts.');
  }

  const shouldRun = !options.dryRun;
  function maybeWrite(path: string, content: string, force?: boolean): void {
    if (shouldRun || force) {
      writeFileSync(path, content, 'utf-8');
      outputPaths.push(path);
    }
  }
  if (options.dryRun && options.verbose) console.log('--dry-run: skipping LLM calls and file writes');

  // Stage 1: Extract PDF pages
  if (options.verbose) console.log('[1/8] Extracting PDF pages...');
  const pages = !options.dryRun ? await extractPDFPages(options.pdfPath) : [];
  const pdfMeta = !options.dryRun ? await extractPDF(options.pdfPath) : { metadata: { title: options.subject } };

  // Stage 2: Build source inventory
  const invPath = join(options.outputDir, 'source-inventory.json');
  let inventory: SourceInventory;
  if (canResume('source-inventory.json')) {
    inventory = JSON.parse(readFileSync(invPath, 'utf-8'));
    if (options.verbose) console.log('[2/8] Resumed source inventory from cache');
  } else {
    if (options.verbose) console.log('[2/8] Building source inventory...');
    inventory = !options.dryRun ? await buildSourceInventory(router, pages, pdfMeta.metadata.title) : { documentId: 'dry-run', title: 'Dry Run', totalPages: 0, units: [], warnings: [] };
    maybeWrite(invPath, JSON.stringify(inventory, null, 2));
  }

  // Stage 3: Generate concept map
  const cmPath = join(options.outputDir, 'concept-map.json');
  let concepts: Concept[] = [];
  let conceptWarnings: string[] = [];
  if (canResume('concept-map.json')) {
    const cm = JSON.parse(readFileSync(cmPath, 'utf-8'));
    concepts = cm.concepts;
    conceptWarnings = cm.warnings || [];
    if (options.verbose) console.log('[3/8] Resumed concept map from cache');
  } else {
    if (options.verbose) console.log('[3/8] Generating concept map...');
    if (!options.dryRun) {
      const result = await generateConceptMap(router, inventory.units, `${options.subject} ${options.levelCode}`);
      concepts = result.concepts;
      conceptWarnings = result.warnings;
      reviewItems.push(...conceptWarnings);
    }
    maybeWrite(cmPath, JSON.stringify({ concepts, warnings: conceptWarnings }, null, 2));
  }

  // Stage 4: Generate lesson blueprints
  const bpPath = join(options.outputDir, 'lesson-blueprints.json');
  let blueprints: LessonBlueprint[] = [];
  let bpWarnings: string[] = [];
  if (canResume('lesson-blueprints.json')) {
    blueprints = JSON.parse(readFileSync(bpPath, 'utf-8'));
    if (options.verbose) console.log('[4/8] Resumed lesson blueprints from cache');
  } else {
    if (options.verbose) console.log('[4/8] Generating lesson blueprints...');
    if (!options.dryRun) {
      const result = await generateLessonBlueprints(router, concepts, inventory.units, options.widgetCategories);
      blueprints = result.blueprints;
      bpWarnings = result.warnings;
      reviewItems.push(...bpWarnings);
    }
    maybeWrite(bpPath, JSON.stringify(blueprints, null, 2));
  }

  // Stage 5: Generate activities from blueprints
  const conceptActivityPairs: ConceptActivityPair[] = [];
  const conceptActivityMap = new Map<string, GeneratedActivity[]>();
  if (canResume('course-spec.json')) {
    if (options.verbose) console.log('[5/8] Activities already generated (resuming)');
  } else {
    if (options.verbose) console.log('[5/8] Generating activities from blueprints...');
    if (!options.dryRun) {
      const llmAdapter = legacyAdapter(router, 'activity_generation');
      for (const bp of blueprints) {
        const result = await generateActivitiesForConcept(
          llmAdapter,
          { conceptId: bp.conceptId, chapterCode: 'CH1', chapterName: options.subject, learningObjective: bp.objective, coreIdea: '', examples: [], misconceptions: bp.misconceptionTargets, supports: { visual: bp.representations.includes('visual') }, masteryCriteria: 0.8, difficulty: 'beginner', estimatedDuration: 30, dependencies: bp.priorKnowledge },
          [],
        );
        const pair: ConceptActivityPair = { concept: { conceptId: bp.conceptId, chapterCode: 'CH1', chapterName: options.subject, learningObjective: bp.objective, coreIdea: '', examples: [], misconceptions: bp.misconceptionTargets, supports: { visual: bp.representations.includes('visual') }, masteryCriteria: 0.8, difficulty: 'beginner', estimatedDuration: 30, dependencies: bp.priorKnowledge }, activities: result.activities };
        conceptActivityPairs.push(pair);
        conceptActivityMap.set(bp.conceptId, result.activities);
      }
    }
  }

  // Stage 6: Generate assets (deterministic SVGs)
  const assetManifest: AssetManifest = { version: 1, generatedAt: new Date().toISOString(), assets: [] };
  if (options.verbose) console.log('[6/8] Generating visual assets...');
  if (!options.dryRun) {
    const { written: _written } = generateAssetFiles(assetManifest, options.outputDir);
  }
  const assetsPath = join(options.outputDir, 'assets', 'manifest.json');
  outputPaths.push(assetsPath);

  // Stage 7: Validate math + widgets + coverage
  if (options.verbose) console.log('[7/8] Running validation...');
  const allActivities = conceptActivityPairs.flatMap(p => p.activities);
  const mathQuestions = extractMathQuestions(allActivities);
  const mathResults = validateAllMath(mathQuestions);

  const widgetResults: WidgetValidationResult[] = [];
  for (const activity of allActivities) {
    if (activity.courseSpecType === 'widget' && activity.widgetId && activity.widgetConfig) {
      widgetResults.push(validateWidgetConfig(activity.widgetId, activity.widgetConfig));
    }
  }

  const activityIdMap = new Map<string, string[]>();
  for (const [key, acts] of conceptActivityMap) {
    activityIdMap.set(key, acts.map(a => `${a.step}-${a.order}`));
  }
  const coverageLedger = buildCoverageLedger(inventory.units, concepts, blueprints, assetManifest.assets, activityIdMap);

  const clPath = join(options.outputDir, 'coverage-ledger.json');
  maybeWrite(clPath, JSON.stringify(coverageLedger, null, 2));

  // Stage 8: Write course-spec artifacts + quality report
  if (options.verbose) console.log('[8/8] Generating outputs and quality report...');
  if (!options.dryRun) {
    const filenamePrefix = `${options.levelCode}-${options.subject}`.toLowerCase();
    if (options.format === 'md' || options.format === 'both') {
      writeCourseSpecOutput(options.outputDir, filenamePrefix, conceptActivityPairs, options.force);
      outputPaths.push(join(options.outputDir, `${filenamePrefix}-course-spec.md`));
    }
    if (options.format === 'json' || options.format === 'both') {
      writeCourseSpecJSONOutput(options.outputDir, filenamePrefix, conceptActivityPairs, options.force);
      outputPaths.push(join(options.outputDir, `${filenamePrefix}-course-spec.json`));
    }
  }

  maybeWrite(hashPath, configHash, true);

  const durationMs = Date.now() - startTime;
  const stageUsage: Record<string, { provider: string; model: string }> = {};
  for (const stage of ['source_inventory','concept_map','concept_enrichment','lesson_blueprint','asset_plan','activity_generation','review'] as const) {
    const cfg = router.getStageConfig(stage as LlmStage);
    stageUsage[stage] = { provider: cfg.provider, model: cfg.model };
  }

  const report = generateQualityReport({
    stageUsage,
    retries,
    durationMs,
    coverage: coverageLedger.summary,
    mathResults,
    widgetResults,
    reviewItems,
    assetCount: assetManifest.assets.length,
    conceptCount: concepts.length,
    hasCycles: conceptWarnings.some(w => w.includes('cycle')),
  });

  const qrPath = join(options.outputDir, 'quality-report.json');
  maybeWrite(qrPath, JSON.stringify(report, null, 2), true);

  return { report, outputPaths, coverageLedger, assetManifest };
}
