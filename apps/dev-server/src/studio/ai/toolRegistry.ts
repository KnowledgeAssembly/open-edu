import type { CompanionTool, ToolRegistry } from '@open-edu/companion';
import { companionToolCatalog } from './chat/toolCatalog.js';

/** In-memory `ToolRegistry` seeded with the built-in generation tool catalog. */
export class InMemoryToolRegistry implements ToolRegistry {
  private readonly tools = new Map<string, CompanionTool>();

  constructor(tools: CompanionTool[] = companionToolCatalog) {
    for (const tool of tools) this.tools.set(tool.id, tool);
  }

  register(tool: CompanionTool): void {
    this.tools.set(tool.id, tool);
  }

  get(id: string): CompanionTool | undefined {
    return this.tools.get(id);
  }

  list(): CompanionTool[] {
    return [...this.tools.values()];
  }
}
