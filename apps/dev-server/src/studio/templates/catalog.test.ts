import { describe, it, expect } from 'vitest';
import { STUDIO_TEMPLATES, getTemplateById } from './catalog';
import { PackageManifestSchema, WorkflowSchema, ContentNodeSchema } from '@open-edu/schemas';

describe('STUDIO_TEMPLATES', () => {
  it('includes at least three templates with package.json + entry node', () => {
    expect(STUDIO_TEMPLATES.length).toBeGreaterThanOrEqual(3);
    for (const t of STUDIO_TEMPLATES) {
      expect(t.files['package.json']).toBeTruthy();
      const manifest = JSON.parse(t.files['package.json']!);
      expect(manifest.entry).toBeTruthy();
      expect(t.files[manifest.entry]).toBeTruthy();
    }
  });

  it('getTemplateById returns reading-lesson', () => {
    expect(getTemplateById('reading-lesson')?.id).toBe('reading-lesson');
  });

  it('every template package.json satisfies PackageManifestSchema', () => {
    for (const t of STUDIO_TEMPLATES) {
      const result = PackageManifestSchema.safeParse(JSON.parse(t.files['package.json']!));
      expect(result.success, `template ${t.id} manifest invalid`).toBe(true);
    }
  });

  it('every template workflow.json satisfies WorkflowSchema', () => {
    for (const t of STUDIO_TEMPLATES) {
      const result = WorkflowSchema.safeParse(JSON.parse(t.files['workflow.json']!));
      expect(result.success, `template ${t.id} workflow invalid`).toBe(true);
    }
  });

  it('every template quiz node satisfies ContentNodeSchema', () => {
    for (const t of STUDIO_TEMPLATES) {
      for (const [path, content] of Object.entries(t.files)) {
        if (path.startsWith('nodes/') && path.endsWith('.json')) {
          const result = ContentNodeSchema.safeParse(JSON.parse(content!));
          expect(result.success, `template ${t.id} node ${path} invalid`).toBe(true);
        }
      }
    }
  });

  it('every markdown node starts with a heading', () => {
    for (const t of STUDIO_TEMPLATES) {
      for (const [path, content] of Object.entries(t.files)) {
        if (path.startsWith('nodes/') && path.endsWith('.md')) {
          expect(/^#{1,6}\s/m.test(content!), `template ${t.id} ${path} missing heading`).toBe(
            true,
          );
        }
      }
    }
  });
});
