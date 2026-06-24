import type { RewardReceipt } from './types';
import type { TelemetryEvent } from '@open-edu/schemas';

export function verifyReceipt(receipt: RewardReceipt, telemetryEvents: TelemetryEvent[]): boolean {
  if (!receipt.actionId || !receipt.dispatchedAt || receipt.dispatchedAt <= 0) return false;

  switch (receipt.status) {
    case 'delivered':
      if (receipt.error) return false;
      if (telemetryEvents.length === 0) return false;
      return telemetryEvents.some((event) => {
        const eventTimestamp = (event as Record<string, unknown>).timestamp as number | undefined;
        if (!eventTimestamp) return false;
        return Math.abs(eventTimestamp - receipt.dispatchedAt) < 5000;
      });
    case 'failed':
      return !!receipt.error;
    case 'skipped':
      return !receipt.error;
  }
}

export interface ReplayResult {
  skipped: RewardReceipt[];
  dispatched: RewardReceipt[];
}

export async function replayRewards(
  packageDir: string,
  telemetryFile: string,
): Promise<ReplayResult> {
  const fs = await import('fs/promises');
  const path = await import('path');

  const rewardsPath = path.join(packageDir, 'rewards.json');
  let rewardsConfig: {
    triggers?: Array<{ onEvent: string; rewards: Array<Record<string, unknown>> }>;
  };
  try {
    const content = await fs.readFile(rewardsPath, 'utf-8');
    rewardsConfig = JSON.parse(content);
  } catch {
    return { skipped: [], dispatched: [] };
  }

  if (!rewardsConfig.triggers || rewardsConfig.triggers.length === 0) {
    return { skipped: [], dispatched: [] };
  }

  let telemetryContent: string;
  try {
    telemetryContent = await fs.readFile(telemetryFile, 'utf-8');
  } catch {
    return { skipped: [], dispatched: [] };
  }

  const lines = telemetryContent.trim().split('\n').filter(Boolean);
  const events: TelemetryEvent[] = lines.map((line) => JSON.parse(line));

  const receipts: RewardReceipt[] = [];
  let nextId = 0;

  for (const event of events) {
    const eventType = (event as Record<string, unknown>).event as string;

    for (const trigger of rewardsConfig.triggers) {
      if (trigger.onEvent !== eventType) continue;

      for (const actionDef of trigger.rewards) {
        const existing = receipts.find(
          (r) => r.actionType === String(actionDef.action) && r.status === 'delivered',
        );

        if (existing) {
          receipts.push({
            actionId: `replay-skip-${nextId++}`,
            actionType: String(actionDef.action),
            dispatchedAt: Date.now(),
            status: 'skipped',
            detail: 'Already delivered in previous replay',
          });
          continue;
        }

        receipts.push({
          actionId: `replay-${nextId++}`,
          actionType: String(actionDef.action),
          dispatchedAt: Date.now(),
          status: 'delivered',
          detail: `Replayed: ${String(actionDef.action)} for ${eventType}`,
        });
      }
    }
  }

  const skipped = receipts.filter((r) => r.status === 'skipped');
  const dispatched = receipts.filter((r) => r.status !== 'skipped');
  return { skipped, dispatched };
}
