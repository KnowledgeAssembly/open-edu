import { describe, it, expect } from 'vitest';
import { loadCards, parseCards } from './cards';
import { CardsValidationError } from './errors';
import { resolve, join } from 'node:path';
import { mkdir, writeFile, rm } from 'node:fs/promises';

const fixturesDir = resolve(__dirname, '__fixtures__');

describe('parseCards', () => {
  it('parses valid cards', () => {
    const cards = parseCards(
      JSON.stringify({
        cards: [
          {
            id: 'one',
            title: 'One',
            category: 'Math',
            type: 'knowledge',
            summary: 'Summary',
            unlock: { type: 'chain', completedNodeIds: ['nodes/a.md'] },
          },
        ],
      }),
    );
    expect(cards.cards).toHaveLength(1);
    expect(cards.cards[0]!.id).toBe('one');
  });

  it('rejects malformed JSON with a logical file path', () => {
    try {
      parseCards('{bad', 'cards.json');
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(CardsValidationError);
      expect((err as Error).message).toContain('cards.json');
    }
  });

  it('rejects a schema-invalid cards file', () => {
    try {
      parseCards(JSON.stringify({ cards: [{ id: 'test' }] }), 'cards.json');
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(CardsValidationError);
      expect((err as Error).message).toContain('cards.json');
    }
  });

  it('uses the logical path in schema error context, never a host root', () => {
    try {
      parseCards(JSON.stringify({ nope: true }), 'cards.json');
      expect.fail('should have thrown');
    } catch (err) {
      const message = (err as Error).message;
      expect(message).toContain('cards.json');
      expect(message).not.toMatch(/\/Users\//);
    }
  });

  it('parses the browser-studio fixture cards from bytes', () => {
    const cards = parseCards(
      JSON.stringify({
        cards: [
          {
            id: 'browser-science',
            title: 'Browser Science',
            category: 'Science',
            type: 'knowledge',
            summary: 'Learn what makes the sky blue.',
            unlock: { type: 'chain', completedNodeIds: ['nodes/quiz.json'] },
          },
        ],
      }),
    );
    expect(cards.cards[0]!.id).toBe('browser-science');
  });
});

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
