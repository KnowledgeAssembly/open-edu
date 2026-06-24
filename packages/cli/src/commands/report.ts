import * as fs from 'fs';
import { readJsonl, createSummary } from '@open-edu/telemetry';
import type { CliResult } from '../utils/json-output.js';

export function reportTelemetry(filePath: string, options?: { json?: boolean }): CliResult {
  if (!fs.existsSync(filePath)) {
    const error = `File not found: ${filePath}`;
    if (options?.json) {
      return { success: false, error, code: 1 };
    }
    console.error(error);
    return { success: false, error, code: 1 };
  }

  const { events, errors } = readJsonl(filePath);

  const summary = createSummary(events);

  if (errors.length > 0) {
    const diagnostics = errors.map((e) => `  Line ${e.line}: ${e.error}`).join('\n');
    const errorMsg = `Failed to parse telemetry file:\n${diagnostics}`;
    if (options?.json) {
      return {
        success: false,
        error: errorMsg,
        code: 1,
        data: { errors, summary },
      } as unknown as CliResult;
    }
    console.error(errorMsg);
    return { success: false, error: errorMsg, code: 1 };
  }

  if (options?.json) {
    return {
      success: true,
      data: {
        file: filePath,
        totalEvents: summary.totalEvents,
        byType: summary.byType,
        nodeOpens: summary.nodeOpens,
        nodeCompletions: summary.nodeCompletions,
        averageQuizScore: summary.averageQuizScore,
        sessionCount: summary.sessionCount,
        sessionIds: summary.sessionIds,
        errors: errors.length > 0 ? errors : undefined,
      },
    };
  }

  console.log(`Telemetry Report: ${filePath}`);
  console.log(`  Total events:      ${summary.totalEvents}`);
  console.log(`  Sessions:          ${summary.sessionCount}`);
  console.log(`  Node opens:        ${summary.nodeOpens}`);
  console.log(`  Node completions:  ${summary.nodeCompletions}`);

  if (summary.averageQuizScore !== null) {
    console.log(`  Avg quiz score:    ${summary.averageQuizScore.toFixed(1)}`);
  } else {
    console.log(`  Avg quiz score:    N/A`);
  }

  if (Object.keys(summary.byType).length > 0) {
    console.log(`  Events by type:`);
    for (const [type, count] of Object.entries(summary.byType)) {
      console.log(`    ${type}: ${count}`);
    }
  }

  if (errors.length > 0) {
    console.log(`  Parse errors:      ${errors.length}`);
    for (const err of errors) {
      console.log(`    Line ${err.line}: ${err.error}`);
    }
  }

  return { success: true, data: { summary, warnings: errors.length > 0 ? errors : undefined } };
}
