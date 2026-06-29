import type { LlmProvider } from '@open-edu/llm-config';
import { extractPDF } from '../extract/index.js';
import { chunkContent } from '../chunk/index.js';
import { generateConcepts } from '../generate-concept/index.js';
import { generateAllActivities } from '../generate-activities/index.js';
import { validateWithRetry } from '../validate/index.js';
import { writeCourseSpecOutput } from '../output/index.js';
import type {
  ConceptCandidate,
  GeneratedConcept,
  GeneratedActivity,
  ConceptActivityPair,
  ValidatedOutput,
} from '../types.js';

export interface PipelineOptions {
  pdfPath: string;
  levelCode: string;
  subject: string;
  force: boolean;
  chapterFilter?: number;
  outputDir: string;
  llmProvider: string;
  llmModel: string;
  interactive: boolean;
  dryRun: boolean;
  verbose: boolean;
  maxRetries: number;
  levelAConceptIds: string[];
}

export interface PipelineReport {
  status: 'complete' | 'partial' | 'failed';
  chaptersProcessed: number;
  conceptsGenerated: number;
  activitiesGenerated: number;
  filesWritten: number;
  filesSkipped: number;
  validationErrors: number;
  retriesNeeded: number;
  failedConcepts: number;
  warnings: string[];
  errors: string[];
  duration: number;
  outputPaths: string[];
}

function log(verbose: boolean, ...args: unknown[]): void {
  if (verbose) {
    console.log(...args);
  }
}

