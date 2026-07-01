import { describe, it, expect } from 'vitest';
import { loadCards } from './cards';
import { CardsValidationError } from './errors';
import { resolve, join } from 'node:path';
import { mkdir, writeFile, rm } from 'node:fs/promises';

const fixturesDir = resolve(__dirname, '__fixtures__');

async function withTempDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = join(fixturesDir, `tmp-cards-${Math.random().toString(36).slice(2)}`);
  await mkdir(dir, { recursive: true });
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

describe('loadCards', () => {
  it('should return null when cards.json does not exist', async () => {
    const result = await loadCards(join(fixturesDir, 'minimal-package'));
    expect(result).toBeNull();
  });

  it('should load valid cards.json', async () => {
    const result = await loadCards(join(fixturesDir, 'valid-package'));
    expect(result).not.toBeNull();
    expect(result!.cards).toHaveLength(2);
    expect(result!.cards[0]!.id).toBe('living-things');
    expect(result!.cards[1]!.id).toBe('careful-observer');
  });

  it('should reject invalid cards JSON', async () => {
    await withTempDir(async (dir) => {
      await writeFile(join(dir, 'cards.json'), '{"cards": [{"id": "test"}]}');
      await expect(loadCards(dir)).rejects.toThrow(CardsValidationError);
    });
  });
});
