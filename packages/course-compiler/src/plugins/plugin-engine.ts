import type { CourseModel, CompilerDiagnostic } from '../schemas/index.js';
import type { Root } from 'mdast';

export type PluginHook =
  | 'beforeParse'
  | 'afterAST'
  | 'transformModel'
  | 'beforeGenerate'
  | 'afterGenerate';

export interface PluginContext {
  model: CourseModel;
  diagnostics: CompilerDiagnostic[];
  ast?: Root;
  options: Record<string, unknown>;
}

export interface CompilerPlugin {
  name: string;
  hooks: Partial<
    Record<PluginHook, (context: PluginContext) => PluginContext | Promise<PluginContext>>
  >;
}

export interface PluginEngine {
  register(plugin: CompilerPlugin): void;
  unregister(name: string): void;
  executeHook(hook: PluginHook, context: PluginContext): Promise<PluginContext>;
}

export function createPluginEngine(): PluginEngine {
  const plugins: CompilerPlugin[] = [];

  function register(plugin: CompilerPlugin): void {
    if (plugins.some((p) => p.name === plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already registered`);
    }
    const hookCount = Object.keys(plugin.hooks).length;
    if (hookCount === 0) {
      throw new Error(`Plugin "${plugin.name}" must define at least one hook`);
    }
    plugins.push(plugin);
  }

  function unregister(name: string): void {
    const index = plugins.findIndex((p) => p.name === name);
    if (index !== -1) {
      plugins.splice(index, 1);
    }
  }

  async function executeHook(hook: PluginHook, context: PluginContext): Promise<PluginContext> {
    let currentContext = { ...context };

    for (const plugin of plugins) {
      const hookFn = plugin.hooks[hook];
      if (!hookFn) continue;

      try {
        const result = await Promise.resolve(hookFn(currentContext));
        currentContext = { ...currentContext, ...result };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        currentContext.diagnostics.push({
          severity: 'error',
          message: `Plugin "${plugin.name}" failed on hook "${hook}": ${message}`,
          code: 'PLUGIN_ERROR',
        });
      }
    }

    return currentContext;
  }

  return { register, unregister, executeHook };
}

export function createPlaceholderAssetPlugin(): CompilerPlugin {
  return {
    name: 'placeholder-assets',
    hooks: {
      beforeGenerate: (context: PluginContext) => {
        const diagnostics: CompilerDiagnostic[] = [];

        for (const mod of context.model.modules) {
          for (const lesson of mod.lessons) {
            if (!lesson.assets) continue;
            for (const asset of lesson.assets) {
              if (asset.placeholderGenerated) {
                diagnostics.push({
                  severity: 'info',
                  message: `Asset "${asset.id}" at "${asset.path}" is a placeholder`,
                  code: 'PLACEHOLDER',
                });
              }
            }
          }
        }

        return {
          ...context,
          diagnostics: [...context.diagnostics, ...diagnostics],
        };
      },
    },
  };
}
