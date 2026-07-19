import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Security requirements', () => {
  it('manifest does not contain sensitive fields', () => {
    const manifestPath = path.resolve(__dirname, '../../../../apps/learner/public/manifest.webmanifest');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifest).not.toHaveProperty('api_key');
    expect(manifest).not.toHaveProperty('secret');
    expect(manifest).not.toHaveProperty('token');
  });
});
