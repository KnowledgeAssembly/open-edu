import * as fs from 'fs';
import type { TelemetryEvent } from '@open-edu/schemas';
import { TelemetryEventSchema } from '@open-edu/schemas';

export interface ParseError {
  line: number;
  error: string;
}

export interface ReadResult {
  events: TelemetryEvent[];
  errors: ParseError[];
}

export function readJsonl(filePath: string): ReadResult {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const events: TelemetryEvent[] = [];
  const errors: ParseError[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (line.length === 0) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      errors.push({ line: i + 1, error: 'Invalid JSON' });
      continue;
    }

    const result = TelemetryEventSchema.safeParse(parsed);
    if (result.success) {
      events.push(result.data);
    } else {
      const messages = result.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      errors.push({ line: i + 1, error: messages });
    }
  }

  return { events, errors };
}