export async function runPipeline(
  llm: LlmProvider,
  options: PipelineOptions,
): Promise<PipelineReport> {
  const startTime = Date.now();
  const errors: string[] = [];
  const warnings: string[] = [];

  log(options.verbose, '[Pipeline] Starting curriculum generation...');
  log(options.verbose, `  PDF:   ${options.pdfPath}`);
  log(options.verbose, `  Level: ${options.levelCode}`);
  log(options.verbose, `  Subject: ${options.subject}`);

  // 1. Extract
  log(options.verbose, '\n[1/6] Extracting PDF...');
  let chapters;
  try {
    const pdf = await extractPDF(options.pdfPath);
    chapters = pdf.chapters;
    log(options.verbose, `  ✓ ${chapters.length} chapters found`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      status: 'failed',
      chaptersProcessed: 0,
      conceptsGenerated: 0,
      activitiesGenerated: 0,
      filesWritten: 0,
      filesSkipped: 0,
      validationErrors: 1,
      retriesNeeded: 0,
      failedConcepts: 0,
      warnings: [],
      errors: [`Extraction failed: ${msg}`],
      duration: Date.now() - startTime,
      outputPaths: [],
    };
  }

  if (options.chapterFilter) {
    const originalCount = chapters.length;
    chapters = chapters.filter((ch) => ch.chapterNumber === options.chapterFilter);
    if (chapters.length === 0) {
      return {
        status: 'failed',
        chaptersProcessed: 0,
        conceptsGenerated: 0,
        activitiesGenerated: 0,
        filesWritten: 0,
        filesSkipped: 0,
        validationErrors: 1,
        retriesNeeded: 0,
        failedConcepts: 0,
        warnings: [],
        errors: [
          `Chapter ${options.chapterFilter} not found. Available: ${Array.from({ length: originalCount }, (_, i) => i + 1).join(', ')}`,
        ],
        duration: Date.now() - startTime,
        outputPaths: [],
      };
    }
    log(options.verbose, `  → Filtered to chapter ${options.chapterFilter} (of ${originalCount})`);
  }

  // 2. Chunk
  log(options.verbose, '\n[2/6] Chunking content...');
  let candidates: ConceptCandidate[] = [];
  try {
    candidates = await chunkContent(
      llm,
      chapters,
      options.levelAConceptIds,
      options.levelCode,
      options.subject,
    );
    log(options.verbose, `  ✓ ${candidates.length} concept candidates identified`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Chunking failed: ${msg}`);
    log(options.verbose, `  ✗ ${msg}`);
  }

  if (candidates.length === 0 && errors.length > 0) {
    return {
      status: 'failed',
      chaptersProcessed: chapters?.length ?? 0,
      conceptsGenerated: 0,
      activitiesGenerated: 0,
      filesWritten: 0,
      filesSkipped: 0,
      validationErrors: errors.length,
      retriesNeeded: 0,
      failedConcepts: 0,
      warnings,
      errors,
      duration: Date.now() - startTime,
      outputPaths: [],
    };
  }

  // 3. Generate Concepts
  log(options.verbose, '\n[3/6] Generating concepts...');
  let concepts: GeneratedConcept[] = [];
  try {
    const result = await generateConcepts(
      llm,
      candidates,
      options.levelAConceptIds,
      options.levelCode,
      options.subject,
    );
    concepts = result.concepts;
    warnings.push(...result.warnings);
    log(options.verbose, `  ✓ ${concepts.length} concepts generated`);
    if (result.warnings.length > 0) {
      log(options.verbose, `  ⚠ ${result.warnings.length} warnings`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Concept generation failed: ${msg}`);
    log(options.verbose, `  ✗ ${msg}`);
  }

  // 4. Generate Activities
  log(options.verbose, '\n[4/6] Generating activities...');
  let activitiesMap = new Map<string, GeneratedActivity[]>();
  try {
    const result = await generateAllActivities(llm, concepts);
    activitiesMap = result.activitiesMap;
    warnings.push(...result.warnings);
    errors.push(...result.errors);
    log(options.verbose, `  ✓ ${activitiesMap.size} concepts have activities`);
    if (result.errors.length > 0) {
      log(options.verbose, `  ✗ ${result.errors.length} activity generation errors`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Activity generation failed: ${msg}`);
    log(options.verbose, `  ✗ ${msg}`);
  }

  // Build pairs
  const pairs: ConceptActivityPair[] = concepts
    .filter((c) => activitiesMap.has(c.conceptId))
    .map((c) => ({
      concept: c,
      activities: activitiesMap.get(c.conceptId)!,
    }));

  // 5. Validate
  log(options.verbose, '\n[5/6] Validating...');
  let validated: ValidatedOutput;
  let retryCount = 0;
  try {
    validated = await validateWithRetry(
      {
        regenerateConcept: async (conceptId, _validationErrors) => {
          const concept = concepts.find((c) => c.conceptId === conceptId);
          if (!concept) return null;
          const activities = activitiesMap.get(conceptId);
          if (!activities) return null;
          const pair: ConceptActivityPair = { concept, activities };
          return pair;
        },
      },
      pairs,
      options.maxRetries,
    );
    retryCount = validated.failed.reduce((sum, f) => sum + f.retries, 0);
    log(
      options.verbose,
      `  ✓ ${validated.passed.length}/${pairs.length} passed (${retryCount} retries)`,
    );
    if (validated.failed.length > 0) {
      log(options.verbose, `  ✗ ${validated.failed.length} concepts failed validation`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Validation failed: ${msg}`);
    validated = { passed: pairs, failed: [], warnings: [] };
    log(options.verbose, `  ✗ ${msg}`);
  }

  warnings.push(...validated.warnings.map((w) => `${w.conceptId}: ${w.warnings.join(', ')}`));

  // 6. Write output
  let filePath: string | null = null;

  if (!options.dryRun) {
    log(options.verbose, '\n[6/6] Writing course-spec.md...');
    try {
      const result = writeCourseSpecOutput(
        options.outputDir,
        `${options.levelCode?.toLowerCase() || ''}-${options.subject || ''}-`,
        validated.passed,
        options.force,
      );
      filePath = result.filePath;
      log(options.verbose, `  ✓ ${result.concepts} concepts written to course-spec.md`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`File writing failed: ${msg}`);
      log(options.verbose, `  ✗ ${msg}`);
    }
  } else {
    log(options.verbose, '\n[6/6] Dry run — files not written');
  }

  const activitiesGenCount = Array.from(activitiesMap.values()).reduce(
    (sum, acts) => sum + acts.length,
    0,
  );

  return {
    status:
      errors.length === 0
        ? 'complete'
        : filePath !== null && validated.passed.length > 0
          ? 'partial'
          : 'failed',
    chaptersProcessed: chapters?.length ?? 0,
    conceptsGenerated: concepts.length,
    activitiesGenerated: activitiesGenCount,
    filesWritten: filePath ? 1 : 0,
    filesSkipped: 0,
    validationErrors: validated.failed.length,
    retriesNeeded: retryCount,
    failedConcepts: validated.failed.length,
    warnings,
    errors,
    duration: Date.now() - startTime,
    outputPaths: filePath ? [filePath] : [],
  };
}
