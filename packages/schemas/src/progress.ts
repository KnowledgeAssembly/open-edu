import { z } from 'zod';

export const ProgressSnapshotSchema = z.object({
  packageId: z.string().min(1).max(128),
  packageVersion: z.string().min(1).max(64),
  currentNodeId: z.string().min(1).max(512),
  visitedNodes: z.array(z.string().min(1).max(512)),
  scores: z.record(z.number()).default({}),
  isCompleted: z.boolean().default(false),
  updatedAt: z.string().min(1).max(64).datetime(),
});

export type ProgressSnapshot = z.infer<typeof ProgressSnapshotSchema>;
