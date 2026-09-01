import { describe, it, expect } from 'vitest';
import type { CompanionTool } from '@open-edu/companion';
import { InMemoryToolRegistry } from './toolRegistry.js';

function simpleTool(id: string): CompanionTool {
  return {
    id,
    description: `Tool ${id}`,
    inputSchema: { parse: () => id } as never,
    permission: { id, kind: 'propose' },
    async execute() {
      return { ok: true, value: id };
    },
  };
}

describe('InMemoryToolRegistry', () => {
  it('registers, gets, and lists tools', () => {
    const registry = new InMemoryToolRegistry([]);
    registry.register(simpleTool('a'));
    registry.register(simpleTool('b'));
    expect(registry.get('a')?.id).toBe('a');
    expect(registry.list().map((tool) => tool.id)).toEqual(['a', 'b']);
  });

  it('registering a duplicate id overwrites the earlier tool', () => {
    const registry = new InMemoryToolRegistry([]);
    registry.register(simpleTool('a'));
    registry.register({ ...simpleTool('a'), description: 'overwritten' });
    expect(registry.list()).toHaveLength(1);
    expect(registry.get('a')?.description).toBe('overwritten');
  });

  it('get of an unknown id returns undefined', () => {
    const registry = new InMemoryToolRegistry([]);
    expect(registry.get('missing')).toBeUndefined();
  });

  it('seeds with the built-in generation catalog by default', () => {
    const registry = new InMemoryToolRegistry();
    const ids = registry.list().map((tool) => tool.id);
    expect(ids).toContain('generate_course');
    expect(ids).toContain('generate_item');
    expect(ids).toContain('edit_item');
  });
});
