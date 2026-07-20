import { describe, it, expect, beforeEach } from 'vitest';
import { openDatabase, resetDatabase, DB_NAME, DB_VERSION } from '../db.js';

describe('IndexedDB database setup', () => {
  beforeEach(() => {
    resetDatabase();
  });

  it('exports correct DB_NAME and DB_VERSION', () => {
    expect(DB_NAME).toBe('open-edu');
    expect(DB_VERSION).toBe(2);
  });

  it('opens database with all required object stores', async () => {
    const db = await openDatabase();
    const storeNames = Array.from(db.objectStoreNames);
    expect(storeNames).toContain('courses');
    expect(storeNames).toContain('progress');
    expect(storeNames).toContain('search-indexes');
    expect(storeNames).toContain('preferences');
    expect(storeNames).toContain('badges');
    expect(storeNames).toContain('cards');
    db.close();
  });

  it('courses store has id keyPath', async () => {
    const db = await openDatabase();
    const tx = db.transaction('courses', 'readonly');
    const store = tx.objectStore('courses');
    expect(store.keyPath).toBe('id');
    db.close();
  });

  it('progress store has a compound key', async () => {
    const db = await openDatabase();
    const tx = db.transaction('progress', 'readonly');
    const store = tx.objectStore('progress');
    expect(store.keyPath).toEqual(['courseId', 'lessonId']);
    db.close();
  });

  it('badges store has courseId keyPath', async () => {
    const db = await openDatabase();
    const tx = db.transaction('badges', 'readonly');
    const store = tx.objectStore('badges');
    expect(store.keyPath).toBe('courseId');
    db.close();
  });

  it('cards store has cardId keyPath', async () => {
    const db = await openDatabase();
    const tx = db.transaction('cards', 'readonly');
    const store = tx.objectStore('cards');
    expect(store.keyPath).toBe('cardId');
    db.close();
  });

  it('openDatabase returns the same instance on repeated calls', async () => {
    const db1 = await openDatabase();
    const db2 = await openDatabase();
    expect(db1).toBe(db2);
    db1.close();
  });
});
