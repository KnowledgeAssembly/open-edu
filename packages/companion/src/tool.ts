import type { z } from 'zod';
import type { Permission } from './permission.js';

export type ToolResult = { ok: true; value: unknown } | { ok: false; error: string };

export interface ToolContext {
  requestId?: string;
  signal?: AbortSignal;
  [key: string]: unknown;
}

export interface CompanionTool<Input = unknown> {
  id: string;
  description: string;
  inputSchema: z.ZodType<Input>;
  permission: Permission;
  execute(input: Input, context: ToolContext): Promise<ToolResult>;
}

export interface ToolRegistry {
  register(tool: CompanionTool): void;
  get(id: string): CompanionTool | undefined;
  list(): CompanionTool[];
}
