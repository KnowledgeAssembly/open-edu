import { describe, it, expect } from 'vitest';
import { loadRewards } from './rewards';
import { RewardsValidationError } from './errors';
import { resolve, join } from 'node:path';
import { writeFile, unlink } from 'node:fs/promises';

const fixturesDir = resolve(__dirname, '__fixtures__');

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
