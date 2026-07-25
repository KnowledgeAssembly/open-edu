import { z } from 'zod';

export const CONCEPT_KINDS = ['skill', 'knowledge', 'procedure', 'application'] as const;
export type ConceptKind = (typeof CONCEPT_KINDS)[number];

export const REPRESENTATION_TYPES = ['concrete', 'visual', 'symbolic'] as const;

export const ConceptSchema = z.object({
  conceptId: z.string().regex(/^[a-z][a-z0-9_]*$/),
  label: z.string().min(3),
  kind: z.enum(CONCEPT_KINDS),
  sourceUnitIds: z.array(z.string()).min(1),
  learningObjective: z.string().min(10),
  coreIdea: z.string().min(20),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  masteryThreshold: z.number().min(0.5).max(0.95),
  prerequisites: z.array(z.string()),
  representations: z.array(z.enum(REPRESENTATION_TYPES)).min(1),
  exerciseFamilies: z.array(z.string()).min(1),
  misconceptionTargets: z.array(z.string()),
  adultContext: z.string().nullable().optional(),
  recommendedWidgetCategories: z.array(z.string()),
  estimatedMinutes: z.number().int().min(5).max(60),
});

export type Concept = z.infer<typeof ConceptSchema>;

export const ConceptMapSchema = z.object({
  concepts: z.array(ConceptSchema),
  documentId: z.string(),
});

export type ConceptMap = z.infer<typeof ConceptMapSchema>;
