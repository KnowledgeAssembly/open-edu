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

export const ModuleProgressSnapshotSchema = z.object({
  moduleId: z.string().min(1).max(128),
  packageVersion: z.string().min(1).max(64),
  currentNodeId: z.string().min(1).max(512),
  visitedNodes: z.array(z.string().min(1).max(512)),
  scores: z.record(z.number()).default({}),
  isCompleted: z.boolean().default(false),
  completedAt: z.string().optional(),
});

export const BundleProgressSnapshotSchema = z.object({
  bundleId: z.string(),
  bundleVersion: z.string().min(1).max(64),
  currentModuleId: z.string().optional(),
  moduleStatuses: z.record(z.enum(['locked', 'unlocked', 'in_progress', 'completed'])).default({}),
  moduleProgress: z.record(ModuleProgressSnapshotSchema).default({}),
  updatedAt: z.string().datetime(),
});

export type ModuleProgressSnapshot = z.infer<typeof ModuleProgressSnapshotSchema>;
export type BundleProgressSnapshot = z.infer<typeof BundleProgressSnapshotSchema>;
