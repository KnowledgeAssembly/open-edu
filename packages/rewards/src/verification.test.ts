import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyReceipt, replayRewards } from './verification';
import type { RewardReceipt } from './types';
import type { TelemetryEvent } from '@open-edu/schemas';

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

describe('verifyReceipt', () => {
  const now = Date.now();
  const telemetryEvents: TelemetryEvent[] = [
    {
      event: 'node_complete',
      nodeId: 'n1',
      timestamp: now,
    } as TelemetryEvent,
  ];

  it('should return true for a valid delivered receipt with matching telemetry', () => {
    const receipt: RewardReceipt = {
      actionId: 'reward-1',
      actionType: 'badge.award',
      dispatchedAt: now,
      status: 'delivered',
      detail: 'Badge "completer" awarded',
    };
    expect(verifyReceipt(receipt, telemetryEvents)).toBe(true);
  });

  it('should return false for a delivered receipt with error', () => {
    const receipt: RewardReceipt = {
      actionId: 'reward-2',
      actionType: 'badge.award',
      dispatchedAt: now,
      status: 'delivered',
      error: 'Something went wrong',
    };
    expect(verifyReceipt(receipt, telemetryEvents)).toBe(false);
  });

  it('should return false for a delivered receipt with no matching telemetry', () => {
    const receipt: RewardReceipt = {
      actionId: 'reward-3',
      actionType: 'badge.award',
      dispatchedAt: now - 100000,
      status: 'delivered',
    };
    expect(verifyReceipt(receipt, [])).toBe(false);
  });

  it('should return true for a failed receipt with error', () => {
    const receipt: RewardReceipt = {
      actionId: 'reward-4',
      actionType: 'webhook',
      dispatchedAt: now,
      status: 'failed',
      error: 'Connection refused',
    };
    expect(verifyReceipt(receipt, telemetryEvents)).toBe(true);
  });

  it('should return false for a failed receipt without error', () => {
    const receipt: RewardReceipt = {
      actionId: 'reward-5',
      actionType: 'webhook',
      dispatchedAt: now,
      status: 'failed',
    };
    expect(verifyReceipt(receipt, telemetryEvents)).toBe(false);
  });

  it('should return true for a skipped receipt without error', () => {
    const receipt: RewardReceipt = {
      actionId: 'reward-6',
      actionType: 'badge.award',
      dispatchedAt: now,
      status: 'skipped',
      detail: 'Badge already awarded',
    };
    expect(verifyReceipt(receipt, telemetryEvents)).toBe(true);
  });

  it('should return false for a receipt with no dispatchedAt', () => {
    const receipt: RewardReceipt = {
      actionId: 'reward-7',
      actionType: 'badge.award',
      dispatchedAt: 0,
      status: 'delivered',
    };
    expect(verifyReceipt(receipt, telemetryEvents)).toBe(false);
  });

  it('should return false for a receipt with no actionId', () => {
    const receipt: RewardReceipt = {
      actionId: '',
      actionType: 'badge.award',
      dispatchedAt: now,
      status: 'delivered',
    };
    expect(verifyReceipt(receipt, telemetryEvents)).toBe(false);
  });
});

describe('replayRewards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty result when rewards.json does not exist', async () => {
    const { readFile } = await import('fs/promises');
    vi.mocked(readFile).mockRejectedValue(new Error('ENOENT'));
    const result = await replayRewards('/nonexistent', '/nonexistent.jsonl');
    expect(result.skipped).toHaveLength(0);
    expect(result.dispatched).toHaveLength(0);
  });

  it('should dispatch rewards for matching telemetry events', async () => {
    const { readFile } = await import('fs/promises');
    vi.mocked(readFile)
      .mockResolvedValueOnce(
        JSON.stringify({
          triggers: [
            { onEvent: 'node_complete', rewards: [{ action: 'badge.award', badge: 'completer' }] },
          ],
        }),
      )
      .mockResolvedValueOnce(
        JSON.stringify({ event: 'node_complete', nodeId: 'n1', timestamp: Date.now() }) + '\n',
      );
    const result = await replayRewards('/pkg', '/events.jsonl');
    expect(result.dispatched).toHaveLength(1);
    expect(result.dispatched[0]?.actionType).toBe('badge.award');
  });

  it('should skip already-delivered actions', async () => {
    const { readFile } = await import('fs/promises');
    vi.mocked(readFile)
      .mockResolvedValueOnce(
        JSON.stringify({
          triggers: [
            { onEvent: 'node_complete', rewards: [{ action: 'badge.award', badge: 'completer' }] },
          ],
        }),
      )
      .mockResolvedValueOnce(
        JSON.stringify({ event: 'node_complete', nodeId: 'n1', timestamp: Date.now() }) +
          '\n' +
          JSON.stringify({ event: 'node_complete', nodeId: 'n2', timestamp: Date.now() + 100 }) +
          '\n',
      );
    const result = await replayRewards('/pkg', '/events.jsonl');
    expect(result.dispatched).toHaveLength(1);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0]?.status).toBe('skipped');
  });
});
