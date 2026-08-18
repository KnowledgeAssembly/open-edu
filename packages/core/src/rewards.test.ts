import { describe, it, expect } from 'vitest';
import { loadRewards, parseRewards } from './rewards';
import { RewardsValidationError } from './errors';
import { resolve, join } from 'node:path';
import { writeFile, unlink } from 'node:fs/promises';

const fixturesDir = resolve(__dirname, '__fixtures__');

describe('parseRewards', () => {
  it('parses valid rewards', () => {
    const rewards = parseRewards(
      JSON.stringify({
        triggers: [
          { onEvent: 'workflow.complete', rewards: [{ action: 'badge.award', badge: 'done' }] },
        ],
      }),
    );
    expect(rewards.triggers[0]!.onEvent).toBe('workflow.complete');
  });

  it('rejects malformed JSON with a logical file path', () => {
    try {
      parseRewards('{bad', 'rewards.json');
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(RewardsValidationError);
      expect((err as Error).message).toContain('rewards.json');
    }
  });

  it('rejects a schema-invalid rewards file', () => {
    try {
      parseRewards(JSON.stringify({ triggers: [] }), 'rewards.json');
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(RewardsValidationError);
      expect((err as Error).message).toContain('rewards.json');
    }
  });

  it('uses the logical path in schema error context, never a host root', () => {
    try {
      parseRewards(JSON.stringify({ nope: true }), 'rewards.json');
      expect.fail('should have thrown');
    } catch (err) {
      const message = (err as Error).message;
      expect(message).toContain('rewards.json');
      expect(message).not.toMatch(/\/Users\//);
    }
  });

  it('parses the browser-studio fixture rewards from bytes', () => {
    const rewards = parseRewards(
      JSON.stringify({
        triggers: [
          {
            onEvent: 'workflow.complete',
            rewards: [{ action: 'badge.award', badge: 'browser-complete' }],
          },
        ],
      }),
    );
    expect(rewards.triggers).toHaveLength(1);
  });
});

describe('loadRewards', () => {
  it('should load valid rewards', async () => {
    const rewards = await loadRewards(join(fixturesDir, 'valid-package'));
    expect(rewards).not.toBeNull();
    expect(rewards!.triggers).toHaveLength(1);
    expect(rewards!.triggers[0]!.onEvent).toBe('workflow.complete');
  });

  it('should return null when rewards.json does not exist', async () => {
    const result = await loadRewards(join(fixturesDir, 'minimal-package'));
    expect(result).toBeNull();
  });

  it('should reject invalid rewards JSON', async () => {
    const tmpDir = join(fixturesDir, 'minimal-package');
    const tmpPath = join(tmpDir, 'rewards.json');
    await writeFile(tmpPath, '{"triggers": []}');
    await expect(loadRewards(tmpDir)).rejects.toThrow(RewardsValidationError);
    await unlink(tmpPath);
  });
});
