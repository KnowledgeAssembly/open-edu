import { describe, it, expect, beforeEach } from 'vitest';
import { ConversationManager } from '../services/ConversationManager.js';
import type { LearningContext } from '../providers/types.js';

describe('ConversationManager', () => {
  let manager: ConversationManager;

  beforeEach(() => {
    manager = new ConversationManager();
  });

  it('creates a new session and returns its ID', () => {
    const context: LearningContext = { courseId: 'course-1', lessonId: 'lesson-1' };
    const sessionId = manager.createSession(context);
    expect(sessionId).toBeTruthy();
    expect(typeof sessionId).toBe('string');
  });

  it('sets current session after creation', () => {
    const sessionId = manager.createSession({});
    expect(manager.currentSession).toBe(sessionId);
  });

  it('adds messages to a session', () => {
    const sessionId = manager.createSession({});
    manager.addMessage(sessionId, {
      id: 'msg-1',
      role: 'user',
      text: 'What is gravity?',
      timestamp: 1000,
    });
    manager.addMessage(sessionId, {
      id: 'msg-2',
      role: 'ai',
      text: 'Gravity is a force...',
      timestamp: 1001,
    });

    const history = manager.getHistory(sessionId);
    expect(history.length).toBe(2);
    expect(history[0]!.text).toBe('What is gravity?');
    expect(history[1]!.text).toBe('Gravity is a force...');
  });

  it('returns empty history for unknown session', () => {
    const history = manager.getHistory('nonexistent');
    expect(history).toEqual([]);
  });

  it('sends a message and auto-creates session', () => {
    const context: LearningContext = { courseId: 'course-1' };
    const message = manager.send('Hello', context);

    expect(message.role).toBe('user');
    expect(message.text).toBe('Hello');
    expect(message.id).toBeTruthy();
    expect(message.timestamp).toBeGreaterThan(0);
    expect(manager.currentSession).toBeTruthy();
  });

  it('maintains message order in session', () => {
    const sessionId = manager.createSession({});
    manager.addMessage(sessionId, { id: '1', role: 'user', text: 'first', timestamp: 1 });
    manager.addMessage(sessionId, { id: '2', role: 'ai', text: 'second', timestamp: 2 });
    manager.addMessage(sessionId, { id: '3', role: 'user', text: 'third', timestamp: 3 });

    const history = manager.getHistory(sessionId);
    expect(history.map((m) => m.text)).toEqual(['first', 'second', 'third']);
  });

  it('resets session messages', () => {
    const sessionId = manager.createSession({});
    manager.addMessage(sessionId, { id: '1', role: 'user', text: 'question', timestamp: 1 });
    expect(manager.getHistory(sessionId).length).toBe(1);

    manager.resetSession(sessionId);
    expect(manager.getHistory(sessionId).length).toBe(0);
  });

  it('returns current session messages', () => {
    const sessionId = manager.createSession({});
    manager.addMessage(sessionId, { id: '1', role: 'user', text: 'hi', timestamp: 1 });
    const messages = manager.getCurrentMessages();
    expect(messages.length).toBe(1);
    expect(messages[0]!.text).toBe('hi');
  });

  it('returns empty array when no current session', () => {
    expect(manager.getCurrentMessages()).toEqual([]);
  });

  it('supports multiple sessions independently', () => {
    const s1 = manager.createSession({ courseId: 'c1' });
    const s2 = manager.createSession({ courseId: 'c2' });

    manager.addMessage(s1, { id: '1', role: 'user', text: 'in session 1', timestamp: 1 });
    manager.addMessage(s2, { id: '2', role: 'user', text: 'in session 2', timestamp: 2 });

    expect(manager.getHistory(s1).length).toBe(1);
    expect(manager.getHistory(s2).length).toBe(1);
  });

  it('includes citations in messages', () => {
    const sessionId = manager.createSession({});
    manager.addMessage(sessionId, {
      id: 'cite-msg',
      role: 'ai',
      text: 'Gravity is a force',
      timestamp: 1,
      citations: [{ source: 'Physics 101', text: 'Gravity attracts masses' }],
    });

    const history = manager.getHistory(sessionId);
    expect(history[0]!.citations).toHaveLength(1);
    expect(history[0]!.citations![0]!.source).toBe('Physics 101');
  });
});
