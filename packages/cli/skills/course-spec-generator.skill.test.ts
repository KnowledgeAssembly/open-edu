import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SKILL_PATH = join(__dirname, 'course-spec-generator.skill.md');
const README_PATH = join(__dirname, 'README.md');

describe('CLI skill reference compatibility', () => {
  it('skill file exists', () => {
    expect(existsSync(SKILL_PATH)).toBe(true);
  });

  it('README exists', () => {
    expect(existsSync(README_PATH)).toBe(true);
  });

  it('skill references the portable skill or portable spec approach', () => {
    const content = readFileSync(SKILL_PATH, 'utf-8');
    const mentionsPortable =
      content.includes('skills/openedu-course-authoring') ||
      content.includes('portable') ||
      content.includes('repository mode');
    expect(mentionsPortable).toBe(true);
  });

  it('skill recommends JSON format', () => {
    const content = readFileSync(SKILL_PATH, 'utf-8');
    expect(content).toMatch(/course-spec\.json|JSON.*recommended|JSON.*preferred/i);
  });

  it('skill identifies compiler validation', () => {
    const content = readFileSync(SKILL_PATH, 'utf-8');
    expect(content).toMatch(/--validate|compiler.*valid|edu.*compile/i);
  });

  it('skill does not present a hardcoded widget catalog as authoritative', () => {
    const content = readFileSync(SKILL_PATH, 'utf-8');
    const hasHardcodedCatalog =
      content.includes('### 1. `open-edu.') &&
      content.includes('### 2. `open-edu.') &&
      content.includes('### 3. `open-edu.');
    expect(hasHardcodedCatalog).toBe(false);
  });

  it('skill does not exceed reasonable size for a compatibility reference', () => {
    const content = readFileSync(SKILL_PATH, 'utf-8');
    const lines = content.split('\n').length;
    expect(lines).toBeLessThan(300);
  });

  it('README documents installation and usage', () => {
    const content = readFileSync(README_PATH, 'utf-8');
    expect(content).toMatch(/install|usage|setup|how to/i);
    expect(content).toMatch(/portable|repository/i);
    expect(content).toMatch(/skills\/openedu-course-authoring/i);
  });
});
