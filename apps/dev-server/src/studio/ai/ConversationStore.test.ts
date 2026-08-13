import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { ConversationStore, pruneMessages, CONVERSATION_MAX_MESSAGES } from './ConversationStore';
import type { StoredChatMessage } from './ConversationStore';

describe('ConversationStore', () => {
  let store: ConversationStore;

  beforeEach(() => {
    store = new ConversationStore();
  });

  afterEach(async () => {
    try {
      await store.clearMessages('test-course');
    } catch {
      // ignore
    }
  });

  it('round-trips messages', async () => {
    const messages: StoredChatMessage[] = [
      { id: '1', role: 'user', content: 'Hello', createdAt: 100 },
      { id: '2', role: 'assistant', content: 'Hi', createdAt: 200 },
    ];
    await store.saveMessages('test-course', messages);
    const loaded = await store.loadMessages('test-course');
    expect(loaded).toHaveLength(2);
    expect(loaded[0]!.content).toBe('Hello');
    expect(loaded[1]!.content).toBe('Hi');
  });

  it('returns empty array for unknown course', async () => {
    const loaded = await store.loadMessages('nonexistent');
    expect(loaded).toEqual([]);
  });

  it('clears messages for a course', async () => {
    await store.saveMessages('test-course', [
      { id: '1', role: 'user', content: 'Hello', createdAt: 100 },
    ]);
    await store.clearMessages('test-course');
    const loaded = await store.loadMessages('test-course');
    expect(loaded).toEqual([]);
  });

  it('does not affect other courses', async () => {
    await store.saveMessages('course-a', [{ id: '1', role: 'user', content: 'A', createdAt: 100 }]);
    await store.saveMessages('course-b', [{ id: '2', role: 'user', content: 'B', createdAt: 200 }]);
    await store.clearMessages('course-a');
    const loadedB = await store.loadMessages('course-b');
    expect(loadedB).toHaveLength(1);
    expect(loadedB[0]!.content).toBe('B');
  });
});

describe('pruneMessages', () => {
  it('returns messages unchanged when under limit', () => {
    const messages = Array.from({ length: 5 }, (_, i) => ({
      id: `${i}`,
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `msg ${i}`,
      createdAt: i,
    }));
    expect(pruneMessages(messages)).toHaveLength(5);
  });

  it('prunes oldest pairs when over limit', () => {
    const messages: StoredChatMessage[] = Array.from(
      { length: CONVERSATION_MAX_MESSAGES + 10 },
      (_, i) => ({
        id: `${i}`,
        role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
        content: `msg ${i}`,
        createdAt: i,
      }),
    );
    const pruned = pruneMessages(messages);
    expect(pruned.length).toBeLessThanOrEqual(CONVERSATION_MAX_MESSAGES);
    // First message should not be an assistant (orphaned turn start)
    expect(pruned[0]!.role).not.toBe('assistant');
  });

  it('handles empty array', () => {
    expect(pruneMessages([])).toEqual([]);
  });
});
