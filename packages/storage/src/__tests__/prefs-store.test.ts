import { describe, it, expect, beforeEach } from 'vitest';
import { savePreferences, getPreferences, deletePreferences } from '../prefs-store.js';
import { openDatabase, resetDatabase } from '../db.js';

describe('Preferences Store', () => {
  beforeEach(async () => {
    const db = await openDatabase();
    await db.clear('preferences');
    db.close();
    resetDatabase();
  });

  it('saves and retrieves preferences by locale', async () => {
    const prefs = { locale: 'en', theme: 'light', fontSize: 'medium' };
    await savePreferences(prefs);
    const result = await getPreferences('en');
    expect(result).toBeDefined();
    expect(result?.theme).toBe('light');
  });

  it('deletes preferences for a locale', async () => {
    await savePreferences({ locale: 'es', theme: 'dark', fontSize: 'large' });
    await deletePreferences('es');
    const result = await getPreferences('es');
    expect(result).toBeUndefined();
  });
});
