import { describe, it, expect } from 'vitest';
import { loadPackage } from '@open-edu/core';
import { resolve } from 'path';

describe('interactive-demo example', () => {
  it('should load without errors', async () => {
    const pkg = await loadPackage(resolve(__dirname));
    expect(pkg.manifest.id).toBe('interactive-demo');
    expect(pkg.manifest.title).toBe('Interactive Engine Demo');
    expect(pkg.nodes).toHaveLength(4);
    expect(pkg.workflow).not.toBeNull();
    expect(pkg.workflow!.routing).toHaveProperty('nodes/number-line.json');
    expect(pkg.workflow!.routing).toHaveProperty('nodes/number-line-practice.json');
    expect(pkg.workflow!.routing).toHaveProperty('nodes/composed-lesson.json');

    const numberLine = pkg.nodes.find((n) => n.relativePath === 'nodes/number-line.json');
    expect(numberLine?.node.type).toBe('interactive');
    if (numberLine?.node.type === 'interactive') {
      expect(numberLine.node.engine).toBe('visual');
      expect(numberLine.node.spec).toBeDefined();
    }

    const numberLinePractice = pkg.nodes.find(
      (n) => n.relativePath === 'nodes/number-line-practice.json',
    );
    expect(numberLinePractice?.node.type).toBe('interactive');
    if (numberLinePractice?.node.type === 'interactive') {
      expect(numberLinePractice.node.engine).toBe('visual');
      expect(numberLinePractice.node.prompt).toBe('Tap the emphasized number on the line.');
      const spec = numberLinePractice.node.spec as {
        content?: { components?: Array<{ props?: { interactive?: boolean } }> };
      };
      expect(spec.content?.components?.[0]?.props?.interactive).toBe(true);
    }

    const composed = pkg.nodes.find((n) => n.relativePath === 'nodes/composed-lesson.json');
    expect(composed?.node.type).toBe('interactive');
    if (composed?.node.type === 'interactive') {
      expect(composed.node.engines).toHaveLength(2);
      expect(composed.node.bindings).toHaveLength(1);
    }
  });
});
