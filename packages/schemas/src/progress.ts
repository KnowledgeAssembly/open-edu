import { z } from 'zod';

export const ProgressSnapshotSchema = z.object({
  packageId: z.string().min(1),
  packageVersion: z.string().min(1),
  currentNodeId: z.string().min(1),
  visitedNodes: z.array(z.string().min(1)),
  scores: z.record(z.number()).default({}),
  isCompleted: z.boolean().default(false),
  updatedAt: z.string().datetime(),
});

export type ProgressSnapshot = z.infer<typeof ProgressSnapshotSchema>;
