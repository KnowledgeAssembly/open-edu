import { z } from 'zod';

export const taskStateSchema = z.enum([
  'started',
  'running',
  'waiting-for-approval',
  'completed',
  'failed',
  'cancelled',
]);
export type TaskState = z.infer<typeof taskStateSchema>;

export interface Task {
  id: string;
  conversationId: string;
  state: TaskState;
  kind: 'generate_course' | 'generate_item' | 'edit_item' | 'multi-step' | 'explain';
  changeSetId?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

/** Tasks are operation records, separate from conversation and workspace state (spec §20). */
export interface TaskStore {
  create(task: Task): Promise<void>;
  update(id: string, patch: Partial<Task>): Promise<void>;
  get(id: string): Promise<Task | undefined>;
  listByConversation(conversationId: string): Promise<Task[]>;
}
