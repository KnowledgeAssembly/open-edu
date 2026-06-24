import type { TelemetryEvent } from '@open-edu/schemas';

export interface TelemetrySummary {
  totalEvents: number;
  byType: Record<string, number>;
  nodeOpens: number;
  nodeCompletions: number;
  averageQuizScore: number | null;
  sessionCount: number;
  sessionIds: string[];
}

export function createSummary(events: TelemetryEvent[]): TelemetrySummary {
  const byType: Record<string, number> = {};
  let nodeOpens = 0;
  let nodeCompletions = 0;
  const quizScores: number[] = [];
  const sessionIds = new Set<string>();

  for (const event of events) {
    const type = event.event;
    byType[type] = (byType[type] ?? 0) + 1;

    if (type === 'node_open') nodeOpens++;
    if (type === 'node_complete') nodeCompletions++;

    if (type === 'node_complete' && 'score' in event && typeof event.score === 'number') {
      quizScores.push(event.score);
    }

    if (event.sessionId) {
      sessionIds.add(event.sessionId);
    }
  }

  const averageQuizScore =
    quizScores.length > 0 ? quizScores.reduce((sum, s) => sum + s, 0) / quizScores.length : null;

  return {
    totalEvents: events.length,
    byType,
    nodeOpens,
    nodeCompletions,
    averageQuizScore,
    sessionCount: sessionIds.size,
    sessionIds: [...sessionIds].sort(),
  };
}
