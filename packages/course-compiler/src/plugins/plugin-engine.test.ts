import { describe, it, expect } from 'vitest';
import { createPluginEngine, createPlaceholderAssetPlugin } from './plugin-engine.js';
import type { CompilerPlugin, PluginContext } from './plugin-engine.js';
import type { CourseModel } from '../schemas/index.js';

function emptyContext(): PluginContext {
  return {
    model: {
      metadata: { title: 'Test', description: 'Test', language: 'en' },
      modules: [],
    },
    diagnostics: [],
    options: {},
  };
}

describe('createPluginEngine', () => {
  it('registers a plugin', () => {
    const engine = createPluginEngine();
    const plugin: CompilerPlugin = {
      name: 'test-plugin',
      hooks: {
        beforeParse: (ctx) => ctx,
      },
    };
    engine.register(plugin);
    // No error means success
  });

  it('rejects registering a plugin with no hooks', () => {
    const engine = createPluginEngine();
    const plugin: CompilerPlugin = {
      name: 'empty-plugin',
      hooks: {},
    };
    expect(() => engine.register(plugin)).toThrow('must define at least one hook');
  });

  it('rejects registering a duplicate plugin name', () => {
    const engine = createPluginEngine();
    const plugin: CompilerPlugin = {
      name: 'dup',
      hooks: { beforeParse: (ctx) => ctx },
    };
    engine.register(plugin);
    expect(() => engine.register({ ...plugin })).toThrow('already registered');
  });

  it('unregisters a plugin', () => {
    const engine = createPluginEngine();
    const plugin: CompilerPlugin = {
      name: 'test-plugin',
      hooks: { beforeParse: (ctx) => ctx },
    };
    engine.register(plugin);
    engine.unregister('test-plugin');
    // Should not throw - plugin removed
  });

  it('executes hooks in registration order', async () => {
    const engine = createPluginEngine();
    const order: number[] = [];

    engine.register({
      name: 'first',
      hooks: {
        transformModel: (ctx) => {
          order.push(1);
          return ctx;
        },
      },
    });
    engine.register({
      name: 'second',
      hooks: {
        transformModel: (ctx) => {
          order.push(2);
          return ctx;
        },
      },
    });

    await engine.executeHook('transformModel', emptyContext());
    expect(order).toEqual([1, 2]);
  });

  it('passes context through sequential hooks', async () => {
    const engine = createPluginEngine();

    engine.register({
      name: 'add-diag',
      hooks: {
        transformModel: (ctx) => ({
          ...ctx,
          diagnostics: [...ctx.diagnostics, { severity: 'info', message: 'from plugin', code: 'TEST' }],
        }),
      },
    });

    const result = await engine.executeHook('transformModel', emptyContext());
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]!.code).toBe('TEST');
  });

  it('handles plugin errors gracefully', async () => {
    const engine = createPluginEngine();

    engine.register({
      name: 'failing-plugin',
      hooks: {
        transformModel: () => {
          throw new Error('Something went wrong');
        },
      },
    });

    const result = await engine.executeHook('transformModel', emptyContext());
    expect(result.diagnostics.some((d) => d.code === 'PLUGIN_ERROR')).toBe(true);
    expect(result.diagnostics[0]!.message).toContain('failing-plugin');
  });

  it('returns unmodified context when no plugins registered for a hook', async () => {
    const engine = createPluginEngine();
    const ctx = emptyContext();
    const result = await engine.executeHook('beforeParse', ctx);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('continues after a failing plugin', async () => {
    const engine = createPluginEngine();
    const order: number[] = [];

    engine.register({
      name: 'failing',
      hooks: {
        transformModel: () => {
          order.push(1);
          throw new Error('Fail');
        },
      },
    });
    engine.register({
      name: 'succeeding',
      hooks: {
        transformModel: (ctx) => {
          order.push(2);
          return ctx;
        },
      },
    });

    await engine.executeHook('transformModel', emptyContext());
    expect(order).toEqual([1, 2]);
  });
});

describe('createPlaceholderAssetPlugin', () => {
  it('adds diagnostics for placeholder assets', async () => {
    const engine = createPluginEngine();
    engine.register(createPlaceholderAssetPlugin());

    const model: CourseModel = {
      metadata: { title: 'Test', description: 'Test', language: 'en' },
      modules: [
        {
          id: 'mod-1',
          title: 'Module 1',
          lessons: [
            {
              id: 'lesson-1',
              title: 'Lesson 1',
              objectives: [{ id: 'o1', description: 'Obj' }],
              content: 'Content',
              assets: [
                { id: 'img-1', path: 'img.png', type: 'image', placeholderGenerated: true },
              ],
            },
          ],
        },
      ],
    };

    const ctx: PluginContext = { model, diagnostics: [], options: {} };
    const result = await engine.executeHook('beforeGenerate', ctx);
    expect(result.diagnostics.some((d) => d.code === 'PLACEHOLDER')).toBe(true);
  });

  it('does not add diagnostics when no placeholders exist', async () => {
    const engine = createPluginEngine();
    engine.register(createPlaceholderAssetPlugin());

    const model: CourseModel = {
      metadata: { title: 'Test', description: 'Test', language: 'en' },
      modules: [],
    };

    const ctx: PluginContext = { model, diagnostics: [], options: {} };
    const result = await engine.executeHook('beforeGenerate', ctx);
    expect(result.diagnostics).toHaveLength(0);
  });
});
